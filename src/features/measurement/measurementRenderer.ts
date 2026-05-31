import * as THREE from "three";
import type { MeasurementAxis, MeasurementItem, MeasurementPoint, MeasurementTool } from "../../types/measurement";
import { MEASUREMENT_AXIS_COLORS, MEASUREMENT_AXIS_VECTORS, pointToVector } from "../../utils/measurement";

type RedrawMeasurementsParams = {
  activeDragAxis: MeasurementAxis | null;
  activeMeasurementTool: MeasurementTool | null;
  draftMeasurementPoints: MeasurementPoint[];
  draggedMeasurementPointId?: string;
  draggedMeasurementPointIndex?: number;
  group: THREE.Group;
  measurementEnabled: boolean;
  measurements: MeasurementItem[];
  selectedMeasurementId: string | null;
};

const disposeMeasurementObject = (object: THREE.Object3D) => {
  object.traverse((child) => {
    if (child instanceof THREE.Line || child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const material = child.material as THREE.Material | THREE.Material[];
      if (Array.isArray(material)) {
        material.forEach((item) => item.dispose());
      } else {
        material.dispose();
      }
    }
  });
};

export const redrawMeasurementObjects = ({
  activeDragAxis,
  activeMeasurementTool,
  draftMeasurementPoints,
  draggedMeasurementPointId,
  draggedMeasurementPointIndex,
  group,
  measurementEnabled,
  measurements,
  selectedMeasurementId,
}: RedrawMeasurementsParams) => {
  while (group.children.length) {
    const child = group.children.pop();
    if (!child) continue;
    disposeMeasurementObject(child);
  }

  if (!measurementEnabled) return;

  measurements.forEach((measurement) => {
    const isSelected = selectedMeasurementId === measurement.id;
    const color = isSelected ? 0xc7ff4a : 0x66b7ff;
    const vertices = measurement.points.map(pointToVector);
    const lineVertices = measurement.type === "rect" && vertices.length >= 4 ? [...vertices, vertices[0]] : vertices;
    if (lineVertices.length >= 2) {
      const geometry = new THREE.BufferGeometry().setFromPoints(lineVertices);
      const material = new THREE.LineBasicMaterial({ color, depthTest: false });
      const line = new THREE.Line(geometry, material);
      line.renderOrder = 30;
      group.add(line);
    }

    vertices.forEach((point) => {
      const geometry = new THREE.SphereGeometry(isSelected ? 0.055 : 0.04, 12, 12);
      const material = new THREE.MeshBasicMaterial({ color, depthTest: false });
      const handle = new THREE.Mesh(geometry, material);
      handle.position.copy(point);
      handle.renderOrder = 31;
      group.add(handle);
    });
  });

  if (draggedMeasurementPointId && typeof draggedMeasurementPointIndex === "number") {
    const draggedMeasurement = measurements.find((measurement) => measurement.id === draggedMeasurementPointId);
    const anchorPoint = draggedMeasurement?.points[draggedMeasurementPointIndex];
    if (anchorPoint) {
      const anchor = pointToVector(anchorPoint);
      const length = 0.5;
      const headLength = length * 0.22;
      const headWidth = length * 0.09;

      (Object.keys(MEASUREMENT_AXIS_VECTORS) as MeasurementAxis[]).forEach((axis) => {
        const isActive = activeDragAxis === axis;
        const arrow = new THREE.ArrowHelper(
          MEASUREMENT_AXIS_VECTORS[axis],
          anchor,
          length,
          isActive ? 0xc7ff4a : MEASUREMENT_AXIS_COLORS[axis],
          isActive ? headLength * 1.25 : headLength,
          isActive ? headWidth * 1.35 : headWidth,
        );
        arrow.traverse((child) => {
          child.renderOrder = isActive ? 43 : 42;
          if (child instanceof THREE.Line) {
            child.material = new THREE.LineBasicMaterial({
              color: isActive ? 0xc7ff4a : MEASUREMENT_AXIS_COLORS[axis],
              depthTest: false,
              transparent: true,
              opacity: isActive ? 1 : 0.78,
            });
          }
          if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshBasicMaterial({
              color: isActive ? 0xc7ff4a : MEASUREMENT_AXIS_COLORS[axis],
              depthTest: false,
              transparent: true,
              opacity: isActive ? 1 : 0.86,
            });
          }
        });
        group.add(arrow);
      });
    }
  }

  if ((activeMeasurementTool === "polyline" || activeMeasurementTool === "angle") && draftMeasurementPoints.length > 0) {
    const vertices = draftMeasurementPoints.map(pointToVector);
    if (vertices.length >= 2) {
      const geometry = new THREE.BufferGeometry().setFromPoints(vertices);
      const material = new THREE.LineBasicMaterial({ color: 0xc7ff4a, depthTest: false, transparent: true, opacity: 0.75 });
      const line = new THREE.Line(geometry, material);
      line.renderOrder = 32;
      group.add(line);
    }

    vertices.forEach((point) => {
      const geometry = new THREE.SphereGeometry(0.045, 12, 12);
      const material = new THREE.MeshBasicMaterial({ color: 0xc7ff4a, depthTest: false });
      const handle = new THREE.Mesh(geometry, material);
      handle.position.copy(point);
      handle.renderOrder = 33;
      group.add(handle);
    });
  }
};
