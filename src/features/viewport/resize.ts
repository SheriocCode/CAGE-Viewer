import * as THREE from "three";
import type { Line2 } from "three/examples/jsm/lines/Line2.js";
import type { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { EDLPass } from "../../EDLPass";

type ResizeViewportParams = {
  annotationGroup: THREE.Group;
  boundingBox: THREE.Box3 | null;
  composer: EffectComposer;
  edlPass: EDLPass | null;
  mount: HTMLDivElement;
  orthographicCamera: THREE.OrthographicCamera | null;
  perspectiveCamera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer;
};

export const resizeViewport = ({
  annotationGroup,
  boundingBox,
  composer,
  edlPass,
  mount,
  orthographicCamera,
  perspectiveCamera,
  renderer,
}: ResizeViewportParams) => {
  const width = mount.clientWidth;
  const height = mount.clientHeight;
  const nextAspect = width / Math.max(1, height);

  renderer.setSize(width, height);
  composer.setSize(width, height);

  if (perspectiveCamera) {
    perspectiveCamera.aspect = nextAspect;
    perspectiveCamera.updateProjectionMatrix();
  }

  if (orthographicCamera) {
    const size = boundingBox ? boundingBox.getSize(new THREE.Vector3()).length() : 12;
    const orthoScale = Math.max(6, size * 0.6);
    orthographicCamera.left = (-orthoScale * nextAspect) / 2;
    orthographicCamera.right = (orthoScale * nextAspect) / 2;
    orthographicCamera.top = orthoScale / 2;
    orthographicCamera.bottom = -orthoScale / 2;
    orthographicCamera.updateProjectionMatrix();
  }

  edlPass?.setSize(width, height);

  annotationGroup.children.forEach((obj) => {
    const mat = (obj as Line2).material as LineMaterial;
    if (mat && "resolution" in mat) {
      mat.resolution.set(width, height);
    }
  });
};
