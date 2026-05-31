import type { CameraMode } from "../../types/view";

type StatusBarProps = {
  cameraMode: CameraMode;
  edlEnabled: boolean;
};

export function StatusBar({ cameraMode, edlEnabled }: StatusBarProps) {
  return (
    <footer className="status-bar">
      <span>状态：就绪</span>
      <span>当前相机：{cameraMode === "perspective" ? "透视" : "正射"}</span>
      <span>增强：{edlEnabled ? "开启" : "关闭"}</span>
    </footer>
  );
}
