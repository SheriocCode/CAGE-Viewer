import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import type { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import type { EDLPass } from "./EDLPass";
import { RightPanel } from "./components/panel/RightPanel";
import { CoordinateRulers } from "./components/workbench/CoordinateRulers";
import { StatusBar } from "./components/workbench/StatusBar";
import { TopMenuBar } from "./components/workbench/TopMenuBar";
import { ViewportGizmo } from "./components/workbench/ViewportGizmo";
import { ViewToolbar, type ViewPreset } from "./components/workbench/ViewToolbar";
import { ViewportStats } from "./components/workbench/ViewportStats";
import { redrawAnnotationObjects } from "./features/annotation/annotationRenderer";
import { MeasurementOverlay } from "./features/measurement/MeasurementOverlay";
import {
  createLineMeasurementItem,
  createPointMeasurementItem,
  createRectMeasurementItem,
  updateMeasurementPointInList,
} from "./features/measurement/measurementActions";
import {
  getPointsInScreenRect,
  getViewportPoint,
  pickPointFromCanvas,
  projectPointToScreen,
  projectPointerToMeasurementAxis,
  projectPointerToZPlane,
  projectViewportPointToZPlane,
} from "./features/measurement/measurementPicking";
import { redrawMeasurementObjects } from "./features/measurement/measurementRenderer";
import { createFilteredPointCloud, disposePointCloud } from "./features/point-cloud/pointCloud";
import { renderCoordinateRulers } from "./features/viewport/coordinateRulers";
import { createDynamicGrid, getGridSignature, getReferenceBox, getVisibleGridRange } from "./features/viewport/grid";
import { applyViewParamsToViewport, buildViewParamsSnapshot } from "./features/view-params/viewParams";
import { useThreeViewport } from "./hooks/useThreeViewport";
import { useMeasurementInteraction } from "./hooks/useMeasurementInteraction";
import { useFileActions } from "./hooks/useFileActions";
import type { AnnotationData } from "./types/annotation";
import type { DraggedMeasurementPoint, MeasurementAxis, MeasurementItem, MeasurementPoint, MeasurementTool, RectDraft, ScreenPoint } from "./types/measurement";
import type { PanelFeatureId, PanelSectionId } from "./types/panel";
import type { RulerRefs } from "./types/ruler";
import type { CameraMode, ViewParamsSnapshot } from "./types/view";
import { getMeasurementCenter, vectorToPoint } from "./utils/measurement";
import "./App.css";

function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const inputPlyRef = useRef<HTMLInputElement>(null);
  const inputAnnoRef = useRef<HTMLInputElement>(null);
  const inputViewParamsRef = useRef<HTMLInputElement>(null);

  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const perspectiveCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orthographicCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const activeCameraRef = useRef<THREE.Camera | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const renderPassRef = useRef<RenderPass | null>(null);
  const edlPassRef = useRef<EDLPass | null>(null);

  const pointCloudRef = useRef<THREE.Points | null>(null);
  const gridRef = useRef<THREE.LineSegments | null>(null);
  const gridSignatureRef = useRef<string>("");
  const showGridRef = useRef(true);
  const axesRef = useRef<THREE.AxesHelper | null>(null);
  const rulerRefs = useRef<RulerRefs>({ left: null, bottom: null, right: null });
  const rulerSignatureRef = useRef("");
  const gizmoAxisRefs = useRef<{ x: HTMLDivElement | null; y: HTMLDivElement | null; z: HTMLDivElement | null }>({
    x: null,
    y: null,
    z: null,
  });
  const gizmoLineRefs = useRef<{ x: HTMLDivElement | null; y: HTMLDivElement | null; z: HTMLDivElement | null }>({
    x: null,
    y: null,
    z: null,
  });
  const annotationGroupRef = useRef<THREE.Group>(new THREE.Group());
  const measurementGroupRef = useRef<THREE.Group>(new THREE.Group());
  const measurementsRef = useRef<MeasurementItem[]>([]);
  const selectedMeasurementIdRef = useRef<string | null>(null);
  const originalPositionsRef = useRef<Float32Array | null>(null);
  const originalColorsRef = useRef<Float32Array | null>(null);
  const zRangeRef = useRef({ min: 0, max: 3 });
  const boundingBoxRef = useRef<THREE.Box3 | null>(null);
  const annotationDataRef = useRef<AnnotationData | null>(null);
  const edlEnabledRef = useRef(false);
  const edlStrengthRef = useRef(0.6);
  const edlRadiusRef = useRef(0.6);
  const hasAutoFramedRef = useRef(false);

  const [plyFileName, setPlyFileName] = useState("未导入点云");
  const [annotationFileName, setAnnotationFileName] = useState("未导入标注");
  const [pointSize, setPointSize] = useState(3);
  const [zThresholdRatio, setZThresholdRatio] = useState(10);
  const [cameraMode, setCameraMode] = useState<CameraMode>("perspective");
  const [edlEnabled, setEdlEnabled] = useState(false);
  const [edlStrength, setEdlStrength] = useState(0.6);
  const [edlRadius, setEdlRadius] = useState(0.6);
  const [roomColor, setRoomColor] = useState("#b8f24d");
  const [doorColor, setDoorColor] = useState("#ff5d73");
  const [windowColor, setWindowColor] = useState("#66b7ff");
  const [activeViewPreset, setActiveViewPreset] = useState<ViewPreset>("iso");
  const [openMenu, setOpenMenu] = useState<"file" | "export" | null>(null);
  const [viewportBgColor, setViewportBgColor] = useState("#08090a");
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [annotationLineWidth, setAnnotationLineWidth] = useState(2);
  const [measurementEnabled, setMeasurementEnabled] = useState(false);
  const [activeMeasurementTool, setActiveMeasurementTool] = useState<MeasurementTool | null>("select");
  const [measurements, setMeasurements] = useState<MeasurementItem[]>([]);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null);
  const [pendingLinePoint, setPendingLinePoint] = useState<MeasurementPoint | null>(null);
  const [draftMeasurementPoints, setDraftMeasurementPoints] = useState<MeasurementPoint[]>([]);
  const [rectDraft, setRectDraft] = useState<RectDraft | null>(null);
  const [draggedMeasurementPoint, setDraggedMeasurementPoint] = useState<DraggedMeasurementPoint | null>(null);
  const [activeDragAxis, setActiveDragAxis] = useState<MeasurementAxis | null>(null);
  const [isMeasurementHandleHover, setIsMeasurementHandleHover] = useState(false);
  const [measurementLabelTick, setMeasurementLabelTick] = useState(0);
  const [activePanelFeature, setActivePanelFeature] = useState<PanelFeatureId>("quick");
  const [collapsedSections, setCollapsedSections] = useState<Record<PanelSectionId, boolean>>({
    fileStatus: false,
    cloudBasic: false,
    cloudAdvanced: true,
    viewProjection: false,
    viewDisplay: false,
    effectAdvanced: false,
    measurementResults: false,
    measurementDetails: false,
    annotationColors: false,
    annotationStroke: false,
    annotationActions: false,
  });

  const getCurrentReferenceBox = () => getReferenceBox(boundingBoxRef.current);

  const getCurrentVisibleGridRange = () => {
    const camera = activeCameraRef.current;
    const mount = mountRef.current;
    if (!camera || !mount) return null;
    return getVisibleGridRange(camera, mount, getCurrentReferenceBox());
  };

  const updateDynamicGrid = () => {
    const scene = sceneRef.current;
    if (!scene) return;
    const range = getCurrentVisibleGridRange();
    if (!range) return;

    const signature = getGridSignature(range);
    if (gridSignatureRef.current === signature) {
      if (gridRef.current) gridRef.current.visible = showGridRef.current;
      return;
    }

    if (gridRef.current) {
      scene.remove(gridRef.current);
      gridRef.current.geometry.dispose();
      (gridRef.current.material as THREE.Material).dispose();
    }

    const grid = createDynamicGrid(range, getCurrentReferenceBox().min.z, showGridRef.current);
    gridRef.current = grid;
    gridSignatureRef.current = signature;
    scene.add(grid);
  };

  const updateCoordinateRulers = () => {
    const camera = activeCameraRef.current;
    const mount = mountRef.current;
    const gridRange = getCurrentVisibleGridRange();
    if (!camera || !mount || !gridRange) return;

    const signature = renderCoordinateRulers({
      camera,
      gridRange,
      mount,
      referenceBox: getCurrentReferenceBox(),
      rulerRefs: rulerRefs.current,
      visible: showGridRef.current,
    });
    if (signature === rulerSignatureRef.current) return;
    rulerSignatureRef.current = signature;
  };

  useThreeViewport({
    activeCameraRef,
    annotationGroupRef,
    axesRef,
    boundingBoxRef,
    composerRef,
    controlsRef,
    edlEnabledRef,
    edlPassRef,
    edlRadius,
    edlRadiusRef,
    edlStrength,
    edlStrengthRef,
    gizmoAxisRefs,
    gizmoLineRefs,
    gridRef,
    gridSignatureRef,
    measurementGroupRef,
    measurementsRef,
    mountRef,
    orthographicCameraRef,
    perspectiveCameraRef,
    renderPassRef,
    rendererRef,
    rulerSignatureRef,
    sceneRef,
    showAxes,
    updateCoordinateRulers,
    updateDynamicGrid,
    viewportBgColor,
    onMeasurementFrame: () => setMeasurementLabelTick((tick) => tick + 1),
  });

  useEffect(() => {
    edlEnabledRef.current = edlEnabled;
  }, [edlEnabled]);

  useEffect(() => {
    edlStrengthRef.current = edlStrength;
    edlRadiusRef.current = edlRadius;
  }, [edlRadius, edlStrength]);

  useEffect(() => {
    measurementsRef.current = measurements;
  }, [measurements]);

  useEffect(() => {
    selectedMeasurementIdRef.current = selectedMeasurementId;
  }, [selectedMeasurementId]);

  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.background = new THREE.Color(viewportBgColor);
  }, [viewportBgColor]);

  useEffect(() => {
    showGridRef.current = showGrid;
    if (gridRef.current) gridRef.current.visible = showGrid;
    rulerSignatureRef.current = "";
  }, [showGrid]);

  useEffect(() => {
    if (!axesRef.current) return;
    axesRef.current.visible = showAxes;
  }, [showAxes]);

  const fitViewToBoundingBox = useCallback((box: THREE.Box3, resetDirection = false) => {
    boundingBoxRef.current = box;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(0.1, size.length() * 0.5);

    const currentCamera = activeCameraRef.current;
    const currentTarget = controlsRef.current?.target ?? center;
    const fallbackDir = new THREE.Vector3(-1, -1, 0.9).normalize();
    const currentDir = currentCamera
      ? currentCamera.position.clone().sub(currentTarget).normalize()
      : fallbackDir;
    const viewDir = resetDirection ? fallbackDir : currentDir;

    if (perspectiveCameraRef.current) {
      const fov = THREE.MathUtils.degToRad(perspectiveCameraRef.current.fov);
      const fitHeightDistance = radius / Math.tan(fov / 2);
      const fitWidthDistance = fitHeightDistance / perspectiveCameraRef.current.aspect;
      const dist = Math.max(fitHeightDistance, fitWidthDistance) * 1.3;
      perspectiveCameraRef.current.position.copy(center.clone().add(viewDir.clone().multiplyScalar(dist)));
      perspectiveCameraRef.current.near = 0.01;
      perspectiveCameraRef.current.far = dist * 20;
      perspectiveCameraRef.current.lookAt(center);
      perspectiveCameraRef.current.updateProjectionMatrix();
    }

    if (orthographicCameraRef.current && mountRef.current) {
      const aspect = mountRef.current.clientWidth / Math.max(1, mountRef.current.clientHeight);
      const maxDim = Math.max(size.x, size.y, size.z);
      const frustumHeight = Math.max(6, maxDim * 1.8);
      orthographicCameraRef.current.left = (-frustumHeight * aspect) / 2;
      orthographicCameraRef.current.right = (frustumHeight * aspect) / 2;
      orthographicCameraRef.current.top = frustumHeight / 2;
      orthographicCameraRef.current.bottom = -frustumHeight / 2;
      orthographicCameraRef.current.position.copy(center.clone().add(viewDir.clone().multiplyScalar(radius * 2.8)));
      orthographicCameraRef.current.near = -2000;
      orthographicCameraRef.current.far = 3000;
      orthographicCameraRef.current.lookAt(center);
      orthographicCameraRef.current.updateProjectionMatrix();
    }

    if (controlsRef.current) {
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
    }
  }, []);

  const onResetView = () => {
    if (!boundingBoxRef.current) return;
    fitViewToBoundingBox(boundingBoxRef.current.clone(), true);
    setActiveViewPreset("fit");
  };

  const setPresetView = (kind: Exclude<ViewPreset, "fit">) => {
    const box = boundingBoxRef.current;
    if (!box) return;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(0.1, size.length() * 0.55);

    const dirMap: Record<typeof kind, THREE.Vector3> = {
      iso: new THREE.Vector3(-1, -1, 0.9).normalize(),
      top: new THREE.Vector3(0, 0, 1),
      front: new THREE.Vector3(0, -1, 0),
      right: new THREE.Vector3(1, 0, 0),
    };

    const dir = dirMap[kind].clone();
    const target = center.clone();
    const camera = activeCameraRef.current;
    if (!camera) return;

    if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
      const cam = camera as THREE.PerspectiveCamera;
      const fov = THREE.MathUtils.degToRad(cam.fov);
      const dist = radius / Math.tan(fov / 2);
      cam.position.copy(center.clone().add(dir.multiplyScalar(dist * 1.25)));
      cam.up.set(0, 0, 1);
      cam.lookAt(target);
      cam.updateProjectionMatrix();
    } else {
      const cam = camera as THREE.OrthographicCamera;
      cam.position.copy(center.clone().add(dir.multiplyScalar(radius * 2.8)));
      cam.up.set(0, 0, 1);
      cam.lookAt(target);
      cam.updateProjectionMatrix();
    }

    if (controlsRef.current) {
      controlsRef.current.target.copy(target);
      controlsRef.current.update();
    }

    setActiveViewPreset(kind);
  };

  const togglePanelSection = (key: PanelSectionId) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openPanelSection = (key: PanelSectionId) => {
    setCollapsedSections((prev) => ({ ...prev, [key]: false }));
  };

  const deleteMeasurement = (id: string) => {
    setMeasurements((prev) => prev.filter((item) => item.id !== id));
    setSelectedMeasurementId((prev) => (prev === id ? null : prev));
  };

  const getDraggedMeasurementTargetPoint = (clientX: number, clientY: number, drag: DraggedMeasurementPoint, axis: MeasurementAxis | null) => {
    if (axis) {
      return projectPointerToMeasurementAxis(activeCameraRef.current, mountRef.current, clientX, clientY, drag, axis);
    }
    return (
      pickPointFromCanvas(pointCloudRef.current, activeCameraRef.current, mountRef.current, pointSize, clientX, clientY) ??
      projectPointerToZPlane(activeCameraRef.current, mountRef.current, clientX, clientY, drag.fallbackZ)
    );
  };

  const createRectMeasurement = (draft: RectDraft) => {
    const selectedPoints = getPointsInScreenRect(pointCloudRef.current, activeCameraRef.current, mountRef.current, draft);
    if (selectedPoints.length === 0) return;

    const zs = selectedPoints.map((point) => point[2]);
    const z = zs.reduce((sum, value) => sum + value, 0) / zs.length;
    const minX = Math.min(draft.start.x, draft.current.x);
    const maxX = Math.max(draft.start.x, draft.current.x);
    const minY = Math.min(draft.start.y, draft.current.y);
    const maxY = Math.max(draft.start.y, draft.current.y);
    const points = [
      projectViewportPointToZPlane(mountRef.current, activeCameraRef.current, { x: minX, y: minY }, z),
      projectViewportPointToZPlane(mountRef.current, activeCameraRef.current, { x: maxX, y: minY }, z),
      projectViewportPointToZPlane(mountRef.current, activeCameraRef.current, { x: maxX, y: maxY }, z),
      projectViewportPointToZPlane(mountRef.current, activeCameraRef.current, { x: minX, y: maxY }, z),
    ];
    if (points.some((point) => !point)) return;
    const item = createRectMeasurementItem(measurementsRef.current, points as MeasurementPoint[], selectedPoints.length);
    setMeasurements((prev) => [...prev, item]);
    setSelectedMeasurementId(item.id);
    setActivePanelFeature("measurement");
    openPanelSection("measurementResults");
  };

  const createPointMeasurement = (type: "polyline" | "angle", points: MeasurementPoint[]) => {
    const item = createPointMeasurementItem(measurementsRef.current, type, points);
    if (!item) return;
    setMeasurements((prev) => [...prev, item]);
    setSelectedMeasurementId(item.id);
    setDraftMeasurementPoints([]);
    setActivePanelFeature("measurement");
    openPanelSection("measurementResults");
  };

  const createLineMeasurement = (start: MeasurementPoint, end: MeasurementPoint) => {
    const item = createLineMeasurementItem(measurementsRef.current, [start, end]);
    setMeasurements((prev) => [...prev, item]);
    setSelectedMeasurementId(item.id);
    setActivePanelFeature("measurement");
    openPanelSection("measurementResults");
  };

  const updateMeasurementPoint = (id: string, pointIndex: number, point: MeasurementPoint) => {
    setMeasurements((prev) => updateMeasurementPointInList(prev, id, pointIndex, point));
  };

  const findSelectedMeasurementHandle = (clientX: number, clientY: number): DraggedMeasurementPoint | null => {
    const measurement = measurementsRef.current.find((item) => item.id === selectedMeasurementIdRef.current);
    const viewportPoint = getViewportPoint(mountRef.current, clientX, clientY);
    if (!measurement || !viewportPoint) return null;

    let nearestPointIndex = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;
    measurement.points.forEach((point, pointIndex) => {
      const screen = projectPointToScreen(mountRef.current, activeCameraRef.current, point);
      if (!screen) return;
      const distance = Math.hypot(screen.x - viewportPoint.x, screen.y - viewportPoint.y);
      if (distance <= 14 && distance < nearestDistance) {
        nearestPointIndex = pointIndex;
        nearestDistance = distance;
      }
    });

    return nearestPointIndex >= 0
      ? {
          id: measurement.id,
          pointIndex: nearestPointIndex,
          fallbackZ: measurement.points[nearestPointIndex][2],
          originPoint: measurement.points[nearestPointIndex],
        }
      : null;
  };

  const redrawMeasurements = () => {
    redrawMeasurementObjects({
      activeDragAxis,
      activeMeasurementTool,
      draftMeasurementPoints,
      draggedMeasurementPointId: draggedMeasurementPoint?.id,
      draggedMeasurementPointIndex: draggedMeasurementPoint?.pointIndex,
      group: measurementGroupRef.current,
      measurementEnabled,
      measurements,
      selectedMeasurementId,
    });
  };

  const redrawAnnotations = useCallback(() => {
    redrawAnnotationObjects({
      annotationLineWidth,
      data: annotationDataRef.current,
      doorColor,
      group: annotationGroupRef.current,
      height: mountRef.current?.clientHeight ?? 800,
      roomColor,
      wallMax: zRangeRef.current.max,
      wallMin: zRangeRef.current.min,
      width: mountRef.current?.clientWidth ?? 1200,
      windowColor,
    });
  }, [annotationLineWidth, doorColor, roomColor, windowColor]);

  useEffect(() => {
    redrawMeasurements();
    // Measurement rendering reads Three.js refs and is intentionally keyed by measurement state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measurementEnabled, measurements, selectedMeasurementId, activeMeasurementTool, draftMeasurementPoints, draggedMeasurementPoint, activeDragAxis]);

  const rebuildPointCloud = useCallback((shouldFitView = false) => {
    const scene = sceneRef.current;
    if (!scene || !originalPositionsRef.current) return;

    if (pointCloudRef.current) {
      scene.remove(pointCloudRef.current);
      disposePointCloud(pointCloudRef.current);
      pointCloudRef.current = null;
    }

    const positions = originalPositionsRef.current;
    const colors = originalColorsRef.current;
    const points = createFilteredPointCloud({
      colors,
      pointSize,
      positions,
      zRange: zRangeRef.current,
      zThresholdRatio,
    });
    pointCloudRef.current = points;
    scene.add(points);

    if (points.geometry.boundingBox) {
      gridSignatureRef.current = "";
      rulerSignatureRef.current = "";
      const doFit = shouldFitView || !hasAutoFramedRef.current;
      if (doFit) {
        fitViewToBoundingBox(points.geometry.boundingBox.clone(), true);
        hasAutoFramedRef.current = true;
      } else {
        boundingBoxRef.current = points.geometry.boundingBox.clone();
      }
    }
    redrawAnnotations();
  }, [fitViewToBoundingBox, pointSize, redrawAnnotations, zThresholdRatio]);

  const buildCurrentViewParamsSnapshot = useCallback(
    () =>
      buildViewParamsSnapshot({
        cameraMode,
        controls: controlsRef.current,
        orthographicCamera: orthographicCameraRef.current,
        perspectiveCamera: perspectiveCameraRef.current,
        showAxes,
        showGrid,
        viewportBgColor,
      }),
    [cameraMode, showAxes, showGrid, viewportBgColor],
  );

  const applyViewParams = (payload: ViewParamsSnapshot) => {
    applyViewParamsToViewport({
      activeCameraRef,
      controls: controlsRef.current,
      edlPass: edlPassRef.current,
      orthographicCamera: orthographicCameraRef.current,
      payload,
      perspectiveCamera: perspectiveCameraRef.current,
      renderPass: renderPassRef.current,
      setCameraMode,
      setShowAxes,
      setShowGrid,
      setViewportBgColor,
    });
  };

  const { onExportViewParams, onLoadAnnotation, onLoadPly, onLoadViewParams, onSaveSnapshot } = useFileActions({
    annotationDataRef,
    originalColorsRef,
    originalPositionsRef,
    rendererRef,
    zRangeRef,
    applyViewParams,
    buildViewParamsSnapshot: buildCurrentViewParamsSnapshot,
    rebuildPointCloud,
    redrawAnnotations,
    setAnnotationFileName,
    setPlyFileName,
  });

  const { onMeasurementPointerDown, onMeasurementPointerMove, onMeasurementPointerUp } = useMeasurementInteraction({
    activeDragAxis,
    activeMeasurementTool,
    controlsRef,
    draftMeasurementPoints,
    draggedMeasurementPoint,
    findSelectedMeasurementHandle,
    getDraggedMeasurementTargetPoint,
    getViewportPoint: (clientX, clientY) => getViewportPoint(mountRef.current, clientX, clientY),
    measurementEnabled,
    pendingLinePoint,
    pickPointFromCanvas: (clientX, clientY) =>
      pickPointFromCanvas(pointCloudRef.current, activeCameraRef.current, mountRef.current, pointSize, clientX, clientY),
    rectDraft,
    setActiveDragAxis,
    setDraftMeasurementPoints,
    setDraggedMeasurementPoint,
    setIsMeasurementHandleHover,
    setPendingLinePoint,
    setRectDraft,
    createLineMeasurement,
    createPointMeasurement,
    createRectMeasurement,
    updateMeasurementPoint,
  });

  useEffect(() => {
    if (!pointCloudRef.current) return;
    const material = pointCloudRef.current.material as THREE.PointsMaterial;
    material.size = pointSize;
  }, [pointSize]);

  useEffect(() => {
    if (!originalPositionsRef.current) return;
    rebuildPointCloud(false);
  }, [rebuildPointCloud, zThresholdRatio]);

  useEffect(() => {
    const persp = perspectiveCameraRef.current;
    const ortho = orthographicCameraRef.current;
    const controls = controlsRef.current;
    if (!persp || !ortho || !controls) return;

    const prevCamera = activeCameraRef.current;
    const nextCamera = cameraMode === "perspective" ? persp : ortho;
    if (prevCamera && prevCamera !== nextCamera) {
      nextCamera.position.copy(prevCamera.position);
      nextCamera.quaternion.copy(prevCamera.quaternion);
      nextCamera.up.set(0, 0, 1);
      controls.object = nextCamera;
      activeCameraRef.current = nextCamera;

      if (renderPassRef.current) renderPassRef.current.camera = nextCamera;
      edlPassRef.current?.setCamera(nextCamera);
      controls.update();
    }
  }, [cameraMode]);

  useEffect(() => {
    if (!edlPassRef.current) return;
    edlPassRef.current.setStrength(edlStrength);
    edlPassRef.current.setRadius(edlRadius);
  }, [edlRadius, edlStrength]);

  useEffect(() => {
    if (!annotationDataRef.current) return;
    redrawAnnotations();
  }, [redrawAnnotations]);

  const measurementOverlayItems = measurementEnabled
    ? (measurements
        .map((measurement) => {
          void measurementLabelTick;
          const point = projectPointToScreen(mountRef.current, activeCameraRef.current, vectorToPoint(getMeasurementCenter(measurement)));
          return point ? { measurement, point } : null;
        })
        .filter(Boolean) as Array<{ measurement: MeasurementItem; point: ScreenPoint }>)
    : [];

  return (
    <div className="app workbench">
      <TopMenuBar
        openMenu={openMenu}
        onImportAnnotation={() => inputAnnoRef.current?.click()}
        onImportPly={() => inputPlyRef.current?.click()}
        onImportViewParams={() => inputViewParamsRef.current?.click()}
        onExportSnapshot={onSaveSnapshot}
        onExportViewParams={onExportViewParams}
        setOpenMenu={setOpenMenu}
      />

      <main className="workspace-layout">
        <ViewToolbar activeViewPreset={activeViewPreset} onFitView={onResetView} onPresetView={setPresetView} />

        <section className="viewport-shell card-shadow">
          <ViewportStats cameraMode={cameraMode} pointSize={pointSize} zThresholdRatio={zThresholdRatio} />
          <ViewportGizmo axisRefs={gizmoAxisRefs} lineRefs={gizmoLineRefs} onPresetView={setPresetView} />
          <div
            ref={mountRef}
            className={`canvas-wrap ${measurementEnabled ? `measuring ${activeMeasurementTool ?? ""}` : ""} ${isMeasurementHandleHover || draggedMeasurementPoint ? "handle-hover" : ""}`}
            onPointerDown={onMeasurementPointerDown}
            onPointerMove={onMeasurementPointerMove}
            onPointerUp={onMeasurementPointerUp}
            onPointerLeave={() => setIsMeasurementHandleHover(false)}
          />
          <CoordinateRulers rulerRefs={rulerRefs} />
          <MeasurementOverlay
            activeTool={activeMeasurementTool}
            draftPoints={draftMeasurementPoints}
            enabled={measurementEnabled}
            items={measurementOverlayItems}
            pendingLinePoint={pendingLinePoint}
            projectPointToScreen={(point) => projectPointToScreen(mountRef.current, activeCameraRef.current, point)}
            rectDraft={rectDraft}
            selectedMeasurementId={selectedMeasurementId}
            onSelectMeasurement={(measurementId) => {
              setSelectedMeasurementId(measurementId);
              setActivePanelFeature("measurement");
              openPanelSection("measurementDetails");
            }}
            onSelectTool={setActiveMeasurementTool}
          />
        </section>

        <RightPanel
          activeFeature={activePanelFeature}
          activeMeasurementTool={activeMeasurementTool}
          annotationFileName={annotationFileName}
          annotationLineWidth={annotationLineWidth}
          cameraMode={cameraMode}
          collapsedSections={collapsedSections}
          doorColor={doorColor}
          edlEnabled={edlEnabled}
          edlRadius={edlRadius}
          edlStrength={edlStrength}
          measurementEnabled={measurementEnabled}
          measurements={measurements}
          plyFileName={plyFileName}
          pointSize={pointSize}
          openSection={openPanelSection}
          roomColor={roomColor}
          setActiveFeature={setActivePanelFeature}
          setAnnotationLineWidth={setAnnotationLineWidth}
          setCameraMode={setCameraMode}
          setDoorColor={setDoorColor}
          setEdlEnabled={setEdlEnabled}
          setEdlRadius={setEdlRadius}
          setEdlStrength={setEdlStrength}
          setMeasurementEnabled={setMeasurementEnabled}
          setActiveMeasurementTool={setActiveMeasurementTool}
          setSelectedMeasurementId={setSelectedMeasurementId}
          setPointSize={setPointSize}
          setRoomColor={setRoomColor}
          setShowAxes={setShowAxes}
          setShowGrid={setShowGrid}
          setViewportBgColor={setViewportBgColor}
          setWindowColor={setWindowColor}
          setZThresholdRatio={setZThresholdRatio}
          showAxes={showAxes}
          showGrid={showGrid}
          selectedMeasurementId={selectedMeasurementId}
          deleteMeasurement={deleteMeasurement}
          toggleSection={togglePanelSection}
          viewportBgColor={viewportBgColor}
          windowColor={windowColor}
          zThresholdRatio={zThresholdRatio}
        />
      </main>

      <StatusBar cameraMode={cameraMode} edlEnabled={edlEnabled} />

      <input ref={inputPlyRef} type="file" accept=".ply" hidden onChange={onLoadPly} />
      <input ref={inputAnnoRef} type="file" accept=".json" hidden onChange={onLoadAnnotation} />
      <input ref={inputViewParamsRef} type="file" accept=".json" hidden onChange={onLoadViewParams} />
    </div>
  );
}

export default App;
