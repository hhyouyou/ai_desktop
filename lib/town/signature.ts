/**
 * 每栋建筑的专属造型。
 * 统一的纸模语言（米白墙 + 陶土描边 + 低饱和撞色），但屋顶和特征构件按功能重做，
 * 并带缓慢动画：齿轮转、声波扩散、钟摆摇、星球绕。
 *
 * 坐标原点在建筑底面中心，墙体由 build.ts 负责，这里只管屋顶与特征。
 */

import * as THREE from "three";
import { ACCENT, BUILDING_ANNEXES, PAPER, type BuildingAnnexDef, type BuildingDef } from "./data";
import {
  beveledBox,
  flat,
  floatY,
  glow,
  m,
  orbitAround,
  outline,
  pulse,
  shadowed,
  spinY,
  swing,
  toon,
} from "./materials";

export type Tone = { base: number; soft: number; ink: number };

function toneOf(def: BuildingDef): Tone {
  return ACCENT[def.accent];
}

/* ------------------------------ 可复用建筑构件 ------------------------------ */

function framedWindow(width: number, height: number): THREE.Group {
  const group = new THREE.Group();
  group.add(m(beveledBox(width + 0.18, height + 0.18, 0.13, 0.025), PAPER.roofSide));
  group.add(m(beveledBox(width, height, 0.08, 0.018), PAPER.window, 0, 0, 0.085));
  const vertical = new THREE.Mesh(new THREE.BoxGeometry(0.045, height, 0.025), toon(PAPER.wall));
  vertical.position.z = 0.14;
  group.add(vertical);
  const horizontal = new THREE.Mesh(new THREE.BoxGeometry(width, 0.045, 0.025), toon(PAPER.wall));
  horizontal.position.z = 0.14;
  group.add(horizontal);
  return group;
}

function annexRoof(spec: BuildingAnnexDef, color: number): THREE.Group {
  const group = new THREE.Group();
  const { w, d, h, roof } = spec;
  if (roof === "gable") {
    const rise = Math.max(0.65, Math.min(w, d) * 0.36);
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 - 0.18, 0);
    shape.lineTo(w / 2 + 0.18, 0);
    shape.lineTo(0, rise);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: d + 0.36, bevelEnabled: false });
    geometry.translate(0, 0, -(d + 0.36) / 2);
    const mesh = m(geometry, color, 0, h, 0);
    mesh.add(outline(geometry, PAPER.trim, 0.2));
    group.add(mesh);
    group.add(m(beveledBox(0.16, 0.16, d + 0.46, 0.025), PAPER.roofSide, 0, h + rise, 0));
    return group;
  }

  const slab = m(beveledBox(w + 0.38, 0.18, d + 0.38, 0.035), color, 0, h + 0.16, 0);
  if (roof === "shed") slab.rotation.z = -0.13;
  group.add(slab);
  if (roof === "flat") {
    group.add(m(beveledBox(w + 0.18, 0.32, 0.12, 0.025), PAPER.roofSide, 0, h + 0.35, -d / 2));
    group.add(m(beveledBox(0.12, 0.32, d + 0.18, 0.025), PAPER.roofSide, w / 2, h + 0.35, 0));
  }
  return group;
}

function createAnnexes(def: BuildingDef, tone: Tone): THREE.Group {
  const group = new THREE.Group();
  (BUILDING_ANNEXES[def.id] ?? []).forEach((spec) => {
    const annex = new THREE.Group();
    annex.position.set(spec.x, 0, spec.z);
    const wall = spec.wallTone === "side" ? PAPER.wallSide : PAPER.wall;
    const bodyGeometry = beveledBox(spec.w, spec.h, spec.d, 0.055);
    const body = m(bodyGeometry, wall, 0, spec.h / 2, 0);
    body.userData.buildingId = def.id;
    body.add(outline(bodyGeometry, PAPER.trim, 0.18));
    annex.add(body);
    annex.add(m(beveledBox(spec.w + 0.14, 0.24, spec.d + 0.14, 0.035), PAPER.roofSide, 0, 0.12, 0));
    annex.add(annexRoof(spec, spec.roofTone === "base" ? tone.base : tone.soft));

    const windows = spec.windows ?? "both";
    if (windows === "front" || windows === "both") {
      const win = framedWindow(Math.min(0.9, spec.w * 0.42), Math.min(1.05, spec.h * 0.36));
      win.position.set(0, spec.h * 0.58, spec.d / 2 + 0.045);
      annex.add(win);
    }
    if (windows === "side" || windows === "both") {
      const win = framedWindow(Math.min(0.9, spec.d * 0.38), Math.min(1.05, spec.h * 0.36));
      win.rotation.y = Math.PI / 2;
      win.position.set(spec.w / 2 + 0.045, spec.h * 0.58, 0);
      annex.add(win);
    }
    group.add(annex);
  });
  return group;
}

function roofDeck(w: number, d: number, y: number, color: number): THREE.Group {
  const group = new THREE.Group();
  group.add(m(beveledBox(w, 0.16, d, 0.035), PAPER.roofSide, 0, y, 0));
  [-1, 1].forEach((side) => {
    group.add(m(beveledBox(w + 0.08, 0.42, 0.12, 0.025), color, 0, y + 0.25, side * d / 2));
    group.add(m(beveledBox(0.12, 0.42, d + 0.08, 0.025), color, side * w / 2, y + 0.25, 0));
  });
  return group;
}

function stripedAwning(w: number, y: number, z: number, tone: Tone): THREE.Group {
  const group = new THREE.Group();
  const stripes = 7;
  for (let i = 0; i < stripes; i += 1) {
    const panel = m(beveledBox(w / stripes + 0.025, 0.09, 0.92, 0.02), i % 2 === 0 ? tone.base : PAPER.wall);
    panel.position.set(-w / 2 + (i + 0.5) * (w / stripes), y, z);
    panel.rotation.x = -0.14;
    group.add(panel);
  }
  [-1, 1].forEach((side) => {
    group.add(m(new THREE.CylinderGeometry(0.035, 0.045, y, 6), PAPER.trim, side * w * 0.46, y / 2, z + 0.32));
  });
  return group;
}

/* ------------------------------ 1 工坊：单坡厂房 + 转动的齿轮 + 屋顶扳手 ------------------------------ */

function workshop(def: BuildingDef, tone: Tone): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = def;

  const roof = m(beveledBox(w + 0.8, 0.26, d + 0.9, 0.045), tone.soft);
  roof.position.set(0, h + 0.32, 0);
  roof.rotation.z = 0.11;
  g.add(roof);

  // 主厂房＋侧跨之外，再加两片北向天窗，形成生产建筑特有的屋顶节奏。
  [-0.22, 0.22].forEach((ratio) => {
    const skylight = m(beveledBox(w * 0.28, 0.1, d * 0.48, 0.025), PAPER.glass, w * ratio, h + 0.72, -d * 0.12);
    skylight.rotation.x = -0.34;
    skylight.rotation.z = 0.11;
    g.add(skylight);
    g.add(m(beveledBox(w * 0.3, 0.08, 0.12, 0.02), PAPER.trim, w * ratio, h + 0.58, d * 0.12));
  });
  g.add(m(beveledBox(w + 0.16, 0.48, d + 0.16, 0.04), PAPER.wallBack, 0, 0.24, 0));

  g.add(m(new THREE.BoxGeometry(0.34, 0.4, d + 1), PAPER.trim, w * 0.5, h + 0.02, 0));
  g.add(m(new THREE.BoxGeometry(0.24, 0.3, d + 1), PAPER.trim, -w * 0.5, h + 0.02, 0));

  // 侧面大齿轮
  const gear = new THREE.Group();
  gear.position.set(0, h * 0.58, d / 2 + 0.26);
  gear.rotation.x = Math.PI / 2;
  gear.add(m(new THREE.CylinderGeometry(1.22, 1.22, 0.24, 12), tone.base));
  gear.add(m(new THREE.CylinderGeometry(0.32, 0.32, 0.3, 10), PAPER.trim));
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    const tooth = m(new THREE.BoxGeometry(0.22, 0.24, 0.38), tone.ink);
    tooth.position.set(Math.cos(angle) * 1.34, 0, Math.sin(angle) * 1.34);
    tooth.rotation.y = -angle;
    gear.add(tooth);
  }
  spinY(gear, 0.35);
  g.add(gear);

  // 屋顶插着的巨型扳手
  const tool = new THREE.Group();
  tool.position.set(-w * 0.16, h + 1.35, -d * 0.12);
  tool.rotation.set(0.16, 0.55, 0.24);
  tool.add(m(new THREE.BoxGeometry(0.24, 2.5, 0.24), 0x93a0ad));
  const head = m(new THREE.CylinderGeometry(0.5, 0.5, 0.22, 8), 0x93a0ad, 0, 1.45, 0);
  head.rotation.x = Math.PI / 2;
  tool.add(head);
  const notch = m(new THREE.BoxGeometry(0.32, 0.46, 0.3), PAPER.wall, 0, 1.66, 0);
  tool.add(notch);
  g.add(tool);

  g.add(m(new THREE.BoxGeometry(0.44, 1.25, 0.44), PAPER.wallSide, -w * 0.32, h + 0.9, -d * 0.24));

  return g;
}

/* ------------------------------ 2 电报局：天线塔 + 浮动消息 + 摩斯码灯带 ------------------------------ */

function telegraph(def: BuildingDef, tone: Tone): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = def;

  g.add(m(beveledBox(w + 0.6, 0.24, d + 0.6, 0.04), tone.soft, 0, h + 0.12, 0));
  g.add(m(beveledBox(w + 0.82, 0.2, d + 0.82, 0.035), tone.base, 0, h + 0.02, 0));
  g.add(roofDeck(w + 0.18, d + 0.18, h + 0.28, tone.ink));

  // 左侧信号室与右侧天线分开，屋顶形成“机房＋平台＋天线”三段轮廓。
  const signalRoom = m(beveledBox(w * 0.36, 1.15, d * 0.42, 0.055), PAPER.wallSide, -w * 0.2, h + 0.92, -d * 0.12);
  g.add(signalRoom);
  g.add(m(beveledBox(w * 0.4, 0.16, d * 0.46, 0.035), tone.soft, -w * 0.2, h + 1.56, -d * 0.12));
  const signalWindow = framedWindow(0.9, 0.58);
  signalWindow.position.set(-w * 0.2, h + 0.95, d * 0.09 + 0.05);
  g.add(signalWindow);

  // 天线
  g.add(m(new THREE.CylinderGeometry(0.07, 0.09, 1.9, 8), PAPER.trim, w * 0.22, h + 1.2, 0));
  g.add(m(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 6), PAPER.trim, w * 0.22, h + 2.3, 0));

  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), flat(0xffe08a));
  orb.position.set(w * 0.22, h + 2.75, 0);
  g.add(orb);

  // 电弧
  for (let i = 0; i < 3; i += 1) {
    const arc = m(new THREE.CylinderGeometry(0.035, 0.02, 0.6, 5), 0x9fdcf0);
    const angle = (i / 3) * Math.PI * 2;
    arc.position.set(w * 0.22 + Math.cos(angle) * 0.42, h + 2.86, Math.sin(angle) * 0.42);
    arc.rotation.z = Math.cos(angle) * 1.1;
    arc.rotation.x = Math.sin(angle) * -1.1;
    g.add(arc);
  }

  // 墙面摩斯码灯带
  const dots = [-1.2, -0.6, 0.2, 0.9];
  dots.forEach((offset, index) => {
    const dot = new THREE.Mesh(new THREE.BoxGeometry(index % 2 === 0 ? 0.26 : 0.12, 0.08, 0.06), flat(0xffd27a));
    dot.position.set(offset, h * 0.52 + (index % 2) * 0.18, d / 2 + 0.06);
    g.add(dot);
  });

  // 浮动的消息方块
  [
    { x: -0.9, y: h + 1.5, z: 0.5, phase: 0 },
    { x: 0.6, y: h + 1.9, z: -0.6, phase: 1.8 },
    { x: 1.1, y: h + 1.2, z: 0.8, phase: 3.2 },
  ].forEach((item) => {
    const bubble = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.34), glow(tone.base, 0.75));
    bubble.position.set(item.x, item.y, item.z);
    bubble.rotation.y = item.phase;
    floatY(bubble, 0.16, 1.3, item.phase);
    g.add(bubble);
  });

  return g;
}

/* ------------------------------ 3 广播站：大喇叭 + 扩散的声波环 ------------------------------ */

function radio(def: BuildingDef, tone: Tone): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = def;

  g.add(m(beveledBox(w + 0.6, 0.22, d + 0.6, 0.04), tone.base, 0, h + 0.11, 0));
  g.add(roofDeck(w + 0.28, d + 0.28, h * 0.52, tone.base));

  const listeningRoom = m(beveledBox(w * 0.46, 1.35, d * 0.52, 0.055), PAPER.wallSide, -w * 0.2, h + 0.82, -d * 0.12);
  g.add(listeningRoom);
  g.add(m(beveledBox(w * 0.5, 0.16, d * 0.56, 0.035), tone.soft, -w * 0.2, h + 1.56, -d * 0.12));
  const listeningWindow = framedWindow(0.92, 0.72);
  listeningWindow.position.set(-w * 0.2, h + 0.84, d * 0.14 + 0.05);
  g.add(listeningWindow);

  // 喇叭：口朝外上方
  const horn = new THREE.Group();
  horn.position.set(w * 0.32, h + 1.1, 0);
  horn.rotation.z = -0.5;
  horn.rotation.y = -0.4;
  horn.add(m(new THREE.CylinderGeometry(0.14, 0.78, 1.8, 14), tone.base));
  const bell = m(new THREE.CylinderGeometry(1.06, 0.78, 0.4, 14), tone.ink, 0, 1.1, 0);
  horn.add(bell);
  horn.add(m(new THREE.CylinderGeometry(0.14, 0.14, 0.5, 8), PAPER.trim, 0, -0.9, 0));
  g.add(horn);

  // 声波环
  for (let i = 0; i < 3; i += 1) {
    const wave = new THREE.Mesh(
      new THREE.TorusGeometry(1.15, 0.055, 6, 28),
      glow(0x8fd4e8, 0.55 - i * 0.12),
    );
    wave.position.set(w * 0.32, h + 2.15, 0);
    wave.rotation.x = Math.PI / 2;
    pulse(wave, 0.42, i / 3);
    g.add(wave);
  }

  // 顶部小旗
  g.add(m(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 6), PAPER.trim, -w * 0.3, h + 0.75, 0));
  const flag = m(new THREE.BoxGeometry(0.7, 0.42, 0.05), tone.base, -w * 0.3 + 0.36, h + 1.14, 0);
  g.add(flag);

  return g;
}

/* ------------------------------ 4 书店：翻开的书页屋顶 + 斜插的巨书 ------------------------------ */

function bookshop(def: BuildingDef, tone: Tone): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = def;
  const rise = 1.55;

  [-1, 1].forEach((side) => {
    const page = m(new THREE.BoxGeometry(w * 0.58, 0.16, d + 0.8), PAPER.wall);
    page.position.set(side * w * 0.26, h + rise * 0.52, 0);
    page.rotation.z = side * -0.6;
    g.add(page);
  });

  g.add(m(new THREE.BoxGeometry(0.36, 0.42, d + 0.9), tone.base, 0, h + rise * 1.02, 0));

  const books = [
    { x: -1.1, y: h + rise + 0.45, z: 0.55, rz: 0.48, color: tone.ink },
    { x: 0.95, y: h + rise + 0.62, z: -0.45, rz: -0.28, color: 0xd9603c },
    { x: 0.15, y: h + rise + 1.12, z: 0.15, rz: 0.08, color: 0x4666c4 },
  ];
  books.forEach((item) => {
    const book = new THREE.Group();
    book.position.set(item.x, item.y, item.z);
    book.rotation.z = item.rz;
    book.add(m(new THREE.BoxGeometry(0.46, 1.45, 1.05), item.color));
    book.add(m(new THREE.BoxGeometry(0.38, 1.36, 0.94), PAPER.wall, 0.07, 0, 0));
    g.add(book);
  });

  // 墙面书架横条
  for (let i = 0; i < 3; i += 1) {
    g.add(m(new THREE.BoxGeometry(w * 0.7, 0.08, 0.08), PAPER.trunk, 0, h * 0.3 + i * 0.55, d / 2 + 0.04));
  }

  // 街角凸窗与后厢组成书店群，正立面也不再只是重复窗列。
  const bayX = w * 0.28;
  g.add(m(beveledBox(1.7, 1.82, 0.62, 0.05), PAPER.roofSide, bayX, 1.18, d / 2 + 0.34));
  const bayWindow = framedWindow(1.42, 1.5);
  bayWindow.position.set(bayX, 1.2, d / 2 + 0.69);
  g.add(bayWindow);
  g.add(m(beveledBox(1.92, 0.14, 0.84, 0.035), tone.soft, bayX, 2.16, d / 2 + 0.36));
  for (let i = 0; i < 3; i += 1) {
    g.add(m(beveledBox(0.18, 0.34 + i * 0.05, 0.16, 0.02), [tone.base, 0xe0a23a, 0x4666c4][i], bayX - 0.42 + i * 0.42, 0.62, d / 2 + 0.72));
  }

  return g;
}

/* ------------------------------ 5 天文台：圆顶 + 大望远镜 + 环绕星球 ------------------------------ */

function observatory(def: BuildingDef, tone: Tone): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = def;
  const radius = Math.min(w, d) * 0.44;
  const domeBase = h + 0.82;

  // 方形基座之上增加圆形鼓座，让穹顶不再直接压在方盒上。
  g.add(m(new THREE.CylinderGeometry(radius + 0.3, radius + 0.38, 0.2, 32), PAPER.roofSide, 0, h + 0.1, 0));
  g.add(m(new THREE.CylinderGeometry(radius + 0.14, radius + 0.14, 0.68, 32), PAPER.wallSide, 0, h + 0.47, 0));
  g.add(m(new THREE.CylinderGeometry(radius + 0.25, radius + 0.25, 0.14, 32), PAPER.roofSide, 0, h + 0.79, 0));

  [-0.72, 0.72].forEach((x) => {
    g.add(m(beveledBox(0.52, 0.38, 0.09, 0.025), PAPER.roofSide, x, h + 0.47, radius + 0.15));
    g.add(m(beveledBox(0.38, 0.25, 0.06, 0.018), PAPER.window, x, h + 0.47, radius + 0.21));
  });

  const domeGeo = new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  domeGeo.scale(1, 0.86, 1);
  const dome = shadowed(new THREE.Mesh(domeGeo, toon(tone.soft)));
  dome.position.y = domeBase;
  dome.add(outline(domeGeo, PAPER.trim, 0.16));
  g.add(dome);

  // 三道经线肋替代整球描边，近景能看出穹顶的分瓣结构。
  [0, Math.PI / 3, (Math.PI * 2) / 3].forEach((angle) => {
    const rib = m(new THREE.TorusGeometry(radius * 0.995, 0.035, 5, 32, Math.PI), PAPER.roofSide);
    rib.position.y = domeBase;
    rib.rotation.y = angle;
    rib.scale.y = 0.86;
    g.add(rib);
  });

  // 缩窄观测缝与开启的盖板，避免一整块厚重板件压住穹顶轮廓。
  const slit = m(beveledBox(radius * 0.3, 0.1, radius * 1.34, 0.025), tone.ink);
  slit.position.set(-radius * 0.34, domeBase + radius * 0.68, 0);
  slit.rotation.z = 0.55;
  g.add(slit);
  const shutter = m(beveledBox(radius * 0.34, 0.1, radius * 1.38, 0.025), tone.soft);
  shutter.position.set(-radius * 0.72, domeBase + radius * 0.84, 0);
  shutter.rotation.z = 0.9;
  g.add(shutter);

  const scope = new THREE.Group();
  scope.position.set(-radius * 0.12, domeBase + radius * 0.82, 0);
  scope.rotation.z = 0.68;
  scope.add(m(new THREE.CylinderGeometry(0.28, 0.43, 2.5, 16), tone.base));
  scope.add(m(new THREE.CylinderGeometry(0.49, 0.49, 0.2, 16), PAPER.roofSide, 0, 1.32, 0));
  scope.add(m(new THREE.CylinderGeometry(0.34, 0.34, 0.16, 16), tone.ink, 0, 1.47, 0));
  scope.add(m(new THREE.CylinderGeometry(0.12, 0.12, 0.34, 10), PAPER.trim, 0, -1.22, 0));
  g.add(scope);

  [
    { r: 2.3, speed: 0.32, size: 0.19, color: 0xe0a23a, y: h + 1.85, phase: 0 },
    { r: 2.9, speed: 0.22, size: 0.14, color: 0xd9603c, y: h + 2.45, phase: 2.1 },
    { r: 3.3, speed: 0.16, size: 0.11, color: 0x7f77dd, y: h + 1.35, phase: 4.2 },
  ].forEach((item) => {
    const planet = m(new THREE.IcosahedronGeometry(item.size, 0), item.color);
    planet.position.set(item.r, item.y, 0);
    orbitAround(planet, { x: 0, z: 0 }, item.r, item.speed, item.phase);
    g.add(planet);
  });

  return g;
}

/* ------------------------------ 6 地图亭：四角顶棚 + 旋转罗盘 ------------------------------ */

function kiosk(def: BuildingDef, tone: Tone): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = def;

  // 四柱开敞驿站：屋顶、柜台与后部半墙分离，不再用实心盒冒充亭子。
  g.add(m(beveledBox(w + 0.24, 0.16, d + 0.24, 0.04), PAPER.plaza, 0, 0.08, 0));
  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      g.add(m(new THREE.CylinderGeometry(0.1, 0.13, h, 8), PAPER.trunk, sx * (w / 2 - 0.22), h / 2, sz * (d / 2 - 0.22)));
      g.add(m(beveledBox(0.3, 0.16, 0.3, 0.025), PAPER.roofSide, sx * (w / 2 - 0.22), 0.08, sz * (d / 2 - 0.22)));
    });
  });
  g.add(m(beveledBox(w * 0.82, 0.72, 0.16, 0.035), PAPER.wallSide, 0, 0.36, -d / 2 + 0.18));
  [-1, 1].forEach((side) => {
    g.add(m(beveledBox(0.12, 0.12, d * 0.64, 0.025), PAPER.trunk, side * (w / 2 - 0.22), 0.86, -d * 0.08));
  });

  // 悬挑顶棚
  g.add(m(new THREE.BoxGeometry(w + 1.1, 0.18, d + 1.1), tone.soft, 0, h + 0.09, 0));
  g.add(m(new THREE.BoxGeometry(w + 1.24, 0.1, d + 1.24), PAPER.roofSide, 0, h - 0.02, 0));

  const dial = m(new THREE.CylinderGeometry(0.92, 0.92, 0.12, 22), PAPER.wall, 0, h + 0.24, 0);
  g.add(dial);
  g.add(m(new THREE.RingGeometry(0.92, 1.02, 24), PAPER.trim, 0, h + 0.31, 0).clone());

  const needle = new THREE.Group();
  needle.position.set(0, h + 0.35, 0);
  needle.add(m(new THREE.BoxGeometry(0.15, 0.09, 1.15), 0xd9603c, 0, 0, 0.42));
  const tip = m(new THREE.ConeGeometry(0.22, 0.5, 4), 0xd9603c, 0, 0, 1.1);
  tip.rotation.x = Math.PI / 2;
  needle.add(tip);
  needle.add(m(new THREE.BoxGeometry(0.13, 0.08, 0.5), PAPER.trim, 0, 0, -0.5));
  spinY(needle, 0.45);
  g.add(needle);

  // 四面挂的地图
  [
    { x: 0, z: d / 2 + 0.06, ry: 0 },
    { x: w / 2 + 0.06, z: 0, ry: Math.PI / 2 },
  ].forEach((item) => {
    const map = m(new THREE.BoxGeometry(1.5, 1.05, 0.05), PAPER.wall);
    map.position.set(item.x, h * 0.56, item.z);
    map.rotation.y = item.ry;
    g.add(map);
    const grid = m(new THREE.BoxGeometry(1.3, 0.04, 0.06), PAPER.trim);
    grid.position.set(item.x, h * 0.56 + 0.18, item.z + (item.ry === 0 ? 0.03 : 0));
    grid.rotation.y = item.ry;
    g.add(grid);
  });

  return g;
}

/* ------------------------------ 7 报社：印刷滚筒 + 吐出的号外 ------------------------------ */

function gazette(def: BuildingDef, tone: Tone): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = def;

  g.add(m(beveledBox(w + 0.7, 0.24, d + 0.7, 0.04), tone.base, 0, h + 0.12, 0));

  // 后部印刷车间采用锯齿形高侧窗，与前部滚筒形成两种工业屋顶。
  [-0.26, 0, 0.26].forEach((ratio) => {
    const monitor = m(beveledBox(w * 0.2, 0.12, d * 0.24, 0.025), PAPER.glass, w * ratio, h + 0.5, -d * 0.34);
    monitor.rotation.x = -0.48;
    g.add(monitor);
    g.add(m(beveledBox(w * 0.21, 0.1, 0.12, 0.02), PAPER.trim, w * ratio, h + 0.26, -d * 0.22));
  });

  // 两个印刷滚筒
  [0, 1].forEach((index) => {
    const drum = new THREE.Group();
    drum.position.set(0, h + 0.72, index === 0 ? -0.65 : 0.65);
    const barrel = m(new THREE.CylinderGeometry(0.58, 0.58, w * 0.8, 14), 0x9aa3ad);
    barrel.rotation.z = Math.PI / 2;
    drum.add(barrel);
    [-w * 0.42, w * 0.42].forEach((offset) => {
      const cap = m(new THREE.CylinderGeometry(0.64, 0.64, 0.12, 14), PAPER.trim, offset, 0, 0);
      cap.rotation.z = Math.PI / 2;
      drum.add(cap);
    });
    spinY(drum, index === 0 ? 0.55 : -0.55);
    g.add(drum);
  });

  // 从滚筒里吐出来的号外
  const extra = new THREE.Group();
  extra.position.set(w * 0.1, h + 0.55, d / 2 + 0.55);
  extra.rotation.x = -0.62;
  const sheet = m(new THREE.BoxGeometry(1.9, 0.05, 2.1), PAPER.wall);
  sheet.position.z = 1;
  extra.add(sheet);
  for (let i = 0; i < 4; i += 1) {
    const line = m(new THREE.BoxGeometry(1.5 - (i % 2) * 0.4, 0.02, 0.1), PAPER.trim);
    line.position.set(0, 0.04, 0.5 + i * 0.4);
    extra.add(line);
  }
  const headline = m(new THREE.BoxGeometry(1.6, 0.02, 0.22), tone.ink, 0, 0.05, 0.3);
  extra.add(headline);
  g.add(extra);

  // 烟囱
  g.add(m(new THREE.BoxGeometry(0.42, 1.2, 0.42), PAPER.wallSide, -w * 0.34, h + 0.85, -d * 0.26));

  // 旗杆
  g.add(m(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6), PAPER.trim, w * 0.34, h + 0.95, d * 0.2));
  g.add(m(new THREE.BoxGeometry(0.72, 0.44, 0.05), tone.base, w * 0.34 + 0.37, h + 1.5, d * 0.2));

  return g;
}

/* ------------------------------ 8 市政厅：山花 + 圆顶 + 柱廊 ------------------------------ */

function townhall(def: BuildingDef, tone: Tone): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = def;

  // 前廊台阶
  for (let i = 0; i < 3; i += 1) {
    const step = m(new THREE.BoxGeometry(w * 0.9 - i * 0.5, 0.16, 0.7), PAPER.wallSide, 0, 0.08 + i * 0.16, d / 2 + 1.5 - i * 0.28);
    g.add(step);
  }

  // 柱廊
  [-0.36, -0.12, 0.12, 0.36].forEach((ratio) => {
    g.add(m(new THREE.CylinderGeometry(0.17, 0.2, h * 0.82, 10), PAPER.wall, w * ratio, h * 0.41, d / 2 + 0.75));
  });

  // 檐口与低矮栏杆保持公共建筑的横向秩序，中央山花和圆顶作为最高点。
  g.add(m(beveledBox(w + 0.9, 0.2, d + 0.9, 0.04), PAPER.roofSide, 0, h + 0.1, 0));
  g.add(roofDeck(w + 0.42, d + 0.42, h + 0.22, PAPER.wallSide));
  [-1, 1].forEach((side) => {
    g.add(m(new THREE.CylinderGeometry(0.16, 0.22, 0.52, 8), PAPER.roofSide, side * w * 0.39, h + 0.68, -d * 0.3));
    g.add(m(new THREE.SphereGeometry(0.18, 10, 8), tone.soft, side * w * 0.39, h + 1.02, -d * 0.3));
  });

  // 三角山花
  const pedimentShape = new THREE.Shape();
  pedimentShape.moveTo(-w * 0.5, 0);
  pedimentShape.lineTo(w * 0.5, 0);
  pedimentShape.lineTo(0, 1.35);
  pedimentShape.closePath();
  const pedimentGeo = new THREE.ExtrudeGeometry(pedimentShape, { depth: 0.5, bevelEnabled: false });
  const pediment = shadowed(new THREE.Mesh(pedimentGeo, toon(tone.soft)));
  pediment.position.set(0, h + 0.2, d / 2 + 0.3);
  pediment.add(outline(pedimentGeo, PAPER.trim, 0.45));
  g.add(pediment);

  // 徽章
  const emblem = m(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 14), tone.base, 0, h + 0.86, d / 2 + 0.82);
  emblem.rotation.x = Math.PI / 2;
  g.add(emblem);

  // 中央圆顶
  g.add(m(new THREE.CylinderGeometry(0.9, 1.05, 0.5, 16), PAPER.wallSide, 0, h + 0.45, 0));
  const domeGeo = new THREE.SphereGeometry(0.88, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = shadowed(new THREE.Mesh(domeGeo, toon(tone.base)));
  dome.position.y = h + 0.7;
  g.add(dome);
  g.add(m(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 6), PAPER.trim, 0, h + 1.95, 0));
  g.add(m(new THREE.BoxGeometry(0.5, 0.32, 0.04), tone.ink, 0.25, h + 2.2, 0));

  return g;
}

/* ------------------------------ 9 画室：天窗斜顶 + 巨型画架 + 漂浮颜料球 ------------------------------ */

function atelier(def: BuildingDef, tone: Tone): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = def;

  // 左侧北向斜天窗＋右侧小高窗塔，画室屋顶形成一大一小两个采光体。
  const skylight = m(beveledBox(w * 0.5, 0.14, d * 0.6, 0.025), 0xcfe3ea);
  skylight.position.set(-w * 0.2, h + 0.85, -d * 0.2);
  skylight.rotation.x = 0.42;
  g.add(skylight);

  const studioTower = m(beveledBox(w * 0.26, 1.25, d * 0.42, 0.05), PAPER.wallSide, w * 0.31, h + 0.63, -d * 0.3);
  g.add(studioTower);
  const studioWindow = framedWindow(1.12, 0.78);
  studioWindow.position.set(w * 0.31, h + 0.68, -d * 0.09 + 0.05);
  g.add(studioWindow);
  const studioCap = m(beveledBox(w * 0.3, 0.14, d * 0.46, 0.03), tone.soft, w * 0.31, h + 1.34, -d * 0.3);
  studioCap.rotation.x = -0.16;
  g.add(studioCap);

  // 后侧平顶
  g.add(m(new THREE.BoxGeometry(w + 0.5, 0.2, d * 0.5), tone.soft, 0, h + 0.1, d * 0.26));
  g.add(m(new THREE.BoxGeometry(w + 0.62, 0.1, d * 0.56), PAPER.roofSide, 0, h - 0.01, d * 0.26));

  // 巨型画架
  const easel = new THREE.Group();
  easel.position.set(w * 0.1, h + 1.7, d * 0.16);
  easel.rotation.y = -0.28;
  [
    { x: -0.55, rz: 0.16, rx: 0.1 },
    { x: 0.55, rz: -0.16, rx: 0.1 },
    { x: 0, rz: 0, rx: -0.24 },
  ].forEach((leg) => {
    const beam = m(new THREE.BoxGeometry(0.08, 2.2, 0.08), PAPER.trunk);
    beam.position.set(leg.x * 0.7, -1.05, leg.x === 0 ? 0.34 : -0.16);
    beam.rotation.z = leg.rz;
    beam.rotation.x = leg.rx;
    easel.add(beam);
  });

  const canvas = m(new THREE.BoxGeometry(1.7, 1.25, 0.07), PAPER.wall, 0, 0.2, 0);
  easel.add(canvas);
  [
    { x: 0.42, y: 0.4, c: 0xd9603c, w: 0.5, h: 0.34 },
    { x: -0.3, y: 0.12, c: 0x4666c4, w: 0.44, h: 0.5 },
    { x: 0.1, y: -0.28, c: 0xe0a23a, w: 0.62, h: 0.22 },
  ].forEach((blob) => {
    easel.add(m(new THREE.BoxGeometry(blob.w, blob.h, 0.02), blob.c, blob.x, blob.y, 0.05));
  });
  g.add(easel);

  // 漂浮的颜料球
  [
    { x: -1.5, y: h + 1.1, z: 0.9, c: 0xd9603c, phase: 0 },
    { x: 1.6, y: h + 1.7, z: -0.7, c: 0x4666c4, phase: 1.6 },
    { x: -0.6, y: h + 2.4, z: -1.1, c: 0xe0a23a, phase: 3.1 },
    { x: 1.2, y: h + 2.8, z: 0.9, c: 0x3d9e7d, phase: 4.4 },
  ].forEach((item) => {
    const ball = m(new THREE.SphereGeometry(0.2, 10, 8), item.c);
    ball.position.set(item.x, item.y, item.z);
    floatY(ball, 0.2, 1.05, item.phase);
    g.add(ball);
  });

  return g;
}

/* ------------------------------ 10 任务板：木棚 + 飘起的便签 ------------------------------ */

function boardHouse(def: BuildingDef, tone: Tone): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = def;

  // 斜木板顶
  const roof = m(new THREE.BoxGeometry(w + 0.8, 0.22, d + 1.1), tone.soft);
  roof.position.set(0, h + 0.28, 0);
  roof.rotation.x = -0.12;
  g.add(roof);

  for (let i = 0; i < 5; i += 1) {
    g.add(m(new THREE.BoxGeometry(w + 0.8, 0.05, 0.12), PAPER.trunk, 0, h + 0.4, -d * 0.5 + i * (d * 0.28)));
  }

  // 屋檐下的木梁与木骨架，让任务板成为林间小屋而非浅色盒体。
  g.add(m(new THREE.BoxGeometry(w + 0.9, 0.14, 0.16), PAPER.trunk, 0, h - 0.02, d / 2 + 0.3));
  g.add(m(beveledBox(w + 0.12, 0.28, d + 0.12, 0.035), PAPER.trunk, 0, 0.14, 0));
  [-1, 1].forEach((side) => {
    g.add(m(beveledBox(0.18, h, 0.18, 0.025), PAPER.trunk, side * (w / 2 - 0.12), h / 2, d / 2 + 0.06));
    const brace = m(beveledBox(0.12, 1.15, 0.12, 0.02), PAPER.trunk, side * w * 0.34, 0.94, d / 2 + 0.1);
    brace.rotation.z = side * -0.58;
    g.add(brace);
  });
  g.add(m(beveledBox(w, 0.16, 0.16, 0.025), PAPER.trunk, 0, h - 0.28, d / 2 + 0.08));

  // 飘起的便签
  [
    { x: -1.15, y: h + 1.1, z: 0.6, rot: -0.24, color: 0xf6d9c8, phase: 0 },
    { x: 1.05, y: h + 1.5, z: 0.35, rot: 0.3, color: 0xd8e8da, phase: 1.7 },
    { x: -0.1, y: h + 1.9, z: 0.85, rot: 0.06, color: 0xfdf3d8, phase: 3.3 },
  ].forEach((item) => {
    const note = m(new THREE.BoxGeometry(0.86, 0.05, 1.05), item.color);
    note.position.set(item.x, item.y, item.z);
    note.rotation.set(-0.18, item.rot, 0.08);
    floatY(note, 0.14, 1.15, item.phase);
    g.add(note);
    const pin = m(new THREE.SphereGeometry(0.07, 8, 6), 0xd9603c, item.x, item.y + 0.06, item.z - 0.35);
    g.add(pin);
  });

  return g;
}

/* ------------------------------ 11 打字机铺：屋顶纸卷 + 延伸的纸带 ------------------------------ */

function typewriterShop(def: BuildingDef, tone: Tone): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = def;

  g.add(m(new THREE.BoxGeometry(w + 0.6, 0.22, d + 0.6), tone.base, 0, h + 0.11, 0));

  // 纸卷
  const roll = m(new THREE.CylinderGeometry(0.34, 0.34, w * 0.82, 12), PAPER.wall, 0, h + 0.52, -d * 0.26);
  roll.rotation.z = Math.PI / 2;
  g.add(roll);
  [-w * 0.42, w * 0.42].forEach((offset) => {
    const cap = m(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 12), PAPER.trim, offset, h + 0.52, -d * 0.26);
    cap.rotation.z = Math.PI / 2;
    g.add(cap);
  });

  // 从纸卷延伸出的纸带
  const paper = new THREE.Group();
  paper.position.set(0, h + 0.5, -d * 0.26);
  paper.rotation.x = -0.34;
  const strip = m(new THREE.BoxGeometry(w * 0.62, 0.04, 2.5), PAPER.wall);
  strip.position.z = -1.25;
  paper.add(strip);
  for (let i = 0; i < 5; i += 1) {
    const line = m(new THREE.BoxGeometry(w * 0.5 - (i % 2) * 0.3, 0.01, 0.06), PAPER.trim);
    line.position.set(0, 0.03, -0.6 - i * 0.38);
    paper.add(line);
  }
  const curl = m(new THREE.CylinderGeometry(0.18, 0.18, w * 0.62, 10), PAPER.wallSide, 0, 0.1, -2.52);
  curl.rotation.z = Math.PI / 2;
  paper.add(curl);
  g.add(paper);

  // 屋顶键盘（打字机按键）
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const key = m(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 8), PAPER.wallSide);
      key.position.set(-w * 0.3 + col * 0.24, h + 0.26, d * 0.06 + row * 0.24);
      g.add(key);
    }
  }

  return g;
}

/* ------------------------------ 12 咖啡馆：屋顶大咖啡杯 + 热气 ------------------------------ */

function cafe(def: BuildingDef, tone: Tone): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = def;

  g.add(stripedAwning(w * 0.82, 2.48, d / 2 + 0.62, tone));
  // 侧后方烘焙厨房带独立烟囱，与主楼屋顶咖啡杯组成前后两个识别点。
  g.add(m(beveledBox(0.38, 1.15, 0.38, 0.035), PAPER.wallBack, 3.55, 3.5, -0.72));
  g.add(m(beveledBox(0.52, 0.14, 0.52, 0.025), PAPER.roofSide, 3.55, 4.12, -0.72));

  const cup = new THREE.Group();
  cup.position.set(0, h + 0.7, 0);

  const body = m(new THREE.CylinderGeometry(1.52, 1.2, 1.55, 18), PAPER.wall);
  cup.add(body);

  const rim = m(new THREE.CylinderGeometry(1.58, 1.58, 0.18, 18), tone.base, 0, 0.82, 0);
  cup.add(rim);

  const base = m(new THREE.CylinderGeometry(1.02, 1.02, 0.14, 18), PAPER.roofSide, 0, -0.72, 0);
  cup.add(base);

  const handle = m(new THREE.TorusGeometry(0.4, 0.1, 8, 18, Math.PI * 1.15), tone.base);
  handle.position.set(1.46, 0, 0);
  handle.rotation.z = -Math.PI / 2;
  cup.add(handle);

  g.add(cup);

  // 热气
  [0, 1, 2].forEach((index) => {
    const steam = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2 + index * 0.05, 0), glow(0xf7f3e8, 0.5 - index * 0.1));
    steam.position.set((index - 1) * 0.35, h + 1.65, 0);
    floatY(steam, 0.28, 0.85, index * 1.4);
    g.add(steam);
  });

  return g;
}

/* ------------------------------ 13 钟楼：钟面 + 尖顶 + 钟摆 ------------------------------ */

/** 一块真实的钟面：表盘、十二道刻度、按当前时间摆好的时针分针 */
function makeDial(radius: number): THREE.Group {
  const dial = new THREE.Group();

  const disc = m(new THREE.CylinderGeometry(radius, radius, 0.1, 26), PAPER.wall);
  disc.rotation.x = Math.PI / 2;
  dial.add(disc);

  const rim = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.9, radius, 26),
    new THREE.MeshBasicMaterial({ color: PAPER.trim, toneMapped: false }),
  );
  rim.position.z = 0.056;
  dial.add(rim);

  const bezel = m(new THREE.TorusGeometry(radius * 0.97, 0.055, 6, 32), PAPER.roofSide, 0, 0, 0.075);
  dial.add(bezel);

  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    const tick = m(
      new THREE.BoxGeometry(i % 3 === 0 ? 0.09 : 0.055, i % 3 === 0 ? radius * 0.2 : radius * 0.11, 0.02),
      PAPER.ink,
      Math.sin(angle) * radius * 0.76,
      Math.cos(angle) * radius * 0.76,
      0.062,
    );
    tick.rotation.z = -angle;
    dial.add(tick);
  }

  const now = new Date();
  const minutes = now.getMinutes();
  const hours = now.getHours() % 12;

  const makeHand = (length: number, width: number, angle: number, color: number) => {
    const hand = new THREE.Group();
    hand.rotation.z = -angle;
    hand.add(m(new THREE.BoxGeometry(width, length, 0.03), color, 0, length / 2 - 0.05, 0.08));
    return hand;
  };
  dial.add(makeHand(radius * 0.48, 0.11, ((hours + minutes / 60) / 12) * Math.PI * 2, PAPER.ink));
  dial.add(makeHand(radius * 0.76, 0.07, (minutes / 60) * Math.PI * 2, 0x8c3a22));

  const pin = m(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 10), PAPER.trim, 0, 0, 0.11);
  pin.rotation.x = Math.PI / 2;
  dial.add(pin);
  return dial;
}

/* ------------------------------ 13 钟楼（续） ------------------------------ */

function clocktower(def: BuildingDef, tone: Tone): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = def;

  // 塔冠按“挑檐—钟室—屋脊—尖顶”分层，避免一根长盒直接接圆锥。
  g.add(m(beveledBox(w + 0.96, 0.2, d + 0.96, 0.045), PAPER.roofSide, 0, h + 0.1, 0));
  g.add(m(beveledBox(w + 0.56, 0.14, d + 0.56, 0.035), PAPER.wallBack, 0, h + 0.3, 0));

  const cap = m(beveledBox(w * 0.82, 1.08, d * 0.82, 0.055), PAPER.wallSide, 0, h + 0.86, 0);
  g.add(cap);

  [-0.62, 0, 0.62].forEach((offset) => {
    g.add(m(beveledBox(0.3, 0.62, 0.07, 0.02), tone.ink, offset, h + 0.86, d * 0.41 + 0.045));
    g.add(m(beveledBox(0.07, 0.62, 0.3, 0.02), tone.ink, w * 0.41 + 0.045, h + 0.86, offset));
  });

  g.add(m(beveledBox(w * 0.98, 0.18, d * 0.98, 0.04), PAPER.roofSide, 0, h + 1.46, 0));
  const spire = m(new THREE.ConeGeometry(w * 0.64, 2.65, 4), tone.base, 0, h + 2.86, 0);
  spire.rotation.y = Math.PI / 4;
  spire.add(outline(spire.geometry, PAPER.trim, 0.22));
  g.add(spire);

  // 屋脊宝珠与风向标形成清晰但不过高的末端轮廓。
  g.add(m(new THREE.SphereGeometry(0.11, 10, 8), PAPER.roofSide, 0, h + 4.22, 0));
  g.add(m(new THREE.CylinderGeometry(0.035, 0.045, 0.72, 6), PAPER.trim, 0, h + 4.5, 0));
  const vane = new THREE.Group();
  vane.position.set(0, h + 4.82, 0);
  vane.add(m(beveledBox(0.05, 0.05, 1, 0.015), PAPER.trim));
  vane.add(m(beveledBox(0.34, 0.06, 0.06, 0.015), PAPER.trim, 0, 0, 0.44));
  spinY(vane, 0.5);
  g.add(vane);

  // 钟面：正反两侧各一块，显示当前时间
  const faceRadius = Math.min(w, d) * 0.36;
  const faceY = h * 0.72;

  const frontFace = makeDial(faceRadius);
  frontFace.position.set(0, faceY, d / 2 + 0.05);
  g.add(frontFace);

  const sideFace = makeDial(faceRadius);
  sideFace.rotation.y = Math.PI / 2;
  sideFace.position.set(w / 2 + 0.05, faceY, 0);
  g.add(sideFace);

  // 侧面钟摆（从塔身外部垂下）
  const pendulum = new THREE.Group();
  pendulum.position.set(0, h * 0.64, d / 2 + 0.22);
  const rod = m(new THREE.BoxGeometry(0.08, h * 0.24, 0.08), PAPER.trim, 0, -h * 0.12, 0);
  pendulum.add(rod);
  const bob = m(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 14), tone.base, 0, -h * 0.24, 0);
  bob.rotation.x = Math.PI / 2;
  pendulum.add(bob);
  swing(pendulum, 0.24, 1.15);
  g.add(pendulum);

  return g;
}

/* ------------------------------ 分派 ------------------------------ */

const BUILDERS: Record<string, (def: BuildingDef, tone: Tone) => THREE.Group> = {
  workshop,
  telegraph,
  radio,
  bookshop,
  observatory,
  kiosk,
  gazette,
  townhall,
  atelier,
  board: boardHouse,
  typewriter: typewriterShop,
  cafe,
  clocktower,
};

export function createSignature(def: BuildingDef): THREE.Group {
  const group = new THREE.Group();
  const tone = toneOf(def);
  group.add(createAnnexes(def, tone));
  const builder = BUILDERS[def.id];
  if (builder) group.add(builder(def, tone));
  return group;
}
