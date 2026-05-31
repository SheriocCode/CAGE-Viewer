import { MutableRefObject, PointerEvent as ReactPointerEvent, useCallback, useEffect } from "react";
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { DraggedMeasurementPoint, MeasurementAxis, MeasurementPoint, MeasurementTool, RectDraft, ScreenPoint } from "../types/measurement";

type UseMeasurementInteractionParams = {
  activeDragAxis: MeasurementAxis | null;
  activeMeasurementTool: MeasurementTool | null;
  controlsRef: MutableRefObject<OrbitControls | null>;
  draftMeasurementPoints: MeasurementPoint[];
  draggedMeasurementPoint: DraggedMeasurementPoint | null;
  findSelectedMeasurementHandle: (clientX: number, clientY: number) => DraggedMeasurementPoint | null;
  getDraggedMeasurementTargetPoint: (clientX: number, clientY: number, drag: DraggedMeasurementPoint, axis: MeasurementAxis | null) => MeasurementPoint | null;
  getViewportPoint: (clientX: number, clientY: number) => ScreenPoint | null;
  measurementEnabled: boolean;
  pendingLinePoint: MeasurementPoint | null;
  pickPointFromCanvas: (clientX: number, clientY: number) => MeasurementPoint | null;
  rectDraft: RectDraft | null;
  setActiveDragAxis: (axis: MeasurementAxis | null | ((prev: MeasurementAxis | null) => MeasurementAxis | null)) => void;
  setDraftMeasurementPoints: (points: MeasurementPoint[] | ((prev: MeasurementPoint[]) => MeasurementPoint[])) => void;
  setDraggedMeasurementPoint: (point: DraggedMeasurementPoint | null) => void;
  setIsMeasurementHandleHover: (hover: boolean) => void;
  setPendingLinePoint: (point: MeasurementPoint | null) => void;
  setRectDraft: (draft: RectDraft | null | ((prev: RectDraft | null) => RectDraft | null)) => void;
  createLineMeasurement: (start: MeasurementPoint, end: MeasurementPoint) => void;
  createPointMeasurement: (type: "polyline" | "angle", points: MeasurementPoint[]) => void;
  createRectMeasurement: (draft: RectDraft) => void;
  updateMeasurementPoint: (id: string, pointIndex: number, point: MeasurementPoint) => void;
};

const resetDraftState = ({
  controlsRef,
  setActiveDragAxis,
  setDraftMeasurementPoints,
  setDraggedMeasurementPoint,
  setIsMeasurementHandleHover,
  setPendingLinePoint,
  setRectDraft,
}: Pick<
  UseMeasurementInteractionParams,
  | "controlsRef"
  | "setActiveDragAxis"
  | "setDraftMeasurementPoints"
  | "setDraggedMeasurementPoint"
  | "setIsMeasurementHandleHover"
  | "setPendingLinePoint"
  | "setRectDraft"
>) => {
  setPendingLinePoint(null);
  setDraftMeasurementPoints([]);
  setRectDraft(null);
  setDraggedMeasurementPoint(null);
  setActiveDragAxis(null);
  setIsMeasurementHandleHover(false);
  if (controlsRef.current) controlsRef.current.enabled = true;
};

export const useMeasurementInteraction = (params: UseMeasurementInteractionParams) => {
  const {
    activeDragAxis,
    activeMeasurementTool,
    controlsRef,
    draftMeasurementPoints,
    draggedMeasurementPoint,
    findSelectedMeasurementHandle,
    getDraggedMeasurementTargetPoint,
    getViewportPoint,
    measurementEnabled,
    pendingLinePoint,
    pickPointFromCanvas,
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
  } = params;

  const resetCurrentDraftState = useCallback(() => {
    resetDraftState({
      controlsRef,
      setActiveDragAxis,
      setDraftMeasurementPoints,
      setDraggedMeasurementPoint,
      setIsMeasurementHandleHover,
      setPendingLinePoint,
      setRectDraft,
    });
  }, [
    controlsRef,
    setActiveDragAxis,
    setDraftMeasurementPoints,
    setDraggedMeasurementPoint,
    setIsMeasurementHandleHover,
    setPendingLinePoint,
    setRectDraft,
  ]);

  useEffect(() => {
    if (!measurementEnabled) {
      resetCurrentDraftState();
    }
  }, [measurementEnabled, resetCurrentDraftState]);

  useEffect(() => {
    resetCurrentDraftState();
  }, [activeMeasurementTool, resetCurrentDraftState]);

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
      resetCurrentDraftState();
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
    // The handler intentionally reads current refs through the callbacks passed in from App.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMeasurementTool, draftMeasurementPoints, draggedMeasurementPoint, resetCurrentDraftState]);

  useEffect(() => {
    if (!draggedMeasurementPoint) return;
    if (controlsRef.current) controlsRef.current.enabled = false;

    const onPointerMove = (event: PointerEvent) => {
      const point = getDraggedMeasurementTargetPoint(event.clientX, event.clientY, draggedMeasurementPoint, activeDragAxis);
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
    // Dragging needs current Three.js refs without rebinding on every helper recreation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggedMeasurementPoint, activeDragAxis]);

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
      createLineMeasurement(pendingLinePoint, point);
      setPendingLinePoint(null);
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
      const point = getDraggedMeasurementTargetPoint(event.clientX, event.clientY, draggedMeasurementPoint, activeDragAxis);
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

  return {
    onMeasurementPointerDown,
    onMeasurementPointerMove,
    onMeasurementPointerUp,
  };
};
