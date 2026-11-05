/**
 * 共享材质与几何工具：卡通阶梯材质、发光材质、描边、投影开关。
 * build.ts 与 signature.ts 都从这里取，避免循环依赖。
 */

import * as THREE from "three";

let gradientMap: THREE.DataTexture | null = null;

export function getGradientMap(): THREE.DataTexture {
  if (!gradientMap) {
    const data = new Uint8Array([96, 158, 214, 255]);
    const texture = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    gradientMap = texture;
  }
  return gradientMap;
}

const materialCache = new Map<string, THREE.MeshToonMaterial>();

export function toon(color: number, side: THREE.Side = THREE.FrontSide): THREE.MeshToonMaterial {
  const key = `${color}-${side}`;
  const cached = materialCache.get(key);
  if (cached) return cached;
  const material = new THREE.MeshToonMaterial({
    color,
    gradientMap: getGradientMap(),
    side,
  });
  materialCache.set(key, material);
  return material;
}

export function flat(color: number, map?: THREE.Texture): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, map, toneMapped: false });
}

export function glow(color: number, opacity = 0.55): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    toneMapped: false,
    depthWrite: false,
  });
}

export function disposeSharedMaterials(): void {
  materialCache.forEach((material) => material.dispose());
  materialCache.clear();
  gradientMap?.dispose();
  gradientMap = null;
}

export function outline(geometry: THREE.BufferGeometry, color: number, opacity = 0.5): THREE.LineSegments {
  return new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 26),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
  );
}

export function shadowed<T extends THREE.Mesh>(mesh: T): T {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** 快速造一个带阴影的网格 */
export function m(
  geometry: THREE.BufferGeometry,
  color: number,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const mesh = shadowed(new THREE.Mesh(geometry, toon(color)));
  mesh.position.set(x, y, z);
  return mesh;
}

/** 标记为绕 Y 轴自转（每帧由场景推进） */
export function spinY(object: THREE.Object3D, speed: number): THREE.Object3D {
  object.userData.spinY = speed;
  return object;
}

/** 标记为上下浮动 */
export function floatY(object: THREE.Object3D, amp: number, speed: number, phase = 0): THREE.Object3D {
  object.userData.floatY = { baseY: object.position.y, amp, speed, phase };
  return object;
}

/** 标记为绕某点公转（星星、飘浮物） */
export function orbitAround(
  object: THREE.Object3D,
  center: { x: number; z: number },
  radius: number,
  speed: number,
  phase = 0,
): THREE.Object3D {
  object.userData.orbit = { ...center, radius, speed, phase };
  return object;
}

/** 标记为左右摆动（钟摆） */
export function swing(object: THREE.Object3D, amp: number, speed: number): THREE.Object3D {
  object.userData.swing = { amp, speed };
  return object;
}

/** 标记为脉冲（声波、光环） */
export function pulse(object: THREE.Object3D, speed: number, phase = 0): THREE.Object3D {
  object.userData.pulse = { speed, phase, baseScale: object.scale.x };
  return object;
}
