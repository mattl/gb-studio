import {
  CompressedProjectResources,
  CompressedProjectResourcesPatch,
  CompressedResource,
} from "shared/lib/resources/types";

const stripDirtyResource = (obj: any): any | undefined => {
  let foundDirty = false;
  function deepClean<T>(obj: T): T {
    if (obj !== null && typeof obj === "object") {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (key === "__dirty" && obj[key] === true) {
            foundDirty = true;
            delete obj[key];
          } else {
            deepClean(obj[key]);
          }
        }
      }
    }
    return obj;
  }
  const cleanedObject = deepClean(obj);
  if (!foundDirty) {
    return undefined;
  }
  return cleanedObject;
};

const identity = <T>(x: T): T => x;

const stripDirtyResources = <T>(arr: T[]): T[] =>
  arr.map(stripDirtyResource).filter(identity) as T[];

export const buildCompressedProjectResourcesPatch = (
  resources: CompressedProjectResources
): CompressedProjectResourcesPatch => {
  const dirtyResources: CompressedProjectResources = {
    scenes: stripDirtyResources(resources.scenes),
    scripts: stripDirtyResources(resources.scripts),
    sprites: stripDirtyResources(resources.sprites),
    backgrounds: stripDirtyResources(resources.backgrounds),
    emotes: stripDirtyResources(resources.emotes),
    avatars: stripDirtyResources(resources.avatars),
    fonts: stripDirtyResources(resources.fonts),
    tilesets: stripDirtyResources(resources.tilesets),
    sounds: stripDirtyResources(resources.sounds),
    music: stripDirtyResources(resources.music),
    palettes: stripDirtyResources(resources.palettes),
    variables: resources.variables,
    engineFieldValues: resources.engineFieldValues,
    settings: resources.settings,
    metadata: resources.metadata,
  };
  return {
    data: dirtyResources,
    paths: [],
  };
};
