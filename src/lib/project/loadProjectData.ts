import fs from "fs-extra";
import path from "path";
import uuid from "uuid/v4";
import glob from "glob";
import { promisify } from "util";
import loadAllBackgroundData, {
  BackgroundAssetData,
} from "./loadBackgroundData";
import loadAllSpriteData, { SpriteAssetData } from "./loadSpriteData";
import loadAllMusicData, { MusicAssetData } from "./loadMusicData";
import loadAllFontData from "./loadFontData";
import loadAllAvatarData from "./loadAvatarData";
import loadAllEmoteData from "./loadEmoteData";
import loadAllSoundData from "./loadSoundData";
import loadAllScriptEventHandlers, {
  ScriptEventDef,
} from "./loadScriptEventHandlers";
import migrateProject from "./migrateProject";
import type { ProjectData } from "store/features/project/projectActions";
import type {
  EngineFieldSchema,
  SceneTypeSchema,
} from "store/features/engine/engineState";
import type { Asset } from "shared/lib/helpers/assets";
import keyBy from "lodash/keyBy";
import groupBy from "lodash/groupBy";
import { cloneDictionary } from "lib/helpers/clone";
import { Dictionary } from "@reduxjs/toolkit";
import { loadEngineFields } from "lib/project/engineFields";
import { loadSceneTypes } from "lib/project/sceneTypes";
import loadAllTilesetData from "lib/project/loadTilesetData";
import promiseLimit from "lib/helpers/promiseLimit";
import {
  CompressedBackgroundResource,
  CompressedProjectResources,
  EngineFieldValuesResource,
  MusicResource,
  PaletteResource,
  SettingsResource,
  SpriteResource,
  VariablesResource,
} from "shared/lib/resources/types";
import { defaultProjectSettings } from "consts";

export interface LoadProjectResult {
  data: ProjectData;
  resources: CompressedProjectResources;
  scriptEventDefs: Dictionary<ScriptEventDef>;
  engineFields: EngineFieldSchema[];
  sceneTypes: SceneTypeSchema[];
  modifiedSpriteIds: string[];
  isMigrated: boolean;
}

const globAsync = promisify(glob);

const toUnixFilename = (filename: string) => {
  return filename.replace(/\\/g, "/");
};

const toAssetFilename = (elem: Asset) => {
  return (elem.plugin ? `${elem.plugin}/` : "") + toUnixFilename(elem.filename);
};

const indexByFilename = <T extends Asset>(arr: T[]): Record<string, T> =>
  keyBy(arr || [], toAssetFilename);

const indexResourceByFilename = <T extends { data: Asset }>(
  arr: T[]
): Record<string, T> => keyBy(arr || [], ({ data }) => toAssetFilename(data));

const sortByName = (a: { name: string }, b: { name: string }) => {
  const aName = a.name.toUpperCase();
  const bName = b.name.toUpperCase();
  if (aName < bName) {
    return -1;
  }
  if (aName > bName) {
    return 1;
  }
  return 0;
};

const loadProject = async (projectPath: string): Promise<LoadProjectResult> => {
  const projectRoot = path.dirname(projectPath);

  console.time("loadProjectData.loadProject globResources");
  const projectResources = await globAsync(
    path.join(projectRoot, "project", "**/*.gbsres")
  );
  console.timeEnd("loadProjectData.loadProject globResources");

  // console.time("loadProjectData.loadProject readResources");
  // for (const projectResourcePath of projectResources) {
  //   const resourceJson = await fs.readJson(projectResourcePath);
  // }
  // console.timeEnd("loadProjectData.loadProject readResources");

  console.time("loadProjectData.loadProject readResources2");
  const resources = await promiseLimit(
    8,
    projectResources.map((projectResourcePath) => async () => {
      const resourceData = await fs.readJson(projectResourcePath);
      return {
        path: projectResourcePath,
        type: resourceData._resourceType,
        data: resourceData,
      };
    })
  );
  console.timeEnd("loadProjectData.loadProject readResources2");

  console.log("resources.length === ", resources.length);
  console.time("loadProjectData.loadProject build resourcesLookup");
  const resourcesLookup = groupBy(resources, "type");
  console.timeEnd("loadProjectData.loadProject build resourcesLookup");

  console.log(resourcesLookup);

  // console.log(resources);

  // console.log({ projectResources });

  console.time("loadProjectData.loadProject scriptEventDefs");
  const scriptEventDefs = await loadAllScriptEventHandlers(projectRoot);
  console.timeEnd("loadProjectData.loadProject scriptEventDefs");

  console.time("loadProjectData.loadProject engineFields");
  const engineFields = await loadEngineFields(projectRoot);
  console.timeEnd("loadProjectData.loadProject engineFields");

  console.time("loadProjectData.loadProject sceneTypes");
  const sceneTypes = await loadSceneTypes(projectRoot);
  console.timeEnd("loadProjectData.loadProject sceneTypes");

  console.time("loadProjectData.loadProject readJson");
  const originalJson = await fs.readJson(projectPath);
  console.timeEnd("loadProjectData.loadProject readJson");

  const { _version: originalVersion, _release: originalRelease } = originalJson;

  console.time("loadProjectData.loadProject migrateProject");
  const json = migrateProject(
    originalJson,
    projectRoot,
    scriptEventDefs
  ) as ProjectData;
  console.timeEnd("loadProjectData.loadProject migrateProject");

  const isMigrated =
    json._version !== originalVersion || json._release !== originalRelease;

  console.time("loadProjectData.loadProject loadAssets");
  const [
    backgrounds,
    sprites,
    music,
    sounds,
    fonts,
    avatars,
    emotes,
    tilesets,
  ] = await Promise.all([
    loadAllBackgroundData(projectRoot),
    loadAllSpriteData(projectRoot),
    loadAllMusicData(projectRoot),
    loadAllSoundData(projectRoot),
    loadAllFontData(projectRoot),
    loadAllAvatarData(projectRoot),
    loadAllEmoteData(projectRoot),
    loadAllTilesetData(projectRoot),
  ]);
  console.timeEnd("loadProjectData.loadProject loadAssets");

  console.time("loadProjectData.loadProject fixBackgrounds");

  // Merge stored backgrounds data with file system data
  const oldBackgroundByFilename = indexByFilename(json.backgrounds || []);

  const fixedBackgroundIds = backgrounds
    .map((background) => {
      const oldBackground =
        oldBackgroundByFilename[toAssetFilename(background)];
      if (oldBackground) {
        return {
          ...background,
          id: oldBackground.id,
          symbol:
            oldBackground?.symbol !== undefined
              ? oldBackground.symbol
              : background.symbol,
          tileColors:
            oldBackground?.tileColors !== undefined
              ? oldBackground.tileColors
              : [],
          autoColor:
            oldBackground?.autoColor !== undefined
              ? oldBackground.autoColor
              : false,
        };
      }
      return {
        ...background,
        tileColors: [],
      };
    })
    .sort(sortByName);
  console.timeEnd("loadProjectData.loadProject fixBackgrounds");

  console.time("loadProjectData.loadProject fixSprites");

  // Merge stored sprite data with file system data
  const oldSpriteByFilename = indexByFilename(json.spriteSheets || []);
  const modifiedSpriteIds: string[] = [];

  const fixedSpriteIds = sprites
    .map((sprite) => {
      const oldSprite = oldSpriteByFilename[toAssetFilename(sprite)];
      const oldData = oldSprite || {};
      const id = oldData.id || sprite.id;

      if (!oldSprite || !oldSprite.states || oldSprite.numTiles === undefined) {
        modifiedSpriteIds.push(id);
      }

      return {
        ...sprite,
        ...oldData,
        id,
        symbol: oldData?.symbol !== undefined ? oldData.symbol : sprite.symbol,
        filename: sprite.filename,
        name: oldData.name || sprite.name,
        canvasWidth: oldData.canvasWidth || 32,
        canvasHeight: oldData.canvasHeight || 32,
        states: (
          oldData.states || [
            {
              id: uuid(),
              name: "",
              animationType: "multi_movement",
              flipLeft: true,
            },
          ]
        ).map((oldState) => {
          return {
            ...oldState,
            animations: Array.from(Array(8)).map((_, animationIndex) => ({
              id:
                (oldState.animations &&
                  oldState.animations[animationIndex] &&
                  oldState.animations[animationIndex].id) ||
                uuid(),
              frames: (oldState.animations &&
                oldState.animations[animationIndex] &&
                oldState.animations[animationIndex].frames) || [
                {
                  id: uuid(),
                  tiles: [],
                },
              ],
            })),
          };
        }),
      };
    })
    .sort(sortByName);

  console.timeEnd("loadProjectData.loadProject fixSprites");

  console.time("loadProjectData.loadProject fixMusic");

  // Merge stored music data with file system data
  const oldMusicByFilename = indexByFilename(json.music || []);

  const fixedMusicIds = music
    .map((track) => {
      const oldTrack = oldMusicByFilename[toAssetFilename(track)];
      if (oldTrack) {
        return {
          ...track,
          id: oldTrack.id,
          symbol:
            oldTrack?.symbol !== undefined ? oldTrack.symbol : track.symbol,
          settings: {
            ...oldTrack.settings,
          },
        };
      }
      return track;
    })
    .sort(sortByName);

  console.timeEnd("loadProjectData.loadProject fixMusic");

  console.time("loadProjectData.loadProject fixSounds");

  // Merge stored sound effect data with file system data
  const oldSoundByFilename = indexByFilename(json.sounds || []);

  const fixedSoundIds = sounds
    .map((sound) => {
      const oldSound = oldSoundByFilename[toAssetFilename(sound)];
      if (oldSound) {
        return {
          ...sound,
          id: oldSound.id,
          symbol:
            oldSound?.symbol !== undefined ? oldSound.symbol : sound.symbol,
        };
      }
      return sound;
    })
    .sort(sortByName);

  console.timeEnd("loadProjectData.loadProject fixSounds");
  console.time("loadProjectData.loadProject fixFonts");

  // Merge stored fonts data with file system data
  const oldFontByFilename = indexByFilename(json.fonts || []);

  const fixedFontIds = fonts
    .map((font) => {
      const oldFont = oldFontByFilename[toAssetFilename(font)];
      if (oldFont) {
        return {
          ...font,
          id: oldFont.id,
          symbol: oldFont?.symbol !== undefined ? oldFont.symbol : font.symbol,
        };
      }
      return font;
    })
    .sort(sortByName);
  console.timeEnd("loadProjectData.loadProject fixFonts");

  console.time("loadProjectData.loadProject fixAvatars");

  // Merge stored avatars data with file system data
  const oldAvatarByFilename = indexByFilename(json.avatars || []);

  const fixedAvatarIds = avatars
    .map((avatar) => {
      const oldAvatar = oldAvatarByFilename[toAssetFilename(avatar)];
      if (oldAvatar) {
        return {
          ...avatar,
          id: oldAvatar.id,
        };
      }
      return avatar;
    })
    .sort(sortByName);
  console.timeEnd("loadProjectData.loadProject fixAvatars");

  console.time("loadProjectData.loadProject fixEmotes");

  // Merge stored emotes data with file system data
  const oldEmoteByFilename = indexByFilename(json.emotes || []);

  const fixedEmoteIds = emotes
    .map((emote) => {
      const oldEmote = oldEmoteByFilename[toAssetFilename(emote)];
      if (oldEmote) {
        return {
          ...emote,
          id: oldEmote.id,
          symbol:
            oldEmote?.symbol !== undefined ? oldEmote.symbol : emote.symbol,
        };
      }
      return emote;
    })
    .sort(sortByName);
  console.timeEnd("loadProjectData.loadProject fixEmotes");

  console.time("loadProjectData.loadProject fixTilesets");

  // Merge stored tilesets data with file system data
  const oldTilesetByFilename = indexByFilename(json.tilesets || []);

  const fixedTilesetIds = tilesets
    .map((tileset) => {
      const oldTileset = oldTilesetByFilename[toAssetFilename(tileset)];
      if (oldTileset) {
        return {
          ...tileset,
          id: oldTileset.id,
          symbol:
            oldTileset?.symbol !== undefined
              ? oldTileset.symbol
              : tileset.symbol,
        };
      }
      return tileset;
    })
    .sort(sortByName);
  console.timeEnd("loadProjectData.loadProject fixTilesets");

  const addMissingEntityId = <T extends { id: string }>(entity: T) => {
    if (!entity.id) {
      return {
        ...entity,
        id: uuid(),
      };
    }
    return entity;
  };

  console.time("loadProjectData.loadProject fixScenes");

  // Fix ids on actors and triggers
  const fixedScenes = (json.scenes || []).map((scene) => {
    return {
      ...scene,
      actors: scene.actors.map(addMissingEntityId),
      triggers: scene.triggers.map(addMissingEntityId),
    };
  });
  console.timeEnd("loadProjectData.loadProject fixScenes");

  console.time("loadProjectData.loadProject fixCustomEvents");

  const fixedCustomEvents = (json.customEvents || []).map(addMissingEntityId);
  console.timeEnd("loadProjectData.loadProject fixCustomEvents");

  console.time("loadProjectData.loadProject fixPalettes");

  const defaultPalettes = [
    {
      id: "default-bg-1",
      name: "Default BG 1",
      colors: ["F8E8C8", "D89048", "A82820", "301850"],
    },
    {
      id: "default-bg-2",
      name: "Default BG 2",
      colors: ["E0F8A0", "78C838", "488818", "081800"],
    },
    {
      id: "default-bg-3",
      name: "Default BG 3",
      colors: ["F8D8A8", "E0A878", "785888", "002030"],
    },
    {
      id: "default-bg-4",
      name: "Default BG 4",
      colors: ["B8D0D0", "D880D8", "8000A0", "380000"],
    },
    {
      id: "default-bg-5",
      name: "Default BG 5",
      colors: ["F8F8B8", "90C8C8", "486878", "082048"],
    },
    {
      id: "default-bg-6",
      name: "Default BG 6",
      colors: ["F8D8B0", "78C078", "688840", "583820"],
    },
    {
      id: "default-sprite",
      name: "Default Sprites",
      colors: ["F8F0E0", "D88078", "B05010", "000000"],
    },
    {
      id: "default-ui",
      name: "Default UI",
      colors: ["F8F8B8", "90C8C8", "486878", "082048"],
    },
  ] as {
    id: string;
    name: string;
    colors: [string, string, string, string];
  }[];

  const fixedPalettes = (json.palettes || []).map(addMissingEntityId);

  for (let i = 0; i < defaultPalettes.length; i++) {
    const defaultPalette = defaultPalettes[i];
    const existingPalette = fixedPalettes.find(
      (p) => p.id === defaultPalette.id
    );
    if (existingPalette) {
      existingPalette.defaultName = defaultPalette.name;
      existingPalette.defaultColors = defaultPalette.colors;
    } else {
      fixedPalettes.push({
        ...defaultPalette,
        defaultName: defaultPalette.name,
        defaultColors: defaultPalette.colors,
      });
    }
  }
  console.timeEnd("loadProjectData.loadProject fixPalettes");

  console.time("loadProjectData.loadProject fixEngineFieldValues");

  const fixedEngineFieldValues = json.engineFieldValues || [];
  console.timeEnd("loadProjectData.loadProject fixEngineFieldValues");

  console.log("ACTORS", resourcesLookup.actor);

  //   console.log(
  //     "ACTORS MAPPED",
  //     (resourcesLookup.actor ?? []).map((row) => addMissingEntityId({
  //       ...row.data,
  //       actors: (resourcesLookup.actor ?? [])
  // }))
  //   );

  const sceneResources = (resourcesLookup.scene ?? []).map((row) => {
    const sceneDir = path.dirname(row.path);
    const actorsDir = path.join(sceneDir, "actors");
    const triggersDir = path.join(sceneDir, "triggers");
    return addMissingEntityId({
      ...row.data,
      actors: (resourcesLookup.actor ?? [])
        .filter((actorRow) => {
          const relative = path.relative(actorsDir, actorRow.path);
          return (
            relative && !relative.startsWith("..") && !path.isAbsolute(relative)
          );
        })
        .map((actorRow) => actorRow.data.id),
      triggers: (resourcesLookup.trigger ?? [])
        .filter((triggerRow) => {
          const relative = path.relative(triggersDir, triggerRow.path);
          return (
            relative && !relative.startsWith("..") && !path.isAbsolute(relative)
          );
        })
        .map((triggerRow) => triggerRow.data.id),
    });
  });

  const actorResources = (resourcesLookup.actor ?? []).map((row) =>
    addMissingEntityId(row.data)
  );

  const triggerResources = (resourcesLookup.trigger ?? []).map((row) =>
    addMissingEntityId(row.data)
  );

  const scriptResources = (resourcesLookup.script ?? []).map((row) =>
    addMissingEntityId(row.data)
  );

  const mergeAssetsWithResources = <
    R extends Asset & { name: string },
    A extends Asset
  >(
    assets: A[],
    resources: {
      path: string;
      type: string;
      data: R;
    }[],
    mergeFn: (asset: A, resource: R | undefined) => R
  ) => {
    const oldResourceByFilename = indexResourceByFilename(resources || []);
    return assets
      .map((asset) => {
        const oldResource: R =
          oldResourceByFilename[toAssetFilename(asset)]?.data;
        return mergeFn(asset, oldResource);
      })
      .sort(sortByName);
  };

  const mergeAssetIdsWithResources = <
    A extends Asset & { id: string; name: string },
    B extends string
  >(
    assets: A[],
    resources: {
      path: string;
      type: string;
      data: A & { _resourceType: B };
    }[],
    resourceType: B
  ) => {
    return mergeAssetsWithResources(assets, resources, (asset, resource) => {
      return {
        _resourceType: resourceType,
        ...asset,
        id: resource?.id ?? asset.id,
      };
    });
  };

  const mergeAssetIdAndSymbolsWithResources = <
    A extends Asset & { id: string; symbol: string; name: string },
    B extends string
  >(
    assets: A[],
    resources: {
      path: string;
      type: string;
      data: A & { _resourceType: B };
    }[],
    resourceType: B
  ) => {
    return mergeAssetsWithResources(assets, resources, (asset, resource) => {
      return {
        _resourceType: resourceType,
        ...asset,
        id: resource?.id ?? asset.id,
        symbol: resource?.symbol ?? asset.symbol,
      };
    });
  };

  const backgroundResources = mergeAssetsWithResources<
    CompressedBackgroundResource,
    BackgroundAssetData
  >(backgrounds, resourcesLookup.background, (asset, resource) => {
    if (resource) {
      return {
        _resourceType: "background",
        ...asset,
        id: resource.id,
        symbol: resource?.symbol !== undefined ? resource.symbol : asset.symbol,
        tileColors:
          resource?.tileColors !== undefined ? resource.tileColors : "",
        autoColor:
          resource?.autoColor !== undefined ? resource.autoColor : false,
      };
    }
    return {
      _resourceType: "background",
      ...asset,
      tileColors: "",
    };
  });

  const spriteResources = mergeAssetsWithResources<
    SpriteResource,
    SpriteAssetData
  >(sprites, resourcesLookup.sprite, (asset, resource) => {
    if (!resource || !resource.states || resource.numTiles === undefined) {
      modifiedSpriteIds.push(resource?.id ?? asset.id);
    }
    return {
      ...asset,
      ...resource,
      id: resource?.id ?? asset.id,
      symbol: resource?.symbol ?? asset.symbol,
      filename: asset.filename,
      name: resource?.name ?? asset.name,
      canvasWidth: resource?.canvasWidth || 32,
      canvasHeight: resource?.canvasHeight || 32,
      states: (
        resource?.states || [
          {
            id: uuid(),
            name: "",
            animationType: "multi_movement",
            flipLeft: true,
            animations: [],
          },
        ]
      ).map((oldState) => {
        return {
          ...oldState,
          animations: Array.from(Array(8)).map((_, animationIndex) => ({
            id:
              (oldState.animations &&
                oldState.animations[animationIndex] &&
                oldState.animations[animationIndex].id) ||
              uuid(),
            frames: (oldState.animations &&
              oldState.animations[animationIndex] &&
              oldState.animations[animationIndex].frames) || [
              {
                id: uuid(),
                tiles: [],
              },
            ],
          })),
        };
      }),
    } as SpriteResource;
  });

  const emoteResources = mergeAssetIdAndSymbolsWithResources(
    emotes,
    resourcesLookup.emote,
    "emote"
  );

  const avatarResources = mergeAssetIdsWithResources(
    avatars,
    resourcesLookup.avatar,
    "avatar"
  );

  const tilesetResources = mergeAssetIdAndSymbolsWithResources(
    tilesets,
    resourcesLookup.tileset,
    "tileset"
  );

  const soundResources = mergeAssetIdAndSymbolsWithResources(
    sounds,
    resourcesLookup.sound,
    "sound"
  );

  const fontResources = mergeAssetIdAndSymbolsWithResources(
    fonts,
    resourcesLookup.font,
    "font"
  );

  const musicResources = mergeAssetsWithResources<
    MusicResource,
    MusicAssetData
  >(music, resourcesLookup.music, (asset, resource) => {
    if (resource) {
      return {
        _resourceType: "music",
        ...asset,
        id: resource.id,
        symbol: resource?.symbol !== undefined ? resource.symbol : asset.symbol,
        settings: {
          ...resource.settings,
        },
      };
    }
    return {
      _resourceType: "music",
      ...asset,
      settings: {},
    };
  });

  const paletteResources: PaletteResource[] = (
    resourcesLookup.palette ?? []
  ).map((row) => addMissingEntityId(row.data));

  // Add any missing default palettes
  for (let i = 0; i < defaultPalettes.length; i++) {
    const defaultPalette = defaultPalettes[i];
    const existingPalette = fixedPalettes.find(
      (p) => p.id === defaultPalette.id
    );
    if (existingPalette) {
      existingPalette.defaultName = defaultPalette.name;
      existingPalette.defaultColors = defaultPalette.colors;
    } else {
      paletteResources.push({
        _resourceType: "palette",
        ...defaultPalette,
        defaultName: defaultPalette.name,
        defaultColors: defaultPalette.colors,
      });
    }
  }

  const variablesResource: VariablesResource = (resourcesLookup.variables ??
    [])[0].data;

  const engineFieldValuesResource: EngineFieldValuesResource =
    (resourcesLookup.engineFieldValues ?? [])[0].data;

  const settingsResource: SettingsResource = (
    resourcesLookup.settings ?? []
  ).reduce(
    (memo, resource) => {
      return {
        ...memo,
        ...resource.data,
      };
    },
    { _resourceType: "settings", ...defaultProjectSettings }
  );

  return {
    data: {
      ...json,
      backgrounds: fixedBackgroundIds,
      spriteSheets: fixedSpriteIds,
      music: fixedMusicIds,
      sounds: fixedSoundIds,
      fonts: fixedFontIds,
      avatars: fixedAvatarIds,
      emotes: fixedEmoteIds,
      tilesets: fixedTilesetIds,
      scenes: fixedScenes,
      customEvents: fixedCustomEvents,
      palettes: fixedPalettes,
      engineFieldValues: fixedEngineFieldValues,
    },
    resources: {
      scenes: sceneResources,
      actors: actorResources,
      triggers: triggerResources,
      scripts: scriptResources,
      sprites: spriteResources,
      backgrounds: backgroundResources,
      emotes: emoteResources,
      avatars: avatarResources,
      tilesets: tilesetResources,
      fonts: fontResources,
      sounds: soundResources,
      music: musicResources,
      palettes: paletteResources,
      variables: variablesResource,
      engineFieldValues: engineFieldValuesResource,
      settings: settingsResource,
    },
    modifiedSpriteIds,
    isMigrated,
    scriptEventDefs: cloneDictionary(scriptEventDefs),
    engineFields,
    sceneTypes,
  };
};

export default loadProject;
