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
import {
  CompressedProjectResources,
  CompressedProjectResourcesPatch,
} from "shared/lib/resources/types";
import keyBy from "lodash/keyBy";
import promiseLimit from "lib/helpers/promiseLimit";

const CONCURRENT_RESOURCE_SAVE_COUNT = 8;

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

const actorToFileName = (actor: Entity, actorIndex: number): string => {
  const name = actorName(actor, actorIndex);
  return `${stripInvalidPathCharacters(name)
    .toLocaleLowerCase()
    .replace(/[/\\]/g, "_")
    .replace(/\s+/g, "_")}__${actor.id}`;
};

const triggerToFileName = (trigger: Entity, triggerIndex: number): string => {
  const name = triggerName(trigger, triggerIndex);
  return `${stripInvalidPathCharacters(name)
    .toLocaleLowerCase()
    .replace(/[/\\]/g, "_")
    .replace(/\s+/g, "_")}__${trigger.id}`;
};

const saveProjectData = async (
  projectPath: string,
  patch: CompressedProjectResourcesPatch
) => {
  console.time("SAVING PROJECT");
  console.log("SAVE PROJECT DATA" + projectPath);

  const projectResources = patch.data;

  // throw new Error("SAVING BLOCKED FOR NOW");
  const projectFolder = Path.dirname(projectPath);
  const projectPartsFolder = Path.join(projectFolder, "project");
  const projectPartsBckFolder = Path.join(projectFolder, "project.bak");
  const projectResFilename = Path.join(projectFolder, `project.gbsres`);
  const variablesResFilename = Path.join(`variables.gbsres`);
  const settingsResFilename = Path.join(`settings.gbsres`);
  const userSettingsResFilename = Path.join(`user_settings.gbsres`);
  const engineFieldValuesResFilename = Path.join(`engine_field_values.gbsres`);

  const scenesFolder = Path.join("scenes");
  const backgroundsFolder = Path.join("backgrounds");
  const spritesFolder = Path.join("sprites");
  const palettesFolder = Path.join("palettes");
  const scriptsFolder = Path.join("scripts");
  const musicFolder = Path.join("music");
  const soundsFolder = Path.join("sounds");
  const emotesFolder = Path.join("emotes");
  const avatarsFolder = Path.join("avatars");
  const tilesetsFolder = Path.join("tilesets");
  const fontsFolder = Path.join("fonts");

  console.time("SAVING PROJECT : existingResourcePaths");

  const existingPath = Path.join(projectPartsFolder, "**/*.gbsres");
  const existingResourcePaths = new Set(
    (await globAsync(Path.join(projectPartsFolder, "**/*.gbsres"))).map(
      (path) => Path.relative(projectPartsFolder, path)
    )
  );
  const newResourcePaths: Set<string> = new Set();
  console.timeEnd("SAVING PROJECT : existingResourcePaths");

  let forceWrite = true;
  if (await pathExists(projectPartsFolder)) {
    // await copy(projectPartsFolder, projectPartsBckFolder);
    forceWrite = false;
  }

  const writeBuffer: { path: string; data: string }[] = [];

  const writeResource = async <T extends Record<string, unknown>>(
    filename: string,
    resourceType: string,
    resource: T
  ) => {
    newResourcePaths.add(filename);

    // const { foundDirty, cleanedObject } = deepCleanAndCheckDirty(resource);

    // if (forceWrite || foundDirty || !existingResourcePaths.has(filename)) {
    const filePath = Path.join(projectPartsFolder, filename);
    await ensureDir(Path.dirname(filePath));
    writeBuffer.push({
      path: filePath,
      data: encodeResource(resourceType, resource),
    });
    // }
  };

  console.time("SAVING PROJECT : build scene resources");
  let sceneIndex = 0;
  for (const scene of projectResources.scenes) {
    const sceneFolder = Path.join(
      scenesFolder,
      `${entityToFilePath(scene, sceneName(scene, sceneIndex))}`
    );
    const actorsFolder = Path.join(sceneFolder, "actors");
    const triggersFolder = Path.join(sceneFolder, "triggers");
    const sceneFilename = Path.join(sceneFolder, `scene.gbsres`);

    if (scene.actors.length > 0) {
      let actorIndex = 0;
      for (const actor of scene.actors) {
        if (actor) {
          const actorFilename = Path.join(
            actorsFolder,
            `${actorToFileName(actor, actorIndex)}.gbsres`
          );
          await writeResource(actorFilename, "actor", {
            ...actor,
            _index: actorIndex,
          });
          actorIndex++;
        }
      }
    }

    if (scene.triggers.length > 0) {
      let triggerIndex = 0;
      for (const trigger of scene.triggers) {
        if (trigger) {
          const triggerFilename = Path.join(
            triggersFolder,
            `${triggerToFileName(trigger, triggerIndex)}.gbsres`
          );
          await writeResource(triggerFilename, "trigger", {
            ...trigger,
            _index: triggerIndex,
          });
          triggerIndex++;
        }
      }
    }

    await writeResource(sceneFilename, "scene", {
      ...scene,
      actors: undefined,
      triggers: undefined,
      tileColors: undefined,
    });
    sceneIndex++;
  }
  console.timeEnd("SAVING PROJECT : build scene resources");

  console.time("SAVING PROJECT : build background resources");

  let backgroundIndex = 0;
  for (const background of projectResources.backgrounds) {
    const backgroundFilename = Path.join(
      backgroundsFolder,
      `${entityToFilePath(background)}.gbsres`
    );
    await writeResource(backgroundFilename, "background", background);
    backgroundIndex++;
  }
  console.timeEnd("SAVING PROJECT : build background resources");

  let spriteIndex = 0;
  for (const sprite of projectResources.sprites) {
    const spriteFilename = Path.join(
      spritesFolder,
      `${entityToFilePath(sprite)}.gbsres`
    );
    await writeResource(spriteFilename, "sprite", sprite);
    spriteIndex++;
  }

  let paletteIndex = 0;
  for (const palette of projectResources.palettes) {
    const paletteFilename = Path.join(
      palettesFolder,
      `${entityToFilePath(palette, paletteName(palette, paletteIndex))}.gbsres`
    );
    await writeResource(paletteFilename, "palette", palette);
    paletteIndex++;
  }

  let scriptIndex = 0;
  for (const script of projectResources.scripts) {
    const scriptFilename = Path.join(
      scriptsFolder,
      `${entityToFilePath(script, customEventName(script, scriptIndex))}.gbsres`
    );
    await writeResource(scriptFilename, "script", script);
    scriptIndex++;
  }

  let songIndex = 0;
  for (const song of projectResources.music) {
    const songFilename = Path.join(
      musicFolder,
      `${entityToFilePath(song)}.gbsres`
    );
    await writeResource(songFilename, "music", song);
    songIndex++;
  }

  let soundIndex = 0;
  for (const sound of projectResources.sounds) {
    const soundFilename = Path.join(
      soundsFolder,
      `${entityToFilePath(sound)}.gbsres`
    );
    await writeResource(soundFilename, "sound", sound);
    soundIndex++;
  }

  let emoteIndex = 0;
  for (const emote of projectResources.emotes) {
    const emoteFilename = Path.join(
      emotesFolder,
      `${entityToFilePath(emote)}.gbsres`
    );
    await writeResource(emoteFilename, "emote", emote);
    emoteIndex++;
  }

  let avatarIndex = 0;
  for (const avatar of projectResources.avatars) {
    const avatarFilename = Path.join(
      avatarsFolder,
      `${entityToFilePath(avatar)}.gbsres`
    );
    await writeResource(avatarFilename, "avatar", avatar);
    avatarIndex++;
  }

  let tilesetIndex = 0;
  for (const tileset of projectResources.tilesets) {
    const tilesetFilename = Path.join(
      tilesetsFolder,
      `${entityToFilePath(tileset)}.gbsres`
    );
    await writeResource(tilesetFilename, "tileset", tileset);
    tilesetIndex++;
  }

  let fontIndex = 0;
  for (const font of projectResources.fonts) {
    const fontFilename = Path.join(
      fontsFolder,
      `${entityToFilePath(font)}.gbsres`
    );
    await writeResource(fontFilename, "font", font);
    fontIndex++;
  }

  await writeResource(settingsResFilename, "settings", {
    ...projectResources.settings,
    worldScrollX: undefined,
    worldScrollY: undefined,
    zoom: undefined,
  });

  await writeResource(userSettingsResFilename, "settings", {
    worldScrollX: projectResources.settings.worldScrollX,
    worldScrollY: projectResources.settings.worldScrollY,
    zoom: projectResources.settings.zoom,
  });

  await writeResource(
    variablesResFilename,
    "variables",
    projectResources.variables
  );

  await writeResource(
    engineFieldValuesResFilename,
    "engineFieldValues",
    projectResources.engineFieldValues
  );

  console.log("WRITE BUFFER SIZE=" + writeBuffer.length);
  console.time("Flush Write Buffer");
  await promiseLimit(
    CONCURRENT_RESOURCE_SAVE_COUNT,
    writeBuffer.map(({ path, data }) => async () => {
      await writeFileAndFlushAsync(path, data);
    })
  );
  console.timeEnd("Flush Write Buffer");

  await writeFileWithBackupAsync(
    projectPath,
    encodeResource("project", projectResources.metadata)
  );

  const resourceDiff = Array.from(existingResourcePaths).filter(
    (path) => !newResourcePaths.has(path)
  );

  // Remove previous project files that are no longer needed
  for (const path of resourceDiff) {
    const removePath = Path.join(projectPartsFolder, path);
    console.log("WANTING TO REMOVE...", removePath);
    // await remove(removePath);
  }

  // await move(projectPartsTmpFolder, projectPartsFolder, { overwrite: true });

  // // Keep original save for now too
  // await writeFileWithBackupAsync(projectPath, JSON.stringify(project, null, 4));
  console.timeEnd("SAVING PROJECT");
};

export default saveProjectData;
