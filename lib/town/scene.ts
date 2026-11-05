/**
 * 小镇场景总装：渲染器、正交等距相机、光照、地面道路、建筑、人物、交互。
 * 由 React 组件负责生命周期，这里不依赖 React。
 */

import * as THREE from "three";
import { BUILDINGS, PLAZA_RADIUS, TOWN_SIZE, type BuildingDef } from "./data";
import {
  createBuilding,
  createCharacter,
  createGround,
  createPlaza,
  createRoad,
  createTree,
  disposeSharedMaterials,
  type BuildingHandle,
} from "./build";
import { createWalkGrid, findPath, isWalkable, nearestWalkable, type Point, type WalkGrid } from "./path";

export type TownCallbacks = {
  onHover: (id: string | null) => void;
  onTarget: (id: string | null) => void;
  onArrive: (id: string | null) => void;
  onReady: () => void;
};

export type TownScene = {
  dispose: () => void;
  goToBuilding: (id: string) => void;
  zoomBy: (factor: number) => void;
  resetView: () => void;
  getState: () => { x: number; z: number; moving: boolean; arrived: boolean; target: string | null };
};

const TREE_SPOTS: [number, number, number][] = [
  [-16, -9, 1.05],
  [-15.5, -14, 0.9],
  [-9, -15.5, 1.1],
  [0, -16, 0.95],
  [8, -14.5, 1.05],
  [15.5, -12, 0.9],
  [16.5, -7, 1],
  [16, 1, 1.05],
  [16, 8, 0.95],
  [-16.5, -2, 1],
  [-16.5, 11, 1.05],
  [-14, 16, 0.9],
  [11, 15, 1],
  [-3, -16, 0.9],
];

export function createTownScene(container: HTMLElement, callbacks: TownCallbacks): TownScene {
  const width = container.clientWidth;
  const height = container.clientHeight;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.touchAction = "none";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf8f2e4);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  camera.position.set(52, 52, 52);
  camera.lookAt(0, -0.4, 0);

  const view = { zoom: 1 };

  function fitCamera(): void {
    const w = container.clientWidth;
    const h = container.clientHeight;
    const aspect = w / Math.max(h, 1);
    const halfHeight = Math.max(16, 26 / aspect);
    camera.left = -halfHeight * aspect;
    camera.right = halfHeight * aspect;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.zoom = view.zoom;
    camera.updateProjectionMatrix();
  }

  fitCamera();

  const hemisphere = new THREE.HemisphereLight(0xfff8ea, 0xc9b49a, 1.5);
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(0xfff2d8, 2.1);
  sun.position.set(20, 34, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -26;
  sun.shadow.camera.right = 26;
  sun.shadow.camera.top = 26;
  sun.shadow.camera.bottom = -26;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 110;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.045;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xdfe9ff, 0.55);
  fill.position.set(-18, 16, -14);
  scene.add(fill);

  scene.add(createGround(TOWN_SIZE));
  scene.add(createPlaza());

  const handles = new Map<string, BuildingHandle>();
  const hitTargets: THREE.Object3D[] = [];
  const buildingByIdMap = new Map<string, BuildingDef>(BUILDINGS.map((b) => [b.id, b]));

  BUILDINGS.forEach((def) => {
    const handle = createBuilding(def);
    handles.set(def.id, handle);
    hitTargets.push(...handle.hitTargets);
    scene.add(handle.group);
  });

  function doorWorldPosition(def: BuildingDef): THREE.Vector3 {
    const handle = handles.get(def.id);
    if (!handle) return new THREE.Vector3(def.x, 0, def.z);
    const point = handle.group.localToWorld(handle.doorPoint.clone());
    point.y = 0;
    return point;
  }

  // 广场外一圈环路，再从环路向每栋建筑引一小段支路（不穿模）
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(PLAZA_RADIUS + 0.35, PLAZA_RADIUS + 1.85, 72),
    new THREE.MeshToonMaterial({ color: 0xe8dbc2 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.025;
  ring.receiveShadow = true;
  scene.add(ring);

  BUILDINGS.forEach((def) => {
    const radius = Math.hypot(def.x, def.z) || 1;
    const dirX = def.x / radius;
    const dirZ = def.z / radius;
    const startRadius = PLAZA_RADIUS + 1.85;
    const endRadius = radius - Math.max(def.w, def.d) / 2 - 0.7;
    if (endRadius <= startRadius + 0.5) return;
    scene.add(
      createRoad(
        new THREE.Vector3(dirX * startRadius, 0, dirZ * startRadius),
        new THREE.Vector3(dirX * endRadius, 0, dirZ * endRadius),
        0.85,
      ),
    );
  });

  TREE_SPOTS.forEach(([x, z, scale]) => {
    scene.add(createTree(x, z, scale));
  });

  const pickPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(TOWN_SIZE * 2, TOWN_SIZE * 2),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  pickPlane.rotation.x = -Math.PI / 2;
  pickPlane.position.y = 0.02;
  scene.add(pickPlane);

  const grid: WalkGrid = createWalkGrid(BUILDINGS);

  const character = createCharacter();
  character.scale.setScalar(1.22);
  const actor = {
    group: character,
    pos: new THREE.Vector3(0.6, 0, 4.8),
    facing: 0,
    path: [] as Point[],
    targetId: null as string | null,
    moving: false,
    animTime: 0,
    hasArrived: false,
  };
  character.position.copy(actor.pos);
  scene.add(character);

  const legs = (character.userData.legs as THREE.Mesh[]) ?? [];
  const arms = (character.userData.arms as THREE.Mesh[]) ?? [];
  const torso = character.userData.torso as THREE.Mesh | undefined;

  /* ------------------------------ 交互状态 ------------------------------ */

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovered: string | null = null;
  let pointerDownAt = 0;
  let pointerDownX = 0;
  let pointerDownY = 0;
  let lastHoverAt = 0;

  function pickBuilding(clientX: number, clientY: number): string | null {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(hitTargets, false);
    for (const hit of hits) {
      const id = hit.object.userData.buildingId;
      if (typeof id === "string") return id;
    }
    return null;
  }

  function setHovered(id: string | null): void {
    if (hovered === id) return;
    if (hovered) handles.get(hovered)?.setActive(false);
    hovered = id;
    if (id) handles.get(id)?.setActive(true);
    callbacks.onHover(id);
  }

  function moveTo(point: Point, buildingId: string | null): void {
    const path = findPath(grid, { x: actor.pos.x, z: actor.pos.z }, point);
    if (!path || path.length === 0) return;
    actor.path = path;
    actor.targetId = buildingId;
    actor.moving = true;
    actor.hasArrived = false;
    callbacks.onArrive(null);
    callbacks.onTarget(buildingId);
  }

  function goToBuilding(id: string): void {
    const def = buildingByIdMap.get(id);
    if (!def) return;
    const door = doorWorldPosition(def);
    const safe = nearestWalkable(grid, { x: door.x, z: door.z });
    moveTo(safe, id);
  }

  function handlePointerMove(event: PointerEvent): void {
    const now = performance.now();
    if (now - lastHoverAt < 70) return;
    lastHoverAt = now;
    setHovered(pickBuilding(event.clientX, event.clientY));
  }

  function handlePointerDown(event: PointerEvent): void {
    pointerDownAt = performance.now();
    pointerDownX = event.clientX;
    pointerDownY = event.clientY;
  }

  function handlePointerUp(event: PointerEvent): void {
    const moved = Math.hypot(event.clientX - pointerDownX, event.clientY - pointerDownY);
    const elapsed = performance.now() - pointerDownAt;
    if (moved > 8 || elapsed > 600) return;

    const buildingId = pickBuilding(event.clientX, event.clientY);
    if (buildingId) {
      goToBuilding(buildingId);
      return;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const groundHit = raycaster.intersectObject(pickPlane, false);
    if (groundHit.length > 0) {
      const point = groundHit[0].point;
      const safe = nearestWalkable(grid, { x: point.x, z: point.z });
      moveTo(safe, null);
    }
  }

  function handlePointerLeave(): void {
    setHovered(null);
  }

  function handleWheel(event: WheelEvent): void {
    event.preventDefault();
    const next = Math.min(1.9, Math.max(0.72, view.zoom * (1 - event.deltaY * 0.0012)));
    view.zoom = next;
    camera.zoom = next;
    camera.updateProjectionMatrix();
  }

  const keys = new Set<string>();

  function handleKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
      keys.add(key);
      if (actor.moving) {
        actor.path = [];
        actor.moving = false;
        actor.targetId = null;
        callbacks.onTarget(null);
        callbacks.onArrive(null);
      }
      event.preventDefault();
    }
  }

  function handleKeyUp(event: KeyboardEvent): void {
    keys.delete(event.key.toLowerCase());
  }

  const canvas = renderer.domElement;
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointerleave", handlePointerLeave);
  canvas.addEventListener("wheel", handleWheel, { passive: false });
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);

  /* ------------------------------ 每帧更新 ------------------------------ */

  function updateActor(dt: number): void {
    let dx = 0;
    let dz = 0;

    if (keys.size > 0) {
      const step = Math.SQRT1_2;
      if (keys.has("w") || keys.has("arrowup")) {
        dx -= step;
        dz -= step;
      }
      if (keys.has("s") || keys.has("arrowdown")) {
        dx += step;
        dz += step;
      }
      if (keys.has("d") || keys.has("arrowright")) {
        dx += step;
        dz -= step;
      }
      if (keys.has("a") || keys.has("arrowleft")) {
        dx -= step;
        dz += step;
      }
    }

    if (dx !== 0 || dz !== 0) {
      const length = Math.hypot(dx, dz) || 1;
      const speed = 4.4 * dt;
      const nx = actor.pos.x + (dx / length) * speed;
      const nz = actor.pos.z + (dz / length) * speed;
      let moved = false;
      if (isWalkable(grid, nx, nz)) {
        actor.pos.x = nx;
        actor.pos.z = nz;
        moved = true;
      } else if (isWalkable(grid, nx, actor.pos.z)) {
        actor.pos.x = nx;
        moved = true;
      } else if (isWalkable(grid, actor.pos.x, nz)) {
        actor.pos.z = nz;
        moved = true;
      }
      if (moved) {
        actor.facing = lerpAngle(actor.facing, Math.atan2(dx, dz), Math.min(1, dt * 14));
        actor.moving = true;
        actor.animTime += dt;
      }
    } else if (actor.path.length > 0) {
      const next = actor.path[0];
      const toX = next.x - actor.pos.x;
      const toZ = next.z - actor.pos.z;
      const distance = Math.hypot(toX, toZ);

      if (distance < 0.14) {
        actor.path.shift();
        if (actor.path.length === 0) {
          actor.moving = false;
          if (!actor.hasArrived) {
            actor.hasArrived = true;
            callbacks.onArrive(actor.targetId);
          }
        }
      } else {
        const speed = Math.min(4.4 * dt, distance);
        actor.pos.x += (toX / distance) * speed;
        actor.pos.z += (toZ / distance) * speed;
        actor.facing = lerpAngle(actor.facing, Math.atan2(toX, toZ), Math.min(1, dt * 12));
        actor.moving = true;
        actor.animTime += dt;
      }
    } else {
      actor.moving = false;
    }

    character.position.set(actor.pos.x, actor.moving ? Math.abs(Math.sin(actor.animTime * 9)) * 0.07 : 0, actor.pos.z);
    character.rotation.y = actor.facing;

    const swing = actor.moving ? Math.sin(actor.animTime * 9) * 0.46 : 0;
    legs.forEach((leg, index) => {
      leg.rotation.x = index === 0 ? swing : -swing;
    });
    arms.forEach((arm, index) => {
      arm.rotation.x = index === 0 ? -swing * 0.75 : swing * 0.75;
    });
    if (torso) {
      torso.rotation.z = actor.moving ? Math.sin(actor.animTime * 9) * 0.03 : 0;
    }
  }

  let frame = 0;
  let lastTime = performance.now();
  let running = true;

  function tick(now: number): void {
    if (!running) return;
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    updateActor(dt);
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  }

  frame = requestAnimationFrame(tick);
  callbacks.onReady();

  function handleResize(): void {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h);
    fitCamera();
  }

  const resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(container);

  function handleVisibility(): void {
    if (document.hidden) {
      running = false;
      cancelAnimationFrame(frame);
    } else if (!running) {
      running = true;
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }

  document.addEventListener("visibilitychange", handleVisibility);

  return {
    dispose() {
      running = false;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      canvas.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);

      scene.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments) {
          object.geometry?.dispose();
          const material = object.material;
          if (Array.isArray(material)) {
            material.forEach((m) => {
              if (m instanceof THREE.MeshBasicMaterial) {
                m.map?.dispose();
                m.dispose();
              }
            });
          } else if (material instanceof THREE.MeshBasicMaterial) {
            material.map?.dispose();
            material.dispose();
          }
        }
      });

      disposeSharedMaterials();
      renderer.dispose();
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    },
    goToBuilding,
    zoomBy(factor: number) {
      view.zoom = Math.min(1.9, Math.max(0.72, view.zoom * factor));
      camera.zoom = view.zoom;
      camera.updateProjectionMatrix();
    },
    resetView() {
      view.zoom = 1;
      camera.zoom = 1;
      camera.updateProjectionMatrix();
    },
    getState() {
      return {
        x: Math.round(actor.pos.x * 100) / 100,
        z: Math.round(actor.pos.z * 100) / 100,
        moving: actor.moving,
        arrived: actor.hasArrived,
        target: actor.targetId,
      };
    },
  };
}

function lerpAngle(current: number, target: number, t: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * t;
}
