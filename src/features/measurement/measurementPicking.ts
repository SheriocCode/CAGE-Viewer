import * as THREE from "three";
import type { DraggedMeasurementPoint, MeasurementAxis, MeasurementPoint, RectDraft, ScreenPoint } from "../../types/measurement";
import { MEASUREMENT_AXIS_VECTORS, pointToVector, vectorToPoint } from "../../utils/measurement";

export const getViewportPoint = (mount: HTMLDivElement | null, clientX: number, clientY: number): ScreenPoint | null => {
  const shell = mount?.closest(".viewport-shell") as HTMLElement | null;
  if (!shell) return null;
  const rect = shell.getBoundingClientRect();
  return { x: clientX - rect.left, y: clientY - rect.top };
};

export const projectPointToScreen = (
  mount: HTMLDivElement | null,
  camera: THREE.Camera | null,
  point: MeasurementPoint,
): ScreenPoint | null => {
  if (!mount || !camera) return null;
  const shell = mount.closest(".viewport-shell") as HTMLElement | null;
  if (!shell) return null;
  const canvasRect = mount.getBoundingClientRect();
  const shellRect = shell.getBoundingClientRect();
  const projected = pointToVector(point).project(camera);
  if (projected.z < -1 || projected.z > 1) return null;
  return {
    x: canvasRect.left - shellRect.left + ((projected.x + 1) / 2) * canvasRect.width,
    y: canvasRect.top - shellRect.top + ((1 - projected.y) / 2) * canvasRect.height,
  };
};

export const pickPointFromCanvas = (
  pointCloud: THREE.Points | null,
  camera: THREE.Camera | null,
  mount: HTMLDivElement | null,
  pointSize: number,
  clientX: number,
  clientY: number,
): MeasurementPoint | null => {
  if (!pointCloud || !camera || !mount) return null;

  const rect = mount.getBoundingClientRect();
  const pointer = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  const raycaster = new THREE.Raycaster();
  raycaster.params.Points = { threshold: Math.max(0.04, pointSize * 0.015) };
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(pointCloud, false)[0];
  if (hit?.point) return vectorToPoint(hit.point);

  const position = pointCloud.geometry.getAttribute("position");
  let best: MeasurementPoint | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  const maxDistance = 18;
  for (let i = 0; i < position.count; i += 1) {
    const world = new THREE.Vector3(position.getX(i), position.getY(i), position.getZ(i)).applyMatrix4(pointCloud.matrixWorld);
    const projected = world.clone().project(camera);
    if (projected.z < -1 || projected.z > 1) continue;
    const sx = rect.left + ((projected.x + 1) / 2) * rect.width;
    const sy = rect.top + ((1 - projected.y) / 2) * rect.height;
    const distance = Math.hypot(sx - clientX, sy - clientY);
    if (distance < bestDistance && distance <= maxDistance) {
      bestDistance = distance;
      best = [world.x, world.y, world.z];
    }
  }
  return best;
};

export const projectPointerToZPlane = (
  camera: THREE.Camera | null,
  mount: HTMLDivElement | null,
  clientX: number,
  clientY: number,
  z: number,
): MeasurementPoint | null => {
  if (!camera || !mount) return null;
  const rect = mount.getBoundingClientRect();
  const pointer = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(pointer, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -z);
  const hit = new THREE.Vector3();
  if (!raycaster.ray.intersectPlane(plane, hit)) return null;
  return vectorToPoint(hit);
};

export const projectPointerToMeasurementAxis = (
  camera: THREE.Camera | null,
  mount: HTMLDivElement | null,
  clientX: number,
  clientY: number,
  drag: DraggedMeasurementPoint,
  axis: MeasurementAxis,
): MeasurementPoint | null => {
  if (!camera || !mount) return null;

  const rect = mount.getBoundingClientRect();
  const pointer = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(pointer, camera);

  const axisOrigin = pointToVector(drag.originPoint);
  const axisDirection = MEASUREMENT_AXIS_VECTORS[axis];
  const rayOrigin = raycaster.ray.origin;
  const rayDirection = raycaster.ray.direction.clone().normalize();
  const axisRayDot = axisDirection.dot(rayDirection);
  const denominator = 1 - axisRayDot * axisRayDot;
  if (Math.abs(denominator) < 1e-5) return null;

  const originDelta = axisOrigin.clone().sub(rayOrigin);
  const axisDistance = (axisRayDot * rayDirection.dot(originDelta) - axisDirection.dot(originDelta)) / denominator;
  return vectorToPoint(axisOrigin.add(axisDirection.clone().multiplyScalar(axisDistance)));
};

export const projectViewportPointToZPlane = (
  mount: HTMLDivElement | null,
  camera: THREE.Camera | null,
  point: ScreenPoint,
  z: number,
): MeasurementPoint | null => {
  const shell = mount?.closest(".viewport-shell") as HTMLElement | null;
  if (!mount || !shell) return null;
  const shellRect = shell.getBoundingClientRect();
  return projectPointerToZPlane(camera, mount, shellRect.left + point.x, shellRect.top + point.y, z);
};

export const getPointsInScreenRect = (
  pointCloud: THREE.Points | null,
  camera: THREE.Camera | null,
  mount: HTMLDivElement | null,
  draft: RectDraft,
) => {
  if (!pointCloud || !camera || !mount) return [];

  const shell = mount.closest(".viewport-shell") as HTMLElement | null;
  if (!shell) return [];
  const shellRect = shell.getBoundingClientRect();
  const canvasRect = mount.getBoundingClientRect();
  const minX = Math.min(draft.start.x, draft.current.x);
  const maxX = Math.max(draft.start.x, draft.current.x);
  const minY = Math.min(draft.start.y, draft.current.y);
  const maxY = Math.max(draft.start.y, draft.current.y);
  const position = pointCloud.geometry.getAttribute("position");
  const points: MeasurementPoint[] = [];

  for (let i = 0; i < position.count; i += 1) {
    const world = new THREE.Vector3(position.getX(i), position.getY(i), position.getZ(i)).applyMatrix4(pointCloud.matrixWorld);
    const projected = world.clone().project(camera);
    if (projected.z < -1 || projected.z > 1) continue;
    const x = canvasRect.left - shellRect.left + ((projected.x + 1) / 2) * canvasRect.width;
    const y = canvasRect.top - shellRect.top + ((1 - projected.y) / 2) * canvasRect.height;
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
      points.push([world.x, world.y, world.z]);
    }
  }
  return points;
};
