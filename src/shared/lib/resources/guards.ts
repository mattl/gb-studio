import type {
  Actor,
  ActorScriptKey,
  ScriptEvent,
} from "../entities/entitiesTypes";
import { ActorResource } from "./types";

const defaultActor: Actor = {
  id: "",
  name: "",
  symbol: "",
  x: 0,
  y: 0,
  spriteSheetId: "",
  paletteId: "",
  frame: 0,
  animate: false,
  direction: "down",
  moveSpeed: 1,
  animSpeed: 15,
  isPinned: false,
  persistent: false,
  collisionGroup: "",
  script: [],
  startScript: [],
  updateScript: [],
  hit1Script: [],
  hit2Script: [],
  hit3Script: [],
};

const defaultActorResource: ActorResource = {
  _resourceType: "actor",
  ...defaultActor,
};

const isScriptEvent = (value: unknown): value is ScriptEvent => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const event = value as ScriptEvent;
  return (
    typeof event.id === "string" &&
    typeof event.command === "string" &&
    (typeof event.symbol === "undefined" || typeof event.symbol === "string") &&
    (typeof event.args === "undefined" || typeof event.args === "object") &&
    (typeof event.children === "undefined" ||
      typeof event.children === "object")
  );
};

const isScriptEventArray = (value: unknown): value is ScriptEvent[] => {
  return Array.isArray(value) && value.every(isScriptEvent);
};

export const isActor = (value: unknown): value is Actor => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const actor = value as Actor;
  const requiredStringProps = [
    "id",
    "name",
    "symbol",
    "spriteSheetId",
    "paletteId",
    "collisionGroup",
  ] as (keyof Actor)[];
  const requiredNumberProps = [
    "x",
    "y",
    "frame",
    "moveSpeed",
  ] as (keyof Actor)[];
  const requiredBooleanProps = [
    "animate",
    "isPinned",
    "persistent",
  ] as (keyof Actor)[];

  for (const prop of requiredStringProps) {
    if (typeof actor[prop] !== "string") {
      return false;
    }
  }

  for (const prop of requiredNumberProps) {
    if (typeof actor[prop] !== "number") {
      return false;
    }
  }

  for (const prop of requiredBooleanProps) {
    if (typeof actor[prop] !== "boolean") {
      return false;
    }
  }

  if (typeof actor.animSpeed !== "number" && actor.animSpeed !== null) {
    return false;
  }

  if (!["up", "down", "left", "right"].includes(actor.direction)) {
    return false;
  }

  const scriptKeys: ActorScriptKey[] = [
    "script",
    "startScript",
    "updateScript",
    "hit1Script",
    "hit2Script",
    "hit3Script",
  ];
  for (const key of scriptKeys) {
    if (!isScriptEventArray(actor[key])) {
      return false;
    }
  }

  return true;
};

export const isPartialActor = (value: unknown): value is Partial<Actor> => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const actor = value as Partial<Actor>;

  const stringProps = [
    "id",
    "name",
    "symbol",
    "spriteSheetId",
    "paletteId",
    "collisionGroup",
  ] as (keyof Actor)[];
  const numberProps = ["x", "y", "frame", "moveSpeed"] as (keyof Actor)[];
  const booleanProps = ["animate", "isPinned", "persistent"] as (keyof Actor)[];

  for (const prop of stringProps) {
    if (prop in actor && typeof actor[prop] !== "string") {
      return false;
    }
  }

  for (const prop of numberProps) {
    if (prop in actor && typeof actor[prop] !== "number") {
      return false;
    }
  }

  for (const prop of booleanProps) {
    if (prop in actor && typeof actor[prop] !== "boolean") {
      return false;
    }
  }

  if (
    "animSpeed" in actor &&
    typeof actor.animSpeed !== "number" &&
    actor.animSpeed !== null
  ) {
    return false;
  }

  if (
    "direction" in actor &&
    !["up", "down", "left", "right"].includes(actor.direction as string)
  ) {
    return false;
  }

  const scriptKeys: ActorScriptKey[] = [
    "script",
    "startScript",
    "updateScript",
    "hit1Script",
    "hit2Script",
    "hit3Script",
  ];
  for (const key of scriptKeys) {
    if (key in actor && !isScriptEventArray(actor[key])) {
      return false;
    }
  }

  return true;
};

export const toActor = (data: unknown): Actor => {
  if (isPartialActor(data)) {
    return {
      ...defaultActor,
      ...data,
    };
  }
  return defaultActor;
};

export const toActorResource = (data: unknown): ActorResource => {
  return {
    _index: 0,
    ...toActor(data),
    _resourceType: "actor",
  };
};
