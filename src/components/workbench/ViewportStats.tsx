import { Aperture } from "lucide-react";
import type { CameraMode } from "../../types/view";

type ViewportStatsProps = {
  cameraMode: CameraMode;
  pointSize: number;
  zThresholdRatio: number;
};

export function ViewportStats({ cameraMode, pointSize, zThresholdRatio }: ViewportStatsProps) {
  return (
    <div className="viewport-toolbar">
      <div className="chip">
        <Aperture size={13} /> 相机：{cameraMode === "perspective" ? "透视" : "正射"}
      </div>
      <div className="chip">点大小：{pointSize}</div>
      <div className="chip">Z 过滤：{zThresholdRatio}%</div>
    </div>
  );
}
