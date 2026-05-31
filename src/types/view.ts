export type CameraMode = "ortho" | "perspective";

export type CameraSnapshot = {
  position: [number, number, number];
  quaternion: [number, number, number, number];
  up: [number, number, number];
  near: number;
  far: number;
  zoom: number;
  fov?: number;
  aspect?: number;
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
};

export type ViewParamsSnapshot = {
  version: 1;
  cameraMode: CameraMode;
  controlsTarget: [number, number, number];
  perspective: CameraSnapshot;
  orthographic: CameraSnapshot;
  viewportBgColor: string;
  showGrid: boolean;
  showAxes: boolean;
};
