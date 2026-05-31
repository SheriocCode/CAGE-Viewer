import { FolderOpen, ImageDown } from "lucide-react";

type MenuId = "file" | "export" | null;

type TopMenuBarProps = {
  openMenu: MenuId;
  onImportAnnotation: () => void;
  onImportPly: () => void;
  onImportViewParams: () => void;
  onExportSnapshot: () => void;
  onExportViewParams: () => void;
  setOpenMenu: (menu: MenuId) => void;
};

export function TopMenuBar({
  openMenu,
  onImportAnnotation,
  onImportPly,
  onImportViewParams,
  onExportSnapshot,
  onExportViewParams,
  setOpenMenu,
}: TopMenuBarProps) {
  return (
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
                <button
                  className="menu-item"
                  onClick={() => {
                    onImportPly();
                    setOpenMenu(null);
                  }}
                >
                  导入点云文件
                </button>
                <button
                  className="menu-item"
                  onClick={() => {
                    onImportAnnotation();
                    setOpenMenu(null);
                  }}
                >
                  导入标注文件
                </button>
                <button
                  className="menu-item"
                  onClick={() => {
                    onImportViewParams();
                    setOpenMenu(null);
                  }}
                >
                  导入视图参数
                </button>
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
                <button
                  className="menu-item"
                  onClick={() => {
                    onExportSnapshot();
                    setOpenMenu(null);
                  }}
                >
                  导出截图
                </button>
                <button
                  className="menu-item"
                  onClick={() => {
                    onExportViewParams();
                    setOpenMenu(null);
                  }}
                >
                  导出视图参数
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
      <div className="menu-right" />
    </header>
  );
}
