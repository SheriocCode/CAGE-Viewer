import * as THREE from "three";
import type { DynamicGridSignature, RulerAxis, RulerRefs, RulerSide } from "../../types/ruler";
import { AXIS_LABELS, RULER_MAX_TICKS, chooseNiceStep, expandRange, formatRulerValue } from "../../utils/ruler";

type RenderCoordinateRulersParams = {
  camera: THREE.Camera;
  gridRange: DynamicGridSignature;
  mount: HTMLDivElement;
  referenceBox: THREE.Box3;
  rulerRefs: RulerRefs;
  visible: boolean;
};

const projectWorldToCanvas = (world: THREE.Vector3, camera: THREE.Camera, mount: HTMLDivElement) => {
  const projected = world.clone().project(camera);
  if (projected.z < -1 || projected.z > 1) return null;
  return new THREE.Vector2(((projected.x + 1) / 2) * mount.clientWidth, ((1 - projected.y) / 2) * mount.clientHeight);
};

const intersectScreenLineWithRuler = (a: THREE.Vector2, b: THREE.Vector2, side: RulerSide, mount: HTMLDivElement, ruler: HTMLDivElement) => {
  const canvasRect = mount.getBoundingClientRect();
  const rulerRect = ruler.getBoundingClientRect();
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  if (side === "bottom") {
    if (Math.abs(dy) < 0.0001) return null;
    const t = (mount.clientHeight - a.y) / dy;
    const x = a.x + dx * t;
    return canvasRect.left - rulerRect.left + x;
  }

  if (Math.abs(dx) < 0.0001) return null;
  const edgeX = side === "left" ? 0 : mount.clientWidth;
  const t = (edgeX - a.x) / dx;
  const y = a.y + dy * t;
  return canvasRect.top - rulerRect.top + y;
};

const getScreenAxis = (axis: RulerAxis, camera: THREE.Camera, referenceBox: THREE.Box3) => {
  const center = referenceBox.getCenter(new THREE.Vector3());
  const size = Math.max(1, referenceBox.getSize(new THREE.Vector3()).length() * 0.08);
  const direction =
    axis === "x" ? new THREE.Vector3(size, 0, 0) : axis === "y" ? new THREE.Vector3(0, size, 0) : new THREE.Vector3(0, 0, size);
  const a = center.clone().project(camera);
  const b = center.clone().add(direction).project(camera);
  return new THREE.Vector2(b.x - a.x, b.y - a.y);
};

const getRulerRange = (axis: RulerAxis, referenceBox: THREE.Box3, gridRange: DynamicGridSignature) => {
  if (axis === "z") return expandRange(referenceBox.min.z, referenceBox.max.z, 0.08);
  if (axis === "x") return { min: gridRange.minX, max: gridRange.maxX };
  return { min: gridRange.minY, max: gridRange.maxY };
};

const getZAxisAnchor = (range: DynamicGridSignature, camera: THREE.Camera, mount: HTMLDivElement, referenceBox: THREE.Box3) => {
  const candidates = [
    new THREE.Vector3(range.minX, range.minY, referenceBox.min.z),
    new THREE.Vector3(range.maxX, range.minY, referenceBox.min.z),
    new THREE.Vector3(range.minX, range.maxY, referenceBox.min.z),
    new THREE.Vector3(range.maxX, range.maxY, referenceBox.min.z),
    new THREE.Vector3(range.maxX, (range.minY + range.maxY) / 2, referenceBox.min.z),
    new THREE.Vector3((range.minX + range.maxX) / 2, range.maxY, referenceBox.min.z),
  ];

  let best = candidates[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  candidates.forEach((candidate) => {
    const screen = projectWorldToCanvas(candidate, camera, mount);
    if (!screen) return;
    const distance = Math.abs(mount.clientWidth - screen.x) + Math.abs(mount.clientHeight * 0.5 - screen.y) * 0.25;
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  });
  return best;
};

const projectRulerTick = (
  side: RulerSide,
  axis: RulerAxis,
  value: number,
  gridRange: DynamicGridSignature,
  camera: THREE.Camera,
  mount: HTMLDivElement,
  ruler: HTMLDivElement,
  referenceBox: THREE.Box3,
) => {
  const gridZ = referenceBox.min.z;

  if (axis === "x" || axis === "y") {
    const a = axis === "x" ? new THREE.Vector3(value, gridRange.minY, gridZ) : new THREE.Vector3(gridRange.minX, value, gridZ);
    const b = axis === "x" ? new THREE.Vector3(value, gridRange.maxY, gridZ) : new THREE.Vector3(gridRange.maxX, value, gridZ);
    const screenA = projectWorldToCanvas(a, camera, mount);
    const screenB = projectWorldToCanvas(b, camera, mount);
    if (!screenA || !screenB) return null;
    return intersectScreenLineWithRuler(screenA, screenB, side, mount, ruler);
  }

  const anchor = getZAxisAnchor(gridRange, camera, mount, referenceBox);
  const screenA = projectWorldToCanvas(new THREE.Vector3(anchor.x, anchor.y, referenceBox.min.z), camera, mount);
  const screenB = projectWorldToCanvas(new THREE.Vector3(anchor.x, anchor.y, referenceBox.max.z), camera, mount);
  if (!screenA || !screenB) return null;
  const axisPos = intersectScreenLineWithRuler(screenA, screenB, side, mount, ruler);
  if (axisPos === null) {
    const tick = projectWorldToCanvas(new THREE.Vector3(anchor.x, anchor.y, value), camera, mount);
    if (!tick) return null;
    const rulerRect = ruler.getBoundingClientRect();
    const canvasRect = mount.getBoundingClientRect();
    return canvasRect.top - rulerRect.top + tick.y;
  }
  const ratio = (value - referenceBox.min.z) / Math.max(0.0001, referenceBox.max.z - referenceBox.min.z);
  return screenA.y + (screenB.y - screenA.y) * ratio + mount.getBoundingClientRect().top - ruler.getBoundingClientRect().top;
};

const renderRuler = (
  side: RulerSide,
  axis: RulerAxis,
  range: { min: number; max: number },
  params: RenderCoordinateRulersParams,
) => {
  const el = params.rulerRefs[side];
  if (!el) return "";
  const length = side === "bottom" ? el.clientWidth : el.clientHeight;
  const step = chooseNiceStep(range.max - range.min, side === "right" ? 6 : 8);
  const firstTick = Math.ceil(range.min / step) * step;
  const ticks: string[] = [];
  const signatureParts = [side, axis, range.min.toFixed(3), range.max.toFixed(3), step.toFixed(5), String(Math.round(length))];

  for (let value = firstTick; value <= range.max + step * 0.5 && ticks.length < RULER_MAX_TICKS; value += step) {
    const pos = projectRulerTick(side, axis, value, params.gridRange, params.camera, params.mount, el, params.referenceBox);
    if (pos === null) continue;
    if (pos < 18 || pos > length - 18) continue;
    signatureParts.push(value.toFixed(5), pos.toFixed(1));
    ticks.push(
      `<span class="ruler-tick" style="${side === "bottom" ? `left:${pos}px` : `top:${pos}px`}"><i></i><b>${formatRulerValue(
        value,
        step,
      )}</b></span>`,
    );
  }
  const signature = signatureParts.join(":");
  if (el.dataset.signature === signature) return signature;
  el.dataset.axis = axis;
  el.dataset.signature = signature;
  el.innerHTML = `<span class="ruler-axis">${AXIS_LABELS[axis]}</span>${ticks.join("")}`;
  return signature;
};

export const renderCoordinateRulers = (params: RenderCoordinateRulersParams) => {
  (Object.keys(params.rulerRefs) as RulerSide[]).forEach((side) => {
    const el = params.rulerRefs[side];
    if (el) el.hidden = !params.visible;
  });
  if (!params.visible) return "";

  const xScreen = getScreenAxis("x", params.camera, params.referenceBox);
  const yScreen = getScreenAxis("y", params.camera, params.referenceBox);
  const bottomAxis: RulerAxis = Math.abs(xScreen.x) >= Math.abs(yScreen.x) ? "x" : "y";
  const leftAxis: RulerAxis = bottomAxis === "x" ? "y" : "x";
  return [
    renderRuler("bottom", bottomAxis, getRulerRange(bottomAxis, params.referenceBox, params.gridRange), params),
    renderRuler("left", leftAxis, getRulerRange(leftAxis, params.referenceBox, params.gridRange), params),
    renderRuler("right", "z", getRulerRange("z", params.referenceBox, params.gridRange), params),
  ].join("|");
};
