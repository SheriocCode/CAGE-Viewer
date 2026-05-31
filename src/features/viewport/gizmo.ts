import * as THREE from "three";

type GizmoElementRefs = {
  x: HTMLDivElement | null;
  y: HTMLDivElement | null;
  z: HTMLDivElement | null;
};

export const updateViewGizmo = (camera: THREE.Camera | null, axisRefs: GizmoElementRefs, lineRefs: GizmoElementRefs) => {
  if (!camera) return;

  const invQ = camera.quaternion.clone().invert();
  const axes = {
    x: new THREE.Vector3(1, 0, 0).applyQuaternion(invQ),
    y: new THREE.Vector3(0, 1, 0).applyQuaternion(invQ),
    z: new THREE.Vector3(0, 0, 1).applyQuaternion(invQ),
  };

  const radius = 16;
  const center = 28;
  (Object.keys(axes) as Array<keyof typeof axes>).forEach((key) => {
    const el = axisRefs[key];
    if (!el) return;
    const v = axes[key];
    const x = center + v.x * radius;
    const y = center - v.y * radius;
    const depth = (v.z + 1) * 0.5;

    const line = lineRefs[key];
    if (line) {
      const dx = x - center;
      const dy = y - center;
      const len = Math.max(2, Math.sqrt(dx * dx + dy * dy));
      line.style.left = `${center}px`;
      line.style.top = `${center}px`;
      line.style.width = `${len}px`;
      line.style.transform = `translateY(-50%) rotate(${Math.atan2(dy, dx)}rad)`;
      line.style.opacity = `${0.35 + depth * 0.5}`;
    }

    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.opacity = `${0.55 + depth * 0.45}`;
    el.style.transform = `translate(-50%, -50%) scale(${0.85 + depth * 0.35})`;
  });
};
