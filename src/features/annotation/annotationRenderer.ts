import * as THREE from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import type { AnnotationData } from "../../types/annotation";
import { normalizeColor } from "../../utils/color";

type RedrawAnnotationParams = {
  annotationLineWidth: number;
  data: AnnotationData | null;
  doorColor: string;
  group: THREE.Group;
  height: number;
  roomColor: string;
  wallMax: number;
  wallMin: number;
  width: number;
  windowColor: string;
};

const to2DPoints = (coords: number[] | number[][]): Array<[number, number]> => {
  if (Array.isArray(coords[0])) {
    return (coords as number[][]).map(([x, y]) => [x, y]);
  }
  const flat = coords as number[];
  const result: Array<[number, number]> = [];
  for (let i = 0; i < flat.length; i += 2) {
    result.push([flat[i], flat[i + 1]]);
  }
  return result;
};

const to3DPoints = (quad: number[] | number[][]): Array<[number, number, number]> => {
  if (Array.isArray(quad[0])) {
    return (quad as number[][]).map(([x, y, z]) => [x, y, z]);
  }
  const flat = quad as number[];
  const result: Array<[number, number, number]> = [];
  for (let i = 0; i < flat.length; i += 3) {
    result.push([flat[i], flat[i + 1], flat[i + 2]]);
  }
  return result;
};

export const redrawAnnotationObjects = ({
  annotationLineWidth,
  data,
  doorColor,
  group,
  height,
  roomColor,
  wallMax,
  wallMin,
  width,
  windowColor,
}: RedrawAnnotationParams) => {
  while (group.children.length) {
    const child = group.children.pop();
    if (!child) continue;
    const line = child as THREE.Line;
    line.geometry?.dispose();
    (line.material as THREE.Material)?.dispose();
  }

  if (!data) return;

  const addLine = (pts: Array<[number, number, number]>, colorHex: string, closed = false) => {
    if (pts.length < 2) return;
    const linePoints = [...pts];
    if (closed) linePoints.push(pts[0]);

    const positions = linePoints.flatMap(([x, y, z]) => [x, y, z]);
    const geometry = new LineGeometry();
    geometry.setPositions(positions);

    const material = new LineMaterial({
      color: normalizeColor(colorHex),
      linewidth: annotationLineWidth,
      worldUnits: false,
    });
    material.resolution.set(width, height);

    const line = new Line2(geometry, material);
    line.computeLineDistances();
    group.add(line);
  };

  const floorPlan = data.floor_plan ?? {};
  Object.values(floorPlan).forEach((coords) => {
    const roomPts = to2DPoints(coords);
    const floorPts = roomPts.map(([x, y]) => [x, y, wallMin] as [number, number, number]);
    addLine(floorPts, roomColor, true);

    for (let i = 0; i < roomPts.length; i++) {
      const [x1, y1] = roomPts[i];
      const [x2, y2] = roomPts[(i + 1) % roomPts.length];
      addLine(
        [
          [x1, y1, wallMin],
          [x2, y2, wallMin],
        ],
        roomColor,
      );
      addLine(
        [
          [x1, y1, wallMax],
          [x2, y2, wallMax],
        ],
        roomColor,
      );
      addLine(
        [
          [x1, y1, wallMin],
          [x1, y1, wallMax],
        ],
        roomColor,
      );
      addLine(
        [
          [x2, y2, wallMin],
          [x2, y2, wallMax],
        ],
        roomColor,
      );
    }
  });

  const windows = data.door_window?.windows ?? {};
  Object.values(windows).forEach((list) => {
    list.forEach((quad) => addLine(to3DPoints(quad), windowColor, true));
  });

  const doors = data.door_window?.doors ?? {};
  Object.values(doors).forEach((list) => {
    list.forEach((quad) => addLine(to3DPoints(quad), doorColor, true));
  });
};
