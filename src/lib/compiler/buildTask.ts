import loadAllScriptEventHandlers from "lib/project/loadScriptEventHandlers";
import type {
  EngineFieldSchema,
  SceneTypeSchema,
} from "store/features/engine/engineState";
import compileData from "./compileData";
import { ProjectResources } from "shared/lib/resources/types";
import { L10NLookup, setL10NData } from "shared/lib/lang/l10n";
import ejectBuild from "./ejectBuild";
import { validateEjectedBuild } from "./validate/validateEjectedBuild";
import makeBuild from "./makeBuild";

export type BuildType = "rom" | "web" | "pocket";

export type BuildOptions = {
  project: ProjectResources;
  buildType: BuildType;
  projectRoot: string;
  tmpPath: string;
  engineFields: EngineFieldSchema[];
  sceneTypes: SceneTypeSchema[];
  outputRoot: string;
  make: boolean;
  debugEnabled?: boolean;
  l10nData: L10NLookup;
};

export type BuildTaskCommand = {
  action: "build";
  payload: BuildOptions;
};

export type BuildTaskResponse =
  | {
      action: "progress";
      payload: {
        message: string;
      };
    }
  | {
      action: "warning";
      payload: {
        message: string;
      };
    }
  | {
      action: "complete";
      payload: Awaited<ReturnType<typeof compileData>>;
    };

const buildProject = async ({
  project,
  projectRoot,
  engineFields,
  sceneTypes,
  tmpPath,
  outputRoot,
  buildType,
  make,
  l10nData,
}: BuildOptions) => {
  // Initialise l10n
  setL10NData(l10nData);

  // Load script event handlers + plugins
  const scriptEventHandlers = await loadAllScriptEventHandlers(projectRoot);

  const compiledData = await compileData(project, {
    projectRoot,
    engineFields,
    scriptEventHandlers,
    sceneTypes,
    tmpPath,
    debugEnabled: true,
    progress,
    warnings,
  });

  await ejectBuild({
    projectType: "gb",
    projectRoot,
    tmpPath,
    projectData: project,
    engineFields,
    sceneTypes,
    outputRoot,
    compiledData,
    progress,
    warnings,
  });

  await validateEjectedBuild({
    buildRoot: outputRoot,
    progress,
    warnings,
  });

  if (make) {
    await makeBuild({
      buildRoot: outputRoot,
      tmpPath,
      buildType,
      data: project,
      debug: project.settings.generateDebugFilesEnabled,
      progress,
      warnings,
    });
  }

  return compiledData;
};

const progress = (message: string) => {
  send({
    action: "progress",
    payload: {
      message,
    },
  });
};

const warnings = (message: string) => {
  send({
    action: "warning",
    payload: {
      message,
    },
  });
};

const send = (msg: BuildTaskResponse) => {
  return new Promise<void>((resolve, reject) => {
    process.send?.(msg, (e: Error) => {
      if (e) {
        console.error(
          "buildTask process failed to send message to parent process:",
          e
        );
        reject(e);
      }
      resolve();
    });
  });
};

// Listen for a message from the parent process
process.on("message", async (message: BuildTaskCommand) => {
  try {
    if (message.action === "build") {
      const res = await buildProject(message.payload);
      await send({ action: "complete", payload: res });
      process.exit(0);
    }
  } catch (e) {
    console.error("buildTask process terminated with error:", e);
    process.exit(1);
  }
});
