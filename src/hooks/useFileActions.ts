import { ChangeEvent, MutableRefObject } from "react";
import * as THREE from "three";
import { parsePlyPointCloud } from "../features/point-cloud/pointCloud";
import type { AnnotationData } from "../types/annotation";
import type { ViewParamsSnapshot } from "../types/view";
import { downloadBlob, downloadJson, readFileAsArrayBuffer, readFileAsText } from "../utils/file";

type UseFileActionsParams = {
  annotationDataRef: MutableRefObject<AnnotationData | null>;
  originalColorsRef: MutableRefObject<Float32Array | null>;
  originalPositionsRef: MutableRefObject<Float32Array | null>;
  rendererRef: MutableRefObject<THREE.WebGLRenderer | null>;
  zRangeRef: MutableRefObject<{ min: number; max: number }>;
  applyViewParams: (payload: ViewParamsSnapshot) => void;
  buildViewParamsSnapshot: () => ViewParamsSnapshot | null;
  rebuildPointCloud: (shouldFitView?: boolean) => void;
  redrawAnnotations: () => void;
  setAnnotationFileName: (name: string) => void;
  setPlyFileName: (name: string) => void;
};

export const useFileActions = ({
  annotationDataRef,
  originalColorsRef,
  originalPositionsRef,
  rendererRef,
  zRangeRef,
  applyViewParams,
  buildViewParamsSnapshot,
  rebuildPointCloud,
  redrawAnnotations,
  setAnnotationFileName,
  setPlyFileName,
}: UseFileActionsParams) => {
  const onLoadPly = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPlyFileName(file.name);

    try {
      const pointCloud = parsePlyPointCloud(await readFileAsArrayBuffer(file));
      originalPositionsRef.current = pointCloud.positions;
      originalColorsRef.current = pointCloud.colors;
      zRangeRef.current = pointCloud.zRange;
      rebuildPointCloud(true);
    } catch (error) {
      console.error("PLY 解析失败:", error);
      alert("PLY 文件解析失败，请检查文件格式。");
    } finally {
      e.target.value = "";
    }
  };

  const onLoadAnnotation = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnnotationFileName(file.name);

    try {
      const parsed = JSON.parse(await readFileAsText(file)) as AnnotationData;
      annotationDataRef.current = parsed;
      redrawAnnotations();
    } catch (error) {
      console.error("标注解析失败:", error);
      alert("JSON 标注解析失败，请检查格式。");
    } finally {
      e.target.value = "";
    }
  };

  const onSaveSnapshot = () => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.domElement.toBlob((blob: Blob | null) => {
      if (!blob) return;
      downloadBlob(blob, `snapshot-${Date.now()}.png`);
    });
  };

  const onExportViewParams = () => {
    const payload = buildViewParamsSnapshot();
    if (!payload) return;
    downloadJson(payload, `view-params-${Date.now()}.json`);
  };

  const onLoadViewParams = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await readFileAsText(file)) as ViewParamsSnapshot;
      if (parsed.version !== 1) throw new Error("不支持的参数版本");
      applyViewParams(parsed);
    } catch (err) {
      console.error("导入3D参数失败:", err);
      alert("导入3D参数失败，请检查 JSON 格式。");
    } finally {
      e.target.value = "";
    }
  };

  return {
    onExportViewParams,
    onLoadAnnotation,
    onLoadPly,
    onLoadViewParams,
    onSaveSnapshot,
  };
};
