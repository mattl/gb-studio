import type {
  Actor,
  AvatarData,
  Background,
  CustomEvent,
  EmoteData,
  FontData,
  MusicData,
  Palette,
  Scene,
  SoundData,
  Tileset,
  Trigger,
  Variable,
} from "shared/lib/entities/entitiesTypes";
import { SettingsState } from "store/features/settings/settingsState";

// type ProjectResourceType = "scene" | "actor" | "trigger";

export type CompressedSceneResource = Omit<
  Scene,
  "collisions" | "actors" | "triggers"
> & {
  _resourceType: "scene";
  collisions: string;
};

export type CompressedSceneResourceWithChildren = CompressedSceneResource & {
  actors: string[];
  triggers: string[];
};

export type SceneResource = Omit<
  CompressedSceneResourceWithChildren,
  "collisions"
> & {
  collisions: number[];
};

export type ActorResource = Actor & {
  _resourceType: "actor";
};

export type TriggerResource = Trigger & {
  _resourceType: "trigger";
};

export type ScriptResource = CustomEvent & {
  _resourceType: "script";
};

export type CompressedBackgroundResource = Omit<Background, "tileColors"> & {
  _resourceType: "background";
  tileColors: string;
};

export type BackgroundResource = Omit<
  CompressedBackgroundResource,
  "tileColors"
> & {
  tileColors: number[];
};

export type TilesetResource = Tileset & {
  _resourceType: "tileset";
};

export type EmoteResource = EmoteData & {
  _resourceType: "emote";
};

export type AvatarResource = AvatarData & {
  _resourceType: "avatar";
};

export type FontResource = FontData & {
  _resourceType: "font";
};

export type SoundResource = SoundData & {
  _resourceType: "sound";
};

export type MusicResource = MusicData & {
  _resourceType: "music";
};

export type PaletteResource = Palette & {
  _resourceType: "palette";
};

export type SettingsResource = SettingsState & {
  _resourceType: "settings";
};

export type VariablesResource = {
  _resourceType: "variables";
  variables: Variable[];
};

export type CompressedProjectResources = {
  scenes: CompressedSceneResourceWithChildren[];
  actors: ActorResource[];
  triggers: TriggerResource[];
  scripts: ScriptResource[];
  backgrounds: CompressedBackgroundResource[];
  emotes: EmoteResource[];
  avatars: AvatarResource[];
  fonts: FontResource[];
  tilesets: TilesetResource[];
  sounds: SoundResource[];
  music: MusicResource[];
  palettes: PaletteResource[];
  variables: VariablesResource;
  // settings: SettingsResource;
};

export type ProjectResources = Omit<
  CompressedProjectResources,
  "scenes" | "backgrounds"
> & {
  scenes: SceneResource[];
  backgrounds: BackgroundResource[];
};
