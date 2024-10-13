import React, { useEffect, useMemo, useRef } from "react";
import {
  COLLISION_TOP,
  COLLISION_ALL,
  COLLISION_BOTTOM,
  COLLISION_LEFT,
  COLLISION_RIGHT,
  TILE_PROP_LADDER,
  TILE_PROPS,
  COLLISION_SLOPE_45_RIGHT,
  COLLISION_SLOPE_22_RIGHT_BOT,
  COLLISION_SLOPE_22_RIGHT_TOP,
  COLLISION_SLOPE_45_LEFT,
  COLLISION_SLOPE_22_LEFT_TOP,
  COLLISION_SLOPE_22_LEFT_BOT,
  COLLISIONS_EXTRA_SYMBOLS,
} from "consts";
import { useAppSelector } from "store/hooks";

const TILE_SIZE = 8;

interface SceneCollisionsProps {
  width: number;
  height: number;
  collisions: number[];
}

const SceneCollisions = ({
  width,
  height,
  collisions,
}: SceneCollisionsProps) => {
  const canvas = useRef<HTMLCanvasElement>(null);

  const collisionAlpha = useAppSelector(
    (state) => Math.floor(state.project.present.settings.collisionLayerAlpha * 255).toString(16)
  );

  const collisionSettings = useAppSelector(
    (state) => state.project.present.settings.collisionSettings
  );

  const solidColor = useMemo(
    () => {
      const setting = collisionSettings.find(s => s.key == "solid");
      const color = setting ? setting.color : "#FA2828";
      return color + collisionAlpha;
    }, 
    [collisionSettings, collisionAlpha]
  );

  const topColor = useMemo(
    () => {
      const setting = collisionSettings.find(s => s.key == "top");
      const color = setting ? setting.color : "#2828FA";
      return color + collisionAlpha;
    }, 
    [collisionSettings, collisionAlpha]
  );

  const bottomColor = useMemo(
    () => {
      const setting = collisionSettings.find(s => s.key == "bottom");
      const color = setting ? setting.color : "#FFFA28";
      return color + collisionAlpha;
    }, 
    [collisionSettings, collisionAlpha]
  );

  const leftColor = useMemo(
    () => {
      const setting = collisionSettings.find(s => s.key == "left");
      const color = setting ? setting.color : "#FA28FA";
      return color + collisionAlpha;
    }, 
    [collisionSettings, collisionAlpha]
  );

  const rightColor = useMemo(
    () => {
      const setting = collisionSettings.find(s => s.key == "right");
      const color = setting ? setting.color : "#28FAFA";
      return color + collisionAlpha;
    }, 
    [collisionSettings, collisionAlpha]
  );

  const ladderColor = useMemo(
    () => {
      const setting = collisionSettings.find(s => s.key == "ladder");
      const color = setting ? setting.color : "#008000";
      return color + collisionAlpha;
    },
    [collisionSettings, collisionAlpha]
  );

  const slopeColor = "#0000FF";
  const slope45RightColor = useMemo(
    () => {
      const setting = collisionSettings.find(s => s.key == "slope_45_right");
      const color = setting ? setting.color : slopeColor;
      return color + collisionAlpha;
    },
    [collisionSettings, collisionAlpha]
  );

  const slope45LeftColor = useMemo(
    () => {
      const setting = collisionSettings.find(s => s.key == "slope_45_left");
      const color = setting ? setting.color : slopeColor;
      return color + collisionAlpha;
    },
    [collisionSettings, collisionAlpha]
  );

  const slope22Right_botColor = useMemo(
    () => {
      const setting = collisionSettings.find(s => s.key == "slope_22_right_bot");
      const color = setting ? setting.color : slopeColor;
      return color + collisionAlpha;
    },
    [collisionSettings, collisionAlpha]
  );

  const slope22RightTopColor = useMemo(
    () => {
      const setting = collisionSettings.find(s => s.key == "slope_22_right_top");
      const color = setting ? setting.color : slopeColor;
      return color + collisionAlpha;
    },
    [collisionSettings, collisionAlpha]
  );

  const slope22LeftTopColor = useMemo(
    () => {
      const setting = collisionSettings.find(s => s.key == "slope_22_left_top");
      const color = setting ? setting.color : slopeColor;
      return color + collisionAlpha;
    },
    [collisionSettings, collisionAlpha]
  );

  const slope22LeftBotColor = useMemo(
    () => {
      const setting = collisionSettings.find(s => s.key == "slope_22_left_bot");
      const color = setting ? setting.color : slopeColor;
      return color + collisionAlpha;
    },
    [collisionSettings, collisionAlpha]
  );

  const spareColors = useMemo(
    () => ["08","09","10","11","12","13","14","15"].map(i => {
      const setting = collisionSettings.find(s => s.key == ("spare_"+i));
      const color = setting ? setting.color : "#008000";
      return color + collisionAlpha;
    }),
    [collisionSettings, collisionAlpha]
  );


  useEffect(() => {
    if (canvas.current) {
      // eslint-disable-next-line no-self-assign
      canvas.current.width = canvas.current.width; // Clear canvas
      const ctx = canvas.current.getContext("2d");
      
      if (!ctx) return;
      
      ctx.font = "8px Public Pixel";

      for (let yi = 0; yi < height; yi++) {
        for (let xi = 0; xi < width; xi++) {
          const collisionIndex = width * yi + xi;
          const tile = collisions[collisionIndex];
          const tileprop = tile & TILE_PROPS;
          if ((tile & COLLISION_ALL) === COLLISION_ALL) {
            ctx.fillStyle = solidColor;
            ctx.fillRect(xi * TILE_SIZE, yi * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          } else if (tile !== 0) {
            if (tile & COLLISION_TOP) {
              ctx.fillStyle = topColor;
              ctx.fillRect(
                xi * TILE_SIZE,
                yi * TILE_SIZE,
                TILE_SIZE,
                TILE_SIZE * 0.5
              );
            }
            if (tile & COLLISION_BOTTOM) {
              ctx.fillStyle = bottomColor;
              ctx.fillRect(
                xi * TILE_SIZE,
                (yi + .5) * TILE_SIZE,
                TILE_SIZE,
                TILE_SIZE * 0.5
              );
            }
            if (tile & COLLISION_LEFT) {
              ctx.fillStyle = leftColor;
              ctx.fillRect(
                xi * TILE_SIZE,
                yi * TILE_SIZE,
                TILE_SIZE * 0.5,
                TILE_SIZE
              );
            }
            if (tile & COLLISION_RIGHT) {
              ctx.fillStyle = rightColor;
              ctx.fillRect(
                (xi + 0.5) * TILE_SIZE,
                yi * TILE_SIZE,
                TILE_SIZE * 0.5,
                TILE_SIZE
              );
            }
          }
          if (tileprop) {
            switch (tileprop) {
              case TILE_PROP_LADDER: // Ladder
                ctx.fillStyle = ladderColor
                ctx.fillRect(
                  (xi + 0.0) * TILE_SIZE,
                  yi * TILE_SIZE,
                  TILE_SIZE * 0.2,
                  TILE_SIZE
                );
                ctx.fillRect(
                  (xi + 0.8) * TILE_SIZE,
                  yi * TILE_SIZE,
                  TILE_SIZE * 0.2,
                  TILE_SIZE
                );
                ctx.fillRect(
                  xi * TILE_SIZE,
                  (yi + 0.4) * TILE_SIZE,
                  TILE_SIZE,
                  TILE_SIZE * 0.2
                );
                break;
              case COLLISION_SLOPE_45_RIGHT: // slope right
                ctx.fillStyle = slope45RightColor;
                ctx.beginPath();
                ctx.moveTo((xi + 0) * TILE_SIZE, (yi + 1) * TILE_SIZE);
                ctx.lineTo((xi + 1) * TILE_SIZE, (yi + 0) * TILE_SIZE);
                ctx.lineTo((xi + 1) * TILE_SIZE, (yi + 1) * TILE_SIZE);
                ctx.fill(); // Render the path
                break;
              case COLLISION_SLOPE_22_RIGHT_BOT: // slope right shalow BOT
                ctx.fillStyle = slope22LeftBotColor;
                ctx.beginPath();
                ctx.moveTo((xi + 0) * TILE_SIZE, (yi + 1) * TILE_SIZE);
                ctx.lineTo((xi + 1) * TILE_SIZE, (yi + 0.5) * TILE_SIZE);
                ctx.lineTo((xi + 1) * TILE_SIZE, (yi + 1) * TILE_SIZE);
                ctx.fill(); // Render the path
                break;
              case COLLISION_SLOPE_22_RIGHT_TOP: // slope right shalow TOP
                ctx.fillStyle = slope22RightTopColor;
                ctx.beginPath();
                ctx.moveTo((xi + 0) * TILE_SIZE, (yi + 0.5) * TILE_SIZE);
                ctx.lineTo((xi + 1) * TILE_SIZE, (yi + 0) * TILE_SIZE);
                ctx.lineTo((xi + 1) * TILE_SIZE, (yi + 0.5) * TILE_SIZE);
                ctx.fill(); // Render the path
                break;
              case COLLISION_SLOPE_45_LEFT: // slope left
                ctx.fillStyle = slope45LeftColor;
                ctx.beginPath();
                ctx.moveTo((xi + 0) * TILE_SIZE, (yi + 0) * TILE_SIZE);
                ctx.lineTo((xi + 1) * TILE_SIZE, (yi + 1) * TILE_SIZE);
                ctx.lineTo((xi + 0) * TILE_SIZE, (yi + 1) * TILE_SIZE);
                ctx.fill(); // Render the path
                break;
              case COLLISION_SLOPE_22_LEFT_BOT: // slope left shalow BOT
                ctx.fillStyle = slope22LeftBotColor;
                ctx.beginPath();
                ctx.moveTo((xi + 1) * TILE_SIZE, (yi + 1) * TILE_SIZE);
                ctx.lineTo((xi + 0) * TILE_SIZE, (yi + 0.5) * TILE_SIZE);
                ctx.lineTo((xi + 0) * TILE_SIZE, (yi + 1) * TILE_SIZE);
                ctx.fill(); // Render the path
                break;
              case COLLISION_SLOPE_22_LEFT_TOP: // slope left shalow TOP
                ctx.fillStyle = slope22LeftTopColor;
                ctx.beginPath();
                ctx.moveTo((xi + 1) * TILE_SIZE, (yi + 0.5) * TILE_SIZE);
                ctx.lineTo((xi + 0) * TILE_SIZE, (yi + 0) * TILE_SIZE);
                ctx.lineTo((xi + 0) * TILE_SIZE, (yi + 0.5) * TILE_SIZE);
                ctx.fill(); // Render the path
                break;
              default:
                const tilepropValue = (tileprop >> 4) - 8;
                ctx.fillStyle = spareColors[tilepropValue];
                ctx.fillRect(
                  xi * TILE_SIZE,
                  yi * TILE_SIZE,
                  TILE_SIZE,
                  TILE_SIZE
                );
                ctx.fillStyle = "rgba(255,255,255,0.2)";
                ctx.fillText(
                  COLLISIONS_EXTRA_SYMBOLS[tilepropValue],
                  xi * TILE_SIZE,
                  (yi + 0.9) * TILE_SIZE
                );
                break;
            }
          }
        }
      }
    }
  }, [collisions, height, width]);

  return (
    <canvas
      ref={canvas}
      width={width * TILE_SIZE}
      height={height * TILE_SIZE}
    />
  );
};

export default SceneCollisions;
