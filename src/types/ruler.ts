export type RulerAxis = "x" | "y" | "z";

export type RulerSide = "left" | "bottom" | "right";

export type RulerRefs = Record<RulerSide, HTMLDivElement | null>;

export type DynamicGridSignature = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  step: number;
};
