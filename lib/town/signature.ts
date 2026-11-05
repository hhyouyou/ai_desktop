/**
 * 每栋建筑的专属造型。
 * 统一的纸模语言（米白墙 + 陶土描边 + 低饱和撞色），但屋顶和特征构件按功能重做，
 * 并带缓慢动画：齿轮转、声波扩散、钟摆摇、星球绕。
 *
 * 坐标原点在建筑底面中心，墙体由 build.ts 负责，这里只管屋顶与特征。
 */

import * as THREE from "three";
import { ACCENT, PAPER, type BuildingDef } from "./data";
import {
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

/* ------------------------------ 1 工坊：单坡厂房 + 转动的齿轮 + 屋顶扳手 ------------------------------ */

function workshop(def: BuildingDef, tone: Tone): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = def;

  const roof = m(new THREE.BoxGeometry(w + 0.8, 0.26, d + 0.9), tone.soft);
  roof.position.set(0, h + 0.32, 0);
  roof.rotation.z = 0.11;
  g.add(roof);

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

  g.add(m(new THREE.BoxGeometry(w + 0.6, 0.24, d + 0.6), tone.soft, 0, h + 0.12, 0));
  g.add(m(new THREE.BoxGeometry(w + 0.82, 0.2, d + 0.82), tone.base, 0, h + 0.02, 0));

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

  g.add(m(new THREE.BoxGeometry(w + 0.6, 0.22, d + 0.6), tone.base, 0, h + 0.11, 0));

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

  return g;
}

/* ------------------------------ 5 天文台：圆顶 + 大望远镜 + 环绕星球 ------------------------------ */

function observatory(def: BuildingDef, tone: Tone): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = def;
  const radius = Math.min(w, d) * 0.48;

  g.add(m(new THREE.CylinderGeometry(radius + 0.24, radius + 0.32, 0.46, 18), PAPER.roofSide, 0, h + 0.23, 0));

  const domeGeo = new THREE.SphereGeometry(radius, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = shadowed(new THREE.Mesh(domeGeo, toon(tone.soft)));
  dome.position.y = h + 0.46;
  dome.add(outline(domeGeo, PAPER.trim, 0.35));
  g.add(dome);

  const hatch = m(new THREE.BoxGeometry(radius * 0.86, 0.14, radius * 1.7), PAPER.trim);
  hatch.position.set(-radius * 0.52, h + 0.46 + radius * 0.7, 0);
  hatch.rotation.z = 0.55;
  g.add(hatch);

  const scope = new THREE.Group();
  scope.position.set(0, h + 0.46 + radius * 0.58, 0);
  scope.rotation.z = -0.6;
  scope.add(m(new THREE.CylinderGeometry(0.34, 0.5, 2.8, 12), tone.base));
  scope.add(m(new THREE.CylinderGeometry(0.56, 0.56, 0.24, 12), PAPER.trim, 0, 1.48, 0));
  scope.add(m(new THREE.CylinderGeometry(0.15, 0.15, 0.34, 10), PAPER.trim, 0, -1.24, 0));
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

  g.add(m(new THREE.BoxGeometry(w + 0.7, 0.24, d + 0.7), tone.base, 0, h + 0.12, 0));

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

  // 檐口
  g.add(m(new THREE.BoxGeometry(w + 0.9, 0.2, d + 0.9), PAPER.roofSide, 0, h + 0.1, 0));

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

  // 北向斜天窗
  const skylight = m(new THREE.BoxGeometry(w * 0.86, 0.14, d * 0.6), 0xcfe3ea);
  skylight.position.set(0, h + 0.85, -d * 0.2);
  skylight.rotation.x = 0.42;
  g.add(skylight);

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

  // 屋檐下的木梁
  g.add(m(new THREE.BoxGeometry(w + 0.9, 0.14, 0.16), PAPER.trunk, 0, h - 0.02, d / 2 + 0.3));

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

/* ------------------------------ 13 钟楼：尖顶 + 摆动的钟摆 ------------------------------ */

function clocktower(def: BuildingDef, tone: Tone): THREE.Group {
  const g = new THREE.Group();
  const { w, d, h } = def;

  // 顶部挑檐
  g.add(m(new THREE.BoxGeometry(w + 0.9, 0.2, d + 0.9), PAPER.roofSide, 0, h + 0.1, 0));

  const cap = m(new THREE.BoxGeometry(w * 0.82, 1.1, d * 0.82), PAPER.wallSide, 0, h + 0.75, 0);
  g.add(cap);

  const spire = m(new THREE.ConeGeometry(w * 0.58, 2.6, 4), tone.base, 0, h + 2.6, 0);
  spire.rotation.y = Math.PI / 4;
  g.add(spire);

  // 风向标
  g.add(m(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), PAPER.trim, 0, h + 4.2, 0));
  const vane = new THREE.Group();
  vane.position.set(0, h + 4.55, 0);
  vane.add(m(new THREE.BoxGeometry(0.06, 0.06, 1), PAPER.trim));
  vane.add(m(new THREE.BoxGeometry(0.34, 0.06, 0.06), PAPER.trim, 0, 0, 0.44));
  spinY(vane, 0.5);
  g.add(vane);

  // 侧面钟摆（从塔身外部垂下）
  const pendulum = new THREE.Group();
  pendulum.position.set(0, h * 0.78, d / 2 + 0.22);
  const rod = m(new THREE.BoxGeometry(0.09, h * 0.5, 0.09), PAPER.trim, 0, -h * 0.25, 0);
  pendulum.add(rod);
  const bob = m(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 14), tone.base, 0, -h * 0.5, 0);
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
  const builder = BUILDERS[def.id];
  const tone = toneOf(def);
  if (!builder) {
    return new THREE.Group();
  }
  return builder(def, tone);
}
