import migrateProject from "lib/project/migrateProject";
import { BackgroundData, Scene } from "shared/lib/entities/entitiesTypes";
import {
  compressSceneResource,
  compressBackgroundResource,
} from "shared/lib/resources/compression";
import {
  CompressedBackgroundResource,
  CompressedProjectResources,
  CompressedSceneResourceWithChildren,
} from "shared/lib/resources/types";
import type { ScriptEventDefs } from "shared/lib/scripts/eventHelpers";
import type { ProjectData } from "store/features/project/projectActions";

export const migrateLegacyProject = (
  project: ProjectData,
  projectRoot: string,
  scriptEventDefs: ScriptEventDefs
): CompressedProjectResources => {
  console.time("loadProjectData.loadProject migrateProject");
  const migratedProject = migrateProject(project, projectRoot, scriptEventDefs);
  console.timeEnd("loadProjectData.loadProject migrateProject");

  const encodeResource =
    <T extends string>(type: T) =>
    <D>(data: D): D & { _resourceType: T } => ({
      _resourceType: type,
      ...data,
      __dirty: true,
    });

  const encodeScene = (scene: Scene): CompressedSceneResourceWithChildren => {
    const encodeScene = encodeResource("scene");
    const encodeActor = encodeResource("actor");
    const encodeTrigger = encodeResource("trigger");
    return compressSceneResource(
      encodeScene({
        ...scene,
        actors: scene.actors.map((actor, actorIndex) =>
          encodeActor({ ...actor, _index: actorIndex })
        ),
        triggers: scene.triggers.map((trigger, triggerIndex) =>
          encodeTrigger({ ...trigger, _index: triggerIndex })
        ),
      })
    );
  };

  const encodeBackground = (
    background: BackgroundData
  ): CompressedBackgroundResource => {
    const encodeBackground = encodeResource("background");
    return compressBackgroundResource(encodeBackground(background));
  };

  return {
    scenes: migratedProject.scenes.map(encodeScene),
    scripts: migratedProject.customEvents.map(encodeResource("script")),
    sprites: migratedProject.spriteSheets.map(encodeResource("sprite")),
    backgrounds: migratedProject.backgrounds.map(encodeBackground),
    emotes: migratedProject.emotes.map(encodeResource("emote")),
    avatars: migratedProject.avatars.map(encodeResource("avatar")),
    tilesets: migratedProject.tilesets.map(encodeResource("tileset")),
    fonts: migratedProject.fonts.map(encodeResource("font")),
    sounds: migratedProject.sounds.map(encodeResource("sound")),
    music: migratedProject.music.map(encodeResource("music")),
    palettes: migratedProject.palettes.map(encodeResource("palette")),
    variables: {
      _resourceType: "variables",
      variables: migratedProject.variables,
    },
    engineFieldValues: {
      _resourceType: "engineFieldValues",
      engineFieldValues: migratedProject.engineFieldValues,
    },
    settings: {
      _resourceType: "settings",
      ...migratedProject.settings,
    },
    metadata: {
      _resourceType: "project",
      name: migratedProject.name,
      author: migratedProject.author,
      notes: migratedProject.notes,
      _version: migratedProject._version,
      _release: migratedProject._release,
    },
  };
};
