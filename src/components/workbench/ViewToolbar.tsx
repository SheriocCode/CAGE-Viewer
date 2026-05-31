import { Compass } from "lucide-react";

export type ViewPreset = "top" | "front" | "right" | "iso" | "fit";

type ViewToolbarProps = {
  activeViewPreset: ViewPreset;
  onFitView: () => void;
  onPresetView: (preset: Exclude<ViewPreset, "fit">) => void;
};

export function ViewToolbar({ activeViewPreset, onFitView, onPresetView }: ViewToolbarProps) {
  return (
    <aside className="left-toolbar card-shadow">
      <button className={`tool-btn ${activeViewPreset === "top" ? "active" : ""}`} onClick={() => onPresetView("top")} title="顶部视图" aria-label="顶部视图">
        Top
      </button>
      <button className={`tool-btn ${activeViewPreset === "front" ? "active" : ""}`} onClick={() => onPresetView("front")} title="前视图" aria-label="前视图">
        Fr
      </button>
      <button className={`tool-btn ${activeViewPreset === "right" ? "active" : ""}`} onClick={() => onPresetView("right")} title="右视图" aria-label="右视图">
        Rt
      </button>
      <button className={`tool-btn ${activeViewPreset === "iso" ? "active" : ""}`} onClick={() => onPresetView("iso")} title="等轴视图" aria-label="等轴视图">
        Iso
      </button>
      <button className={`tool-btn ${activeViewPreset === "fit" ? "active" : ""}`} onClick={onFitView} title="适配视图" aria-label="适配视图">
        <Compass size={18} />
      </button>
    </aside>
  );
}
