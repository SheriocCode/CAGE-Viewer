import * as THREE from "three";
import type { MutableRefObject } from "react";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { EDLPass } from "../../EDLPass";
import type { CameraMode, CameraSnapshot, ViewParamsSnapshot } from "../../types/view";

export const snapshotPerspectiveCamera = (cam: THREE.PerspectiveCamera): CameraSnapshot => ({
  position: [cam.position.x, cam.position.y, cam.position.z],
  quaternion: [cam.quaternion.x, cam.quaternion.y, cam.quaternion.z, cam.quaternion.w],
  up: [cam.up.x, cam.up.y, cam.up.z],
  near: cam.near,
  far: cam.far,
  zoom: cam.zoom,
  fov: cam.fov,
  aspect: cam.aspect,
});

export const snapshotOrthographicCamera = (cam: THREE.OrthographicCamera): CameraSnapshot => ({
  position: [cam.position.x, cam.position.y, cam.position.z],
  quaternion: [cam.quaternion.x, cam.quaternion.y, cam.quaternion.z, cam.quaternion.w],
  up: [cam.up.x, cam.up.y, cam.up.z],
  near: cam.near,
  far: cam.far,
  zoom: cam.zoom,
  left: cam.left,
  right: cam.right,
  top: cam.top,
  bottom: cam.bottom,
});

export const applyCameraSnapshot = (cam: THREE.Camera, snap: CameraSnapshot) => {
  cam.position.set(...snap.position);
  cam.quaternion.set(...snap.quaternion);
  cam.up.set(...snap.up);

  if ((cam as THREE.PerspectiveCamera).isPerspectiveCamera) {
    const p = cam as THREE.PerspectiveCamera;
    p.near = snap.near;
    p.far = snap.far;
    p.zoom = snap.zoom;
    if (typeof snap.fov === "number") p.fov = snap.fov;
    if (typeof snap.aspect === "number") p.aspect = snap.aspect;
    p.updateProjectionMatrix();
  }

  if ((cam as THREE.OrthographicCamera).isOrthographicCamera) {
    const o = cam as THREE.OrthographicCamera;
    o.near = snap.near;
    o.far = snap.far;
    o.zoom = snap.zoom;
    if (typeof snap.left === "number") o.left = snap.left;
    if (typeof snap.right === "number") o.right = snap.right;
    if (typeof snap.top === "number") o.top = snap.top;
    if (typeof snap.bottom === "number") o.bottom = snap.bottom;
    o.updateProjectionMatrix();
  }
};

type BuildViewParamsSnapshotParams = {
  cameraMode: CameraMode;
  controls: OrbitControls | null;
  orthographicCamera: THREE.OrthographicCamera | null;
  perspectiveCamera: THREE.PerspectiveCamera | null;
  showAxes: boolean;
  showGrid: boolean;
  viewportBgColor: string;
};

export const buildViewParamsSnapshot = ({
  cameraMode,
  controls,
  orthographicCamera,
  perspectiveCamera,
  showAxes,
  showGrid,
  viewportBgColor,
}: BuildViewParamsSnapshotParams): ViewParamsSnapshot | null => {
  if (!perspectiveCamera || !orthographicCamera || !controls) {
    return null;
  }

  return {
    version: 1,
    cameraMode,
    controlsTarget: [controls.target.x, controls.target.y, controls.target.z],
    perspective: snapshotPerspectiveCamera(perspectiveCamera),
    orthographic: snapshotOrthographicCamera(orthographicCamera),
    viewportBgColor,
    showGrid,
    showAxes,
  };
};

type ApplyViewParamsToViewportParams = {
  activeCameraRef: MutableRefObject<THREE.Camera | null>;
  controls: OrbitControls | null;
  edlPass: EDLPass | null;
  orthographicCamera: THREE.OrthographicCamera | null;
  payload: ViewParamsSnapshot;
  perspectiveCamera: THREE.PerspectiveCamera | null;
  renderPass: RenderPass | null;
  setCameraMode: (value: CameraMode) => void;
  setShowAxes: (value: boolean) => void;
  setShowGrid: (value: boolean) => void;
  setViewportBgColor: (value: string) => void;
};

export const applyViewParamsToViewport = ({
  activeCameraRef,
  controls,
  edlPass,
  orthographicCamera,
  payload,
  perspectiveCamera,
  renderPass,
  setCameraMode,
  setShowAxes,
  setShowGrid,
  setViewportBgColor,
}: ApplyViewParamsToViewportParams) => {
  if (!perspectiveCamera || !orthographicCamera || !controls) return;

  applyCameraSnapshot(perspectiveCamera, payload.perspective);
  applyCameraSnapshot(orthographicCamera, payload.orthographic);

  setViewportBgColor(payload.viewportBgColor ?? "#08090a");
  setShowGrid(Boolean(payload.showGrid));
  setShowAxes(Boolean(payload.showAxes));
  setCameraMode(payload.cameraMode);

  controls.target.set(...payload.controlsTarget);
  const nextCamera = payload.cameraMode === "perspective" ? perspectiveCamera : orthographicCamera;
  controls.object = nextCamera;
  activeCameraRef.current = nextCamera;
  if (renderPass) renderPass.camera = nextCamera;
  edlPass?.setCamera(nextCamera);
  controls.update();
};
