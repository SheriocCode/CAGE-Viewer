export type AnnotationData = {
  floor_plan?: Record<string, number[] | number[][]>;
  door_window?: {
    windows?: Record<string, Array<number[] | number[][]>>;
    doors?: Record<string, Array<number[] | number[][]>>;
  };
};
