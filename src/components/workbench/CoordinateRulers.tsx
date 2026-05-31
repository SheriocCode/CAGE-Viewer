import type { MutableRefObject } from "react";
import type { RulerRefs } from "../../types/ruler";

type CoordinateRulersProps = {
  rulerRefs: MutableRefObject<RulerRefs>;
};

export function CoordinateRulers({ rulerRefs }: CoordinateRulersProps) {
  return (
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
  );
}
