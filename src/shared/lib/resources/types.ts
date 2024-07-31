import type {
  Actor,
  AvatarData,
  Background,
  CustomEvent,
  EmoteData,
  EngineFieldValue,
  FontData,
  MusicData,
  Palette,
  Scene,
  SoundData,
  SpriteSheetData,
  TilesetData,
  Trigger,
  Variable,
} from "shared/lib/entities/entitiesTypes";
import type { SettingsState } from "store/features/settings/settingsState";

export type ProjectMetadataResource = {
  _resourceType: "project";
  name: string;
  author: string;
  notes: string;
  _version: string;
  _release: string;
};

export type ActorResource = Actor & {
  _resourceType: "actor";
  _index: number;
};

export type TriggerResource = Trigger & {
  _resourceType: "trigger";
  _index: number;
};

export type CompressedSceneResource = Omit<
  Scene,
  "collisions" | "actors" | "triggers"
> & {
  _resourceType: "scene";
  collisions: string;
};

export type CompressedSceneResourceWithChildren = CompressedSceneResource & {
  actors: ActorResource[];
  triggers: TriggerResource[];
};

export type SceneResource = Omit<
  CompressedSceneResourceWithChildren,
  "collisions"
> & {
  collisions: number[];
};

export type ScriptResource = CustomEvent & {
  _resourceType: "script";
};

export type CompressedBackgroundResource = Omit<
  Background,
  "tileColors" | "inode" | "_v"
> & {
  _resourceType: "background";
  tileColors: string;
};

export type BackgroundResource = Omit<
  CompressedBackgroundResource,
  "tileColors"
> & {
  tileColors: number[];
};

export type TilesetResource = TilesetData & {
  _resourceType: "tileset";
};

export type SpriteResource = SpriteSheetData & {
  _resourceType: "sprite";
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

export type EngineFieldValuesResource = {
  _resourceType: "engineFieldValues";
  engineFieldValues: EngineFieldValue[];
};

export type CompressedResource =
  | CompressedSceneResourceWithChildren
  | ScriptResource
  | SpriteResource
  | CompressedBackgroundResource
  | EmoteResource
  | AvatarResource
  | FontResource
  | TilesetResource
  | SoundResource
  | MusicResource
  | PaletteResource
  | VariablesResource
  | EngineFieldValuesResource
  | SettingsResource
  | ProjectMetadataResource;

export type CompressedProjectResources = {
  scenes: CompressedSceneResourceWithChildren[];
  scripts: ScriptResource[];
  sprites: SpriteResource[];
  backgrounds: CompressedBackgroundResource[];
  emotes: EmoteResource[];
  avatars: AvatarResource[];
  fonts: FontResource[];
  tilesets: TilesetResource[];
  sounds: SoundResource[];
  music: MusicResource[];
  palettes: PaletteResource[];
  variables: VariablesResource;
  engineFieldValues: EngineFieldValuesResource;
  settings: SettingsResource;
  metadata: ProjectMetadataResource;
};

export type ProjectResources = Omit<
  CompressedProjectResources,
  "scenes" | "backgrounds"
> & {
  scenes: SceneResource[];
  backgrounds: BackgroundResource[];
};

export type ProjectEntityResources = Omit<
  ProjectResources,
  "settings" | "metadata"
>;

export type CompressedProjectResourcesPatch = {
  data: CompressedProjectResources;
  paths: string[];
};

export const isProjectMetadataResource = (
  x: unknown
): x is ProjectMetadataResource => {
  return (
    x !== null &&
    typeof x === "object" &&
    "_resourceType" in x &&
    (x as { _resourceType: string })._resourceType === "project"
  );
};
