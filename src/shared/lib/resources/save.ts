/* eslint-disable @typescript-eslint/no-unused-vars */
import Path from "path";
import {
  CompressedProjectResources,
  WriteFile,
} from "shared/lib/resources/types";
import {
  getActorResourcePath,
  getPaletteResourcePath,
  getResourceAssetPath,
  getSceneFolderPath,
  getSceneResourcePath,
  getScriptResourcePath,
  getTriggerResourcePath,
} from "shared/lib/resources/paths";
import SparkMD5 from "spark-md5";

export const encodeResource = <T extends Record<string, unknown>>(
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

export const buildResourceExportBuffer = (
  projectResources: CompressedProjectResources
): WriteFile[] => {
  console.time("SAVING PROJECT");
  console.log("SAVE PROJECT DATA");

  const projectPartsFolder = "project";
  const variablesResFilename = Path.join(`variables.gbsres`);
  const settingsResFilename = Path.join(`settings.gbsres`);
  const userSettingsResFilename = Path.join(`user_settings.gbsres`);
  const engineFieldValuesResFilename = Path.join(`engine_field_values.gbsres`);

  const writeBuffer: WriteFile[] = [];

  const writeResource = <T extends Record<string, unknown>>(
    filename: string,
    resourceType: string,
    resource: T
  ) => {
    const filePath = Path.join(projectPartsFolder, filename);
    const data = encodeResource(resourceType, resource);
    writeBuffer.push({
      path: filePath,
      checksum: SparkMD5.hash(data),
      data,
    });
  };

  console.time("SAVING PROJECT : build scene resources");
  let sceneIndex = 0;
  for (const scene of projectResources.scenes) {
    const sceneFolder = getSceneFolderPath(scene, sceneIndex);
    const sceneFilename = getSceneResourcePath(scene, sceneIndex);
    // Scene Actors
    if (scene.actors.length > 0) {
      let actorIndex = 0;
      for (const actor of scene.actors) {
        if (actor) {
          const actorFilename = getActorResourcePath(
            sceneFolder,
            actor,
            actorIndex
          );
          writeResource(actorFilename, "actor", {
            ...actor,
            _index: actorIndex,
          });
          actorIndex++;
        }
      }
    }
    // Scene Triggers
    if (scene.triggers.length > 0) {
      let triggerIndex = 0;
      for (const trigger of scene.triggers) {
        if (trigger) {
          const triggerFilename = getTriggerResourcePath(
            sceneFolder,
            trigger,
            triggerIndex
          );
          writeResource(triggerFilename, "trigger", {
            ...trigger,
            _index: triggerIndex,
          });
          triggerIndex++;
        }
      }
    }

    writeResource(sceneFilename, "scene", {
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
    const backgroundFilename = getResourceAssetPath(background);
    writeResource(backgroundFilename, "background", background);
    backgroundIndex++;
  }
  console.timeEnd("SAVING PROJECT : build background resources");

  let spriteIndex = 0;
  for (const sprite of projectResources.sprites) {
    const spriteFilename = getResourceAssetPath(sprite);
    writeResource(spriteFilename, "sprite", sprite);
    spriteIndex++;
  }

  let paletteIndex = 0;
  for (const palette of projectResources.palettes) {
    const paletteFilename = getPaletteResourcePath(palette, paletteIndex);
    writeResource(paletteFilename, "palette", palette);
    paletteIndex++;
  }

  let scriptIndex = 0;
  for (const script of projectResources.scripts) {
    const scriptFilename = getScriptResourcePath(script, scriptIndex);
    writeResource(scriptFilename, "script", script);
    scriptIndex++;
  }

  let songIndex = 0;
  for (const song of projectResources.music) {
    const songFilename = getResourceAssetPath(song);
    writeResource(songFilename, "music", song);
    songIndex++;
  }

  let soundIndex = 0;
  for (const sound of projectResources.sounds) {
    const soundFilename = getResourceAssetPath(sound);
    writeResource(soundFilename, "sound", sound);
    soundIndex++;
  }

  let emoteIndex = 0;
  for (const emote of projectResources.emotes) {
    const emoteFilename = getResourceAssetPath(emote);
    writeResource(emoteFilename, "emote", emote);
    emoteIndex++;
  }

  let avatarIndex = 0;
  for (const avatar of projectResources.avatars) {
    const avatarFilename = getResourceAssetPath(avatar);
    writeResource(avatarFilename, "avatar", avatar);
    avatarIndex++;
  }

  let tilesetIndex = 0;
  for (const tileset of projectResources.tilesets) {
    const tilesetFilename = getResourceAssetPath(tileset);
    writeResource(tilesetFilename, "tileset", tileset);
    tilesetIndex++;
  }

  let fontIndex = 0;
  for (const font of projectResources.fonts) {
    const fontFilename = getResourceAssetPath(font);
    writeResource(fontFilename, "font", font);
    fontIndex++;
  }

  writeResource(settingsResFilename, "settings", {
    ...projectResources.settings,
    worldScrollX: undefined,
    worldScrollY: undefined,
    zoom: undefined,
  });

  writeResource(userSettingsResFilename, "settings", {
    worldScrollX: projectResources.settings.worldScrollX,
    worldScrollY: projectResources.settings.worldScrollY,
    zoom: projectResources.settings.zoom,
  });

  writeResource(variablesResFilename, "variables", projectResources.variables);

  writeResource(
    engineFieldValuesResFilename,
    "engineFieldValues",
    projectResources.engineFieldValues
  );

  console.timeEnd("SAVING PROJECT");

  return writeBuffer;
};
