/**
 * 地点附属物：一个地点 = 主楼 + 院落里的其他东西。
 * 咖啡馆有户外桌椅阳伞，报社有印刷车间和晾报架，书店有露天书摊。
 */

import * as THREE from "three";
import { ACCENT, PAPER, type AnnexDef } from "./data";
import { m, shadowed, toon } from "./materials";
import { createBench, createLamp, createPlanter } from "./build";
import { createFence } from "./props";

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
    default:
      return new THREE.Group();
  }
}
