import fs from "fs-extra";

export const readJson = async (file: string): Promise<unknown> => {
  return fs.readJson(file);
};
