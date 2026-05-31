import * as THREE from "three";
import type { DynamicGridSignature } from "../../types/ruler";
import { chooseNiceStep, expandRange } from "../../utils/ruler";

export const getReferenceBox = (box: THREE.Box3 | null) => {
  if (box && !box.isEmpty()) return box.clone();
  return new THREE.Box3(new THREE.Vector3(-10, -10, 0), new THREE.Vector3(10, 10, 3));
};

const intersectViewportWithZPlane = (camera: THREE.Camera, mount: HTMLDivElement, planeZ: number) => {
  const corners = [new THREE.Vector2(-1, -1), new THREE.Vector2(1, -1), new THREE.Vector2(-1, 1), new THREE.Vector2(1, 1)];
  const points: THREE.Vector3[] = [];

  corners.forEach((corner) => {
    const nearPoint = new THREE.Vector3(corner.x, corner.y, -1).unproject(camera);
    const farPoint = new THREE.Vector3(corner.x, corner.y, 1).unproject(camera);
    const direction = farPoint.clone().sub(nearPoint).normalize();
    const origin = (camera as THREE.PerspectiveCamera).isPerspectiveCamera ? camera.position.clone() : nearPoint;
    if (Math.abs(direction.z) < 0.0001) return;
    const distance = (planeZ - origin.z) / direction.z;
    if (!Number.isFinite(distance)) return;
    points.push(origin.add(direction.multiplyScalar(distance)));
  });

  if (points.length < 2) return null;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const width = Math.max(1, mount.clientWidth);
  const height = Math.max(1, mount.clientHeight);
  const viewportPad = Math.max(width, height) / Math.min(width, height);
  return {
    x: expandRange(Math.min(...xs), Math.max(...xs), 0.05 * viewportPad),
    y: expandRange(Math.min(...ys), Math.max(...ys), 0.05 * viewportPad),
  };
};

export const getVisibleGridRange = (camera: THREE.Camera, mount: HTMLDivElement, referenceBox: THREE.Box3): DynamicGridSignature => {
  const gridZ = referenceBox.min.z;
  const planeRange = intersectViewportWithZPlane(camera, mount, gridZ);
  const boxX = expandRange(referenceBox.min.x, referenceBox.max.x, 0.18);
  const boxY = expandRange(referenceBox.min.y, referenceBox.max.y, 0.18);
  const x = planeRange?.x ?? boxX;
  const y = planeRange?.y ?? boxY;

  const minX = Math.min(x.min, boxX.min);
  const maxX = Math.max(x.max, boxX.max);
  const minY = Math.min(y.min, boxY.min);
  const maxY = Math.max(y.max, boxY.max);
  const step = chooseNiceStep(Math.max(maxX - minX, maxY - minY), 14);

  return {
    minX: Math.floor(minX / step) * step,
    maxX: Math.ceil(maxX / step) * step,
    minY: Math.floor(minY / step) * step,
    maxY: Math.ceil(maxY / step) * step,
    step,
  };
};

export const getGridSignature = (range: DynamicGridSignature) =>
  [range.minX, range.maxX, range.minY, range.maxY, range.step].map((value) => value.toFixed(3)).join("|");

export const createDynamicGrid = (range: DynamicGridSignature, z: number, visible: boolean) => {
  const positions: number[] = [];
  const colors: number[] = [];
  const minor = new THREE.Color(0xf5f5f5);
  const major = new THREE.Color(0xebebeb);
  const pushLine = (a: THREE.Vector3, b: THREE.Vector3, color: THREE.Color) => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
  };

  let index = 0;
  for (let x = range.minX; x <= range.maxX + range.step * 0.5; x += range.step) {
    pushLine(new THREE.Vector3(x, range.minY, z), new THREE.Vector3(x, range.maxY, z), index % 5 === 0 ? major : minor);
    index += 1;
  }
  index = 0;
  for (let y = range.minY; y <= range.maxY + range.step * 0.5; y += range.step) {
    pushLine(new THREE.Vector3(range.minX, y, z), new THREE.Vector3(range.maxX, y, z), index % 5 === 0 ? major : minor);
    index += 1;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false });
  const grid = new THREE.LineSegments(geometry, material);
  grid.visible = visible;
  return grid;
};
