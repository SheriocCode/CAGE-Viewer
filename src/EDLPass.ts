import * as THREE from "three";
import { FullScreenQuad, Pass } from "three/examples/jsm/postprocessing/Pass.js";

type EDLPassCamera = THREE.PerspectiveCamera | THREE.OrthographicCamera;

const edlVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const edlFragmentShader = /* glsl */ `
#include <packing>

uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 resolution;
uniform float cameraNear;
uniform float cameraFar;
uniform float strength;
uniform float radius;
uniform int isPerspectiveCamera;

varying vec2 vUv;

float getViewZ(const in float depth) {
  if (isPerspectiveCamera == 1) {
    return perspectiveDepthToViewZ(depth, cameraNear, cameraFar);
  }
  return orthographicDepthToViewZ(depth, cameraNear, cameraFar);
}

float getLinearDepth(const in vec2 uv) {
  float depth = texture2D(tDepth, uv).x;
  if (depth >= 1.0) {
    return cameraFar;
  }
  return max(0.000001, -getViewZ(depth));
}

float getDepthResponse(const in vec2 offset, const in vec2 texel, const in float centerLog) {
  vec2 sampleUv = clamp(vUv + offset * texel, vec2(0.0), vec2(1.0));
  float sampleDepth = getLinearDepth(sampleUv);
  return max(0.0, log2(sampleDepth) - centerLog);
}

void main() {
  vec4 color = texture2D(tColor, vUv);

  if (strength <= 0.0 || radius <= 0.0) {
    gl_FragColor = color;
    return;
  }

  float centerDepth = getLinearDepth(vUv);

  if (centerDepth >= cameraFar * 0.999) {
    gl_FragColor = color;
    return;
  }

  vec2 texel = radius / resolution;
  float centerLog = log2(centerDepth);
  float diagonal = 0.70710678;
  float response =
    getDepthResponse(vec2(1.0, 0.0), texel, centerLog) +
    getDepthResponse(vec2(-1.0, 0.0), texel, centerLog) +
    getDepthResponse(vec2(0.0, 1.0), texel, centerLog) +
    getDepthResponse(vec2(0.0, -1.0), texel, centerLog) +
    getDepthResponse(vec2(diagonal, diagonal), texel, centerLog) +
    getDepthResponse(vec2(-diagonal, diagonal), texel, centerLog) +
    getDepthResponse(vec2(diagonal, -diagonal), texel, centerLog) +
    getDepthResponse(vec2(-diagonal, -diagonal), texel, centerLog);

  float shade = exp(-response * strength * 0.02);
  gl_FragColor = vec4(color.rgb * shade, color.a);
}
`;

export class EDLPass extends Pass {
  private readonly scene: THREE.Scene;
  private camera: EDLPassCamera;
  private readonly renderTarget: THREE.WebGLRenderTarget;
  private readonly material: THREE.ShaderMaterial;
  private readonly fsQuad: FullScreenQuad;

  constructor(scene: THREE.Scene, camera: EDLPassCamera, width: number, height: number) {
    super();
    this.scene = scene;
    this.camera = camera;

    const depthTexture = new THREE.DepthTexture(width, height);
    depthTexture.type = THREE.UnsignedIntType;
    depthTexture.format = THREE.DepthFormat;

    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      depthTexture,
      depthBuffer: true,
    });

    this.material = new THREE.ShaderMaterial({
      name: "EDLPassMaterial",
      uniforms: {
        tColor: { value: this.renderTarget.texture },
        tDepth: { value: depthTexture },
        resolution: { value: new THREE.Vector2(width, height) },
        cameraNear: { value: camera.near },
        cameraFar: { value: camera.far },
        strength: { value: 0.6 },
        radius: { value: 0.6 },
        isPerspectiveCamera: { value: (camera as THREE.PerspectiveCamera).isPerspectiveCamera ? 1 : 0 },
      },
      vertexShader: edlVertexShader,
      fragmentShader: edlFragmentShader,
    });

    this.fsQuad = new FullScreenQuad(this.material);
  }

  setCamera(camera: EDLPassCamera) {
    this.camera = camera;
    this.updateCameraUniforms();
  }

  setStrength(value: number) {
    this.material.uniforms.strength.value = value;
  }

  setRadius(value: number) {
    this.material.uniforms.radius.value = value;
  }

  setSize(width: number, height: number) {
    this.renderTarget.setSize(width, height);
    this.material.uniforms.resolution.value.set(width, height);
  }

  dispose() {
    this.renderTarget.dispose();
    this.material.dispose();
    this.fsQuad.dispose();
  }

  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget) {
    this.updateCameraUniforms();

    const previousClearAlpha = renderer.getClearAlpha();
    renderer.setRenderTarget(this.renderTarget);
    renderer.clear();
    renderer.render(this.scene, this.camera);

    renderer.setClearAlpha(previousClearAlpha);
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.fsQuad.render(renderer);
  }

  private updateCameraUniforms() {
    this.material.uniforms.cameraNear.value = this.camera.near;
    this.material.uniforms.cameraFar.value = this.camera.far;
    this.material.uniforms.isPerspectiveCamera.value = (this.camera as THREE.PerspectiveCamera).isPerspectiveCamera ? 1 : 0;
  }
}
