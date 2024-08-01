import { Actor, Scene, Trigger } from "shared/lib/entities/entitiesTypes";

export type LegacyScene = Omit<Scene, "actors" | "triggers"> & {
  actors: Actor[];
  triggers: Trigger[];
};
