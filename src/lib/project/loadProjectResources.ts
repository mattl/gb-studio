import fs from "fs-extra";
import path from "path";
import {
  CompressedProjectResources,
  CompressedSceneResourceWithChildren,
  EngineFieldValuesResource,
  ProjectMetadataResource,
  SettingsResource,
  VariablesResource,
} from "shared/lib/resources/types";
import glob from "glob";
import { promisify } from "util";
import promiseLimit from "lib/helpers/promiseLimit";
import groupBy from "lodash/groupBy";
import type { Dictionary } from "lodash";
import { defaultProjectSettings } from "consts";

const globAsync = promisify(glob);

const CONCURRENT_RESOURCE_LOAD_COUNT = 8;

const sortByIndex = (
  a: { data: { _index: number } },
  b: { data: { _index: number } }
) => {
  if (a.data._index < b.data._index) {
    return -1;
  }
  if (a.data._index > b.data._index) {
    return 1;
  }
  return 0;
};

export const loadProjectResources = async (
  projectRoot: string,
  metadataResource: ProjectMetadataResource
): Promise<CompressedProjectResources> => {
  console.time("loadProjectData.loadProject globResources");
  const projectResources = await globAsync(
    path.join(projectRoot, "project", "**/*.gbsres")
  );
  console.timeEnd("loadProjectData.loadProject globResources");

  console.time("loadProjectData.loadProject readResources2");
  const resources = await promiseLimit(
    CONCURRENT_RESOURCE_LOAD_COUNT,
    projectResources.map((projectResourcePath) => async () => {
      const resourceData = await fs.readJson(projectResourcePath);
      return {
        path: path
          .relative(projectRoot, projectResourcePath)
          .split(path.sep)
          .join(path.posix.sep),
        type: resourceData._resourceType,
        data: resourceData,
      };
    })
  );
  console.timeEnd("loadProjectData.loadProject readResources2");

  console.time("loadProjectData.loadProject build resourcesLookup");
  const resourcesLookup: Dictionary<
    | {
        path: string;
        type: string;
        data: any;
      }[]
    | undefined
  > = groupBy(resources, "type");
  console.timeEnd("loadProjectData.loadProject build resourcesLookup");

  console.time("loadProjectData.loadProject build actorsBySceneFolderLookup");
  const actorSubFolder = `${path.posix.sep}actors${path.posix.sep}`;
  const actorsBySceneFolderLookup = groupBy(
    (resourcesLookup.actor ?? []).sort(sortByIndex),
    (row) => {
      const actorFolderIndex = row.path.lastIndexOf(actorSubFolder);
      return row.path.substring(0, actorFolderIndex);
    }
  );
  console.timeEnd(
    "loadProjectData.loadProject build actorsBySceneFolderLookup"
  );

  console.time("loadProjectData.loadProject build triggersBySceneFolderLookup");
  const triggerSubFolder = `${path.posix.sep}triggers${path.posix.sep}`;
  const triggersBySceneFolderLookup = groupBy(
    (resourcesLookup.trigger ?? []).sort(sortByIndex),
    (row) => {
      const triggerFolderIndex = row.path.lastIndexOf(triggerSubFolder);
      return row.path.substring(0, triggerFolderIndex);
    }
  );
  console.timeEnd(
    "loadProjectData.loadProject build triggersBySceneFolderLookup"
  );

  console.time("loadProjectData.loadProject build sceneResources");

  const extractData = <T>(value: { data: T }): T => value.data;
  const extractDataArray = <T>(arr: { data: T }[] | undefined): T[] =>
    arr?.map(extractData) ?? [];

  const sceneResources: CompressedSceneResourceWithChildren[] = (
    resourcesLookup.scene ?? []
  ).map((row) => {
    const sceneDir = path.posix.dirname(row.path);
    return {
      ...row.data,
      actors: (actorsBySceneFolderLookup[sceneDir] ?? []).map(extractData),
      triggers: (triggersBySceneFolderLookup[sceneDir] ?? []).map(extractData),
    };
  });

  console.timeEnd("loadProjectData.loadProject build sceneResources");

  console.time("loadProjectData.loadProject build variablesResource");
  const variablesResource: VariablesResource = (resourcesLookup.variables ??
    [])[0].data;
  console.timeEnd("loadProjectData.loadProject build variablesResource");

  console.time("loadProjectData.loadProject build engineFieldValuesResource");
  const engineFieldValuesResource: EngineFieldValuesResource =
    (resourcesLookup.engineFieldValues ?? [])[0].data;
  console.timeEnd(
    "loadProjectData.loadProject build engineFieldValuesResource"
  );

  console.time("loadProjectData.loadProject build settingsResource");
  const settingsResource: SettingsResource = (
    resourcesLookup.settings ?? []
  ).reduce(
    (memo, resource) => {
      return {
        ...memo,
        ...resource.data,
      };
    },
    { _resourceType: "settings", ...defaultProjectSettings }
  );
  console.timeEnd("loadProjectData.loadProject build settingsResource");

  return {
    scenes: sceneResources,
    scripts: extractDataArray(resourcesLookup.script),
    sprites: extractDataArray(resourcesLookup.sprite),
    backgrounds: extractDataArray(resourcesLookup.background),
    emotes: extractDataArray(resourcesLookup.emote),
    avatars: extractDataArray(resourcesLookup.avatar),
    tilesets: extractDataArray(resourcesLookup.tileset),
    fonts: extractDataArray(resourcesLookup.font),
    sounds: extractDataArray(resourcesLookup.sound),
    music: extractDataArray(resourcesLookup.music),
    palettes: extractDataArray(resourcesLookup.palette),
    variables: variablesResource,
    engineFieldValues: engineFieldValuesResource,
    settings: settingsResource,
    metadata: metadataResource,
  };
};
