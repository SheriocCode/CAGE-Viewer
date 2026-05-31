import * as THREE from "three";
import type { MeasurementAxis, MeasurementItem, MeasurementPoint, MeasurementTool } from "../types/measurement";

export const formatMeasure = (value: number, unit: "u" | "u²" | "°") => `${value.toFixed(3)} ${unit}`;

export const pointToVector = ([x, y, z]: MeasurementPoint) => new THREE.Vector3(x, y, z);

export const vectorToPoint = (value: THREE.Vector3): MeasurementPoint => [value.x, value.y, value.z];

export const MEASUREMENT_AXIS_VECTORS: Record<MeasurementAxis, THREE.Vector3> = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

export const MEASUREMENT_AXIS_COLORS: Record<MeasurementAxis, number> = {
  x: 0xff5d73,
  y: 0x66d36e,
  z: 0x66b7ff,
};

export const getLineDistance = (points: MeasurementPoint[]) => {
  if (points.length < 2) return 0;
  return pointToVector(points[0]).distanceTo(pointToVector(points[1]));
};

export const getPolylineDistance = (points: MeasurementPoint[]) => {
  if (points.length < 2) return 0;
  return points.slice(1).reduce((sum, point, index) => sum + pointToVector(points[index]).distanceTo(pointToVector(point)), 0);
};

export const getAngleDegrees = (points: MeasurementPoint[]) => {
  if (points.length < 3) return 0;
  const [a, b, c] = points.map(pointToVector);
  const first = a.sub(b).normalize();
  const second = c.sub(b).normalize();
  return THREE.MathUtils.radToDeg(first.angleTo(second));
};

export const getMeasurementTypeLabel = (type: MeasurementTool) => {
  if (type === "rect") return "矩形区域";
  if (type === "line") return "线段距离";
  if (type === "polyline") return "折线距离";
  if (type === "angle") return "角度测量";
  return "选择";
};

export const getRectMetrics = (points: MeasurementPoint[]) => {
  if (points.length < 4) return { width: 0, depth: 0, area: 0 };
  const [p0, p1, p2, p3] = points.map(pointToVector);
  const width = (p0.distanceTo(p1) + p3.distanceTo(p2)) / 2;
  const depth = (p1.distanceTo(p2) + p0.distanceTo(p3)) / 2;
  const area = new THREE.Triangle(p0, p1, p2).getArea() + new THREE.Triangle(p0, p2, p3).getArea();
  return { width, depth, area };
};

export const summarizeMeasurement = (measurement: MeasurementItem) => {
  if (measurement.type === "line") return formatMeasure(getLineDistance(measurement.points), "u");
  if (measurement.type === "polyline") return formatMeasure(getPolylineDistance(measurement.points), "u");
  if (measurement.type === "angle") return formatMeasure(getAngleDegrees(measurement.points), "°");
  if (measurement.type === "rect") return formatMeasure(getRectMetrics(measurement.points).area, "u²");
  return "待实现";
};

export const getMeasurementCenter = (measurement: MeasurementItem) => {
  if (!measurement.points.length) return new THREE.Vector3();
  const total = measurement.points.reduce((acc, point) => acc.add(pointToVector(point)), new THREE.Vector3());
  return total.divideScalar(measurement.points.length);
};
