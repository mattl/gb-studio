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
import { checksumFile } from "lib/helpers/checksum";

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

export const loadProjectResourceChecksums = async (
  projectPath: string
): Promise<Record<string, string>> => {
  const projectRoot = path.dirname(projectPath);

  console.time("loadProjectResourceHashes.loadProject globResources");
  const projectResources = await globAsync(
    path.join(projectRoot, "project", "**/*.gbsres")
  );
  console.timeEnd("loadProjectResourceHashes.loadProject globResources");

  console.time("loadProjectResourceHashes.loadProject readResources2");
  const resources = await promiseLimit(
    CONCURRENT_RESOURCE_LOAD_COUNT,
    projectResources.map((projectResourcePath) => async () => {
      const resourceData = await checksumFile(projectResourcePath);
      return {
        path: path
          .relative(projectRoot, projectResourcePath)
          .split(path.sep)
          .join(path.posix.sep),
        data: resourceData,
      };
    })
  );
  console.timeEnd("loadProjectResourceHashes.loadProject readResources2");
  console.log("GOT RESORUCES ");
  console.log(resources);
  return resources.reduce((memo, { path, data }) => {
    memo[path] = data;
    return memo;
  }, {} as Record<string, string>);
};
