/**
 * 地点附属物：一个地点 = 主楼 + 院落里的其他东西。
 * 咖啡馆有户外桌椅阳伞，报社有印刷车间和晾报架，书店有露天书摊。
 */

import * as THREE from "three";
import { ACCENT, PAPER, type AnnexDef } from "./data";
import { m, shadowed, spinY, toon } from "./materials";
import { createBench, createLamp, createPlanter } from "./build";
import { createFence } from "./props";

/* ------------------------------ 工坊：木工与铁活 ------------------------------ */

/** 确定性伪随机，保证每次刷新长一样 */
function jitter(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

/** 夯土场院：把门前这块地压实，院子才成立 */
function pad(def: AnnexDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);
  const w = def.w ?? 8;
  const d = def.d ?? 4;

  const rim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.04, d + 0.4), toon(0xc0a97f));
  rim.position.y = 0.02;
  rim.receiveShadow = true;
  group.add(rim);

  const soil = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, d), toon(0xd3c09a));
  soil.position.y = 0.045;
  soil.receiveShadow = true;
  group.add(soil);

  // 踩出来的浅色车辙
  [-0.9, 0.9].forEach((offset) => {
    const rut = new THREE.Mesh(new THREE.BoxGeometry(w - 1.6, 0.02, 0.34), toon(0xc4ae86));
    rut.position.set(0, 0.086, offset);
    group.add(rut);
  });

  // 散落的木屑与碎石
  for (let i = 0; i < 18; i += 1) {
    const chip = new THREE.Mesh(
      new THREE.BoxGeometry(0.1 + jitter(i) * 0.14, 0.02, 0.05 + jitter(i + 7) * 0.06),
      toon(i % 3 === 0 ? 0xb9a987 : 0xa88d64),
    );
    chip.position.set((jitter(i + 2) - 0.5) * (w - 1.6), 0.088, (jitter(i + 5) - 0.5) * (d - 1.2));
    chip.rotation.y = jitter(i + 11) * Math.PI;
    group.add(chip);
  }

  return group;
}

/** 露天工作台：台钳、锯、锤、待加工的木板 */
function workbench(def: AnnexDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);
  group.rotation.y = def.rot ?? 0;

  const top = 0.93;

  group.add(m(new THREE.BoxGeometry(2.3, 0.14, 0.94), 0x7a5334, 0, top, 0));

  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      group.add(m(new THREE.BoxGeometry(0.12, top, 0.12), 0x8a6c47, sx * 0.98, top / 2, sz * 0.35));
    });
  });
  // 腿间的横撑与下层存货板
  group.add(m(new THREE.BoxGeometry(2.02, 0.07, 0.74), 0x8a6c47, 0, 0.3, 0));
  [0, 1, 2].forEach((i) => {
    group.add(m(new THREE.BoxGeometry(1.72, 0.09, 0.19), i === 1 ? 0xb59367 : 0xa37f55, 0.08, 0.39 + i * 0.095, -0.28 + i * 0.26));
  });

  // 红色铁皮工具箱
  group.add(m(new THREE.BoxGeometry(0.46, 0.24, 0.28), 0xb5553a, -1.02, top + 0.19, 0.06));
  group.add(m(new THREE.BoxGeometry(0.48, 0.04, 0.3), 0x8c3a22, -1.02, top + 0.32, 0.06));
  group.add(m(new THREE.BoxGeometry(0.12, 0.05, 0.05), 0x5d5a55, -1.02, top + 0.35, 0.06));

  // 台钳（前端右侧）
  group.add(m(new THREE.BoxGeometry(0.3, 0.24, 0.32), 0x5d5a55, 0.94, top + 0.18, 0.3));
  group.add(m(new THREE.CylinderGeometry(0.032, 0.032, 0.26, 6), 0x7d7972, 0.94, top + 0.32, 0.3));

  // 台面上：一摞待加工的板、锯、锤
  for (let i = 0; i < 3; i += 1) {
    group.add(m(new THREE.BoxGeometry(0.92, 0.05, 0.34), 0xb08a5c, -0.62, top + 0.09 + i * 0.052, -0.02 + i * 0.012));
  }

  const saw = m(new THREE.BoxGeometry(0.78, 0.02, 0.16), 0xb5b8bd, 0.32, top + 0.08, -0.22);
  saw.rotation.y = 0.22;
  group.add(saw);
  const sawGrip = m(new THREE.BoxGeometry(0.18, 0.11, 0.13), 0x6b5844, 0.73, top + 0.1, -0.31);
  sawGrip.rotation.y = 0.22;
  group.add(sawGrip);

  group.add(m(new THREE.BoxGeometry(0.05, 0.05, 0.4), 0x8a6c47, 0.08, top + 0.09, 0.24));
  group.add(m(new THREE.BoxGeometry(0.16, 0.11, 0.11), 0x5d5a55, 0.08, top + 0.1, 0.03));

  // 台面上散着的刨花
  for (let i = 0; i < 6; i += 1) {
    const chip = m(
      new THREE.BoxGeometry(0.09, 0.012, 0.035),
      0xc9a978,
      -0.2 + (jitter(i) - 0.5) * 0.9,
      top + 0.075,
      (jitter(i + 3) - 0.5) * 0.62,
    );
    chip.rotation.y = jitter(i + 9) * Math.PI;
    group.add(chip);
  }

  // 旁边的木凳：干活的人可以坐下
  const stool = new THREE.Group();
  stool.position.set(-1.36, 0, 0.34);
  stool.rotation.y = 0.4;
  stool.add(m(new THREE.BoxGeometry(0.42, 0.07, 0.36), 0xb08a5c, 0, 0.46, 0));
  [
    [-0.15, -0.12],
    [0.15, -0.12],
    [-0.15, 0.12],
    [0.15, 0.12],
  ].forEach(([sx, sz]) => {
    stool.add(m(new THREE.BoxGeometry(0.06, 0.46, 0.06), 0x8a6c47, sx, 0.23, sz));
  });
  stool.add(m(new THREE.BoxGeometry(0.34, 0.05, 0.05), 0x8a6c47, 0, 0.2, 0));
  group.add(stool);

  return group;
}

/** 木料堆：码放的原木 + 斜靠的板子 + 锯末 */
function lumber(def: AnnexDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);
  group.rotation.y = def.rot ?? 0;

  const rows: [number, number, number][] = [
    [-0.35, 0.17, 0],
    [0, 0.17, 0],
    [0.35, 0.17, 0],
    [-0.175, 0.5, 0.01],
    [0.175, 0.5, 0.01],
    [0, 0.83, 0.02],
  ];

  rows.forEach(([x, y, z]) => {
    const log = m(new THREE.CylinderGeometry(0.17, 0.17, 2.5, 10), 0xa98a5f, x, y, z);
    log.rotation.z = Math.PI / 2;
    group.add(log);
    [-1.26, 1.26].forEach((end) => {
      const cap = m(new THREE.CylinderGeometry(0.171, 0.171, 0.02, 10), 0xc2a271, x + end, y, z);
      cap.rotation.z = Math.PI / 2;
      group.add(cap);
    });
  });

  // 斜靠在木堆上的板子
  for (let i = 0; i < 3; i += 1) {
    const plank = m(new THREE.BoxGeometry(0.36, 1.75, 0.07), i === 1 ? 0xb58f60 : 0xa8814f, 0.66 - i * 0.09, 0.8, 0.66 - i * 0.12);
    plank.rotation.x = 0.34;
    plank.rotation.z = (i - 1) * 0.05;
    group.add(plank);
  }

  // 锯末堆
  const dust = m(new THREE.ConeGeometry(0.42, 0.22, 9), 0xd3b581, 0.2, 0.11, 0.5);
  group.add(dust);

  return group;
}

/** 铁砧：木墩、砧身、尖角、砧面上的红铁、淬火桶 */
function anvil(def: AnnexDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);
  group.rotation.y = def.rot ?? 0;

  group.add(m(new THREE.CylinderGeometry(0.3, 0.34, 0.5, 10), 0x8a6c47, 0, 0.25, 0));
  group.add(m(new THREE.BoxGeometry(0.34, 0.1, 0.42), 0x565853, 0, 0.55, 0));

  // 砧身：上宽下窄
  group.add(m(new THREE.BoxGeometry(0.28, 0.26, 0.62), 0x6a6c66, 0, 0.73, 0));
  group.add(m(new THREE.BoxGeometry(0.34, 0.06, 0.68), 0x7b7d76, 0, 0.87, 0));

  const horn = m(new THREE.ConeGeometry(0.12, 0.4, 8), 0x6a6c66, 0, 0.79, 0.46);
  horn.rotation.x = Math.PI / 2;
  group.add(horn);

  // 砧面上还热着的一块铁
  group.add(m(new THREE.BoxGeometry(0.26, 0.035, 0.06), 0xe0904a, 0, 0.915, -0.12));

  // 淬火桶
  group.add(m(new THREE.CylinderGeometry(0.2, 0.17, 0.36, 10), 0x8a6c47, 0.56, 0.18, 0.22));
  group.add(m(new THREE.CylinderGeometry(0.173, 0.173, 0.03, 10), 0x5c7f86, 0.56, 0.34, 0.22));

  return group;
}

/** 手推车：两轮板车，装着木箱与刨花 */
function cart(def: AnnexDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);
  group.rotation.y = def.rot ?? 0;

  [-1, 1].forEach((side) => {
    const wheel = new THREE.Group();
    wheel.position.set(side * 0.56, 0.36, -0.12);
    wheel.rotation.z = Math.PI / 2;
    wheel.add(m(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 14), 0x5f452c));
    wheel.add(m(new THREE.CylinderGeometry(0.1, 0.1, 0.11, 8), 0x5d4a33));
    for (let i = 0; i < 4; i += 1) {
      const spoke = m(new THREE.BoxGeometry(0.05, 0.62, 0.03), 0x4a3624);
      spoke.rotation.y = (i / 4) * Math.PI;
      wheel.add(spoke);
    }
    group.add(wheel);
  });

  group.add(m(new THREE.BoxGeometry(1.06, 0.1, 1.5), 0xa2553c, 0, 0.62, 0));
  [-1, 1].forEach((side) => {
    group.add(m(new THREE.BoxGeometry(0.07, 0.34, 1.5), 0x8c4230, side * 0.5, 0.8, 0));
  });
  group.add(m(new THREE.BoxGeometry(1.06, 0.3, 0.07), 0x8c4230, 0, 0.78, -0.72));

  [-1, 1].forEach((side) => {
    const handle = m(new THREE.BoxGeometry(0.06, 0.06, 0.98), 0x6b533a, side * 0.36, 0.7, 1.08);
    handle.rotation.x = -0.3;
    group.add(handle);
  });

  // 车上的木箱与刨花
  group.add(m(new THREE.BoxGeometry(0.52, 0.42, 0.52), 0xb08a5c, -0.12, 0.88, 0.06));
  group.add(m(new THREE.BoxGeometry(0.54, 0.05, 0.54), 0x8a6f4d, -0.12, 1.06, 0.06));
  for (let i = 0; i < 5; i += 1) {
    const chip = m(new THREE.BoxGeometry(0.1, 0.015, 0.04), 0xc9a978, 0.24 + (jitter(i) - 0.5) * 0.3, 0.69, -0.2 + (jitter(i + 4) - 0.5) * 0.7);
    chip.rotation.y = jitter(i + 6) * Math.PI;
    group.add(chip);
  }

  return group;
}

/** 料架：靠墙的三层木架，摆着半成品 */
function shelf(def: AnnexDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);
  group.rotation.y = def.rot ?? 0;

  const width = 1.8;
  const depth = 0.72;

  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      group.add(m(new THREE.BoxGeometry(0.09, 1.92, 0.09), 0x8a6c47, sx * (width / 2), 0.96, sz * (depth / 2)));
    });
  });

  [0.36, 0.98, 1.6].forEach((y) => {
    group.add(m(new THREE.BoxGeometry(width, 0.07, depth), 0xa9855b, 0, y, 0));
  });

  // 底层：木箱与铁桶
  group.add(m(new THREE.BoxGeometry(0.52, 0.42, 0.46), 0xb08a5c, -0.5, 0.6, 0));
  group.add(m(new THREE.CylinderGeometry(0.19, 0.17, 0.4, 10), 0x8f9188, 0.4, 0.6, 0.02));

  // 中层：几块立着的板
  for (let i = 0; i < 4; i += 1) {
    const board = m(new THREE.BoxGeometry(0.06, 0.56, 0.42), i % 2 === 0 ? 0xb58f60 : 0xa8814f, -0.62 + i * 0.12, 1.3, 0);
    board.rotation.x = 0.1;
    group.add(board);
  }

  // 顶层：一条没上完漆的凳子
  group.add(m(new THREE.BoxGeometry(0.52, 0.06, 0.36), 0xc09a68, 0.36, 1.72, 0));
  [-1, 1].forEach((sx) => {
    [-1, 1].forEach((sz) => {
      group.add(m(new THREE.BoxGeometry(0.05, 0.14, 0.05), 0xa8814f, 0.36 + sx * 0.2, 1.63, sz * 0.13));
    });
  });

  return group;
}

/** 砂轮：木架、石轮、水槽、摇柄（石轮会转） */
function grindstone(def: AnnexDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);
  group.rotation.y = def.rot ?? 0;

  [-1, 1].forEach((side) => {
    [-1, 1].forEach((sz) => {
      group.add(m(new THREE.BoxGeometry(0.12, 0.98, 0.12), 0x8a6c47, side * 0.5, 0.49, sz * 0.3));
    });
    group.add(m(new THREE.BoxGeometry(0.1, 0.1, 0.72), 0x7d6142, side * 0.5, 0.92, 0));
  });
  group.add(m(new THREE.BoxGeometry(1.12, 0.09, 0.14), 0x7d6142, 0, 0.26, 0));

  // 水槽
  group.add(m(new THREE.BoxGeometry(0.84, 0.2, 0.44), 0x8a6c47, 0, 0.2, 0));
  group.add(m(new THREE.BoxGeometry(0.72, 0.03, 0.32), 0x7d9aa0, 0, 0.3, 0));

  // 石轮：轴沿 X，轮面朝 X，绕自身轴自转
  const axle = new THREE.Group();
  axle.position.set(0, 0.86, 0);
  axle.rotation.z = Math.PI / 2;

  const drum = new THREE.Group();
  drum.add(m(new THREE.CylinderGeometry(0.42, 0.42, 0.19, 16), 0x9a9a92));
  for (let i = 0; i < 10; i += 1) {
    const angle = (i / 10) * Math.PI * 2;
    const notch = m(new THREE.BoxGeometry(0.1, 0.2, 0.05), 0x83837b);
    notch.position.set(Math.cos(angle) * 0.4, 0, Math.sin(angle) * 0.4);
    notch.rotation.y = -angle;
    drum.add(notch);
  }
  // 摇柄：跟着石轮一起转
  drum.add(m(new THREE.BoxGeometry(0.26, 0.045, 0.045), 0x5d5a55, 0.13, 0.16, 0));
  drum.add(m(new THREE.CylinderGeometry(0.035, 0.035, 0.14, 8), 0x6b5844, 0.26, 0.21, 0));

  spinY(drum, 0.85);
  axle.add(drum);
  group.add(axle);

  return group;
}

function shed(def: AnnexDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);
  group.rotation.y = def.rot ?? 0;
  const tone = ACCENT[def.accent ?? "coral"];

  const w = 3.2;
  const d = 2.8;
  const h = 2.3;

  const body = shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(PAPER.wallSide)));
  body.position.y = h / 2;
  group.add(body);

  const roof = m(new THREE.BoxGeometry(w + 0.45, 0.18, d + 0.5), tone.base, 0, h + 0.16, 0);
  roof.rotation.x = -0.08;
  group.add(roof);

  const door = m(new THREE.BoxGeometry(1.6, 1.7, 0.1), tone.ink, 0, 0.85, d / 2 + 0.02);
  group.add(door);
  for (let i = 1; i < 5; i += 1) {
    group.add(m(new THREE.BoxGeometry(1.6, 0.05, 0.04), PAPER.trim, 0, (1.7 / 5) * i, d / 2 + 0.08));
  }

  group.add(m(new THREE.BoxGeometry(0.34, 0.5, 0.34), PAPER.wallSide, w * 0.32, h + 0.42, -d * 0.2));

  return group;
}

function stall(def: AnnexDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);
  group.rotation.y = def.rot ?? 0;
  const tone = ACCENT[def.accent ?? "mint"];

  group.add(m(new THREE.BoxGeometry(2.4, 0.12, 0.82), PAPER.trunk, 0, 0.9, 0));
  [-1, 1].forEach((sx) => {
    [-0.3, 0.3].forEach((sz) => {
      group.add(m(new THREE.BoxGeometry(0.08, 0.9, 0.08), 0x6b5844, sx, 0.45, sz));
    });
  });

  group.add(m(new THREE.BoxGeometry(2.4, 1.5, 0.1), PAPER.wallSide, 0, 1.65, -0.36));

  const colors = [0xd9603c, 0x4666c4, 0xe0a23a, 0x3d9e7d, 0x7b63c4];
  for (let i = 0; i < 10; i += 1) {
    const book = m(new THREE.BoxGeometry(0.16, 0.42, 0.14), colors[i % colors.length]);
    book.position.set(-1 + (i % 5) * 0.42, 1.32 + Math.floor(i / 5) * 0.5, -0.28);
    group.add(book);
  }
  for (let i = 0; i < 4; i += 1) {
    const pile = m(new THREE.BoxGeometry(0.34, 0.28, 0.24), colors[(i + 2) % colors.length]);
    pile.position.set(-0.8 + i * 0.55, 1.1, 0.02);
    group.add(pile);
  }

  const canopy = m(new THREE.BoxGeometry(2.9, 0.1, 1.5), tone.base, 0, 2.5, 0.05);
  canopy.rotation.x = -0.12;
  group.add(canopy);
  [-1.25, 1.25].forEach((x) => {
    group.add(m(new THREE.BoxGeometry(0.07, 2.5, 0.07), PAPER.trim, x, 1.25, 0.55));
  });

  return group;
}

function table(def: AnnexDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);

  group.add(m(new THREE.CylinderGeometry(0.42, 0.42, 0.07, 12), PAPER.wall, 0, 0.72, 0));
  group.add(m(new THREE.CylinderGeometry(0.06, 0.08, 0.72, 8), 0x6b5844, 0, 0.36, 0));
  group.add(m(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 10), 0x6b5844, 0, 0.03, 0));

  [0, Math.PI].forEach((angle) => {
    const chair = new THREE.Group();
    chair.position.set(Math.cos(angle) * 0.72, 0, Math.sin(angle) * 0.72);
    chair.rotation.y = -angle;
    chair.add(m(new THREE.BoxGeometry(0.38, 0.06, 0.38), PAPER.trunk, 0, 0.44, 0));
    chair.add(m(new THREE.BoxGeometry(0.38, 0.4, 0.06), PAPER.trunk, 0, 0.64, -0.16));
    [
      [-0.14, -0.14],
      [0.14, -0.14],
      [-0.14, 0.14],
      [0.14, 0.14],
    ].forEach(([x, z]) => {
      chair.add(m(new THREE.BoxGeometry(0.05, 0.44, 0.05), 0x6b5844, x, 0.22, z));
    });
    group.add(chair);
  });

  // 桌上的一杯咖啡
  group.add(m(new THREE.CylinderGeometry(0.09, 0.07, 0.13, 8), PAPER.wall, 0.12, 0.82, 0.05));

  return group;
}

function parasol(def: AnnexDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);
  const tone = ACCENT[def.accent ?? "coral"];

  group.add(m(new THREE.CylinderGeometry(0.045, 0.045, 2.45, 6), PAPER.trim, 0, 1.22, 0));

  const canopy = m(new THREE.ConeGeometry(1.28, 0.52, 8), tone.base, 0, 2.5, 0);
  group.add(canopy);

  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    const rib = m(new THREE.BoxGeometry(0.03, 0.03, 1.2), tone.ink);
    rib.position.set(Math.cos(angle) * 0.62, 2.32, Math.sin(angle) * 0.62);
    rib.rotation.y = -angle;
    rib.rotation.x = 0.2;
    group.add(rib);
  }

  return group;
}

function rack(def: AnnexDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);
  group.rotation.y = def.rot ?? 0;

  [-0.85, 0.85].forEach((x) => {
    group.add(m(new THREE.BoxGeometry(0.08, 2, 0.08), PAPER.trunk, x, 1, 0));
  });
  group.add(m(new THREE.BoxGeometry(1.9, 0.06, 0.06), PAPER.trunk, 0, 1.96, 0));

  for (let i = 0; i < 4; i += 1) {
    const paper = m(new THREE.BoxGeometry(0.34, 0.52, 0.02), PAPER.wall);
    paper.position.set(-0.6 + i * 0.4, 1.62, 0.03);
    paper.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.05;
    group.add(paper);
    for (let line = 0; line < 3; line += 1) {
      const rule = m(new THREE.BoxGeometry(0.26 - (line % 2) * 0.08, 0.02, 0.01), PAPER.trim);
      rule.position.set(-0.6 + i * 0.4, 1.7 - line * 0.14, 0.05);
      group.add(rule);
    }
  }

  return group;
}

function chalkboard(def: AnnexDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);
  group.rotation.y = def.rot ?? 0;

  [1, -1].forEach((side) => {
    const board = m(new THREE.BoxGeometry(0.92, 1.3, 0.06), side > 0 ? 0x2f3a35 : PAPER.trunk);
    board.position.set(0, 0.68, side * 0.17);
    board.rotation.x = side * 0.16;
    group.add(board);
  });

  for (let i = 0; i < 3; i += 1) {
    group.add(m(new THREE.BoxGeometry(0.54 - i * 0.09, 0.03, 0.01), 0xe8e4d8, 0, 0.98 - i * 0.18, -0.21));
  }

  return group;
}

function barrels(def: AnnexDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);
  group.rotation.y = def.rot ?? 0;

  [
    { x: -0.32, z: 0, y: 0.31 },
    { x: 0.3, z: 0.1, y: 0.31 },
    { x: -0.02, z: 0.02, y: 0.92 },
  ].forEach((item) => {
    const barrel = m(new THREE.CylinderGeometry(0.26, 0.26, 0.62, 10), 0x9a7b52, item.x, item.y, item.z);
    group.add(barrel);
    group.add(m(new THREE.CylinderGeometry(0.27, 0.27, 0.05, 10), 0x6b5844, item.x, item.y + 0.2, item.z));
  });

  return group;
}

function well(def: AnnexDef): THREE.Group {
  const group = new THREE.Group();
  group.position.set(def.x, 0, def.z);

  group.add(m(new THREE.CylinderGeometry(0.72, 0.78, 0.72, 12), PAPER.plazaEdge, 0, 0.36, 0));
  group.add(m(new THREE.CylinderGeometry(0.56, 0.56, 0.05, 12), PAPER.water, 0, 0.68, 0));

  [-0.62, 0.62].forEach((x) => {
    group.add(m(new THREE.BoxGeometry(0.08, 1.4, 0.08), PAPER.trunk, x, 1.3, 0));
  });
  group.add(m(new THREE.BoxGeometry(1.6, 0.12, 0.74), 0xd9603c, 0, 2.16, 0));
  group.add(m(new THREE.BoxGeometry(0.02, 0.62, 0.02), 0x8a7a66, 0, 1.86, 0));
  group.add(m(new THREE.CylinderGeometry(0.15, 0.13, 0.22, 8), PAPER.trunk, 0, 1.5, 0));

  return group;
}

export function createAnnex(def: AnnexDef): THREE.Group {
  switch (def.kind) {
    case "shed":
      return shed(def);
    case "stall":
      return stall(def);
    case "fence":
      return createFence(def.x, def.z, def.rot ?? 0, def.length ?? 3);
    case "table":
      return table(def);
    case "parasol":
      return parasol(def);
    case "bench":
      return createBench(def.x, def.z, def.rot ?? 0);
    case "planter":
      return createPlanter(def.x, def.z);
    case "rack":
      return rack(def);
    case "chalkboard":
      return chalkboard(def);
    case "barrels":
      return barrels(def);
    case "well":
      return well(def);
    case "lamp":
      return createLamp(def.x, def.z);
    case "pad":
      return pad(def);
    case "workbench":
      return workbench(def);
    case "lumber":
      return lumber(def);
    case "anvil":
      return anvil(def);
    case "cart":
      return cart(def);
    case "shelf":
      return shelf(def);
    case "grindstone":
      return grindstone(def);
    default:
      return new THREE.Group();
  }
}
