import fs from "fs-extra";
import path from "path";
import uuid from "uuid/v4";
import glob from "glob";
import { promisify } from "util";
import loadAllBackgroundData, {
  BackgroundAssetData,
} from "./loadBackgroundData";
import loadAllSpriteData, { SpriteAssetData } from "./loadSpriteData";
import loadAllMusicData, { MusicAssetData } from "./loadMusicData";
import loadAllFontData from "./loadFontData";
import loadAllAvatarData from "./loadAvatarData";
import loadAllEmoteData from "./loadEmoteData";
import loadAllSoundData from "./loadSoundData";
import loadAllScriptEventHandlers, {
  ScriptEventDef,
} from "./loadScriptEventHandlers";
import migrateProject from "./migrateProject";
import type { ProjectData } from "store/features/project/projectActions";
import type {
  EngineFieldSchema,
  SceneTypeSchema,
} from "store/features/engine/engineState";
import type { Asset } from "shared/lib/helpers/assets";
import keyBy from "lodash/keyBy";
import groupBy from "lodash/groupBy";
import { cloneDictionary } from "lib/helpers/clone";
import { Dictionary } from "@reduxjs/toolkit";
import { loadEngineFields } from "lib/project/engineFields";
import { loadSceneTypes } from "lib/project/sceneTypes";
import loadAllTilesetData from "lib/project/loadTilesetData";
import promiseLimit from "lib/helpers/promiseLimit";
import {
  CompressedBackgroundResource,
  CompressedProjectResources,
  EngineFieldValuesResource,
  MusicResource,
  PaletteResource,
  SettingsResource,
  SpriteResource,
  VariablesResource,
} from "shared/lib/resources/types";
import { defaultPalettes, defaultProjectSettings } from "consts";

export interface LoadProjectResult {
  resources: CompressedProjectResources;
  scriptEventDefs: Dictionary<ScriptEventDef>;
  engineFields: EngineFieldSchema[];
  sceneTypes: SceneTypeSchema[];
  modifiedSpriteIds: string[];
  isMigrated: boolean;
}

const globAsync = promisify(glob);

const CONCURRENT_RESOURCE_LOAD_COUNT = 8;

const toUnixFilename = (filename: string) => {
  return filename.replace(/\\/g, "/");
};

const toAssetFilename = (elem: Asset) => {
  return (elem.plugin ? `${elem.plugin}/` : "") + toUnixFilename(elem.filename);
};

const indexResourceByFilename = <T extends { data: Asset }>(
  arr: T[]
): Record<string, T> => keyBy(arr || [], ({ data }) => toAssetFilename(data));

const sortByName = (a: { name: string }, b: { name: string }) => {
  const aName = a.name.toUpperCase();
  const bName = b.name.toUpperCase();
  if (aName < bName) {
    return -1;
  }
  if (aName > bName) {
    return 1;
  }
  return 0;
};

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

const loadProject = async (projectPath: string): Promise<LoadProjectResult> => {
  const projectRoot = path.dirname(projectPath);

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
  const resourcesLookup = groupBy(resources, "type");
  console.timeEnd("loadProjectData.loadProject build resourcesLookup");

  console.time("loadProjectData.loadProject scriptEventDefs");
  const scriptEventDefs = await loadAllScriptEventHandlers(projectRoot);
  console.timeEnd("loadProjectData.loadProject scriptEventDefs");

  console.time("loadProjectData.loadProject engineFields");
  const engineFields = await loadEngineFields(projectRoot);
  console.timeEnd("loadProjectData.loadProject engineFields");

  console.time("loadProjectData.loadProject sceneTypes");
  const sceneTypes = await loadSceneTypes(projectRoot);
  console.timeEnd("loadProjectData.loadProject sceneTypes");

  console.time("loadProjectData.loadProject readJson");
  const originalJson = await fs.readJson(projectPath);
  console.timeEnd("loadProjectData.loadProject readJson");

  const { _version: originalVersion, _release: originalRelease } = originalJson;

  console.time("loadProjectData.loadProject migrateProject");
  const json = migrateProject(
    originalJson,
    projectRoot,
    scriptEventDefs
  ) as ProjectData;
  console.timeEnd("loadProjectData.loadProject migrateProject");

  const isMigrated =
    json._version !== originalVersion || json._release !== originalRelease;

  console.time("loadProjectData.loadProject loadAssets");
  const [
    backgrounds,
    sprites,
    music,
    sounds,
    fonts,
    avatars,
    emotes,
    tilesets,
  ] = await Promise.all([
    loadAllBackgroundData(projectRoot),
    loadAllSpriteData(projectRoot),
    loadAllMusicData(projectRoot),
    loadAllSoundData(projectRoot),
    loadAllFontData(projectRoot),
    loadAllAvatarData(projectRoot),
    loadAllEmoteData(projectRoot),
    loadAllTilesetData(projectRoot),
  ]);
  console.timeEnd("loadProjectData.loadProject loadAssets");

  const modifiedSpriteIds: string[] = [];

  const addMissingEntityId = <T extends { id: string }>(entity: T) => {
    if (!entity.id) {
      return {
        ...entity,
        id: uuid(),
      };
    }
    return entity;
  };

  console.time("loadProjectData.loadProject fixPalettes");

  console.timeEnd("loadProjectData.loadProject fixPalettes");

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

  const sceneResources = (resourcesLookup.scene ?? []).map((row) => {
    const sceneDir = path.posix.dirname(row.path);
    return addMissingEntityId({
      ...row.data,
      actors: (actorsBySceneFolderLookup[sceneDir] ?? []).map((actorRow) =>
        addMissingEntityId(actorRow.data)
      ),
      triggers: (triggersBySceneFolderLookup[sceneDir] ?? []).map(
        (triggerRow) => addMissingEntityId(triggerRow.data)
      ),
    });
  });

  console.timeEnd("loadProjectData.loadProject build sceneResources");

  console.time("loadProjectData.loadProject build scriptResources");
  const scriptResources = (resourcesLookup.script ?? []).map((row) =>
    addMissingEntityId(row.data)
  );
  console.timeEnd("loadProjectData.loadProject build scriptResources");

  const mergeAssetsWithResources = <
    R extends Asset & { name: string },
    A extends Asset
  >(
    assets: A[],
    resources: {
      // path: string;
      // type: string;
      data: R;
    }[],
    mergeFn: (asset: A, resource: R | undefined) => R
  ) => {
    const oldResourceByFilename = indexResourceByFilename(resources || []);
    return assets
      .map((asset) => {
        const oldResource: R =
          oldResourceByFilename[toAssetFilename(asset)]?.data;
        return mergeFn(asset, oldResource);
      })
      .sort(sortByName);
  };

  const mergeAssetIdsWithResources = <
    A extends Asset & { id: string; name: string },
    B extends string
  >(
    assets: A[],
    resources: {
      // path: string;
      // type: string;
      data: A & { _resourceType: B };
    }[],
    resourceType: B
  ) => {
    return mergeAssetsWithResources(assets, resources, (asset, resource) => {
      return {
        _resourceType: resourceType,
        ...asset,
        id: resource?.id ?? asset.id,
      };
    });
  };

  const mergeAssetIdAndSymbolsWithResources = <
    A extends Asset & { id: string; symbol: string; name: string },
    B extends string
  >(
    assets: A[],
    resources: {
      // path: string;
      // type: string;
      data: A & { _resourceType: B };
    }[],
    resourceType: B
  ) => {
    return mergeAssetsWithResources(assets, resources, (asset, resource) => {
      return {
        _resourceType: resourceType,
        ...asset,
        id: resource?.id ?? asset.id,
        symbol: resource?.symbol ?? asset.symbol,
      };
    });
  };

  console.time("loadProjectData.loadProject build backgroundResources");
  const backgroundResources = mergeAssetsWithResources<
    CompressedBackgroundResource,
    BackgroundAssetData
  >(backgrounds, resourcesLookup.background, (asset, resource) => {
    if (resource) {
      return {
        _resourceType: "background",
        ...asset,
        id: resource.id,
        symbol: resource?.symbol !== undefined ? resource.symbol : asset.symbol,
        tileColors:
          resource?.tileColors !== undefined ? resource.tileColors : "",
        autoColor:
          resource?.autoColor !== undefined ? resource.autoColor : false,
      };
    }
    return {
      _resourceType: "background",
      ...asset,
      tileColors: "",
    };
  });
  console.timeEnd("loadProjectData.loadProject build backgroundResources");

  console.time("loadProjectData.loadProject build spriteResources");
  const spriteResources = mergeAssetsWithResources<
    SpriteResource,
    SpriteAssetData
  >(sprites, resourcesLookup.sprite, (asset, resource) => {
    if (!resource || !resource.states || resource.numTiles === undefined) {
      modifiedSpriteIds.push(resource?.id ?? asset.id);
    }
    return {
      ...asset,
      ...resource,
      id: resource?.id ?? asset.id,
      symbol: resource?.symbol ?? asset.symbol,
      filename: asset.filename,
      name: resource?.name ?? asset.name,
      canvasWidth: resource?.canvasWidth || 32,
      canvasHeight: resource?.canvasHeight || 32,
      states: (
        resource?.states || [
          {
            id: uuid(),
            name: "",
            animationType: "multi_movement",
            flipLeft: true,
            animations: [],
          },
        ]
      ).map((oldState) => {
        return {
          ...oldState,
          animations: Array.from(Array(8)).map((_, animationIndex) => ({
            id:
              (oldState.animations &&
                oldState.animations[animationIndex] &&
                oldState.animations[animationIndex].id) ||
              uuid(),
            frames: (oldState.animations &&
              oldState.animations[animationIndex] &&
              oldState.animations[animationIndex].frames) || [
              {
                id: uuid(),
                tiles: [],
              },
            ],
          })),
        };
      }),
    } as SpriteResource;
  });
  console.timeEnd("loadProjectData.loadProject build spriteResources");

  console.time("loadProjectData.loadProject build emoteResources");
  const emoteResources = mergeAssetIdAndSymbolsWithResources(
    emotes,
    resourcesLookup.emote,
    "emote"
  );
  console.timeEnd("loadProjectData.loadProject build emoteResources");

  console.time("loadProjectData.loadProject build avatarResources");
  const avatarResources = mergeAssetIdsWithResources(
    avatars,
    resourcesLookup.avatar,
    "avatar"
  );
  console.timeEnd("loadProjectData.loadProject build avatarResources");

  console.time("loadProjectData.loadProject build tilesetResources");
  const tilesetResources = mergeAssetIdAndSymbolsWithResources(
    tilesets,
    resourcesLookup.tileset,
    "tileset"
  );
  console.timeEnd("loadProjectData.loadProject build tilesetResources");

  console.time("loadProjectData.loadProject build soundResources");
  const soundResources = mergeAssetIdAndSymbolsWithResources(
    sounds,
    resourcesLookup.sound,
    "sound"
  );
  console.timeEnd("loadProjectData.loadProject build soundResources");

  console.time("loadProjectData.loadProject build fontResources");
  const fontResources = mergeAssetIdAndSymbolsWithResources(
    fonts,
    resourcesLookup.font,
    "font"
  );
  console.timeEnd("loadProjectData.loadProject build fontResources");

  console.time("loadProjectData.loadProject build musicResources");
  const musicResources = mergeAssetsWithResources<
    MusicResource,
    MusicAssetData
  >(music, resourcesLookup.music, (asset, resource) => {
    if (resource) {
      return {
        _resourceType: "music",
        ...asset,
        id: resource.id,
        symbol: resource?.symbol !== undefined ? resource.symbol : asset.symbol,
        settings: {
          ...resource.settings,
        },
      };
    }
    return {
      _resourceType: "music",
      ...asset,
      settings: {},
    };
  });
  console.timeEnd("loadProjectData.loadProject build musicResources");

  console.time("loadProjectData.loadProject build paletteResources");
  const paletteResources: PaletteResource[] = (
    resourcesLookup.palette ?? []
  ).map((row) => addMissingEntityId(row.data));

  // Add any missing default palettes
  for (let i = 0; i < defaultPalettes.length; i++) {
    const defaultPalette = defaultPalettes[i];
    const existingPalette = paletteResources.find(
      (p) => p.id === defaultPalette.id
    );
    if (existingPalette) {
      existingPalette.defaultName = defaultPalette.name;
      existingPalette.defaultColors = defaultPalette.colors;
    } else {
      paletteResources.push({
        _resourceType: "palette",
        ...defaultPalette,
        defaultName: defaultPalette.name,
        defaultColors: defaultPalette.colors,
      });
    }
  }
  console.timeEnd("loadProjectData.loadProject build paletteResources");

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
    resources: {
      scenes: sceneResources,
      // actors: actorResources,
      // triggers: triggerResources,
      scripts: scriptResources,
      sprites: spriteResources,
      backgrounds: backgroundResources,
      emotes: emoteResources,
      avatars: avatarResources,
      tilesets: tilesetResources,
      fonts: fontResources,
      sounds: soundResources,
      music: musicResources,
      palettes: paletteResources,
      variables: variablesResource,
      engineFieldValues: engineFieldValuesResource,
      settings: settingsResource,
      metadata: originalJson,
    },
    modifiedSpriteIds,
    isMigrated,
    scriptEventDefs: cloneDictionary(scriptEventDefs),
    engineFields,
    sceneTypes,
  };
};

export default loadProject;
