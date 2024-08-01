import path from "path";
import glob from "glob";
import { promisify } from "util";
import promiseLimit from "lib/helpers/promiseLimit";
import { checksumMD5File } from "lib/helpers/checksum";

const globAsync = promisify(glob);

const CONCURRENT_RESOURCE_LOAD_COUNT = 16;

export const loadProjectResourceChecksums = async (
  projectPath: string
): Promise<Record<string, string>> => {
  const projectRoot = path.dirname(projectPath);
  const projectResourcesRoot = path.join(projectRoot, "project");

  console.time("loadProjectResourceHashes.loadProject globResources");
  const projectResources = await globAsync(
    path.join(projectResourcesRoot, "**/*.gbsres")
  );
  console.timeEnd("loadProjectResourceHashes.loadProject globResources");

  console.time("loadProjectResourceHashes.loadProject readResources2");
  const resources = await promiseLimit(
    CONCURRENT_RESOURCE_LOAD_COUNT,
    projectResources.map((projectResourcePath) => async () => {
      const resourceData = await checksumMD5File(projectResourcePath);
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
  return resources.reduce((memo, { path, data }) => {
    memo[path] = data;
    return memo;
  }, {} as Record<string, string>);
};
