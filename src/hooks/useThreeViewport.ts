import { MutableRefObject, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { EDLPass } from "../EDLPass";
import { updateViewGizmo } from "../features/viewport/gizmo";
import { resizeViewport } from "../features/viewport/resize";
import type { MeasurementItem } from "../types/measurement";

type GizmoElementRefs = {
  x: HTMLDivElement | null;
  y: HTMLDivElement | null;
  z: HTMLDivElement | null;
};

type UseThreeViewportParams = {
  activeCameraRef: MutableRefObject<THREE.Camera | null>;
  annotationGroupRef: MutableRefObject<THREE.Group>;
  axesRef: MutableRefObject<THREE.AxesHelper | null>;
  boundingBoxRef: MutableRefObject<THREE.Box3 | null>;
  composerRef: MutableRefObject<EffectComposer | null>;
  controlsRef: MutableRefObject<OrbitControls | null>;
  edlEnabledRef: MutableRefObject<boolean>;
  edlPassRef: MutableRefObject<EDLPass | null>;
  edlRadius: number;
  edlRadiusRef: MutableRefObject<number>;
  edlStrength: number;
  edlStrengthRef: MutableRefObject<number>;
  gizmoAxisRefs: MutableRefObject<GizmoElementRefs>;
  gizmoLineRefs: MutableRefObject<GizmoElementRefs>;
  gridRef: MutableRefObject<THREE.LineSegments | null>;
  gridSignatureRef: MutableRefObject<string>;
  measurementGroupRef: MutableRefObject<THREE.Group>;
  measurementsRef: MutableRefObject<MeasurementItem[]>;
  mountRef: MutableRefObject<HTMLDivElement | null>;
  orthographicCameraRef: MutableRefObject<THREE.OrthographicCamera | null>;
  perspectiveCameraRef: MutableRefObject<THREE.PerspectiveCamera | null>;
  renderPassRef: MutableRefObject<RenderPass | null>;
  rendererRef: MutableRefObject<THREE.WebGLRenderer | null>;
  rulerSignatureRef: MutableRefObject<string>;
  sceneRef: MutableRefObject<THREE.Scene | null>;
  showAxes: boolean;
  updateCoordinateRulers: () => void;
  updateDynamicGrid: () => void;
  viewportBgColor: string;
  onMeasurementFrame: () => void;
};

export const useThreeViewport = ({
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
  onMeasurementFrame,
}: UseThreeViewportParams) => {
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

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
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const aspect = mount.clientWidth / Math.max(1, mount.clientHeight);
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
    const edlPass = new EDLPass(scene, activeCameraRef.current as THREE.PerspectiveCamera | THREE.OrthographicCamera, mount.clientWidth, mount.clientHeight);
    edlPass.setStrength(edlStrength);
    edlPass.setRadius(edlRadius);

    composer.addPass(renderPass);
    composer.addPass(edlPass);

    composerRef.current = composer;
    renderPassRef.current = renderPass;
    edlPassRef.current = edlPass;

    const onResize = () => {
      resizeViewport({
        annotationGroup: annotationGroupRef.current,
        boundingBox: boundingBoxRef.current,
        composer,
        edlPass,
        mount,
        orthographicCamera: orthographicCameraRef.current,
        perspectiveCamera: perspectiveCameraRef.current,
        renderer,
      });

      gridSignatureRef.current = "";
      rulerSignatureRef.current = "";
    };

    window.addEventListener("resize", onResize);

    let animationId = 0;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      updateViewGizmo(activeCameraRef.current, gizmoAxisRefs.current, gizmoLineRefs.current);
      updateDynamicGrid();
      updateCoordinateRulers();
      if (measurementsRef.current.length > 0) {
        onMeasurementFrame();
      }
      if (edlEnabledRef.current && edlStrengthRef.current > 0 && edlRadiusRef.current > 0) {
        composer.render();
      } else if (sceneRef.current && activeCameraRef.current) {
        renderer.render(sceneRef.current, activeCameraRef.current);
      }
    };
    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", onResize);
      controls.dispose();
      edlPass.dispose();
      const grid = gridRef.current;
      if (grid) {
        grid.geometry.dispose();
        (grid.material as THREE.Material).dispose();
        gridRef.current = null;
      }
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
      controlsRef.current = null;
      composerRef.current = null;
      edlPassRef.current = null;
      renderPassRef.current = null;
      rendererRef.current = null;
      sceneRef.current = null;
    };
    // The viewport owns imperative Three.js objects; runtime refs keep changing outside React's dependency model.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
