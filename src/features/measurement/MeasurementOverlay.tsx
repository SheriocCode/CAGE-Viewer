import { LocateFixed, MousePointer2, Route, Ruler, Square } from "lucide-react";
import type { MeasurementItem, MeasurementPoint, MeasurementTool, RectDraft, ScreenPoint } from "../../types/measurement";
import { summarizeMeasurement } from "../../utils/measurement";

type MeasurementOverlayItem = {
  measurement: MeasurementItem;
  point: ScreenPoint;
};

type MeasurementOverlayProps = {
  activeTool: MeasurementTool | null;
  draftPoints: MeasurementPoint[];
  enabled: boolean;
  items: MeasurementOverlayItem[];
  pendingLinePoint: MeasurementPoint | null;
  projectPointToScreen: (point: MeasurementPoint) => ScreenPoint | null;
  rectDraft: RectDraft | null;
  selectedMeasurementId: string | null;
  onSelectMeasurement: (measurementId: string) => void;
  onSelectTool: (tool: MeasurementTool) => void;
};

export function MeasurementOverlay({
  activeTool,
  draftPoints,
  enabled,
  items,
  pendingLinePoint,
  projectPointToScreen,
  rectDraft,
  selectedMeasurementId,
  onSelectMeasurement,
  onSelectTool,
}: MeasurementOverlayProps) {
  if (!enabled) return null;

  const pendingLinePointScreen = pendingLinePoint ? projectPointToScreen(pendingLinePoint) : null;

  return (
    <>
      <div className="measurement-toolbar" aria-label="测量工具栏">
        <button
          className={`measurement-toolbar-btn ${activeTool === "select" ? "active" : ""}`}
          onClick={() => onSelectTool("select")}
          title="选择/旋转"
          type="button"
        >
          <MousePointer2 size={16} />
          <small>选择</small>
        </button>
        <button
          className={`measurement-toolbar-btn ${activeTool === "rect" ? "active" : ""}`}
          onClick={() => onSelectTool("rect")}
          title="矩形区域测量"
          type="button"
        >
          <Square size={16} />
          <small>矩形</small>
        </button>
        <button
          className={`measurement-toolbar-btn ${activeTool === "line" ? "active" : ""}`}
          onClick={() => onSelectTool("line")}
          title="线段距离"
          type="button"
        >
          <Ruler size={16} />
          <small>线段</small>
        </button>
        <button
          className={`measurement-toolbar-btn ${activeTool === "polyline" ? "active" : ""}`}
          onClick={() => onSelectTool("polyline")}
          title="折线距离：连续点击取点，双击或按 Enter 完成"
          type="button"
        >
          <Route size={16} />
          <small>折线</small>
        </button>
        <button
          className={`measurement-toolbar-btn ${activeTool === "angle" ? "active" : ""}`}
          onClick={() => onSelectTool("angle")}
          title="角度测量：依次选择端点、顶点、端点"
          type="button"
        >
          <LocateFixed size={16} />
          <small>角度</small>
        </button>
      </div>

      {rectDraft && (
        <div
          className="measurement-selection"
          style={{
            left: Math.min(rectDraft.start.x, rectDraft.current.x),
            top: Math.min(rectDraft.start.y, rectDraft.current.y),
            width: Math.abs(rectDraft.current.x - rectDraft.start.x),
            height: Math.abs(rectDraft.current.y - rectDraft.start.y),
          }}
        />
      )}

      {pendingLinePointScreen && (
        <div
          className="measurement-pending-dot"
          style={{
            left: pendingLinePointScreen.x,
            top: pendingLinePointScreen.y,
          }}
        />
      )}

      {draftPoints.map((point, index) => {
        const screen = projectPointToScreen(point);
        if (!screen) return null;
        return (
          <div
            className="measurement-pending-dot"
            key={`draft-${index}`}
            style={{
              left: screen.x,
              top: screen.y,
            }}
          />
        );
      })}

      {items.map(({ measurement, point }) => (
        <button
          className={`measurement-label ${selectedMeasurementId === measurement.id ? "active" : ""}`}
          key={measurement.id}
          onClick={() => onSelectMeasurement(measurement.id)}
          style={{ left: point.x, top: point.y }}
          type="button"
        >
          <span>{measurement.label}</span>
          <strong>{summarizeMeasurement(measurement)}</strong>
        </button>
      ))}
    </>
  );
}
