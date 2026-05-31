import type { MutableRefObject } from "react";

type GizmoRefs = {
  x: HTMLDivElement | null;
  y: HTMLDivElement | null;
  z: HTMLDivElement | null;
};

type ViewportGizmoProps = {
  axisRefs: MutableRefObject<GizmoRefs>;
  lineRefs: MutableRefObject<GizmoRefs>;
  onPresetView: (preset: "top" | "front" | "right") => void;
};

export function ViewportGizmo({ axisRefs, lineRefs, onPresetView }: ViewportGizmoProps) {
  return (
    <div className="xyz-gizmo" aria-label="XYZ 视角导航">
      <div
        className="axis-line x"
        ref={(el) => {
          lineRefs.current.x = el;
        }}
      />
      <div
        className="axis-line y"
        ref={(el) => {
          lineRefs.current.y = el;
        }}
      />
      <div
        className="axis-line z"
        ref={(el) => {
          lineRefs.current.z = el;
        }}
      />
      <div
        className="axis x"
        onClick={() => onPresetView("right")}
        title="切换到右视图"
        ref={(el) => {
          axisRefs.current.x = el;
        }}
      >
        X
      </div>
      <div
        className="axis y"
        onClick={() => onPresetView("front")}
        title="切换到前视图"
        ref={(el) => {
          axisRefs.current.y = el;
        }}
      >
        Y
      </div>
      <div
        className="axis z"
        onClick={() => onPresetView("top")}
        title="切换到顶视图"
        ref={(el) => {
          axisRefs.current.z = el;
        }}
      >
        Z
      </div>
    </div>
  );
}
