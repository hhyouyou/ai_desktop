/**
 * 小镇场景总装：渲染器、正交等距相机、光照、地面道路、建筑、人物、交互。
 * 由 React 组件负责生命周期，这里不依赖 React。
 */

import * as THREE from "three";
import {
  BARRELS,
  BENCHES,
  BICYCLES,
  BINS,
  BUILDINGS,
  BUSHES,
  CLOTHESLINES,
  CRATES,
  DECOR,
  FENCES,
  FLOWERS,
  LAMPS,
  PARK,
  PARK_TREES,
  PATHS,
  PLANTERS,
  PLAZA,
  POND,
  POTS,
  SIGNPOSTS,
  STALLS,
  STREET_TREES,
  STREETS,
  TOWN_SIZE,
  YARDS,
  type BuildingDef,
} from "./data";
import {
  createBench,
  createBuilding,
  createCharacter,
  createCrosswalk,
  createDecorBuilding,
  createGround,
  createLamp,
  createMailbox,
  createPark,
  createPath,
  createPlanter,
  createPlaza,
  createStall,
  createStreet,
  createTree,
  createYard,
  type BuildingHandle,
} from "./build";
import { disposeSharedMaterials } from "./materials";
import {
  createBarrel,
  createBicycle,
  createBushes,
  createClothesline,
  createCrates,
  createFence,
  createFlowerField,
  createFlowerPot,
  createGrassTufts,
  createSignpost,
  createTrashBin,
} from "./props";
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
    const halfHeight = Math.max(28, 44 / aspect);
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
  sun.position.set(40, 60, 28);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -44;
  sun.shadow.camera.right = 44;
  sun.shadow.camera.top = 44;
  sun.shadow.camera.bottom = -44;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 150;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.045;
  scene.add(sun);

  const fill = new THREE.DirectionalLight(0xdfe9ff, 0.55);
  fill.position.set(-18, 16, -14);
  scene.add(fill);

  scene.add(createGround(TOWN_SIZE));

  STREETS.forEach((street) => {
    scene.add(createStreet(street));
  });

  PATHS.forEach((path) => {
    scene.add(createPath(path.x1, path.z1, path.x2, path.z2, path.width));
  });

  YARDS.forEach((yard) => {
    scene.add(createYard(yard.x, yard.z, yard.w + 1.2, yard.d + 0.8));
  });

  // 两个主路口各铺四条斑马线
  const crossings: [number, number, number, "x" | "z"][] = [
    [-1.9, -11.6, 5.4, "x"],
    [-1.9, -6.6, 5.4, "x"],
    [-6.2, -9.1, 4.2, "z"],
    [2.4, -9.1, 4.2, "z"],
    [-1.6, 9.9, 5.4, "x"],
    [-1.6, 14.6, 5.4, "x"],
    [-6, 12.2, 4.2, "z"],
    [2.6, 12.2, 4.2, "z"],
  ];
  crossings.forEach(([x, z, span, along]) => {
    scene.add(createCrosswalk(x, z, span, along));
  });

  scene.add(createPlaza());
  scene.add(createPark());

  DECOR.forEach((item) => {
    scene.add(createDecorBuilding(item));
  });

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

  LAMPS.forEach(([x, z]) => scene.add(createLamp(x, z)));
  BENCHES.forEach((bench) => scene.add(createBench(bench.x, bench.z, bench.rot)));
  PLANTERS.forEach(([x, z]) => scene.add(createPlanter(x, z)));
  STALLS.forEach((stall) => scene.add(createStall(stall.x, stall.z, stall.accent)));
  scene.add(createMailbox(2.6, -5.4));

  // 绿植：手动点位 + 每块草地四角自动补灌木
  const yardBushes: { x: number; z: number; s: number }[] = [];
  YARDS.forEach((yard, index) => {
    const halfW = (yard.w + 1.2) / 2 - 0.75;
    const halfD = (yard.d + 0.8) / 2 - 0.75;
    [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ].forEach(([sx, sz], corner) => {
      if ((index + corner) % 3 === 0) return;
      yardBushes.push({
        x: yard.x + sx * halfW,
        z: yard.z + sz * halfD,
        s: 0.8 + ((index + corner) % 4) * 0.13,
      });
    });
  });

  scene.add(createBushes([...BUSHES, ...yardBushes]));
  scene.add(createFlowerField(FLOWERS));

  const grassSpots: { x: number; z: number; s: number }[] = [];
  [...BUSHES, ...FLOWERS].forEach((spot, index) => {
    for (let i = 0; i < 2; i += 1) {
      const angle = index * 2.3 + i * 1.9;
      const radius = 0.45 + ((index + i) % 5) * 0.16;
      grassSpots.push({
        x: spot.x + Math.cos(angle) * radius,
        z: spot.z + Math.sin(angle) * radius,
        s: 0.7 + ((index + i) % 4) * 0.16,
      });
    }
  });
  scene.add(createGrassTufts(grassSpots));

  // 生活痕迹
  FENCES.forEach((fence) => scene.add(createFence(fence.x, fence.z, fence.rot, fence.length ?? 2)));
  BICYCLES.forEach((bike) => scene.add(createBicycle(bike.x, bike.z, bike.rot)));
  CLOTHESLINES.forEach((line) =>
    scene.add(createClothesline(line.x, line.z, line.rot, line.length ?? 2.6)),
  );
  BINS.forEach(([x, z]) => scene.add(createTrashBin(x, z)));
  CRATES.forEach((crate) => scene.add(createCrates(crate.x, crate.z, crate.rot)));
  POTS.forEach((pot) => scene.add(createFlowerPot(pot.x, pot.z, pot.accent ?? "coral")));
  BARRELS.forEach((barrel) => scene.add(createBarrel(barrel.x, barrel.z)));
  SIGNPOSTS.forEach((sign) => scene.add(createSignpost(sign.x, sign.z, sign.rot)));

  [...PARK_TREES, ...STREET_TREES].forEach(([x, z, scale]) => {
    scene.add(createTree(x, z, scale));
  });

  YARDS.forEach((yard, index) => {
    if (yard.w < 5.8 || index % 2 !== 0) return;
    scene.add(createTree(yard.x + 0.8, yard.z + 0.3, 0.92));
  });

  const pickPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(TOWN_SIZE * 2, TOWN_SIZE * 2),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  pickPlane.rotation.x = -Math.PI / 2;
  pickPlane.position.y = 0.02;
  scene.add(pickPlane);

  const grid: WalkGrid = createWalkGrid([
    ...BUILDINGS.map((b) => ({ x: b.x, z: b.z, r: Math.max(b.w, b.d) * 0.62 + 0.55 })),
    ...DECOR.map((d) => ({ x: d.x, z: d.z, r: Math.max(d.w, d.d) * 0.62 + 0.45 })),
    { x: PLAZA.x, z: PLAZA.z, r: 1.45 },
    { x: POND.x, z: POND.z, r: Math.max(POND.rx, POND.rz) + 0.35 },
    ...STALLS.map((s) => ({ x: s.x, z: s.z, r: 1.15 })),
  ]);

  const character = createCharacter();
  character.scale.setScalar(1.22);
  const actor = {
    group: character,
    pos: new THREE.Vector3(-1.8, 0, 7.6),
    facing: Math.PI,
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
  let elapsed = 0;

  type AnimatedNode = {
    object: THREE.Object3D;
    spinY?: number;
    floatY?: { baseY: number; amp: number; speed: number; phase: number };
    orbit?: { x: number; z: number; radius: number; speed: number; phase: number };
    swing?: { amp: number; speed: number };
    pulse?: { speed: number; phase: number; baseScale: number };
  };

  const animated: AnimatedNode[] = [];
  scene.traverse((object) => {
    const data = object.userData;
    if (data.spinY || data.floatY || data.orbit || data.swing || data.pulse) {
      animated.push({
        object,
        spinY: data.spinY,
        floatY: data.floatY,
        orbit: data.orbit,
        swing: data.swing,
        pulse: data.pulse,
      });
    }
  });

  function updateAnimated(dt: number): void {
    elapsed += dt;
    for (const node of animated) {
      const object = node.object;

      if (node.spinY) {
        object.rotation.y += node.spinY * dt;
      }

      if (node.floatY) {
        const { baseY, amp, speed, phase } = node.floatY;
        object.position.y = baseY + Math.sin(elapsed * speed + phase) * amp;
      }

      if (node.orbit) {
        const { x, z, radius, speed, phase } = node.orbit;
        const angle = elapsed * speed + phase;
        object.position.x = x + Math.cos(angle) * radius;
        object.position.z = z + Math.sin(angle) * radius;
      }

      if (node.swing) {
        object.rotation.z = Math.sin(elapsed * node.swing.speed) * node.swing.amp;
      }

      if (node.pulse) {
        const { speed, phase, baseScale } = node.pulse;
        const t = (elapsed * speed + phase) % 1;
        object.scale.setScalar(baseScale * (1 + t * 1.7));
        const material = (object as THREE.Mesh).material;
        if (material instanceof THREE.MeshBasicMaterial) {
          material.opacity = Math.max(0, 0.5 * (1 - t));
        }
      }
    }
  }

  function tick(now: number): void {
    if (!running) return;
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    updateActor(dt);
    updateAnimated(dt);
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
