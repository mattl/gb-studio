import Path from "path";
import { fork, ChildProcess } from "child_process";
import compileData from "./compileData";
import { BuildOptions, BuildTaskCommand, BuildTaskResponse } from "./buildTask";
import { getL10NData } from "shared/lib/lang/l10n";

type BuilderRunnerResult = {
  kill: () => void;
  result: ReturnType<typeof compileData>;
};

type BuildRunnerOptions = Omit<BuildOptions, "l10nData"> & {
  progress: (msg: string) => void;
  warnings: (msg: string) => void;
};

export const buildRunner = ({
  progress,
  warnings,
  ...options
}: BuildRunnerOptions): BuilderRunnerResult => {
  let buildTask: ChildProcess | undefined;
  let cancelling = false;

  const compiledData = new Promise<Awaited<ReturnType<typeof compileData>>>(
    (resolve, reject) => {
      const taskPath = Path.resolve(__dirname, "./buildTask.js");
      buildTask = fork(taskPath);
      const command: BuildTaskCommand = {
        action: "build",
        payload: {
          ...options,
          l10nData: getL10NData(),
        },
      };
      buildTask.send(command);

      // Listen for messages from the child process
      buildTask.on("message", (message: BuildTaskResponse) => {
        if (cancelling) {
          return;
        }
        if (message.action === "progress") {
          progress(message.payload.message);
        } else if (message.action === "warning") {
          warnings(message.payload.message);
        } else if (message.action === "complete") {
          resolve(message.payload);
        }
      });

      // Handle child process exit
      buildTask.on("exit", (code) => {
        buildTask = undefined;
        if (code !== 0) {
          reject(code ?? 1);
        }
      });
    }
  );

  const kill = () => {
    if (cancelling) {
      return;
    }
    cancelling = true;
    if (buildTask) {
      process.kill(buildTask.pid);
    }
  };

  return {
    kill,
    result: compiledData,
  };
};
