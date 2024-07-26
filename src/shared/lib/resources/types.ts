import type {
  Actor,
  Background,
  CustomEvent,
  Scene,
  Trigger,
  Variable,
} from "shared/lib/entities/entitiesTypes";

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
  variables: VariablesResource;
};

export type ProjectResources = Omit<
  CompressedProjectResources,
  "scenes" | "backgrounds"
> & {
  scenes: SceneResource[];
  backgrounds: BackgroundResource[];
};
