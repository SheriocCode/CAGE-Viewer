import { ReactNode } from "react";

export type PanelFeatureId = "quick" | "measurement" | "file" | "cloud" | "view" | "effect" | "annotation";

export type PanelFeature = {
  id: PanelFeatureId;
  label: string;
  icon: ReactNode;
  summary?: string;
};

export type PanelSectionId =
  | "fileStatus"
  | "cloudBasic"
  | "cloudAdvanced"
  | "viewProjection"
  | "viewDisplay"
  | "effectAdvanced"
  | "measurementResults"
  | "measurementDetails"
  | "annotationColors"
  | "annotationStroke"
  | "annotationActions";

export type QuickEntry = {
  id: string;
  label: string;
  value: string;
  feature: PanelFeatureId;
  section?: PanelSectionId;
};
