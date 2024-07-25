import {
  ActorDirection,
  SceneParallaxLayer,
  ScriptEvent,
} from "shared/lib/entities/entitiesTypes";

// type ProjectResourceType = "scene" | "actor" | "trigger";

export interface CompressedSceneResource {
  _resourceType: "scene";
  id: string;
  type: string;
  name: string;
  symbol: string;
  notes?: string;
  labelColor?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundId: string;
  tilesetId: string;
  paletteIds: string[];
  spritePaletteIds: string[];
  collisions: string;
  autoFadeSpeed: number | null;
  autoFadeEventCollapse?: boolean;
  parallax?: SceneParallaxLayer[];
  playerSpriteSheetId?: string;
  script: ScriptEvent[];
  playerHit1Script: ScriptEvent[];
  playerHit2Script: ScriptEvent[];
  playerHit3Script: ScriptEvent[];
}

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

export interface ActorResource {
  _resourceType: "actor";
  id: string;
  name: string;
  symbol: string;
  notes?: string;
  x: number;
  y: number;
  spriteSheetId: string;
  paletteId: string;
  frame: number;
  moveSpeed: number;
  animSpeed: number | null;
  direction: ActorDirection;
  animate: boolean;
  isPinned: boolean;
  persistent: boolean;
  collisionGroup: string;
  script: ScriptEvent[];
  startScript: ScriptEvent[];
  updateScript: ScriptEvent[];
  hit1Script: ScriptEvent[];
  hit2Script: ScriptEvent[];
  hit3Script: ScriptEvent[];
}

export type TriggerResource = {
  _resourceType: "trigger";
  id: string;
  name: string;
  symbol: string;
  notes?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  script: ScriptEvent[];
  leaveScript: ScriptEvent[];
};

export type CompressedProjectResources = {
  scenes: CompressedSceneResourceWithChildren[];
  actors: ActorResource[];
  triggers: TriggerResource[];
};

export type ProjectResources = Omit<CompressedProjectResources, "scenes"> & {
  scenes: SceneResource[];
};
