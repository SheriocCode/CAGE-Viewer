import { ChevronDown, ChevronRight, Cloud, Eye, FolderOpen, Link2, PencilRuler, Ruler, SlidersHorizontal, Sparkles, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import type { MeasurementItem, MeasurementTool } from "../../types/measurement";
import type { PanelFeature, PanelFeatureId, PanelSectionId, QuickEntry } from "../../types/panel";
import type { CameraMode } from "../../types/view";
import { normalizeColor } from "../../utils/color";
import { formatMeasure, getLineDistance, getMeasurementTypeLabel, getRectMetrics, summarizeMeasurement } from "../../utils/measurement";

const PANEL_FEATURES: PanelFeature[] = [
  { id: "quick", label: "常用", icon: <SlidersHorizontal size={15} />, summary: "高频视口控制" },
  { id: "measurement", label: "测量", icon: <Ruler size={15} />, summary: "距离与区域测量" },
  { id: "file", label: "文件", icon: <FolderOpen size={15} />, summary: "点云与标注导入状态" },
  { id: "cloud", label: "点云", icon: <Cloud size={15} />, summary: "点大小与空间过滤" },
  { id: "view", label: "视图", icon: <Eye size={15} />, summary: "相机、网格与背景" },
  { id: "effect", label: "增强", icon: <Sparkles size={15} />, summary: "视觉增强参数" },
  { id: "annotation", label: "标注", icon: <PencilRuler size={15} />, summary: "标注颜色与线宽" },
];

type PanelSectionProps = {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: ReactNode;
};

function PanelSection({ title, collapsed, onToggle, children }: PanelSectionProps) {
  return (
    <section className="panel-section">
      <button className="collapse-header" onClick={onToggle} type="button">
        <h3>{title}</h3>
        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
      </button>
      {!collapsed && <div className="panel-section-body">{children}</div>}
    </section>
  );
}

type FeatureNavProps = {
  features: PanelFeature[];
  activeFeature: PanelFeatureId;
  onSelectFeature: (feature: PanelFeatureId) => void;
};

function FeatureNav({ features, activeFeature, onSelectFeature }: FeatureNavProps) {
  return (
    <nav className="feature-nav" aria-label="右侧功能目录">
      {features.map((feature) => (
        <button
          className={`feature-nav-item ${activeFeature === feature.id ? "active" : ""}`}
          key={feature.id}
          onClick={() => onSelectFeature(feature.id)}
          title={feature.summary}
          type="button"
        >
          {feature.icon}
          <span>{feature.label}</span>
        </button>
      ))}
    </nav>
  );
}

type QuickControlsProps = {
  entries: QuickEntry[];
  onLocateEntry: (feature: PanelFeatureId, section?: PanelSectionId) => void;
};

function QuickControls({ entries, onLocateEntry }: QuickControlsProps) {
  return (
    <section className="quick-controls" aria-label="常用控制">
      <div className="quick-entry-list">
        {entries.map((entry) => (
          <div className="quick-entry" key={entry.id}>
            <div className="quick-entry-copy">
              <span>{entry.label}</span>
              <strong>{entry.value}</strong>
            </div>
            <button
              className="quick-entry-link"
              type="button"
              onClick={() => onLocateEntry(entry.feature, entry.section)}
              title={`定位到${entry.label}`}
              aria-label={`定位到${entry.label}`}
            >
              <Link2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

type PanelControlProps = {
  pointSize: number;
  zThresholdRatio: number;
  cameraMode: CameraMode;
  showGrid: boolean;
  showAxes: boolean;
  edlEnabled: boolean;
  measurementEnabled: boolean;
  activeMeasurementTool: MeasurementTool | null;
  measurements: MeasurementItem[];
  selectedMeasurementId: string | null;
  setPointSize: (value: number) => void;
  setZThresholdRatio: (value: number) => void;
  setCameraMode: (mode: CameraMode) => void;
  setShowGrid: (value: boolean) => void;
  setShowAxes: (value: boolean) => void;
  setEdlEnabled: (value: boolean) => void;
  setMeasurementEnabled: (value: boolean) => void;
  setActiveMeasurementTool: (value: MeasurementTool | null) => void;
  setSelectedMeasurementId: (value: string | null) => void;
  deleteMeasurement: (id: string) => void;
};

type FeaturePaneProps = PanelControlProps & {
  activeFeature: PanelFeatureId;
  feature: PanelFeature;
  quickEntries: QuickEntry[];
  collapsedSections: Record<PanelSectionId, boolean>;
  locateEntry: (feature: PanelFeatureId, section?: PanelSectionId) => void;
  toggleSection: (key: PanelSectionId) => void;
  plyFileName: string;
  annotationFileName: string;
  viewportBgColor: string;
  edlStrength: number;
  edlRadius: number;
  roomColor: string;
  doorColor: string;
  windowColor: string;
  annotationLineWidth: number;
  setViewportBgColor: (value: string) => void;
  setEdlStrength: (value: number) => void;
  setEdlRadius: (value: number) => void;
  setRoomColor: (value: string) => void;
  setDoorColor: (value: string) => void;
  setWindowColor: (value: string) => void;
  setAnnotationLineWidth: (value: number) => void;
};

function FeaturePane({
  activeFeature,
  feature,
  quickEntries,
  collapsedSections,
  locateEntry,
  toggleSection,
  plyFileName,
  annotationFileName,
  pointSize,
  zThresholdRatio,
  cameraMode,
  viewportBgColor,
  showGrid,
  showAxes,
  edlEnabled,
  measurementEnabled,
  activeMeasurementTool,
  measurements,
  selectedMeasurementId,
  edlStrength,
  edlRadius,
  roomColor,
  doorColor,
  windowColor,
  annotationLineWidth,
  setPointSize,
  setZThresholdRatio,
  setCameraMode,
  setViewportBgColor,
  setShowGrid,
  setShowAxes,
  setEdlEnabled,
  setMeasurementEnabled,
  setActiveMeasurementTool,
  setSelectedMeasurementId,
  deleteMeasurement,
  setEdlStrength,
  setEdlRadius,
  setRoomColor,
  setDoorColor,
  setWindowColor,
  setAnnotationLineWidth,
}: FeaturePaneProps) {
  return (
    <div className="feature-pane">
      <header className="feature-pane-header">
        <div className="feature-pane-icon">{feature.icon}</div>
        <div className="feature-pane-copy">
          <h2>{feature.label}</h2>
          <p>{feature.summary}</p>
        </div>
        {activeFeature === "effect" && (
          <label className={`feature-toggle ${edlEnabled ? "active" : ""}`}>
            <span>{edlEnabled ? "开启" : "关闭"}</span>
            <input type="checkbox" checked={edlEnabled} onChange={(e) => setEdlEnabled(e.target.checked)} />
            <span className="feature-toggle-track" aria-hidden="true">
              <span className="feature-toggle-thumb" />
            </span>
          </label>
        )}
        {activeFeature === "measurement" && (
          <button
            className={`feature-toggle ${measurementEnabled ? "active" : ""}`}
            type="button"
            aria-pressed={measurementEnabled}
            onClick={() => {
              const nextMeasurementEnabled = !measurementEnabled;
              setMeasurementEnabled(nextMeasurementEnabled);
              if (nextMeasurementEnabled && !activeMeasurementTool) setActiveMeasurementTool("select");
            }}
          >
            <span>{measurementEnabled ? "开启" : "关闭"}</span>
            <span className="feature-toggle-track" aria-hidden="true">
              <span className="feature-toggle-thumb" />
            </span>
          </button>
        )}
      </header>

      {activeFeature === "quick" && <QuickControls entries={quickEntries} onLocateEntry={locateEntry} />}

      {activeFeature === "file" && (
        <PanelSection title="导入状态" collapsed={collapsedSections.fileStatus} onToggle={() => toggleSection("fileStatus")}>
          <div className="meta-list">
            <div className="meta-row">
              <span>点云</span>
              <strong title={plyFileName}>{plyFileName}</strong>
            </div>
            <div className="meta-row">
              <span>标注</span>
              <strong title={annotationFileName}>{annotationFileName}</strong>
            </div>
          </div>
        </PanelSection>
      )}

      {activeFeature === "measurement" && (
        <>
          <PanelSection title="结果" collapsed={collapsedSections.measurementResults} onToggle={() => toggleSection("measurementResults")}>
            {measurements.length === 0 ? (
              <p>暂无测量结果。开启测量后在 3D 视口中创建距离或区域测量。</p>
            ) : (
              <div className="measurement-result-list">
                {measurements.map((measurement) => (
                  <button
                    className={`measurement-result-item ${selectedMeasurementId === measurement.id ? "active" : ""}`}
                    key={measurement.id}
                    onClick={() => setSelectedMeasurementId(measurement.id)}
                    type="button"
                  >
                    <span>{measurement.label}</span>
                    <strong>{summarizeMeasurement(measurement)}</strong>
                    <small>{measurement.type === "rect" ? `${measurement.pointCount ?? 0} 点` : `${measurement.points.length} 点`}</small>
                  </button>
                ))}
              </div>
            )}
          </PanelSection>
          <PanelSection title="详情" collapsed={collapsedSections.measurementDetails} onToggle={() => toggleSection("measurementDetails")}>
            {measurements.find((item) => item.id === selectedMeasurementId) ? (
              (() => {
                const measurement = measurements.find((item) => item.id === selectedMeasurementId)!;
                const rect = getRectMetrics(measurement.points);
                return (
                  <div className="measurement-detail">
                    <div className="meta-row">
                      <span>类型</span>
                      <strong>{getMeasurementTypeLabel(measurement.type)}</strong>
                    </div>
                    <div className="meta-row">
                      <span>结果</span>
                      <strong>{summarizeMeasurement(measurement)}</strong>
                    </div>
                    {measurement.type === "rect" && (
                      <>
                        <div className="meta-row">
                          <span>宽度</span>
                          <strong>{formatMeasure(rect.width, "u")}</strong>
                        </div>
                        <div className="meta-row">
                          <span>深度</span>
                          <strong>{formatMeasure(rect.depth, "u")}</strong>
                        </div>
                      </>
                    )}
                    {measurement.type === "polyline" && (
                      <div className="meta-row">
                        <span>节点数</span>
                        <strong>{measurement.points.length}</strong>
                      </div>
                    )}
                    {measurement.type === "angle" && measurement.points.length >= 3 && (
                      <>
                        <div className="meta-row">
                          <span>顶点</span>
                          <strong>2</strong>
                        </div>
                        <div className="meta-row">
                          <span>边长</span>
                          <strong>{`${formatMeasure(getLineDistance([measurement.points[1], measurement.points[0]]), "u")} / ${formatMeasure(getLineDistance([measurement.points[1], measurement.points[2]]), "u")}`}</strong>
                        </div>
                      </>
                    )}
                    <div className="measurement-point-list">
                      {measurement.points.map((point, index) => (
                        <code key={`${measurement.id}-${index}`}>{`${index + 1}: ${point.map((value) => value.toFixed(3)).join(", ")}`}</code>
                      ))}
                    </div>
                    <button className="btn ghost" onClick={() => deleteMeasurement(measurement.id)} type="button">
                      <Trash2 size={14} /> 删除测量
                    </button>
                  </div>
                );
              })()
            ) : (
              <p>从结果列表中选择一项查看坐标和统计信息。</p>
            )}
          </PanelSection>
        </>
      )}

      {activeFeature === "cloud" && (
        <>
          <PanelSection title="基础参数" collapsed={collapsedSections.cloudBasic} onToggle={() => toggleSection("cloudBasic")}>
            <label className="control-row">
              <span>点大小</span>
              <output>{pointSize}</output>
              <input type="range" min={1} max={10} value={pointSize} onChange={(e) => setPointSize(Number(e.target.value))} />
            </label>
            <label className="control-row">
              <span>Z 轴过滤</span>
              <output>{zThresholdRatio}%</output>
              <input type="range" min={0} max={100} value={zThresholdRatio} onChange={(e) => setZThresholdRatio(Number(e.target.value))} />
            </label>
          </PanelSection>
          <PanelSection title="高级参数" collapsed={collapsedSections.cloudAdvanced} onToggle={() => toggleSection("cloudAdvanced")}>
            <p>后续点云渲染、采样和过滤参数可放在这里。</p>
          </PanelSection>
        </>
      )}

      {activeFeature === "view" && (
        <>
          <PanelSection title="相机" collapsed={collapsedSections.viewProjection} onToggle={() => toggleSection("viewProjection")}>
            <label className="control-row">
              <span>投影模式</span>
              <select value={cameraMode} onChange={(e) => setCameraMode(e.target.value as CameraMode)}>
                <option value="ortho">正射投影</option>
                <option value="perspective">透视投影</option>
              </select>
            </label>
          </PanelSection>
          <PanelSection title="显示" collapsed={collapsedSections.viewDisplay} onToggle={() => toggleSection("viewDisplay")}>
            <label className="switch-row">
              <span>显示网格</span>
              <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
            </label>
            <label className="switch-row">
              <span>显示 XYZ 轴</span>
              <input type="checkbox" checked={showAxes} onChange={(e) => setShowAxes(e.target.checked)} />
            </label>
            <label className="swatch-row">
              <span>背景色</span>
              <input type="color" value={viewportBgColor} onChange={(e) => setViewportBgColor(e.target.value)} />
            </label>
          </PanelSection>
        </>
      )}

      {activeFeature === "effect" && (
        <PanelSection title="高级参数" collapsed={collapsedSections.effectAdvanced} onToggle={() => toggleSection("effectAdvanced")}>
          <label className="control-row">
            <span>强度</span>
            <output>{edlStrength.toFixed(1)}</output>
            <input
              type="range"
              min={0}
              max={5}
              step={0.1}
              value={edlStrength}
              disabled={!edlEnabled}
              onChange={(e) => setEdlStrength(Number(e.target.value))}
            />
          </label>
          <label className="control-row">
            <span>半径</span>
            <output>{edlRadius.toFixed(1)}</output>
            <input
              type="range"
              min={0}
              max={5}
              step={0.1}
              value={edlRadius}
              disabled={!edlEnabled}
              onChange={(e) => setEdlRadius(Number(e.target.value))}
            />
          </label>
        </PanelSection>
      )}

      {activeFeature === "annotation" && (
        <>
          <PanelSection title="颜色" collapsed={collapsedSections.annotationColors} onToggle={() => toggleSection("annotationColors")}>
            <label className="swatch-row">
              <span>房间</span>
              <input type="color" value={normalizeColor(roomColor)} onChange={(e) => setRoomColor(e.target.value)} />
            </label>
            <label className="swatch-row">
              <span>门</span>
              <input type="color" value={normalizeColor(doorColor)} onChange={(e) => setDoorColor(e.target.value)} />
            </label>
            <label className="swatch-row">
              <span>窗户</span>
              <input type="color" value={normalizeColor(windowColor)} onChange={(e) => setWindowColor(e.target.value)} />
            </label>
          </PanelSection>
          <PanelSection title="线条" collapsed={collapsedSections.annotationStroke} onToggle={() => toggleSection("annotationStroke")}>
            <label className="control-row">
              <span>线宽</span>
              <output>{annotationLineWidth}</output>
              <input type="range" min={1} max={8} value={annotationLineWidth} onChange={(e) => setAnnotationLineWidth(Number(e.target.value))} />
            </label>
          </PanelSection>
          <PanelSection title="操作" collapsed={collapsedSections.annotationActions} onToggle={() => toggleSection("annotationActions")}>
            <button
              className="btn ghost"
              type="button"
              onClick={() => {
                setRoomColor("#b8f24d");
                setDoorColor("#ff5d73");
                setWindowColor("#66b7ff");
              }}
            >
              重置标注颜色
            </button>
          </PanelSection>
        </>
      )}
    </div>
  );
}

export type RightPanelProps = PanelControlProps & {
  activeFeature: PanelFeatureId;
  collapsedSections: Record<PanelSectionId, boolean>;
  plyFileName: string;
  annotationFileName: string;
  viewportBgColor: string;
  edlStrength: number;
  edlRadius: number;
  roomColor: string;
  doorColor: string;
  windowColor: string;
  annotationLineWidth: number;
  setActiveFeature: (feature: PanelFeatureId) => void;
  openSection: (key: PanelSectionId) => void;
  toggleSection: (key: PanelSectionId) => void;
  setViewportBgColor: (value: string) => void;
  setEdlStrength: (value: number) => void;
  setEdlRadius: (value: number) => void;
  setRoomColor: (value: string) => void;
  setDoorColor: (value: string) => void;
  setWindowColor: (value: string) => void;
  setAnnotationLineWidth: (value: number) => void;
};

export function RightPanel(props: RightPanelProps) {
  const activeFeature = PANEL_FEATURES.find((feature) => feature.id === props.activeFeature) ?? PANEL_FEATURES[0];
  const locateEntry = (feature: PanelFeatureId, section?: PanelSectionId) => {
    props.setActiveFeature(feature);
    if (section) props.openSection(section);
  };
  const quickEntries: QuickEntry[] = [
    { id: "file-ply", label: "点云文件", value: props.plyFileName, feature: "file", section: "fileStatus" },
    { id: "file-annotation", label: "标注文件", value: props.annotationFileName, feature: "file", section: "fileStatus" },
    { id: "cloud-point-size", label: "点大小", value: String(props.pointSize), feature: "cloud", section: "cloudBasic" },
    { id: "cloud-z-filter", label: "Z 轴过滤", value: `${props.zThresholdRatio}%`, feature: "cloud", section: "cloudBasic" },
    { id: "view-camera", label: "投影模式", value: props.cameraMode === "perspective" ? "透视投影" : "正射投影", feature: "view", section: "viewProjection" },
    { id: "view-grid", label: "显示网格", value: props.showGrid ? "开启" : "关闭", feature: "view", section: "viewDisplay" },
    { id: "view-axes", label: "显示 XYZ 轴", value: props.showAxes ? "开启" : "关闭", feature: "view", section: "viewDisplay" },
    { id: "view-bg", label: "背景色", value: props.viewportBgColor, feature: "view", section: "viewDisplay" },
    { id: "measure-enabled", label: "测量模式", value: props.measurementEnabled ? "开启" : "关闭", feature: "measurement" },
    {
      id: "measure-tool",
      label: "测量工具",
      value: props.activeMeasurementTool === "select" ? "选择/旋转" : props.activeMeasurementTool ?? "未选择",
      feature: "measurement",
      section: "measurementResults",
    },
    { id: "measure-count", label: "测量结果", value: `${props.measurements.length} 项`, feature: "measurement", section: "measurementResults" },
    { id: "effect-enabled", label: "视觉增强", value: props.edlEnabled ? "开启" : "关闭", feature: "effect" },
    { id: "effect-strength", label: "增强强度", value: String(props.edlStrength), feature: "effect", section: "effectAdvanced" },
    { id: "effect-radius", label: "增强半径", value: String(props.edlRadius), feature: "effect", section: "effectAdvanced" },
    { id: "annotation-room", label: "房间颜色", value: normalizeColor(props.roomColor), feature: "annotation", section: "annotationColors" },
    { id: "annotation-door", label: "门颜色", value: normalizeColor(props.doorColor), feature: "annotation", section: "annotationColors" },
    { id: "annotation-window", label: "窗户颜色", value: normalizeColor(props.windowColor), feature: "annotation", section: "annotationColors" },
    { id: "annotation-line", label: "标注线宽", value: String(props.annotationLineWidth), feature: "annotation", section: "annotationStroke" },
    { id: "annotation-reset", label: "重置标注颜色", value: "操作", feature: "annotation", section: "annotationActions" },
  ];

  return (
    <aside className="right-panel card-shadow">
      <div className="feature-layout">
        <FeatureNav features={PANEL_FEATURES} activeFeature={props.activeFeature} onSelectFeature={props.setActiveFeature} />
        <FeaturePane feature={activeFeature} quickEntries={quickEntries} locateEntry={locateEntry} {...props} />
      </div>
    </aside>
  );
}
