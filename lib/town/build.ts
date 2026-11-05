/**
 * 程序化纸模建筑：主体 + 屋顶 + 门窗 + 招牌 + 附加构件。
 * 全部用基础几何拼出来，不依赖任何模型文件。
 */

import * as THREE from "three";
import {
  ACCENT,
  PAPER,
  PARK,
  PLAZA,
  type AccentKey,
  type BuildingDef,
  type DecorDef,
  type StreetDef,
} from "./data";
import { createBoardTexture, createClockTexture, createSignTexture } from "./textures";

/* ------------------------------ 材质 ------------------------------ */

let gradientMap: THREE.DataTexture | null = null;

function getGradientMap(): THREE.DataTexture {
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

function toon(color: number, side: THREE.Side = THREE.FrontSide): THREE.MeshToonMaterial {
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

function flat(color: number, map?: THREE.Texture): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color, map, toneMapped: false });
}

export function disposeSharedMaterials(): void {
  materialCache.forEach((material) => material.dispose());
  materialCache.clear();
  gradientMap?.dispose();
  gradientMap = null;
}

function outline(geometry: THREE.BufferGeometry, color: number, opacity = 0.5): THREE.LineSegments {
  const lines = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 26),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
  );
  return lines;
}

function shadowed<T extends THREE.Mesh>(mesh: T): T {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/* ------------------------------ 建筑 ------------------------------ */

export type BuildingHandle = {
  def: BuildingDef;
  group: THREE.Group;
  /** 参与射线检测的对象（用于 hover / 点击） */
  hitTargets: THREE.Object3D[];
  /** 站在门口的位置 */
  doorPoint: THREE.Vector3;
  /** 名牌锚点（世界坐标，由外部计算） */
  height: number;
  setActive: (active: boolean) => void;
};

type RoofResult = { group: THREE.Group; rise: number };

function createRoof(def: BuildingDef, accent: { base: number; soft: number; ink: number }): RoofResult {
  const group = new THREE.Group();
  const { w, d, h, roof } = def;

  if (roof === "gable") {
    const rise = Math.max(1.1, Math.min(w, d) * 0.42);
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 - 0.3, 0);
    shape.lineTo(w / 2 + 0.3, 0);
    shape.lineTo(0, rise);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: d + 0.5, bevelEnabled: false });
    geometry.translate(0, 0, -(d + 0.5) / 2);
    const mesh = shadowed(new THREE.Mesh(geometry, toon(accent.soft)));
    mesh.position.y = h;
    mesh.add(outline(geometry, PAPER.trim, 0.45));
    group.add(mesh);
    return { group, rise };
  }

  if (roof === "flat") {
    const slab = shadowed(new THREE.Mesh(new THREE.BoxGeometry(w + 0.7, 0.26, d + 0.7), toon(accent.soft)));
    slab.position.y = h + 0.13;
    group.add(slab);
    const parapet = shadowed(
      new THREE.Mesh(new THREE.BoxGeometry(w + 0.92, 0.16, d + 0.92), toon(PAPER.roofSide)),
    );
    parapet.position.y = h + 0.03;
    group.add(parapet);
    const edge = outline(new THREE.BoxGeometry(w + 0.92, 0.16, d + 0.92), PAPER.trim, 0.4);
    edge.position.y = h + 0.03;
    group.add(edge);
    return { group, rise: 0.4 };
  }

  if (roof === "pyramid") {
    const rise = Math.max(1.2, Math.min(w, d) * 0.5);
    const radius = (Math.max(w, d) / 2 + 0.35) * Math.SQRT2 * 0.74;
    const geometry = new THREE.ConeGeometry(radius, rise, 4);
    const mesh = shadowed(new THREE.Mesh(geometry, toon(accent.base)));
    mesh.rotation.y = Math.PI / 4;
    mesh.position.y = h + rise / 2;
    mesh.add(outline(geometry, PAPER.trim, 0.45));
    group.add(mesh);
    return { group, rise };
  }

  if (roof === "dome") {
    const radius = Math.min(w, d) * 0.5;
    const geometry = new THREE.SphereGeometry(radius, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    geometry.scale(1, 1.28, 1);
    const mesh = shadowed(new THREE.Mesh(geometry, toon(accent.soft)));
    mesh.position.y = h;
    mesh.add(outline(geometry, PAPER.trim, 0.35));
    group.add(mesh);
    const base = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(radius + 0.1, radius + 0.2, 0.3, 22), toon(PAPER.roofSide)));
    base.position.y = h + 0.15;
    group.add(base);
    return { group, rise: radius * 1.28 + 0.3 };
  }

  const rise = 2.1;
  const cap = shadowed(new THREE.Mesh(new THREE.BoxGeometry(w * 0.84, 0.9, d * 0.84), toon(PAPER.wallSide)));
  cap.position.y = h + 0.45;
  group.add(cap);
  const spireGeometry = new THREE.ConeGeometry((w * 0.84) / 2 * 1.38, rise, 4);
  const spire = shadowed(new THREE.Mesh(spireGeometry, toon(accent.base)));
  spire.rotation.y = Math.PI / 4;
  spire.position.y = h + 0.9 + rise / 2;
  spire.add(outline(spireGeometry, PAPER.trim, 0.45));
  group.add(spire);
  return { group, rise: rise + 0.9 };
}

export function createBuilding(def: BuildingDef): BuildingHandle {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);
  // 门朝主街（+X）或朝镜头（+Z），加一点点确定性倾斜，避免整排建筑过于呆板
  const baseRotation = def.facing === "east" ? Math.PI / 2 : 0;
  const tiltSeed = (def.id.charCodeAt(0) + def.id.charCodeAt(1) + def.id.length) % 7;
  group.rotation.y = baseRotation + (tiltSeed - 3) * 0.014;

  const accent = ACCENT[def.accent];
  const { w, d, h } = def;
  const hitTargets: THREE.Object3D[] = [];

  const bodyGeometry = new THREE.BoxGeometry(w, h, d);
  const body = shadowed(
    new THREE.Mesh(bodyGeometry, [
      toon(PAPER.wallSide),
      toon(PAPER.wallBack),
      toon(PAPER.wall),
      toon(PAPER.wallBack),
      toon(PAPER.wall),
      toon(PAPER.wallBack),
    ]),
  );
  body.position.y = h / 2;
  body.userData.buildingId = def.id;
  body.add(outline(bodyGeometry, PAPER.trim, 0.5));
  group.add(body);
  hitTargets.push(body);

  const roof = createRoof(def, accent);
  group.add(roof.group);

  const doorHeight = Math.min(1.95, h - 0.8);
  const doorWidth = Math.min(1.1, w * 0.3);

  const frame = shadowed(new THREE.Mesh(new THREE.BoxGeometry(doorWidth + 0.32, doorHeight + 0.22, 0.18), toon(accent.ink)));
  frame.position.set(0, (doorHeight + 0.22) / 2, d / 2 + 0.03);
  group.add(frame);

  const door = shadowed(new THREE.Mesh(new THREE.BoxGeometry(doorWidth, doorHeight, 0.16), toon(accent.base)));
  door.position.set(0, doorHeight / 2, d / 2 + 0.11);
  door.userData.buildingId = def.id;
  group.add(door);
  hitTargets.push(door);

  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), flat(0xf4d98a));
  knob.position.set(doorWidth * 0.3, doorHeight * 0.52, d / 2 + 0.2);
  group.add(knob);

  const step = new THREE.Mesh(new THREE.BoxGeometry(doorWidth + 0.7, 0.13, 0.95), toon(PAPER.sidewalk));
  step.position.set(0, 0.065, d / 2 + 0.58);
  step.receiveShadow = true;
  group.add(step);

  if (h > 2.2) {
    const windowGeometry = new THREE.BoxGeometry(0.66, 0.74, 0.1);
    [-1, 1].forEach((side) => {
      const win = new THREE.Mesh(windowGeometry, toon(PAPER.window));
      win.position.set(side * w * 0.29, h * 0.62, d / 2 + 0.04);
      win.userData.buildingId = def.id;
      group.add(win);
      hitTargets.push(win);
      const sash = outline(windowGeometry, PAPER.trim, 0.5);
      sash.position.copy(win.position);
      sash.scale.set(1.02, 1.02, 1);
      group.add(sash);
    });
  }

  const signTexture = createSignTexture(def.name, accent.base, PAPER.trim);
  const signWidth = Math.min(w * 0.86, 3.8);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(signWidth, signWidth * 0.29),
    new THREE.MeshBasicMaterial({ map: signTexture, transparent: true, toneMapped: false }),
  );
  sign.position.set(0, Math.min(h * 0.74, 2.75), d / 2 + 0.07);
  group.add(sign);

  const extras = def.extras ?? [];
  const roofRise = roof.rise;

  if (extras.includes("chimney")) {
    const chimney = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.25, 0.46), toon(PAPER.wallSide)));
    chimney.position.set(-w * 0.28, h + 0.62, -d * 0.18);
    group.add(chimney);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.14, 0.6), toon(PAPER.roofSide));
    cap.position.set(-w * 0.28, h + 1.28, -d * 0.18);
    group.add(cap);
  }

  if (extras.includes("awning")) {
    const awning = shadowed(new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, 0.1, 1.05), toon(accent.base)));
    awning.position.set(0, 2.42, d / 2 + 0.52);
    awning.rotation.x = -0.3;
    group.add(awning);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.88, 0.22, 0.1), toon(accent.soft));
    lip.position.set(0, 2.28, d / 2 + 1.02);
    group.add(lip);
  }

  if (extras.includes("antenna")) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.7, 6), toon(PAPER.trim));
    pole.position.set(w * 0.22, h + roofRise + 0.8, 0);
    group.add(pole);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), flat(accent.base));
    tip.position.set(w * 0.22, h + roofRise + 1.68, 0);
    group.add(tip);
  }

  if (extras.includes("clock")) {
    const clockTexture = createClockTexture();
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.86, 28), new THREE.MeshBasicMaterial({ map: clockTexture, transparent: true, toneMapped: false }));
    face.position.set(0, h * 0.74, d / 2 + 0.06);
    group.add(face);
  }

  if (extras.includes("flag")) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.9, 6), toon(PAPER.trim));
    pole.position.set(w * 0.32, h + roofRise + 0.95, 0);
    group.add(pole);
    const flagShape = new THREE.Shape();
    flagShape.moveTo(0, 0);
    flagShape.lineTo(0.95, -0.3);
    flagShape.lineTo(0, -0.6);
    flagShape.closePath();
    const flag = new THREE.Mesh(new THREE.ShapeGeometry(flagShape), toon(accent.base, THREE.DoubleSide));
    flag.position.set(w * 0.32, h + roofRise + 1.55, 0);
    group.add(flag);
  }

  if (extras.includes("board")) {
    const boardTexture = createBoardTexture();
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 1.69), new THREE.MeshBasicMaterial({ map: boardTexture, toneMapped: false }));
    panel.position.set(-w * 0.33, 1.02, d / 2 + 0.08);
    group.add(panel);
    const boardFrame = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.84, 0.08), toon(PAPER.trunk));
    boardFrame.position.set(-w * 0.33, 1.02, d / 2 + 0.02);
    group.add(boardFrame);
  }

  if (extras.includes("columns")) {
    const columnGeometry = new THREE.CylinderGeometry(0.16, 0.19, h * 0.78, 10);
    [-0.42, -0.24, 0.24, 0.42].forEach((ratio) => {
      const column = shadowed(new THREE.Mesh(columnGeometry, toon(PAPER.wall)));
      column.position.set(w * ratio, h * 0.39, d / 2 + 0.62);
      group.add(column);
    });
    const porch = shadowed(new THREE.Mesh(new THREE.BoxGeometry(w * 0.98, 0.18, 1.1), toon(PAPER.roofSide)));
    porch.position.set(0, h * 0.79, d / 2 + 0.58);
    group.add(porch);
  }

  if (extras.includes("lantern")) {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.34), toon(PAPER.trim));
    bracket.position.set(w * 0.36, 2.18, d / 2 + 0.16);
    group.add(bracket);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), flat(0xffd98a));
    bulb.position.set(w * 0.36, 2.06, d / 2 + 0.32);
    group.add(bulb);
  }

  if (extras.includes("tank")) {
    const tank = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.9, 12), toon(PAPER.wallSide)));
    tank.position.set(w * 0.22, h + 0.45, -d * 0.22);
    group.add(tank);
  }

  const highlight = new THREE.Mesh(
    new THREE.RingGeometry(Math.max(w, d) * 0.62, Math.max(w, d) * 0.72, 40),
    new THREE.MeshBasicMaterial({ color: accent.base, transparent: true, opacity: 0, side: THREE.DoubleSide, toneMapped: false }),
  );
  highlight.rotation.x = -Math.PI / 2;
  highlight.position.y = 0.03;
  group.add(highlight);

  const highlightMaterial = highlight.material as THREE.MeshBasicMaterial;
  let baseY = 0;
  let hoverLift = 0;

  return {
    def,
    group,
    hitTargets,
    height: h + roofRise,
    doorPoint: new THREE.Vector3(0, 0, d / 2 + 2.3),
    setActive(active: boolean) {
      highlightMaterial.opacity = active ? 0.85 : 0;
      hoverLift = active ? 0.14 : 0;
      group.position.y = baseY + hoverLift;
    },
  };
}

/* ------------------------------ 地面与装饰 ------------------------------ */

export function createGround(size: number): THREE.Group {
  const group = new THREE.Group();

  const base = new THREE.Mesh(new THREE.BoxGeometry(size * 2, 0.5, size * 2), toon(PAPER.ground));
  base.position.y = -0.25;
  base.receiveShadow = true;
  group.add(base);

  const lip = new THREE.Mesh(new THREE.BoxGeometry(size * 2 + 1.2, 0.5, size * 2 + 1.2), toon(PAPER.plazaEdge));
  lip.position.y = -0.56;
  lip.receiveShadow = true;
  group.add(lip);

  return group;
}

export function createPlaza(): THREE.Group {
  const group = new THREE.Group();
  const radius = PLAZA.radius;

  const disc = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.18, 48), toon(PAPER.plaza));
  disc.position.set(PLAZA.x, 0.09, PLAZA.z);
  disc.receiveShadow = true;
  group.add(disc);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.97, radius * 1.06, 52),
    new THREE.MeshBasicMaterial({ color: PAPER.plazaEdge, transparent: true, opacity: 0.9, side: THREE.DoubleSide, toneMapped: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(PLAZA.x, 0.19, PLAZA.z);
  group.add(ring);

  const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.3, 0.46, 24), toon(PAPER.wall));
  basin.position.set(PLAZA.x, 0.42, PLAZA.z);
  shadowed(basin);
  group.add(basin);

  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(0.98, 0.98, 0.08, 24),
    new THREE.MeshToonMaterial({ color: PAPER.water, gradientMap: getGradientMap(), transparent: true, opacity: 0.92 }),
  );
  water.position.set(PLAZA.x, 0.63, PLAZA.z);
  group.add(water);

  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, 1.4, 12), toon(PAPER.wall));
  pillar.position.set(PLAZA.x, 1, PLAZA.z);
  shadowed(pillar);
  group.add(pillar);

  const top = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8), toon(PAPER.plazaEdge));
  top.position.set(PLAZA.x, 1.78, PLAZA.z);
  group.add(top);

  return group;
}

export function createRoad(from: THREE.Vector3, to: THREE.Vector3, width = 0.95): THREE.Mesh {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dz);
  const geometry = new THREE.BoxGeometry(width, 0.05, length);
  const mesh = new THREE.Mesh(geometry, toon(0xe9ddc6));
  mesh.position.set((from.x + to.x) / 2, 0.03, (from.z + to.z) / 2);
  mesh.rotation.y = Math.atan2(dx, dz);
  mesh.receiveShadow = true;
  return mesh;
}

export function createTree(x: number, z: number, scale = 1): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.2 * scale, 1.1 * scale, 7), toon(PAPER.trunk));
  trunk.position.y = 0.55 * scale;
  shadowed(trunk);
  group.add(trunk);

  const lower = new THREE.Mesh(new THREE.ConeGeometry(1.05 * scale, 1.7 * scale, 8), toon(PAPER.leafDark));
  lower.position.y = 1.55 * scale;
  shadowed(lower);
  lower.add(outline(lower.geometry, PAPER.trim, 0.28));
  group.add(lower);

  const upper = new THREE.Mesh(new THREE.ConeGeometry(0.78 * scale, 1.35 * scale, 8), toon(PAPER.leaf));
  upper.position.y = 2.3 * scale;
  shadowed(upper);
  group.add(upper);

  return group;
}

export function createCharacter(): THREE.Group {
  const group = new THREE.Group();

  const bodyMaterial = toon(0x4666c4);
  const skinMaterial = toon(0xf3cfae);
  const legMaterial = toon(0x3a2a22);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.78, 0.22), bodyMaterial);
  torso.position.y = 0.95;
  shadowed(torso);
  torso.add(outline(torso.geometry, PAPER.ink, 0.45));
  group.add(torso);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.24), skinMaterial);
  head.position.y = 1.6;
  shadowed(head);
  head.add(outline(head.geometry, PAPER.ink, 0.45));
  group.add(head);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.18, 0.28), toon(0x2f2119));
  hair.position.y = 1.86;
  group.add(hair);

  const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.14, 0.26), toon(0xd9603c));
  scarf.position.y = 1.37;
  group.add(scarf);

  const legs: THREE.Mesh[] = [];
  [-0.17, 0.17].forEach((offset) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.62, 0.2), legMaterial);
    leg.position.set(offset, 0.31, 0);
    shadowed(leg);
    group.add(leg);
    legs.push(leg);
  });

  const arms: THREE.Mesh[] = [];
  [-0.4, 0.4].forEach((offset) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.56, 0.18), bodyMaterial);
    arm.position.set(offset, 0.98, 0);
    shadowed(arm);
    group.add(arm);
    arms.push(arm);
  });

  group.userData.legs = legs;
  group.userData.arms = arms;
  group.userData.torso = torso;

  const marker = new THREE.Mesh(
    new THREE.CircleGeometry(0.52, 24),
    new THREE.MeshBasicMaterial({
      color: 0xd9603c,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.035;
  group.add(marker);

  return group;
}

/* ------------------------------ 街道 ------------------------------ */

export function createStreet(street: StreetDef): THREE.Group {
  const group = new THREE.Group();
  const dx = street.x2 - street.x1;
  const dz = street.z2 - street.z1;
  const length = Math.hypot(dx, dz);
  const angle = Math.atan2(dx, dz);
  const cx = (street.x1 + street.x2) / 2;
  const cz = (street.z1 + street.z2) / 2;

  const road = new THREE.Mesh(new THREE.BoxGeometry(street.width, 0.08, length), toon(PAPER.road));
  road.position.set(cx, 0.04, cz);
  road.rotation.y = angle;
  road.receiveShadow = true;
  group.add(road);

  const swWidth = street.kind === "main" ? 0.95 : 0.72;
  const swHeight = street.kind === "main" ? 0.2 : street.kind === "cross" ? 0.19 : 0.18;
  const normalX = Math.cos(angle);
  const normalZ = -Math.sin(angle);

  [-1, 1].forEach((side) => {
    const offset = street.width / 2 + swWidth / 2 + 0.05;
    const walk = new THREE.Mesh(new THREE.BoxGeometry(swWidth, swHeight, length), toon(PAPER.sidewalk));
    walk.position.set(cx + normalX * offset * side, swHeight / 2, cz + normalZ * offset * side);
    walk.rotation.y = angle;
    walk.receiveShadow = true;
    group.add(walk);

    // 路缘石：贴着路面的一条深色细边
    const curb = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.14, length),
      toon(0xb3a68c),
    );
    const curbOffset = street.width / 2 + 0.08;
    curb.position.set(cx + normalX * curbOffset * side, 0.07, cz + normalZ * curbOffset * side);
    curb.rotation.y = angle;
    group.add(curb);
  });

  if (street.kind !== "lane") {
    const dashes = Math.floor(length / 3);
    for (let i = 0; i < dashes; i += 1) {
      if (i % 2 === 0) continue;
      const t = (i - (dashes - 1) / 2) * 3;
      const dash = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.02, 1.4),
        new THREE.MeshBasicMaterial({ color: 0xf2ead4, transparent: true, opacity: 0.7, toneMapped: false }),
      );
      dash.position.set(cx + (dx / length) * t, 0.088, cz + (dz / length) * t);
      dash.rotation.y = angle;
      group.add(dash);
    }
  }

  return group;
}

export function createCrosswalk(cx: number, cz: number, span: number, along: "x" | "z"): THREE.Group {
  const group = new THREE.Group();
  const stripes = 6;
  for (let i = 0; i < stripes; i += 1) {
    const offset = (i - (stripes - 1) / 2) * 0.6;
    const geometry =
      along === "x"
        ? new THREE.BoxGeometry(span, 0.02, 0.32)
        : new THREE.BoxGeometry(0.32, 0.02, span);
    const stripe = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0xf6f1e2, toneMapped: false }));
    stripe.position.set(cx + (along === "x" ? 0 : offset), 0.095, cz + (along === "x" ? offset : 0));
    group.add(stripe);
  }
  return group;
}

/* ------------------------------ 公园 ------------------------------ */

export function createPark(): THREE.Group {
  const group = new THREE.Group();
  group.position.set(PARK.x, 0, PARK.z);

  const lawn = new THREE.Mesh(new THREE.BoxGeometry(PARK.w, 0.14, PARK.d), toon(PAPER.grass));
  lawn.position.y = 0.07;
  lawn.receiveShadow = true;
  group.add(lawn);

  const border = new THREE.Mesh(new THREE.BoxGeometry(PARK.w + 0.5, 0.1, PARK.d + 0.5), toon(PAPER.grassDark));
  border.position.y = 0.03;
  border.receiveShadow = true;
  group.add(border);

  const pathA = new THREE.Mesh(new THREE.BoxGeometry(PARK.w - 0.3, 0.04, 0.9), toon(PAPER.sidewalk));
  pathA.position.set(0, 0.16, 1.9);
  pathA.receiveShadow = true;
  group.add(pathA);

  const pathB = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, PARK.d - 0.3), toon(PAPER.sidewalk));
  pathB.position.set(1.5, 0.16, 0);
  pathB.receiveShadow = true;
  group.add(pathB);

  const pondRim = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.5, 0.24, 28), toon(PAPER.plazaEdge));
  pondRim.position.set(-0.6, 0.2, -1.8);
  pondRim.receiveShadow = true;
  group.add(pondRim);

  const pond = new THREE.Mesh(
    new THREE.CylinderGeometry(1.28, 1.28, 0.1, 28),
    new THREE.MeshToonMaterial({ color: PAPER.water, gradientMap: getGradientMap() }),
  );
  pond.position.set(-0.6, 0.33, -1.8);
  group.add(pond);

  const lily = new THREE.Mesh(new THREE.CircleGeometry(0.22, 10), toon(PAPER.leaf));
  lily.rotation.x = -Math.PI / 2;
  lily.position.set(-0.15, 0.39, -1.5);
  group.add(lily);

  return group;
}

/* ------------------------------ 街景小品 ------------------------------ */

export function createLamp(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 2.7, 8), toon(0x4a4038));
  pole.position.y = 1.35;
  shadowed(pole);
  group.add(pole);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.07, 0.07), toon(0x4a4038));
  arm.position.set(0.26, 2.66, 0);
  group.add(arm);

  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.2, 8), toon(0x4a4038));
  shade.position.set(0.52, 2.56, 0);
  shade.rotation.x = Math.PI;
  group.add(shade);

  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), flat(0xffe2a8));
  bulb.position.set(0.52, 2.46, 0);
  group.add(bulb);

  return group;
}

export function createBench(x: number, z: number, rot: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rot;

  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 0.46), toon(PAPER.trunk));
  seat.position.y = 0.46;
  shadowed(seat);
  group.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.44, 0.09), toon(PAPER.trunk));
  back.position.set(0, 0.7, -0.2);
  group.add(back);

  [-0.6, 0.6].forEach((offset) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.46, 0.4), toon(0x6b5844));
    leg.position.set(offset, 0.23, 0);
    group.add(leg);
  });

  return group;
}

export function createPlanter(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const box = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, 0.42, 10), toon(PAPER.wallSide));
  box.position.y = 0.21;
  shadowed(box);
  group.add(box);

  const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 10), toon(0x6b5540));
  soil.position.y = 0.44;
  group.add(soil);

  const colors = [0xd9603c, 0xe0a23a, 0xd97fae, 0x7b63c4];
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2;
    const flower = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 6),
      toon(colors[i % colors.length]),
    );
    flower.position.set(Math.cos(angle) * 0.24, 0.52, Math.sin(angle) * 0.24);
    group.add(flower);
  }

  return group;
}

export function createStall(x: number, z: number, accent: AccentKey): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const tone = ACCENT[accent];

  const table = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.95), toon(PAPER.trunk));
  table.position.y = 0.88;
  shadowed(table);
  group.add(table);

  [-0.72, 0.72].forEach((offsetX) => {
    [-0.36, 0.36].forEach((offsetZ) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.88, 0.1), toon(0x6b5844));
      leg.position.set(offsetX, 0.44, offsetZ);
      group.add(leg);
    });
  });

  [-0.72, 0.72].forEach((offsetX) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.15, 0.08), toon(PAPER.trim));
    post.position.set(offsetX, 1.48, 0.34);
    group.add(post);
  });

  const canopyA = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.09, 0.62), toon(tone.base));
  canopyA.position.set(0, 2.06, 0.18);
  canopyA.rotation.x = -0.16;
  shadowed(canopyA);
  group.add(canopyA);

  const canopyB = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.09, 0.62), toon(tone.soft));
  canopyB.position.set(0, 2.06, -0.34);
  canopyB.rotation.x = -0.16;
  group.add(canopyB);

  for (let i = 0; i < 3; i += 1) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.3), toon(i % 2 === 0 ? tone.soft : PAPER.wallSide));
    crate.position.set(-0.5 + i * 0.5, 1.06, 0);
    group.add(crate);
  }

  return group;
}

export function createMailbox(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.05, 0.12), toon(PAPER.trim));
  post.position.y = 0.52;
  shadowed(post);
  group.add(post);

  const boxBody = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.46, 0.4), toon(0xd9603c));
  boxBody.position.y = 1.2;
  shadowed(boxBody);
  group.add(boxBody);

  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.42, 10, 1, false, 0, Math.PI), toon(0xb34b2e));
  roof.rotation.z = Math.PI / 2;
  roof.position.y = 1.43;
  group.add(roof);

  return group;
}

/* ------------------------------ 装饰建筑 ------------------------------ */

export function createDecorBuilding(def: DecorDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);
  const tone = ACCENT[def.accent];

  if (def.kind === "watertower") {
    const legGeometry = new THREE.CylinderGeometry(0.09, 0.11, def.h * 0.52, 6);
    [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeometry, toon(0x6b5844));
      leg.position.set(lx * def.w * 0.28, (def.h * 0.52) / 2, lz * def.d * 0.28);
      shadowed(leg);
      group.add(leg);
    });

    const brace = new THREE.Mesh(new THREE.BoxGeometry(def.w * 0.6, 0.08, def.d * 0.6), toon(0x6b5844));
    brace.position.y = def.h * 0.3;
    group.add(brace);

    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(def.w * 0.48, def.w * 0.48, def.h * 0.4, 16),
      toon(tone.soft),
    );
    tank.position.y = def.h * 0.52 + def.h * 0.2;
    shadowed(tank);
    group.add(tank);

    const lid = new THREE.Mesh(new THREE.ConeGeometry(def.w * 0.52, 0.7, 16), toon(PAPER.roofSide));
    lid.position.y = def.h * 0.52 + def.h * 0.4 + 0.35;
    group.add(lid);

    return group;
  }

  const body = shadowed(
    new THREE.Mesh(
      new THREE.BoxGeometry(def.w, def.h, def.d),
      toon(def.kind === "warehouse" ? PAPER.wallSide : PAPER.wall),
    ),
  );
  body.position.y = def.h / 2;
  group.add(body);

  const rise = Math.max(0.9, Math.min(def.w, def.d) * 0.4);
  const shape = new THREE.Shape();
  shape.moveTo(-def.w / 2 - 0.22, 0);
  shape.lineTo(def.w / 2 + 0.22, 0);
  shape.lineTo(0, rise);
  shape.closePath();
  const roofGeometry = new THREE.ExtrudeGeometry(shape, { depth: def.d + 0.36, bevelEnabled: false });
  roofGeometry.translate(0, 0, -(def.d + 0.36) / 2);
  const roofMesh = shadowed(new THREE.Mesh(roofGeometry, toon(tone.soft)));
  roofMesh.position.y = def.h;
  group.add(roofMesh);

  const doorWidth = def.kind === "warehouse" ? 1.9 : 0.92;
  const doorHeight = def.kind === "warehouse" ? def.h * 0.62 : 1.65;
  const door = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, doorHeight, 0.12), toon(tone.ink));
  door.position.set(0, doorHeight / 2, def.d / 2 + 0.02);
  group.add(door);

  if (def.kind === "warehouse") {
    for (let i = 1; i < 5; i += 1) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, 0.05, 0.04), toon(0x8c3a22));
      slat.position.set(0, (doorHeight / 5) * i, def.d / 2 + 0.09);
      group.add(slat);
    }
  } else {
    [-1, 1].forEach((side) => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.52, 0.08), toon(PAPER.window));
      win.position.set(side * def.w * 0.3, def.h * 0.6, def.d / 2 + 0.02);
      group.add(win);
    });

    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.9, 0.34), toon(PAPER.wallSide));
    chimney.position.set(-def.w * 0.28, def.h + 0.45, -def.d * 0.16);
    group.add(chimney);
  }

  return group;
}
