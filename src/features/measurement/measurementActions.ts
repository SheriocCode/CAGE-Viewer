import type { MeasurementItem, MeasurementPoint } from "../../types/measurement";

export const getNextMeasurementLabel = (measurements: MeasurementItem[], type: "rect" | "line" | "polyline" | "angle") => {
  const prefix = type === "rect" ? "矩形" : type === "line" ? "线段" : type === "angle" ? "角度" : "折线";
  return `${prefix} ${measurements.filter((measurement) => measurement.type === type).length + 1}`;
};

export const createRectMeasurementItem = (measurements: MeasurementItem[], points: MeasurementPoint[], pointCount: number): MeasurementItem => ({
  id: `measure-${Date.now()}`,
  type: "rect",
  label: getNextMeasurementLabel(measurements, "rect"),
  points,
  createdAt: Date.now(),
  pointCount,
});

export const createLineMeasurementItem = (measurements: MeasurementItem[], points: [MeasurementPoint, MeasurementPoint]): MeasurementItem => ({
  id: `measure-${Date.now()}`,
  type: "line",
  label: getNextMeasurementLabel(measurements, "line"),
  points,
  createdAt: Date.now(),
});

export const createPointMeasurementItem = (
  measurements: MeasurementItem[],
  type: "polyline" | "angle",
  points: MeasurementPoint[],
): MeasurementItem | null => {
  const minimumPoints = type === "angle" ? 3 : 2;
  if (points.length < minimumPoints) return null;

  return {
    id: `measure-${Date.now()}`,
    type,
    label: getNextMeasurementLabel(measurements, type),
    points,
    createdAt: Date.now(),
  };
};

export const updateMeasurementPointInList = (
  measurements: MeasurementItem[],
  id: string,
  pointIndex: number,
  point: MeasurementPoint,
) =>
  measurements.map((measurement) => {
    if (measurement.id !== id) return measurement;
    const points = [...measurement.points] as MeasurementPoint[];
    points[pointIndex] = point;
    return { ...measurement, points };
  });
