import { ChangeEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import type { Line2 } from "three/examples/jsm/lines/Line2.js";
import type { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { Aperture, Compass, FolderOpen, ImageDown } from "lucide-react";
import { EDLPass } from "./EDLPass";
import { RightPanel } from "./components/panel/RightPanel";
import { redrawAnnotationObjects } from "./features/annotation/annotationRenderer";
import { MeasurementOverlay } from "./features/measurement/MeasurementOverlay";
import { redrawMeasurementObjects } from "./features/measurement/measurementRenderer";
import { applyCameraSnapshot, snapshotOrthographicCamera, snapshotPerspectiveCamera } from "./features/view-params/viewParams";
import type { AnnotationData } from "./types/annotation";
import type { DraggedMeasurementPoint, MeasurementAxis, MeasurementItem, MeasurementPoint, MeasurementTool, RectDraft, ScreenPoint } from "./types/measurement";
import type { PanelFeatureId, PanelSectionId } from "./types/panel";
import type { DynamicGridSignature, RulerAxis, RulerRefs, RulerSide } from "./types/ruler";
import type { CameraMode, ViewParamsSnapshot } from "./types/view";
import { MEASUREMENT_AXIS_VECTORS, getMeasurementCenter, pointToVector, vectorToPoint } from "./utils/measurement";
import { AXIS_LABELS, RULER_MAX_TICKS, chooseNiceStep, expandRange, formatRulerValue } from "./utils/ruler";
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
  const [activeViewPreset, setActiveViewPreset] = useState<"top" | "front" | "right" | "iso" | "fit">("iso");
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

  const getReferenceBox = () => {
    const box = boundingBoxRef.current;
    if (box && !box.isEmpty()) return box.clone();
    return new THREE.Box3(new THREE.Vector3(-10, -10, 0), new THREE.Vector3(10, 10, 3));
  };

  const intersectViewportWithZPlane = (camera: THREE.Camera, mount: HTMLDivElement, planeZ: number) => {
    const corners = [
      new THREE.Vector2(-1, -1),
      new THREE.Vector2(1, -1),
      new THREE.Vector2(-1, 1),
      new THREE.Vector2(1, 1),
    ];
    const points: THREE.Vector3[] = [];

    corners.forEach((corner) => {
      const nearPoint = new THREE.Vector3(corner.x, corner.y, -1).unproject(camera);
      const farPoint = new THREE.Vector3(corner.x, corner.y, 1).unproject(camera);
      const direction = farPoint.clone().sub(nearPoint).normalize();
      const origin = (camera as THREE.PerspectiveCamera).isPerspectiveCamera ? camera.position.clone() : nearPoint;
      if (Math.abs(direction.z) < 0.0001) return;
      const distance = (planeZ - origin.z) / direction.z;
      if (!Number.isFinite(distance)) return;
      points.push(origin.add(direction.multiplyScalar(distance)));
    });

    if (points.length < 2) return null;
    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    const width = Math.max(1, mount.clientWidth);
    const height = Math.max(1, mount.clientHeight);
    const viewportPad = Math.max(width, height) / Math.min(width, height);
    return {
      x: expandRange(Math.min(...xs), Math.max(...xs), 0.05 * viewportPad),
      y: expandRange(Math.min(...ys), Math.max(...ys), 0.05 * viewportPad),
    };
  };

  const getVisibleGridRange = (): DynamicGridSignature | null => {
    const camera = activeCameraRef.current;
    const mount = mountRef.current;
    if (!camera || !mount) return null;

    const box = getReferenceBox();
    const gridZ = box.min.z;
    const planeRange = intersectViewportWithZPlane(camera, mount, gridZ);
    const boxX = expandRange(box.min.x, box.max.x, 0.18);
    const boxY = expandRange(box.min.y, box.max.y, 0.18);
    const x = planeRange?.x ?? boxX;
    const y = planeRange?.y ?? boxY;

    const minX = Math.min(x.min, boxX.min);
    const maxX = Math.max(x.max, boxX.max);
    const minY = Math.min(y.min, boxY.min);
    const maxY = Math.max(y.max, boxY.max);
    const step = chooseNiceStep(Math.max(maxX - minX, maxY - minY), 14);

    return {
      minX: Math.floor(minX / step) * step,
      maxX: Math.ceil(maxX / step) * step,
      minY: Math.floor(minY / step) * step,
      maxY: Math.ceil(maxY / step) * step,
      step,
    };
  };

  const updateDynamicGrid = () => {
    const scene = sceneRef.current;
    if (!scene) return;
    const range = getVisibleGridRange();
    if (!range) return;

    const signature = [range.minX, range.maxX, range.minY, range.maxY, range.step].map((value) => value.toFixed(3)).join("|");
    if (gridSignatureRef.current === signature) {
      if (gridRef.current) gridRef.current.visible = showGridRef.current;
      return;
    }

    if (gridRef.current) {
      scene.remove(gridRef.current);
      gridRef.current.geometry.dispose();
      (gridRef.current.material as THREE.Material).dispose();
    }

    const z = getReferenceBox().min.z;
    const positions: number[] = [];
    const colors: number[] = [];
    const minor = new THREE.Color(0xf5f5f5);
    const major = new THREE.Color(0xebebeb);
    const pushLine = (a: THREE.Vector3, b: THREE.Vector3, color: THREE.Color) => {
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
    };

    let index = 0;
    for (let x = range.minX; x <= range.maxX + range.step * 0.5; x += range.step) {
      pushLine(new THREE.Vector3(x, range.minY, z), new THREE.Vector3(x, range.maxY, z), index % 5 === 0 ? major : minor);
      index += 1;
    }
    index = 0;
    for (let y = range.minY; y <= range.maxY + range.step * 0.5; y += range.step) {
      pushLine(new THREE.Vector3(range.minX, y, z), new THREE.Vector3(range.maxX, y, z), index % 5 === 0 ? major : minor);
      index += 1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const material = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.72, depthWrite: false });
    const grid = new THREE.LineSegments(geometry, material);
    grid.visible = showGridRef.current;
    gridRef.current = grid;
    gridSignatureRef.current = signature;
    scene.add(grid);
  };

  const getScreenAxis = (axis: RulerAxis) => {
    const camera = activeCameraRef.current;
    const box = getReferenceBox();
    if (!camera) return new THREE.Vector2(axis === "x" ? 1 : 0, axis === "y" ? 1 : 0);
    const center = box.getCenter(new THREE.Vector3());
    const size = Math.max(1, box.getSize(new THREE.Vector3()).length() * 0.08);
    const direction =
      axis === "x" ? new THREE.Vector3(size, 0, 0) : axis === "y" ? new THREE.Vector3(0, size, 0) : new THREE.Vector3(0, 0, size);
    const a = center.clone().project(camera);
    const b = center.clone().add(direction).project(camera);
    return new THREE.Vector2(b.x - a.x, b.y - a.y);
  };

  const getRulerRange = (axis: RulerAxis) => {
    const box = getReferenceBox();
    if (axis === "z") return expandRange(box.min.z, box.max.z, 0.08);
    const gridRange = getVisibleGridRange();
    if (axis === "x") return gridRange ? { min: gridRange.minX, max: gridRange.maxX } : expandRange(box.min.x, box.max.x, 0.12);
    return gridRange ? { min: gridRange.minY, max: gridRange.maxY } : expandRange(box.min.y, box.max.y, 0.12);
  };

  const projectWorldToCanvas = (world: THREE.Vector3, camera: THREE.Camera, mount: HTMLDivElement) => {
    const projected = world.clone().project(camera);
    if (projected.z < -1 || projected.z > 1) return null;
    return new THREE.Vector2(((projected.x + 1) / 2) * mount.clientWidth, ((1 - projected.y) / 2) * mount.clientHeight);
  };

  const intersectScreenLineWithRuler = (a: THREE.Vector2, b: THREE.Vector2, side: RulerSide, mount: HTMLDivElement, ruler: HTMLDivElement) => {
    const canvasRect = mount.getBoundingClientRect();
    const rulerRect = ruler.getBoundingClientRect();
    const dx = b.x - a.x;
    const dy = b.y - a.y;

    if (side === "bottom") {
      if (Math.abs(dy) < 0.0001) return null;
      const t = (mount.clientHeight - a.y) / dy;
      const x = a.x + dx * t;
      return canvasRect.left - rulerRect.left + x;
    }

    if (Math.abs(dx) < 0.0001) return null;
    const edgeX = side === "left" ? 0 : mount.clientWidth;
    const t = (edgeX - a.x) / dx;
    const y = a.y + dy * t;
    return canvasRect.top - rulerRect.top + y;
  };

  const getZAxisAnchor = (range: DynamicGridSignature) => {
    const camera = activeCameraRef.current;
    const mount = mountRef.current;
    const box = getReferenceBox();
    if (!camera || !mount) return box.getCenter(new THREE.Vector3());

    const candidates = [
      new THREE.Vector3(range.minX, range.minY, box.min.z),
      new THREE.Vector3(range.maxX, range.minY, box.min.z),
      new THREE.Vector3(range.minX, range.maxY, box.min.z),
      new THREE.Vector3(range.maxX, range.maxY, box.min.z),
      new THREE.Vector3(range.maxX, (range.minY + range.maxY) / 2, box.min.z),
      new THREE.Vector3((range.minX + range.maxX) / 2, range.maxY, box.min.z),
    ];

    let best = candidates[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    candidates.forEach((candidate) => {
      const screen = projectWorldToCanvas(candidate, camera, mount);
      if (!screen) return;
      const distance = Math.abs(mount.clientWidth - screen.x) + Math.abs(mount.clientHeight * 0.5 - screen.y) * 0.25;
      if (distance < bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    });
    return best;
  };

  const projectRulerTick = (side: RulerSide, axis: RulerAxis, value: number, gridRange: DynamicGridSignature | null) => {
    const camera = activeCameraRef.current;
    const mount = mountRef.current;
    const ruler = rulerRefs.current[side];
    if (!camera || !mount || !ruler) return null;

    const box = getReferenceBox();
    const gridZ = box.min.z;
    const range = gridRange ?? getVisibleGridRange();
    if (!range) return null;

    if (axis === "x" || axis === "y") {
      const a =
        axis === "x"
          ? new THREE.Vector3(value, range.minY, gridZ)
          : new THREE.Vector3(range.minX, value, gridZ);
      const b =
        axis === "x"
          ? new THREE.Vector3(value, range.maxY, gridZ)
          : new THREE.Vector3(range.maxX, value, gridZ);
      const screenA = projectWorldToCanvas(a, camera, mount);
      const screenB = projectWorldToCanvas(b, camera, mount);
      if (!screenA || !screenB) return null;
      return intersectScreenLineWithRuler(screenA, screenB, side, mount, ruler);
    }

    const anchor = getZAxisAnchor(range);
    const screenA = projectWorldToCanvas(new THREE.Vector3(anchor.x, anchor.y, box.min.z), camera, mount);
    const screenB = projectWorldToCanvas(new THREE.Vector3(anchor.x, anchor.y, box.max.z), camera, mount);
    if (!screenA || !screenB) return null;
    const axisPos = intersectScreenLineWithRuler(screenA, screenB, side, mount, ruler);
    if (axisPos === null) {
      const tick = projectWorldToCanvas(new THREE.Vector3(anchor.x, anchor.y, value), camera, mount);
      if (!tick) return null;
      const rulerRect = ruler.getBoundingClientRect();
      const canvasRect = mount.getBoundingClientRect();
      return canvasRect.top - rulerRect.top + tick.y;
    }
    const ratio = (value - box.min.z) / Math.max(0.0001, box.max.z - box.min.z);
    return screenA.y + (screenB.y - screenA.y) * ratio + mount.getBoundingClientRect().top - ruler.getBoundingClientRect().top;
  };

  const renderRuler = (side: RulerSide, axis: RulerAxis, range: { min: number; max: number }, gridRange: DynamicGridSignature | null) => {
    const el = rulerRefs.current[side];
    if (!el) return "";
    const length = side === "bottom" ? el.clientWidth : el.clientHeight;
    const step = chooseNiceStep(range.max - range.min, side === "right" ? 6 : 8);
    const firstTick = Math.ceil(range.min / step) * step;
    const ticks: string[] = [];
    const signatureParts = [side, axis, range.min.toFixed(3), range.max.toFixed(3), step.toFixed(5), String(Math.round(length))];

    for (let value = firstTick; value <= range.max + step * 0.5 && ticks.length < RULER_MAX_TICKS; value += step) {
      const pos = projectRulerTick(side, axis, value, gridRange);
      if (pos === null) continue;
      if (pos < 18 || pos > length - 18) continue;
      signatureParts.push(value.toFixed(5), pos.toFixed(1));
      ticks.push(
        `<span class="ruler-tick" style="${side === "bottom" ? `left:${pos}px` : `top:${pos}px`}"><i></i><b>${formatRulerValue(
          value,
          step,
        )}</b></span>`,
      );
    }
    const signature = signatureParts.join(":");
    if (el.dataset.signature === signature) return signature;
    el.dataset.axis = axis;
    el.dataset.signature = signature;
    el.innerHTML = `<span class="ruler-axis">${AXIS_LABELS[axis]}</span>${ticks.join("")}`;
    return signature;
  };

  const updateCoordinateRulers = () => {
    const visible = showGridRef.current;
    (Object.keys(rulerRefs.current) as RulerSide[]).forEach((side) => {
      const el = rulerRefs.current[side];
      if (el) el.hidden = !visible;
    });
    if (!visible) return;

    const xScreen = getScreenAxis("x");
    const yScreen = getScreenAxis("y");
    const bottomAxis: RulerAxis = Math.abs(xScreen.x) >= Math.abs(yScreen.x) ? "x" : "y";
    const leftAxis: RulerAxis = bottomAxis === "x" ? "y" : "x";
    const gridRange = getVisibleGridRange();
    const parts = [
      renderRuler("bottom", bottomAxis, getRulerRange(bottomAxis), gridRange),
      renderRuler("left", leftAxis, getRulerRange(leftAxis), gridRange),
      renderRuler("right", "z", getRulerRange("z"), gridRange),
    ];
    const signature = parts.join("|");
    if (signature === rulerSignatureRef.current) return;
    rulerSignatureRef.current = signature;
  };

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
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(viewportBgColor);
    scene.add(new THREE.AmbientLight(0xffffff, 1.4));
    const axes = new THREE.AxesHelper(2.5);
    axes.visible = showAxes;
    axesRef.current = axes;
    scene.add(axes);
    scene.add(annotationGroupRef.current);
    scene.add(measurementGroupRef.current);
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const aspect = mountRef.current.clientWidth / Math.max(1, mountRef.current.clientHeight);
    const perspectiveCamera = new THREE.PerspectiveCamera(60, aspect, 0.1, 3000);
    perspectiveCamera.up.set(0, 0, 1);
    perspectiveCamera.position.set(8, 8, 8);
    perspectiveCameraRef.current = perspectiveCamera;

    const orthoSize = 12;
    const orthographicCamera = new THREE.OrthographicCamera(
      (-orthoSize * aspect) / 2,
      (orthoSize * aspect) / 2,
      orthoSize / 2,
      -orthoSize / 2,
      0.1,
      3000,
    );
    orthographicCamera.up.set(0, 0, 1);
    orthographicCamera.position.set(8, 8, 8);
    orthographicCameraRef.current = orthographicCamera;
    activeCameraRef.current = perspectiveCamera;

    const controls = new OrbitControls(activeCameraRef.current, renderer.domElement);
    controls.enableDamping = true;
    controls.screenSpacePanning = true;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, activeCameraRef.current);
    const edlPass = new EDLPass(
      scene,
      activeCameraRef.current as THREE.PerspectiveCamera | THREE.OrthographicCamera,
      mountRef.current.clientWidth,
      mountRef.current.clientHeight,
    );
    edlPass.setStrength(edlStrength);
    edlPass.setRadius(edlRadius);

    composer.addPass(renderPass);
    composer.addPass(edlPass);

    composerRef.current = composer;
    renderPassRef.current = renderPass;
    edlPassRef.current = edlPass;

    const onResize = () => {
      if (!mountRef.current || !rendererRef.current || !composerRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      const nextAspect = width / Math.max(1, height);

      rendererRef.current.setSize(width, height);
      composerRef.current.setSize(width, height);

      if (perspectiveCameraRef.current) {
        perspectiveCameraRef.current.aspect = nextAspect;
        perspectiveCameraRef.current.updateProjectionMatrix();
      }

      if (orthographicCameraRef.current) {
        const box = boundingBoxRef.current;
        const size = box ? box.getSize(new THREE.Vector3()).length() : 12;
        const orthoScale = Math.max(6, size * 0.6);
        orthographicCameraRef.current.left = (-orthoScale * nextAspect) / 2;
        orthographicCameraRef.current.right = (orthoScale * nextAspect) / 2;
        orthographicCameraRef.current.top = orthoScale / 2;
        orthographicCameraRef.current.bottom = -orthoScale / 2;
        orthographicCameraRef.current.updateProjectionMatrix();
      }

      if (edlPassRef.current) {
        edlPassRef.current.setSize(width, height);
      }

      gridSignatureRef.current = "";
      rulerSignatureRef.current = "";

      annotationGroupRef.current.children.forEach((obj) => {
        const mat = (obj as Line2).material as LineMaterial;
        if (mat && "resolution" in mat) {
          mat.resolution.set(width, height);
        }
      });
    };

    window.addEventListener("resize", onResize);

    let animationId = 0;
    const updateGizmoFromCamera = () => {
      const camera = activeCameraRef.current;
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
        const el = gizmoAxisRefs.current[key];
        if (!el) return;
        const v = axes[key];
        const x = center + v.x * radius;
        const y = center - v.y * radius;
        const depth = (v.z + 1) * 0.5;

        const line = gizmoLineRefs.current[key];
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

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controlsRef.current?.update();
      updateGizmoFromCamera();
      updateDynamicGrid();
      updateCoordinateRulers();
      if (measurementsRef.current.length > 0) {
        setMeasurementLabelTick((tick) => tick + 1);
      }
      if (edlEnabledRef.current && edlStrengthRef.current > 0 && edlRadiusRef.current > 0) {
        composerRef.current?.render();
      } else {
        if (sceneRef.current && activeCameraRef.current) {
          rendererRef.current?.render(sceneRef.current, activeCameraRef.current);
        }
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      edlPass.dispose();
      if (gridRef.current) {
        gridRef.current.geometry.dispose();
        (gridRef.current.material as THREE.Material).dispose();
      }
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

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

  const fitViewToBoundingBox = (box: THREE.Box3, resetDirection = false) => {
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
  };

  const onResetView = () => {
    if (!boundingBoxRef.current) return;
    fitViewToBoundingBox(boundingBoxRef.current.clone(), true);
    setActiveViewPreset("fit");
  };

  const setPresetView = (kind: "iso" | "top" | "front" | "right") => {
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

  const getViewportPoint = (clientX: number, clientY: number): ScreenPoint | null => {
    const shell = mountRef.current?.closest(".viewport-shell") as HTMLElement | null;
    if (!shell) return null;
    const rect = shell.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const projectPointToScreen = (point: MeasurementPoint): ScreenPoint | null => {
    if (!mountRef.current || !activeCameraRef.current) return null;
    const shell = mountRef.current.closest(".viewport-shell") as HTMLElement | null;
    if (!shell) return null;
    const canvasRect = mountRef.current.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    const projected = pointToVector(point).project(activeCameraRef.current);
    if (projected.z < -1 || projected.z > 1) return null;
    return {
      x: canvasRect.left - shellRect.left + ((projected.x + 1) / 2) * canvasRect.width,
      y: canvasRect.top - shellRect.top + ((1 - projected.y) / 2) * canvasRect.height,
    };
  };

  const pickPointFromCanvas = (clientX: number, clientY: number): MeasurementPoint | null => {
    const pointCloud = pointCloudRef.current;
    const camera = activeCameraRef.current;
    const mount = mountRef.current;
    if (!pointCloud || !camera || !mount) return null;

    const rect = mount.getBoundingClientRect();
    const pointer = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points = { threshold: Math.max(0.04, pointSize * 0.015) };
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(pointCloud, false)[0];
    if (hit?.point) return vectorToPoint(hit.point);

    const position = pointCloud.geometry.getAttribute("position");
    let best: MeasurementPoint | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    const maxDistance = 18;
    for (let i = 0; i < position.count; i += 1) {
      const world = new THREE.Vector3(position.getX(i), position.getY(i), position.getZ(i)).applyMatrix4(pointCloud.matrixWorld);
      const projected = world.clone().project(camera);
      if (projected.z < -1 || projected.z > 1) continue;
      const sx = rect.left + ((projected.x + 1) / 2) * rect.width;
      const sy = rect.top + ((1 - projected.y) / 2) * rect.height;
      const distance = Math.hypot(sx - clientX, sy - clientY);
      if (distance < bestDistance && distance <= maxDistance) {
        bestDistance = distance;
        best = [world.x, world.y, world.z];
      }
    }
    return best;
  };

  const projectPointerToZPlane = (clientX: number, clientY: number, z: number): MeasurementPoint | null => {
    const camera = activeCameraRef.current;
    const mount = mountRef.current;
    if (!camera || !mount) return null;
    const rect = mount.getBoundingClientRect();
    const pointer = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -z);
    const hit = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(plane, hit)) return null;
    return vectorToPoint(hit);
  };

  const projectPointerToMeasurementAxis = (clientX: number, clientY: number, drag: DraggedMeasurementPoint, axis: MeasurementAxis): MeasurementPoint | null => {
    const camera = activeCameraRef.current;
    const mount = mountRef.current;
    if (!camera || !mount) return null;

    const rect = mount.getBoundingClientRect();
    const pointer = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera);

    const axisOrigin = pointToVector(drag.originPoint);
    const axisDirection = MEASUREMENT_AXIS_VECTORS[axis];
    const rayOrigin = raycaster.ray.origin;
    const rayDirection = raycaster.ray.direction.clone().normalize();
    const axisRayDot = axisDirection.dot(rayDirection);
    const denominator = 1 - axisRayDot * axisRayDot;
    if (Math.abs(denominator) < 1e-5) return null;

    const originDelta = axisOrigin.clone().sub(rayOrigin);
    const axisDistance = (axisRayDot * rayDirection.dot(originDelta) - axisDirection.dot(originDelta)) / denominator;
    return vectorToPoint(axisOrigin.add(axisDirection.clone().multiplyScalar(axisDistance)));
  };

  const getDraggedMeasurementTargetPoint = (clientX: number, clientY: number, drag: DraggedMeasurementPoint) => {
    if (activeDragAxis) return projectPointerToMeasurementAxis(clientX, clientY, drag, activeDragAxis);
    return pickPointFromCanvas(clientX, clientY) ?? projectPointerToZPlane(clientX, clientY, drag.fallbackZ);
  };

  const projectViewportPointToZPlane = (point: ScreenPoint, z: number): MeasurementPoint | null => {
    const mount = mountRef.current;
    const shell = mount?.closest(".viewport-shell") as HTMLElement | null;
    if (!mount || !shell) return null;
    const shellRect = shell.getBoundingClientRect();
    return projectPointerToZPlane(shellRect.left + point.x, shellRect.top + point.y, z);
  };

  const getPointsInScreenRect = (draft: RectDraft) => {
    const pointCloud = pointCloudRef.current;
    const camera = activeCameraRef.current;
    const mount = mountRef.current;
    if (!pointCloud || !camera || !mount) return [];

    const shell = mount.closest(".viewport-shell") as HTMLElement | null;
    if (!shell) return [];
    const shellRect = shell.getBoundingClientRect();
    const canvasRect = mount.getBoundingClientRect();
    const minX = Math.min(draft.start.x, draft.current.x);
    const maxX = Math.max(draft.start.x, draft.current.x);
    const minY = Math.min(draft.start.y, draft.current.y);
    const maxY = Math.max(draft.start.y, draft.current.y);
    const position = pointCloud.geometry.getAttribute("position");
    const points: MeasurementPoint[] = [];

    for (let i = 0; i < position.count; i += 1) {
      const world = new THREE.Vector3(position.getX(i), position.getY(i), position.getZ(i)).applyMatrix4(pointCloud.matrixWorld);
      const projected = world.clone().project(camera);
      if (projected.z < -1 || projected.z > 1) continue;
      const x = canvasRect.left - shellRect.left + ((projected.x + 1) / 2) * canvasRect.width;
      const y = canvasRect.top - shellRect.top + ((1 - projected.y) / 2) * canvasRect.height;
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        points.push([world.x, world.y, world.z]);
      }
    }
    return points;
  };

  const createRectMeasurement = (draft: RectDraft) => {
    const selectedPoints = getPointsInScreenRect(draft);
    if (selectedPoints.length === 0) return;

    const zs = selectedPoints.map((point) => point[2]);
    const z = zs.reduce((sum, value) => sum + value, 0) / zs.length;
    const minX = Math.min(draft.start.x, draft.current.x);
    const maxX = Math.max(draft.start.x, draft.current.x);
    const minY = Math.min(draft.start.y, draft.current.y);
    const maxY = Math.max(draft.start.y, draft.current.y);
    const points = [
      projectViewportPointToZPlane({ x: minX, y: minY }, z),
      projectViewportPointToZPlane({ x: maxX, y: minY }, z),
      projectViewportPointToZPlane({ x: maxX, y: maxY }, z),
      projectViewportPointToZPlane({ x: minX, y: maxY }, z),
    ];
    if (points.some((point) => !point)) return;
    const id = `measure-${Date.now()}`;
    const item: MeasurementItem = {
      id,
      type: "rect",
      label: `矩形 ${measurementsRef.current.filter((measurement) => measurement.type === "rect").length + 1}`,
      points: points as MeasurementPoint[],
      createdAt: Date.now(),
      pointCount: selectedPoints.length,
    };
    setMeasurements((prev) => [...prev, item]);
    setSelectedMeasurementId(id);
    setActivePanelFeature("measurement");
    openPanelSection("measurementResults");
  };

  const createPointMeasurement = (type: "polyline" | "angle", points: MeasurementPoint[]) => {
    const minimumPoints = type === "angle" ? 3 : 2;
    if (points.length < minimumPoints) return;

    const id = `measure-${Date.now()}`;
    const item: MeasurementItem = {
      id,
      type,
      label: `${type === "angle" ? "角度" : "折线"} ${measurementsRef.current.filter((measurement) => measurement.type === type).length + 1}`,
      points,
      createdAt: Date.now(),
    };
    setMeasurements((prev) => [...prev, item]);
    setSelectedMeasurementId(id);
    setDraftMeasurementPoints([]);
    setActivePanelFeature("measurement");
    openPanelSection("measurementResults");
  };

  const updateMeasurementPoint = (id: string, pointIndex: number, point: MeasurementPoint) => {
    setMeasurements((prev) =>
      prev.map((measurement) => {
        if (measurement.id !== id) return measurement;
        const points = [...measurement.points] as MeasurementPoint[];
        points[pointIndex] = point;
        return { ...measurement, points };
      }),
    );
  };

  const findSelectedMeasurementHandle = (clientX: number, clientY: number): DraggedMeasurementPoint | null => {
    const measurement = measurementsRef.current.find((item) => item.id === selectedMeasurementIdRef.current);
    const viewportPoint = getViewportPoint(clientX, clientY);
    if (!measurement || !viewportPoint) return null;

    let nearestPointIndex = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;
    measurement.points.forEach((point, pointIndex) => {
      const screen = projectPointToScreen(point);
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

  const redrawAnnotations = () => {
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
  };

  useEffect(() => {
    redrawMeasurements();
    // Measurement rendering reads Three.js refs and is intentionally keyed by measurement state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measurementEnabled, measurements, selectedMeasurementId, activeMeasurementTool, draftMeasurementPoints, draggedMeasurementPoint, activeDragAxis]);

  const rebuildPointCloud = (shouldFitView = false) => {
    const scene = sceneRef.current;
    if (!scene || !originalPositionsRef.current) return;

    if (pointCloudRef.current) {
      scene.remove(pointCloudRef.current);
      pointCloudRef.current.geometry.dispose();
      (pointCloudRef.current.material as THREE.Material).dispose();
      pointCloudRef.current = null;
    }

    const positions = originalPositionsRef.current;
    const colors = originalColorsRef.current;
    const { min, max } = zRangeRef.current;
    const threshold = max - (zThresholdRatio / 100) * (max - min);

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
    pointCloudRef.current = points;
    scene.add(points);

    geometry.computeBoundingBox();
    if (geometry.boundingBox) {
      gridSignatureRef.current = "";
      rulerSignatureRef.current = "";
      const doFit = shouldFitView || !hasAutoFramedRef.current;
      if (doFit) {
        fitViewToBoundingBox(geometry.boundingBox.clone(), true);
        hasAutoFramedRef.current = true;
      } else {
        boundingBoxRef.current = geometry.boundingBox.clone();
      }
    }
    redrawAnnotations();
  };

  const onLoadPly = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPlyFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const loader = new PLYLoader();
        const geometry = loader.parse(reader.result as ArrayBuffer);
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

        originalPositionsRef.current = positions;
        originalColorsRef.current = colors;
        zRangeRef.current = {
          min: Number.isFinite(zMin) ? zMin : 0,
          max: Number.isFinite(zMax) ? zMax : 1,
        };
        rebuildPointCloud(true);
      } catch (error) {
        console.error("PLY 解析失败:", error);
        alert("PLY 文件解析失败，请检查文件格式。");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const onLoadAnnotation = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnnotationFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as AnnotationData;
        annotationDataRef.current = parsed;
        redrawAnnotations();
      } catch (error) {
        console.error("标注解析失败:", error);
        alert("JSON 标注解析失败，请检查格式。");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const onSaveSnapshot = () => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.domElement.toBlob((blob: Blob | null) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `snapshot-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const onExportViewParams = () => {
    if (!perspectiveCameraRef.current || !orthographicCameraRef.current || !controlsRef.current) {
      return;
    }

    const payload: ViewParamsSnapshot = {
      version: 1,
      cameraMode,
      controlsTarget: [controlsRef.current.target.x, controlsRef.current.target.y, controlsRef.current.target.z],
      perspective: snapshotPerspectiveCamera(perspectiveCameraRef.current),
      orthographic: snapshotOrthographicCamera(orthographicCameraRef.current),
      viewportBgColor,
      showGrid,
      showAxes,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `view-params-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyViewParams = (payload: ViewParamsSnapshot) => {
    const persp = perspectiveCameraRef.current;
    const ortho = orthographicCameraRef.current;
    const controls = controlsRef.current;
    if (!persp || !ortho || !controls) return;

    applyCameraSnapshot(persp, payload.perspective);
    applyCameraSnapshot(ortho, payload.orthographic);

    setViewportBgColor(payload.viewportBgColor ?? "#08090a");
    setShowGrid(Boolean(payload.showGrid));
    setShowAxes(Boolean(payload.showAxes));
    setCameraMode(payload.cameraMode);

    controls.target.set(...payload.controlsTarget);
    const nextCamera = payload.cameraMode === "perspective" ? persp : ortho;
    controls.object = nextCamera;
    activeCameraRef.current = nextCamera;
    if (renderPassRef.current) renderPassRef.current.camera = nextCamera;
    edlPassRef.current?.setCamera(nextCamera);
    controls.update();
  };

  const onLoadViewParams = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as ViewParamsSnapshot;
        if (parsed.version !== 1) throw new Error("不支持的参数版本");
        applyViewParams(parsed);
      } catch (err) {
        console.error("导入3D参数失败:", err);
        alert("导入3D参数失败，请检查 JSON 格式。");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  useEffect(() => {
    if (!measurementEnabled) {
      if (controlsRef.current) controlsRef.current.enabled = true;
      setPendingLinePoint(null);
      setDraftMeasurementPoints([]);
      setRectDraft(null);
      setDraggedMeasurementPoint(null);
      setActiveDragAxis(null);
      setIsMeasurementHandleHover(false);
    }
  }, [measurementEnabled]);

  useEffect(() => {
    setPendingLinePoint(null);
    setDraftMeasurementPoints([]);
    setRectDraft(null);
    setDraggedMeasurementPoint(null);
    setActiveDragAxis(null);
    setIsMeasurementHandleHover(false);
    if (controlsRef.current) controlsRef.current.enabled = true;
  }, [activeMeasurementTool]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const axis = event.key.toLowerCase();
      if (draggedMeasurementPoint && (axis === "x" || axis === "y" || axis === "z")) {
        event.preventDefault();
        setActiveDragAxis(axis);
        return;
      }
      if (event.key === "Enter" && activeMeasurementTool === "polyline" && draftMeasurementPoints.length >= 2) {
        event.preventDefault();
        createPointMeasurement("polyline", draftMeasurementPoints);
        return;
      }
      if (event.key !== "Escape") return;
      setPendingLinePoint(null);
      setDraftMeasurementPoints([]);
      setRectDraft(null);
      setDraggedMeasurementPoint(null);
      setActiveDragAxis(null);
      if (controlsRef.current) controlsRef.current.enabled = true;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const axis = event.key.toLowerCase();
      if (axis === "x" || axis === "y" || axis === "z") {
        setActiveDragAxis((prev) => (prev === axis ? null : prev));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // The keyboard handler only needs the current tool and draft points; creation reads refs for the latest list count.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMeasurementTool, draftMeasurementPoints, draggedMeasurementPoint]);

  useEffect(() => {
    if (!draggedMeasurementPoint) return;
    if (controlsRef.current) controlsRef.current.enabled = false;

    const onPointerMove = (event: PointerEvent) => {
      const point = getDraggedMeasurementTargetPoint(event.clientX, event.clientY, draggedMeasurementPoint);
      if (point) updateMeasurementPoint(draggedMeasurementPoint.id, draggedMeasurementPoint.pointIndex, point);
    };

    const onPointerUp = () => {
      setDraggedMeasurementPoint(null);
      setActiveDragAxis(null);
      if (controlsRef.current) controlsRef.current.enabled = true;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
    // Dragging needs the latest Three.js refs without rebinding on every helper recreation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggedMeasurementPoint, activeDragAxis, pointSize]);

  const onMeasurementPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!measurementEnabled || !activeMeasurementTool) return;
    if (event.button !== 0) return;
    const viewportPoint = getViewportPoint(event.clientX, event.clientY);
    if (!viewportPoint) return;

    const selectedHandle = activeMeasurementTool === "select" ? findSelectedMeasurementHandle(event.clientX, event.clientY) : null;
    if (selectedHandle) {
      event.preventDefault();
      if (controlsRef.current) controlsRef.current.enabled = false;
      setActiveDragAxis(null);
      setDraggedMeasurementPoint(selectedHandle);
      return;
    }

    if (activeMeasurementTool === "select") return;

    if (activeMeasurementTool === "rect") {
      event.preventDefault();
      if (controlsRef.current) controlsRef.current.enabled = false;
      setRectDraft({ start: viewportPoint, current: viewportPoint });
      return;
    }

    if (activeMeasurementTool === "line") {
      event.preventDefault();
      const point = pickPointFromCanvas(event.clientX, event.clientY);
      if (!point) return;
      if (!pendingLinePoint) {
        setPendingLinePoint(point);
        return;
      }
      const id = `measure-${Date.now()}`;
      const item: MeasurementItem = {
        id,
        type: "line",
        label: `线段 ${measurementsRef.current.filter((measurement) => measurement.type === "line").length + 1}`,
        points: [pendingLinePoint, point],
        createdAt: Date.now(),
      };
      setMeasurements((prev) => [...prev, item]);
      setSelectedMeasurementId(id);
      setPendingLinePoint(null);
      setActivePanelFeature("measurement");
      openPanelSection("measurementResults");
    }

    if (activeMeasurementTool === "polyline") {
      event.preventDefault();
      if (event.detail >= 2) {
        createPointMeasurement("polyline", draftMeasurementPoints);
        return;
      }

      const point = pickPointFromCanvas(event.clientX, event.clientY);
      if (!point) return;
      setDraftMeasurementPoints((prev) => [...prev, point]);
      return;
    }

    if (activeMeasurementTool === "angle") {
      event.preventDefault();
      const point = pickPointFromCanvas(event.clientX, event.clientY);
      if (!point) return;
      const nextPoints = [...draftMeasurementPoints, point];
      if (nextPoints.length >= 3) {
        createPointMeasurement("angle", nextPoints.slice(0, 3));
        return;
      }
      setDraftMeasurementPoints(nextPoints);
    }
  };

  const onMeasurementPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (draggedMeasurementPoint) {
      const point = getDraggedMeasurementTargetPoint(event.clientX, event.clientY, draggedMeasurementPoint);
      if (point) updateMeasurementPoint(draggedMeasurementPoint.id, draggedMeasurementPoint.pointIndex, point);
      return;
    }
    if (measurementEnabled && activeMeasurementTool === "select") {
      setIsMeasurementHandleHover(Boolean(findSelectedMeasurementHandle(event.clientX, event.clientY)));
      return;
    }
    if (!rectDraft) return;
    const viewportPoint = getViewportPoint(event.clientX, event.clientY);
    if (!viewportPoint) return;
    setRectDraft((prev) => (prev ? { ...prev, current: viewportPoint } : prev));
  };

  const onMeasurementPointerUp = () => {
    if (draggedMeasurementPoint) {
      setDraggedMeasurementPoint(null);
      setActiveDragAxis(null);
      setIsMeasurementHandleHover(false);
      if (controlsRef.current) controlsRef.current.enabled = true;
      return;
    }
    if (!rectDraft) return;
    const width = Math.abs(rectDraft.current.x - rectDraft.start.x);
    const height = Math.abs(rectDraft.current.y - rectDraft.start.y);
    if (width > 8 && height > 8) createRectMeasurement(rectDraft);
    setRectDraft(null);
    if (controlsRef.current) controlsRef.current.enabled = true;
  };

  useEffect(() => {
    if (!pointCloudRef.current) return;
    const material = pointCloudRef.current.material as THREE.PointsMaterial;
    material.size = pointSize;
  }, [pointSize]);

  useEffect(() => {
    if (!originalPositionsRef.current) return;
    rebuildPointCloud(false);
  }, [zThresholdRatio]);

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
  }, [roomColor, doorColor, windowColor, annotationLineWidth]);

  const measurementOverlayItems = measurementEnabled
    ? (measurements
        .map((measurement) => {
          void measurementLabelTick;
          const point = projectPointToScreen(vectorToPoint(getMeasurementCenter(measurement)));
          return point ? { measurement, point } : null;
        })
        .filter(Boolean) as Array<{ measurement: MeasurementItem; point: ScreenPoint }>)
    : [];

  return (
    <div className="app workbench">
      <header className="menu-bar">
        <div className="menu-left">
          <p className="mono-label">CAGE-Viewer</p>
          <nav className="menu-items">
            <div className="menu-dropdown-wrap">
              <button className="menu-btn" type="button" onClick={() => setOpenMenu(openMenu === "file" ? null : "file")}>
                <FolderOpen size={14} />
                文件
              </button>
              {openMenu === "file" && (
                <div className="menu-dropdown">
                  <button className="menu-item" onClick={() => { inputPlyRef.current?.click(); setOpenMenu(null); }}>导入点云文件</button>
                  <button className="menu-item" onClick={() => { inputAnnoRef.current?.click(); setOpenMenu(null); }}>导入标注文件</button>
                  <button className="menu-item" onClick={() => { inputViewParamsRef.current?.click(); setOpenMenu(null); }}>导入视图参数</button>
                </div>
              )}
            </div>

            <div className="menu-dropdown-wrap">
              <button className="menu-btn" type="button" onClick={() => setOpenMenu(openMenu === "export" ? null : "export")}>
                <ImageDown size={14} />
                导出
              </button>
              {openMenu === "export" && (
                <div className="menu-dropdown">
                  <button className="menu-item" onClick={() => { onSaveSnapshot(); setOpenMenu(null); }}>导出截图</button>
                  <button className="menu-item" onClick={() => { onExportViewParams(); setOpenMenu(null); }}>导出视图参数</button>
                </div>
              )}
            </div>
          </nav>
        </div>
        <div className="menu-right" />
      </header>

      <main className="workspace-layout">
        <aside className="left-toolbar card-shadow">
          <button className={`tool-btn ${activeViewPreset === "top" ? "active" : ""}`} onClick={() => setPresetView("top")} title="顶部视图" aria-label="顶部视图">
            Top
          </button>
          <button className={`tool-btn ${activeViewPreset === "front" ? "active" : ""}`} onClick={() => setPresetView("front")} title="前视图" aria-label="前视图">
            Fr
          </button>
          <button className={`tool-btn ${activeViewPreset === "right" ? "active" : ""}`} onClick={() => setPresetView("right")} title="右视图" aria-label="右视图">
            Rt
          </button>
          <button className={`tool-btn ${activeViewPreset === "iso" ? "active" : ""}`} onClick={() => setPresetView("iso")} title="等轴视图" aria-label="等轴视图">
            Iso
          </button>
          <button className={`tool-btn ${activeViewPreset === "fit" ? "active" : ""}`} onClick={onResetView} title="适配视图" aria-label="适配视图">
            <Compass size={18} />
          </button>
        </aside>

        <section className="viewport-shell card-shadow">
          <div className="viewport-toolbar">
            <div className="chip">
              <Aperture size={13} /> 相机：{cameraMode === "perspective" ? "透视" : "正射"}
            </div>
            <div className="chip">点大小：{pointSize}</div>
            <div className="chip">Z 过滤：{zThresholdRatio}%</div>
          </div>
          <div className="xyz-gizmo" aria-label="XYZ 视角导航">
            <div
              className="axis-line x"
              ref={(el) => {
                gizmoLineRefs.current.x = el;
              }}
            />
            <div
              className="axis-line y"
              ref={(el) => {
                gizmoLineRefs.current.y = el;
              }}
            />
            <div
              className="axis-line z"
              ref={(el) => {
                gizmoLineRefs.current.z = el;
              }}
            />
            <div
              className="axis x"
              onClick={() => setPresetView("right")}
              title="切换到右视图"
              ref={(el) => {
                gizmoAxisRefs.current.x = el;
              }}
            >
              X
            </div>
            <div
              className="axis y"
              onClick={() => setPresetView("front")}
              title="切换到前视图"
              ref={(el) => {
                gizmoAxisRefs.current.y = el;
              }}
            >
              Y
            </div>
            <div
              className="axis z"
              onClick={() => setPresetView("top")}
              title="切换到顶视图"
              ref={(el) => {
                gizmoAxisRefs.current.z = el;
              }}
            >
              Z
            </div>
          </div>
          <div
            ref={mountRef}
            className={`canvas-wrap ${measurementEnabled ? `measuring ${activeMeasurementTool ?? ""}` : ""} ${isMeasurementHandleHover || draggedMeasurementPoint ? "handle-hover" : ""}`}
            onPointerDown={onMeasurementPointerDown}
            onPointerMove={onMeasurementPointerMove}
            onPointerUp={onMeasurementPointerUp}
            onPointerLeave={() => setIsMeasurementHandleHover(false)}
          />
          <div className="coordinate-rulers" aria-hidden="true">
            <div
              className="coordinate-ruler ruler-left"
              ref={(el) => {
                rulerRefs.current.left = el;
              }}
            />
            <div
              className="coordinate-ruler ruler-bottom"
              ref={(el) => {
                rulerRefs.current.bottom = el;
              }}
            />
            <div
              className="coordinate-ruler ruler-right"
              ref={(el) => {
                rulerRefs.current.right = el;
              }}
            />
          </div>
          <MeasurementOverlay
            activeTool={activeMeasurementTool}
            draftPoints={draftMeasurementPoints}
            enabled={measurementEnabled}
            items={measurementOverlayItems}
            pendingLinePoint={pendingLinePoint}
            projectPointToScreen={projectPointToScreen}
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

      <footer className="status-bar">
        <span>状态：就绪</span>
        <span>当前相机：{cameraMode === "perspective" ? "透视" : "正射"}</span>
        <span>增强：{edlEnabled ? "开启" : "关闭"}</span>
      </footer>

      <input ref={inputPlyRef} type="file" accept=".ply" hidden onChange={onLoadPly} />
      <input ref={inputAnnoRef} type="file" accept=".json" hidden onChange={onLoadAnnotation} />
      <input ref={inputViewParamsRef} type="file" accept=".json" hidden onChange={onLoadViewParams} />
    </div>
  );
}

export default App;
