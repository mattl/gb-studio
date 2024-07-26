/* eslint-disable @typescript-eslint/no-unused-vars */
import { copy, ensureDir, move, pathExists, remove } from "fs-extra";
import glob from "glob";
import { promisify } from "util";
import { writeFileAndFlushAsync } from "lib/helpers/fs/writeFileAndFlush";
import { writeFileWithBackupAsync } from "lib/helpers/fs/writeFileWithBackup";
import Path from "path";
import {
  actorName,
  customEventName,
  paletteName,
  sceneName,
  triggerName,
} from "shared/lib/entities/entitiesHelpers";
import { stripInvalidPathCharacters } from "shared/lib/helpers/stripInvalidFilenameCharacters";
import type { ProjectData } from "store/features/project/projectActions";
import { compress8bitNumberArray } from "shared/lib/resources/compression";
import { CompressedProjectResources } from "shared/lib/resources/types";

const globAsync = promisify(glob);

type Entity = { id: string; name: string };

const stringify8bitArray = (arr: number[], _width: number): string => {
  return compress8bitNumberArray(arr);
  // return chunk(arr, width)
  //   .map((row) => row.map((v) => v.toString(16).padStart(2, "0")).join(""))
  //   .join("\n");
};

const encodeResource = <T extends Record<string, unknown>>(
  resourceType: string,
  data: T
): string => {
  const {
    // Extract id so it can be moved to top of data
    id,
    // Remove internal data so it isn't stored to disk
    __dirty,
    __type,
    // Extract remaining data to write to disk
    ...rest
  } = data;
  return JSON.stringify(
    {
      _resourceType: resourceType,
      id,
      ...rest,
    },
    null,
    2
  );
};

const entityToFilePath = (entity: Entity, nameOverride?: string): string => {
  const name = nameOverride || entity.name;
  return `${stripInvalidPathCharacters(name)
    .toLocaleLowerCase()
    .replace(/\s+/g, "_")}__${entity.id}`;
};

const saveProjectData = async (
  projectPath: string,
  projectResources: CompressedProjectResources
) => {
  console.log("SAVING");
  console.log(projectResources);
  console.log(JSON.stringify(projectResources.scenes, null, 4));

  throw new Error("SAVING BLOCKED FOR NOW");
  // const projectFolder = Path.dirname(projectPath);
  // const projectPartsFolder = Path.join(projectFolder, "project");
  // const projectPartsTmpFolder = Path.join(projectFolder, "project.sav");
  // const projectPartsBckFolder = Path.join(projectFolder, "project.bak");
  // const projectResFilename = Path.join(projectFolder, `project.gbsres`);
  // const variablesResFilename = Path.join(`variables.gbsres`);
  // const settingsResFilename = Path.join(`settings.gbsres`);
  // const userSettingsResFilename = Path.join(`user_settings.gbsres`);
  // const engineFieldValuesResFilename = Path.join(`engine_field_values.gbsres`);
  // // await rmdir(projectFolder);
  // const scenesFolder = Path.join("scenes");
  // const backgroundsFolder = Path.join("backgrounds");
  // const spritesFolder = Path.join("sprites");
  // const palettesFolder = Path.join("palettes");
  // const scriptsFolder = Path.join("scripts");
  // const musicFolder = Path.join("music");
  // const soundsFolder = Path.join("sounds");
  // const emotesFolder = Path.join("emotes");
  // const avatarsFolder = Path.join("avatars");
  // const tilesetsFolder = Path.join("tilesets");
  // const fontsFolder = Path.join("fonts");

  // const existingPath = Path.join(projectPartsFolder, "**/*.gbsres");
  // const existingResourcePaths = new Set(
  //   (await globAsync(Path.join(projectPartsFolder, "**/*.gbsres"))).map(
  //     (path) => Path.relative(projectPartsFolder, path)
  //   )
  // );
  // const newResourcePaths: Set<string> = new Set();

  // let forceWrite = true;
  // if (await pathExists(projectPartsFolder)) {
  //   await copy(projectPartsFolder, projectPartsBckFolder);
  //   await copy(projectPartsFolder, projectPartsTmpFolder);
  //   forceWrite = false;
  // }

  // const writeResource = async <T extends Record<string, unknown>>(
  //   filename: string,
  //   resourceType: string,
  //   resource: T
  // ) => {
  //   newResourcePaths.add(filename);
  //   if (
  //     forceWrite ||
  //     resource.__dirty ||
  //     !existingResourcePaths.has(filename)
  //   ) {
  //     const filePath = Path.join(projectPartsTmpFolder, filename);
  //     await ensureDir(Path.dirname(filePath));
  //     console.log(
  //       "TRYING TO WRITE",
  //       resourceType,
  //       resource.id,
  //       resource,
  //       "TO",
  //       filePath
  //     );
  //     // await writeFileAndFlushAsync(
  //     //   filePath,
  //     //   encodeResource(resourceType, resource)
  //     // );
  //   }
  // };

  // let sceneIndex = 0;
  // for (const scene of project.scenes) {
  //   const sceneFolder = Path.join(
  //     scenesFolder,
  //     `${entityToFilePath(scene, sceneName(scene, sceneIndex))}`
  //   );
  //   const actorsFolder = Path.join(sceneFolder, "actors");
  //   const triggersFolder = Path.join(sceneFolder, "triggers");
  //   const sceneFilename = Path.join(sceneFolder, `scene.gbsres`);

  //   if (scene.actors.length > 0) {
  //     let actorIndex = 0;
  //     for (const actor of scene.actors) {
  //       const actorFilename = Path.join(
  //         actorsFolder,
  //         `${entityToFilePath(actor, actorName(actor, actorIndex))}.gbsres`
  //       );
  //       await writeResource(actorFilename, "actor", actor);
  //       actorIndex++;
  //     }
  //   }

  //   if (scene.triggers.length > 0) {
  //     let triggerIndex = 0;
  //     for (const trigger of scene.triggers) {
  //       const triggerFilename = Path.join(
  //         triggersFolder,
  //         `${entityToFilePath(
  //           trigger,
  //           triggerName(trigger, triggerIndex)
  //         )}.gbsres`
  //       );
  //       await writeResource(triggerFilename, "trigger", trigger);
  //       triggerIndex++;
  //     }
  //   }

  //   await writeResource(sceneFilename, "scene", {
  //     ...scene,
  //     // actors: scene.actors.map((e) => e.id),
  //     // triggers: scene.triggers.map((e) => e.id),
  //     actors: undefined,
  //     triggers: undefined,
  //     collisions: stringify8bitArray(scene.collisions, scene.width),
  //     // tileColors: stringify8bitArray(scene.tileColors, scene.width)
  //     tileColors: undefined,
  //   });
  //   sceneIndex++;
  // }

  // let backgroundIndex = 0;
  // for (const background of project.backgrounds) {
  //   const backgroundFilename = Path.join(
  //     backgroundsFolder,
  //     `${entityToFilePath(background)}.gbsres`
  //   );
  //   await writeResource(backgroundFilename, "background", {
  //     ...background,
  //     tileColors: stringify8bitArray(background.tileColors, background.width),
  //   });
  //   backgroundIndex++;
  // }

  // let spriteIndex = 0;
  // for (const sprite of project.spriteSheets) {
  //   const spriteFilename = Path.join(
  //     spritesFolder,
  //     `${entityToFilePath(sprite)}.gbsres`
  //   );
  //   await writeResource(spriteFilename, "sprite", {
  //     ...sprite,
  //   });
  //   spriteIndex++;
  // }

  // let paletteIndex = 0;
  // for (const palette of project.palettes) {
  //   const paletteFilename = Path.join(
  //     palettesFolder,
  //     `${entityToFilePath(palette, paletteName(palette, paletteIndex))}.gbsres`
  //   );
  //   await writeResource(paletteFilename, "palette", {
  //     ...palette,
  //   });

  //   paletteIndex++;
  // }

  // let scriptIndex = 0;
  // for (const script of project.customEvents) {
  //   const scriptFilename = Path.join(
  //     scriptsFolder,
  //     `${entityToFilePath(script, customEventName(script, scriptIndex))}.gbsres`
  //   );
  //   await writeResource(scriptFilename, "script", {
  //     ...script,
  //   });

  //   scriptIndex++;
  // }

  // let songIndex = 0;
  // for (const song of project.music) {
  //   const songFilename = Path.join(
  //     musicFolder,
  //     `${entityToFilePath(song)}.gbsres`
  //   );
  //   await writeResource(songFilename, "music", {
  //     ...song,
  //   });

  //   songIndex++;
  // }

  // let soundIndex = 0;
  // for (const sound of project.sounds) {
  //   const soundFilename = Path.join(
  //     soundsFolder,
  //     `${entityToFilePath(sound)}.gbsres`
  //   );
  //   await writeResource(soundFilename, "sound", {
  //     ...sound,
  //   });

  //   soundIndex++;
  // }

  // let emoteIndex = 0;
  // for (const emote of project.emotes) {
  //   const emoteFilename = Path.join(
  //     emotesFolder,
  //     `${entityToFilePath(emote)}.gbsres`
  //   );
  //   await writeResource(emoteFilename, "emote", {
  //     ...emote,
  //   });
  //   emoteIndex++;
  // }

  // let avatarIndex = 0;
  // for (const avatar of project.avatars) {
  //   const avatarFilename = Path.join(
  //     avatarsFolder,
  //     `${entityToFilePath(avatar)}.gbsres`
  //   );
  //   await writeResource(avatarFilename, "avatar", {
  //     ...avatar,
  //   });

  //   avatarIndex++;
  // }

  // let tilesetIndex = 0;
  // for (const tileset of project.tilesets) {
  //   const tilesetFilename = Path.join(
  //     tilesetsFolder,
  //     `${entityToFilePath(tileset)}.gbsres`
  //   );
  //   await writeResource(tilesetFilename, "tileset", {
  //     ...tileset,
  //   });

  //   tilesetIndex++;
  // }

  // let fontIndex = 0;
  // for (const font of project.fonts) {
  //   const fontFilename = Path.join(
  //     fontsFolder,
  //     `${entityToFilePath(font)}.gbsres`
  //   );
  //   await writeResource(fontFilename, "font", {
  //     ...font,
  //   });

  //   fontIndex++;
  // }

  // await writeResource(settingsResFilename, "settings", {
  //   ...project.settings,
  //   worldScrollX: undefined,
  //   worldScrollY: undefined,
  //   zoom: undefined,
  // });

  // await writeResource(userSettingsResFilename, "settings", {
  //   worldScrollX: project.settings.worldScrollX,
  //   worldScrollY: project.settings.worldScrollY,
  //   zoom: project.settings.zoom,
  // });

  // await writeResource(variablesResFilename, "variables", {
  //   ...project.variables,
  // });

  // await writeResource(engineFieldValuesResFilename, "engineFieldValues", {
  //   ...project.engineFieldValues,
  // });

  // await writeFileWithBackupAsync(
  //   projectResFilename,
  //   encodeResource("project", {
  //     ...project,
  //     scenes: undefined,
  //     backgrounds: undefined,
  //     spriteSheets: undefined,
  //     palettes: undefined,
  //     customEvents: undefined,
  //     music: undefined,
  //     sounds: undefined,
  //     emotes: undefined,
  //     avatars: undefined,
  //     fonts: undefined,
  //     tilesets: undefined,
  //     variables: undefined,
  //     engineFieldValues: undefined,
  //     settings: undefined,
  //   })
  // );

  // const resourceDiff = Array.from(existingResourcePaths).filter(
  //   (path) => !newResourcePaths.has(path)
  // );

  // // Remove previous project files that are no longer needed
  // for (const path of resourceDiff) {
  //   const removePath = Path.join(projectPartsTmpFolder, path);
  //   await remove(removePath);
  // }

  // await move(projectPartsTmpFolder, projectPartsFolder, { overwrite: true });

  // // Keep original save for now too
  // await writeFileWithBackupAsync(projectPath, JSON.stringify(project, null, 4));
};

export default saveProjectData;
