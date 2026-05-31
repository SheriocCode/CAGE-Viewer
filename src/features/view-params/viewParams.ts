import * as THREE from "three";
import type { CameraSnapshot } from "../../types/view";

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
