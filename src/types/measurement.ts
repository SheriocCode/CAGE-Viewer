export type MeasurementTool = "select" | "rect" | "line" | "polyline" | "angle";

export type MeasurementPoint = [number, number, number];

export type MeasurementItem = {
  id: string;
  type: MeasurementTool;
  label: string;
  points: MeasurementPoint[];
  createdAt: number;
  pointCount?: number;
};

export type MeasurementAxis = "x" | "y" | "z";

export type DraggedMeasurementPoint = {
  id: string;
  pointIndex: number;
  fallbackZ: number;
  originPoint: MeasurementPoint;
};

export type ScreenPoint = {
  x: number;
  y: number;
};

export type RectDraft = {
  start: ScreenPoint;
  current: ScreenPoint;
};
