import { ensureDir } from "fs-extra";
import { writeFileWithBackupAsync } from "lib/helpers/fs/writeFileWithBackup";
import Path from "path";
import { stripInvalidPathCharacters } from "shared/lib/helpers/stripInvalidFilenameCharacters";
import type { ProjectData } from "store/features/project/projectActions";

// @TODO
// Need to write (only the scenes marked dirty or missing)
// And only delete ones that weren't found in project?

const stringify8bitArray = (arr: number[], _width: number): string => {
  return stringify8bitArrayCompressed(arr, Infinity);
  // return chunk(arr, width)
  //   .map((row) => row.map((v) => v.toString(16).padStart(2, "0")).join(""))
  //   .join("\n");
};

const encodeResource = <T>(data: T): string => {
  return JSON.stringify(data, null, 4);
  // return YAML.stringify(data, { blockQuote: "literal" });
};

const stringify8bitArrayCompressed = (arr: number[], width: number): string => {
  let lastValue = -1;
  let output = "";
  let count = 0;

  for (let i = 0; i < arr.length; i++) {
    if (i % width === 0) {
      if (count === 1) {
        output += "!";
        output += "\n";
      } else if (count > 0) {
        output += `${count.toString(16)}+`;
        output += "\n";
      }
      lastValue = -1;
      count = 0;
    }
    if (arr[i] !== lastValue) {
      if (count === 1) {
        output += "!";
      } else if (count > 0) {
        output += `${count.toString(16)}+`;
      }
      count = 0;
      lastValue = arr[i];
      output += lastValue.toString(16).padStart(2, "0");
    }
    count++;
  }
  if (count === 1) {
    output += "!";
  } else if (count > 0) {
    output += `${count.toString(16)}+`;
  }

  return output;
};

const saveProjectData = async (projectPath: string, project: ProjectData) => {
  const projectFolder = Path.dirname(projectPath);
  const projectPartsFolder = Path.join(projectFolder, "project");
  const projectResFilename = Path.join(projectFolder, `project.gbsres`);

  // await rmdir(projectFolder);
  const scenesFolder = Path.join(projectPartsFolder, "scenes");
  const backgroundsFolder = Path.join(projectPartsFolder, "backgrounds");
  const spritesFolder = Path.join(projectPartsFolder, "sprites");
  const palettesFolder = Path.join(projectPartsFolder, "palettes");
  const scriptsFolder = Path.join(projectPartsFolder, "scripts");
  const musicFolder = Path.join(projectPartsFolder, "music");
  const soundsFolder = Path.join(projectPartsFolder, "sounds");
  const emotesFolder = Path.join(projectPartsFolder, "emotes");
  const avatarsFolder = Path.join(projectPartsFolder, "avatars");
  const tilesetsFolder = Path.join(projectPartsFolder, "tilesets");
  const fontsFolder = Path.join(projectPartsFolder, "fonts");

  await ensureDir(scenesFolder);
  await ensureDir(backgroundsFolder);
  await ensureDir(spritesFolder);
  await ensureDir(palettesFolder);
  await ensureDir(scriptsFolder);
  await ensureDir(musicFolder);
  await ensureDir(soundsFolder);
  await ensureDir(emotesFolder);
  await ensureDir(avatarsFolder);
  await ensureDir(tilesetsFolder);
  await ensureDir(fontsFolder);

  let sceneIndex = 0;
  for (const scene of project.scenes) {
    const sceneFolder = Path.join(
      scenesFolder,
      `${stripInvalidPathCharacters(scene.name)}-${sceneIndex}`
    );
    const actorsFolder = Path.join(sceneFolder, "actors");
    const triggersFolder = Path.join(sceneFolder, "triggers");

    await ensureDir(sceneFolder);

    const sceneFilename = Path.join(sceneFolder, `scene.gbsres`);
    await ensureDir(Path.dirname(sceneFilename));

    if (scene.actors.length > 0) {
      let actorIndex = 0;
      await ensureDir(actorsFolder);
      for (const actor of scene.actors) {
        const actorFilename = Path.join(
          actorsFolder,
          `${actor.name}-${actorIndex}.gbsres`
        );
        await ensureDir(Path.dirname(actorFilename));
        await writeFileWithBackupAsync(
          actorFilename,
          encodeResource({ _resourceType: "actor", ...actor })
        );
        actorIndex++;
      }
    }

    if (scene.triggers.length > 0) {
      let triggerIndex = 0;
      await ensureDir(triggersFolder);
      for (const trigger of scene.triggers) {
        const triggerFilename = Path.join(
          triggersFolder,
          `${trigger.name}-${triggerIndex}.gbsres`
        );
        await ensureDir(Path.dirname(triggerFilename));
        await writeFileWithBackupAsync(
          triggerFilename,
          encodeResource({ _resourceType: "trigger", trigger })
        );
        triggerIndex++;
      }
    }

    await writeFileWithBackupAsync(
      sceneFilename,
      encodeResource({
        _resourceType: "scene",
        ...scene,
        actors: scene.actors.map((e) => e.id),
        triggers: scene.triggers.map((e) => e.id),
        collisions: stringify8bitArray(scene.collisions, scene.width),
        // tileColors: stringify8bitArray(scene.tileColors, scene.width)
        tileColors: undefined,
      })
    );
    sceneIndex++;
  }

  let backgroundIndex = 0;
  for (const background of project.backgrounds) {
    const backgroundFilename = Path.join(
      backgroundsFolder,
      `${stripInvalidPathCharacters(background.name)}-${backgroundIndex}.gbsres`
    );
    await ensureDir(Path.dirname(backgroundFilename));
    await writeFileWithBackupAsync(
      backgroundFilename,
      encodeResource({
        _resourceType: "background",
        ...background,
        tileColors: stringify8bitArray(background.tileColors, background.width),
      })
    );
    backgroundIndex++;
  }

  let spriteIndex = 0;
  for (const sprite of project.spriteSheets) {
    const spriteFilename = Path.join(
      spritesFolder,
      `${stripInvalidPathCharacters(sprite.name)}-${spriteIndex}.gbsres`
    );
    await ensureDir(Path.dirname(spriteFilename));
    await writeFileWithBackupAsync(
      spriteFilename,
      encodeResource({
        _resourceType: "sprite",
        ...sprite,
      })
    );
    spriteIndex++;
  }

  let paletteIndex = 0;
  for (const palette of project.palettes) {
    const paletteFilename = Path.join(
      palettesFolder,
      `${stripInvalidPathCharacters(palette.name)}-${paletteIndex}.gbsres`
    );
    await ensureDir(Path.dirname(paletteFilename));
    await writeFileWithBackupAsync(
      paletteFilename,
      encodeResource({
        _resourceType: "palette",
        ...palette,
      })
    );
    paletteIndex++;
  }

  let scriptIndex = 0;
  for (const script of project.customEvents) {
    const scriptFilename = Path.join(
      scriptsFolder,
      `${stripInvalidPathCharacters(script.name)}-${scriptIndex}.gbsres`
    );
    await ensureDir(Path.dirname(scriptFilename));
    await writeFileWithBackupAsync(
      scriptFilename,
      encodeResource({
        _resourceType: "script",
        ...script,
      })
    );
    scriptIndex++;
  }

  let songIndex = 0;
  for (const song of project.music) {
    const songFilename = Path.join(
      musicFolder,
      `${stripInvalidPathCharacters(song.name)}-${songIndex}.gbsres`
    );
    await ensureDir(Path.dirname(songFilename));
    await writeFileWithBackupAsync(
      songFilename,
      encodeResource({
        _resourceType: "music",
        ...song,
      })
    );
    songIndex++;
  }

  let soundIndex = 0;
  for (const sound of project.sounds) {
    const soundFilename = Path.join(
      soundsFolder,
      `${stripInvalidPathCharacters(sound.name)}-${soundIndex}.gbsres`
    );
    await ensureDir(Path.dirname(soundFilename));
    await writeFileWithBackupAsync(
      soundFilename,
      encodeResource({
        _resourceType: "sound",
        ...sound,
      })
    );
    soundIndex++;
  }

  let emoteIndex = 0;
  for (const emote of project.emotes) {
    const emoteFilename = Path.join(
      emotesFolder,
      `${stripInvalidPathCharacters(emote.name)}-${emoteIndex}.gbsres`
    );
    await ensureDir(Path.dirname(emoteFilename));
    await writeFileWithBackupAsync(
      emoteFilename,
      encodeResource({
        _resourceType: "emote",
        ...emote,
      })
    );
    emoteIndex++;
  }

  let avatarIndex = 0;
  for (const avatar of project.avatars) {
    const avatarFilename = Path.join(
      avatarsFolder,
      `${stripInvalidPathCharacters(avatar.name)}-${avatarIndex}.gbsres`
    );
    await ensureDir(Path.dirname(avatarFilename));
    await writeFileWithBackupAsync(
      avatarFilename,
      encodeResource({
        _resourceType: "avatar",
        ...avatar,
      })
    );
    avatarIndex++;
  }

  let tilesetIndex = 0;
  for (const tileset of project.tilesets) {
    const tilesetFilename = Path.join(
      tilesetsFolder,
      `${stripInvalidPathCharacters(tileset.name)}-${tilesetIndex}.gbsres`
    );
    await ensureDir(Path.dirname(tilesetFilename));
    await writeFileWithBackupAsync(
      tilesetFilename,
      encodeResource({
        _resourceType: "tileset",
        ...tileset,
      })
    );
    tilesetIndex++;
  }

  let fontIndex = 0;
  for (const font of project.fonts) {
    const fontFilename = Path.join(
      fontsFolder,
      `${stripInvalidPathCharacters(font.name)}-${fontIndex}.gbsres`
    );
    await ensureDir(Path.dirname(fontFilename));
    await writeFileWithBackupAsync(
      fontFilename,
      encodeResource({
        _resourceType: "font",
        ...font,
      })
    );
    fontIndex++;
  }

  await writeFileWithBackupAsync(projectPath, JSON.stringify(project, null, 4));

  await writeFileWithBackupAsync(
    projectResFilename,
    encodeResource({
      _resourceType: "project",
      ...project,
      scenes: project.scenes.map((e) => e.id),
      backgrounds: project.backgrounds.map((e) => e.id),
      spriteSheets: project.spriteSheets.map((e) => e.id),
      palettes: project.palettes.map((e) => e.id),
      customEvents: project.customEvents.map((e) => e.id),
      music: project.music.map((e) => e.id),
      sounds: project.sounds.map((e) => e.id),
      emotes: project.emotes.map((e) => e.id),
      avatars: project.avatars.map((e) => e.id),
      fonts: project.fonts.map((e) => e.id),
      tilesets: project.tilesets.map((e) => e.id),
    })
  );
};

export default saveProjectData;
