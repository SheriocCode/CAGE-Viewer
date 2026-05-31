import * as THREE from "three";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";

export type PointCloudSource = {
  colors: Float32Array | null;
  positions: Float32Array;
  zRange: {
    min: number;
    max: number;
  };
};

type CreateFilteredPointCloudParams = {
  colors: Float32Array | null;
  pointSize: number;
  positions: Float32Array;
  zRange: {
    min: number;
    max: number;
  };
  zThresholdRatio: number;
};

export const parsePlyPointCloud = (buffer: ArrayBuffer): PointCloudSource => {
  const loader = new PLYLoader();
  const geometry = loader.parse(buffer);
  geometry.computeVertexNormals();

  const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
  const colAttr = geometry.getAttribute("color") as THREE.BufferAttribute | undefined;

  const positions = new Float32Array(posAttr.array as ArrayLike<number>);
  let colors: Float32Array | null = null;
  if (colAttr) {
    colors = new Float32Array(colAttr.array as ArrayLike<number>);
    let maxVal = 0;
    for (let i = 0; i < colors.length; i++) maxVal = Math.max(maxVal, colors[i]);
    if (maxVal > 1) {
      for (let i = 0; i < colors.length; i++) colors[i] /= 255;
    }
  }

  let zMin = Number.POSITIVE_INFINITY;
  let zMax = Number.NEGATIVE_INFINITY;
  for (let i = 2; i < positions.length; i += 3) {
    zMin = Math.min(zMin, positions[i]);
    zMax = Math.max(zMax, positions[i]);
  }

  geometry.dispose();

  return {
    colors,
    positions,
    zRange: {
      min: Number.isFinite(zMin) ? zMin : 0,
      max: Number.isFinite(zMax) ? zMax : 1,
    },
  };
};

export const createFilteredPointCloud = ({ colors, pointSize, positions, zRange, zThresholdRatio }: CreateFilteredPointCloudParams) => {
  const threshold = zRange.max - (zThresholdRatio / 100) * (zRange.max - zRange.min);
  const nextPos: number[] = [];
  const nextCol: number[] = [];

  for (let i = 0; i < positions.length; i += 3) {
    const z = positions[i + 2];
    if (z <= threshold) {
      nextPos.push(positions[i], positions[i + 1], z);
      if (colors) {
        nextCol.push(colors[i], colors[i + 1], colors[i + 2]);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(nextPos, 3));
  if (colors && nextCol.length > 0) {
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(nextCol, 3));
  }

  const material = new THREE.PointsMaterial({
    size: pointSize,
    sizeAttenuation: false,
    vertexColors: Boolean(colors),
    color: colors ? "#ffffff" : "#a8a8a8",
  });

  const points = new THREE.Points(geometry, material);
  geometry.computeBoundingBox();
  return points;
};

export const disposePointCloud = (points: THREE.Points) => {
  points.geometry.dispose();
  (points.material as THREE.Material).dispose();
};
