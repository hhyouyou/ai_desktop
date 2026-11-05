/**
 * 生活小品：灌木、花丛、草丛、篱笆、晾衣绳、自行车、垃圾桶、木箱、花盆、水桶。
 * 数量多的用 InstancedMesh 合并，控制 draw call。
 */

import * as THREE from "three";
import { PAPER, type AccentKey, ACCENT } from "./data";
import { flat, shadowed, toon } from "./materials";

/** 确定性伪随机，保证每次刷新长一样 */
function hash(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

export type Spot = { x: number; z: number; s?: number };

/* ------------------------------ 植被（实例化） ------------------------------ */

export function createBushes(spots: Spot[]): THREE.Group {
  const group = new THREE.Group();
  if (spots.length === 0) return group;

  const geometry = new THREE.IcosahedronGeometry(1, 0);
  const dummy = new THREE.Object3D();
  const half = Math.ceil(spots.length / 2);

  [
    { material: toon(PAPER.leaf), list: spots.slice(0, half) },
    { material: toon(PAPER.leafDark), list: spots.slice(half) },
  ].forEach((bucket, bucketIndex) => {
    if (bucket.list.length === 0) return;
    const mesh = new THREE.InstancedMesh(geometry, bucket.material, bucket.list.length);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    bucket.list.forEach((spot, index) => {
      const seed = bucketIndex * 1000 + index;
      const base = spot.s ?? 1;
      const scale = base * (1.05 + hash(seed) * 0.55);
      dummy.position.set(spot.x, scale * 0.52, spot.z);
      dummy.scale.set(scale, scale * (0.72 + hash(seed + 3) * 0.4), scale);
      dummy.rotation.set(hash(seed + 1) * 0.5, hash(seed + 2) * Math.PI * 2, hash(seed + 4) * 0.5);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  });

  return group;
}

export function createGrassTufts(spots: Spot[]): THREE.Group {
  const group = new THREE.Group();
  if (spots.length === 0) return group;

  const geometry = new THREE.ConeGeometry(0.14, 0.42, 4);
  const mesh = new THREE.InstancedMesh(geometry, toon(PAPER.grassDark), spots.length);
  mesh.castShadow = true;
  const dummy = new THREE.Object3D();

  spots.forEach((spot, index) => {
    const scale = (spot.s ?? 1) * (0.7 + hash(index + 50) * 0.8);
    dummy.position.set(spot.x, 0.2 * scale, spot.z);
    dummy.scale.setScalar(scale);
    dummy.rotation.y = hash(index + 51) * Math.PI * 2;
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  group.add(mesh);
  return group;
}

export function createFlowerField(spots: { x: number; z: number; accent: AccentKey }[]): THREE.Group {
  const group = new THREE.Group();
  if (spots.length === 0) return group;

  const geometry = new THREE.IcosahedronGeometry(0.14, 0);
  const dummy = new THREE.Object3D();

  (Object.keys(ACCENT) as AccentKey[]).forEach((key, bucketIndex) => {
    const list = spots.filter((spot) => spot.accent === key);
    if (list.length === 0) return;
    const mesh = new THREE.InstancedMesh(geometry, toon(ACCENT[key].base), list.length);
    list.forEach((spot, index) => {
      const seed = bucketIndex * 100 + index;
      dummy.position.set(spot.x, 0.28 + hash(seed) * 0.14, spot.z);
      dummy.scale.setScalar(0.8 + hash(seed + 9) * 0.6);
      dummy.rotation.y = hash(seed + 5) * Math.PI * 2;
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  });

  return group;
}

/* ------------------------------ 篱笆 ------------------------------ */

export function createFence(x: number, z: number, rot: number, length: number, height = 0.85): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rot;

  const posts = Math.max(2, Math.round(length / 0.62));
  const postGeometry = new THREE.BoxGeometry(0.08, height, 0.08);
  for (let i = 0; i < posts; i += 1) {
    const px = -length / 2 + (i / (posts - 1)) * length;
    const post = shadowed(new THREE.Mesh(postGeometry, toon(PAPER.trunk)));
    post.position.set(px, height / 2, 0);
    group.add(post);
  }

  [0.32, 0.66].forEach((ratio) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 0.06, 0.045), toon(PAPER.trunk));
    rail.position.set(0, height * ratio, 0.02);
    group.add(rail);
  });

  return group;
}

/* ------------------------------ 生活小品 ------------------------------ */

export function createClothesline(x: number, z: number, rot: number, length = 3.2): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rot;

  [-length / 2, length / 2].forEach((px) => {
    const pole = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 2.05, 6), toon(PAPER.trunk)));
    pole.position.set(px, 1.02, 0);
    group.add(pole);
  });

  const line = new THREE.Mesh(new THREE.BoxGeometry(length, 0.018, 0.018), toon(0x8a7a66));
  line.position.set(0, 1.94, 0);
  group.add(line);

  const cloths: AccentKey[] = ["coral", "blue", "sun", "mint"];
  cloths.forEach((key, index) => {
    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(0.46, 0.58 + (index % 2) * 0.12),
      toon(ACCENT[key].soft, THREE.DoubleSide),
    );
    cloth.position.set(-length / 2 + 0.55 + index * 0.72, 1.62, 0.01);
    cloth.rotation.y = (index % 2 === 0 ? 1 : -1) * 0.06;
    group.add(cloth);
  });

  return group;
}

export function createBicycle(x: number, z: number, rot: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rot;

  const wheelGeometry = new THREE.TorusGeometry(0.3, 0.032, 6, 14);
  [-0.46, 0.46].forEach((offset) => {
    const wheel = new THREE.Mesh(wheelGeometry, toon(0x3a2a22));
    wheel.position.set(offset, 0.3, 0);
    group.add(wheel);
  });

  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.05, 0.05), toon(0xd9603c));
  frame.position.set(0, 0.56, 0);
  frame.rotation.z = 0.1;
  group.add(frame);

  const downTube = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.045, 0.045), toon(0xd9603c));
  downTube.position.set(0.06, 0.44, 0);
  downTube.rotation.z = -0.42;
  group.add(downTube);

  const seatPost = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.28, 0.045), toon(0x8a7a66));
  seatPost.position.set(-0.24, 0.68, 0);
  group.add(seatPost);

  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.11), toon(0x3a2a22));
  saddle.position.set(-0.26, 0.83, 0);
  group.add(saddle);

  const handlePost = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.36, 0.045), toon(0x8a7a66));
  handlePost.position.set(0.44, 0.68, 0);
  group.add(handlePost);

  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.36), toon(0x3a2a22));
  handle.position.set(0.44, 0.86, 0);
  group.add(handle);

  return group;
}

export function createTrashBin(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const body = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.18, 0.58, 10), toon(0x5c6b5a)));
  body.position.y = 0.29;
  group.add(body);

  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.06, 10), toon(0x46523f));
  lid.position.y = 0.61;
  group.add(lid);

  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.215, 0.05, 10), toon(0x8a9a86));
  band.position.y = 0.42;
  group.add(band);

  return group;
}

export function createCrates(x: number, z: number, rot: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rot;

  const layout: [number, number, number, number][] = [
    [0, 0.22, 0, 0],
    [0.4, 0.22, 0.1, 0.5],
    [0.06, 0.62, -0.02, 0.2],
  ];

  layout.forEach(([px, py, pz, ry]) => {
    const size = 0.38 + (px === 0.06 ? -0.06 : 0);
    const crate = shadowed(new THREE.Mesh(new THREE.BoxGeometry(size, 0.38, size), toon(PAPER.trunk)));
    crate.position.set(px, py, pz);
    crate.rotation.y = ry;
    group.add(crate);

    const slat = new THREE.Mesh(new THREE.BoxGeometry(size + 0.01, 0.05, size + 0.01), toon(0x8a6f4d));
    slat.position.set(px, py + 0.12, pz);
    slat.rotation.y = ry;
    group.add(slat);
  });

  return group;
}

export function createFlowerPot(x: number, z: number, accent: AccentKey = "coral"): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const pot = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.3, 8), toon(0xc08a63)));
  pot.position.y = 0.15;
  group.add(pot);

  const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 8), toon(0x6b5540));
  soil.position.y = 0.3;
  group.add(soil);

  for (let i = 0; i < 4; i += 1) {
    const angle = (i / 4) * Math.PI * 2;
    const flower = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), toon(ACCENT[accent].base));
    flower.position.set(Math.cos(angle) * 0.09, 0.38, Math.sin(angle) * 0.09);
    group.add(flower);
  }

  const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 0), toon(PAPER.leaf));
  leaf.position.set(0, 0.34, 0);
  group.add(leaf);

  return group;
}

export function createBarrel(x: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const body = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.62, 10), toon(0x9a7b52)));
  body.position.y = 0.31;
  group.add(body);

  [0.16, 0.46].forEach((height) => {
    const hoop = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.045, 10), toon(0x6b5844));
    hoop.position.y = height;
    group.add(hoop);
  });

  return group;
}

export function createLaundryPole(x: number, z: number, rot: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rot;

  const pole = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.4, 6), toon(PAPER.trunk)));
  pole.position.y = 1.2;
  group.add(pole);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.05), toon(PAPER.trunk));
  arm.position.set(0.6, 2.2, 0);
  group.add(arm);

  return group;
}

export function createDoormat(x: number, z: number, rot: number, width = 1): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rot;

  const mat = new THREE.Mesh(new THREE.BoxGeometry(width, 0.03, 0.55), toon(0x9b8a74));
  mat.position.y = 0.02;
  mat.receiveShadow = true;
  group.add(mat);

  return group;
}

export function createSignpost(x: number, z: number, rot: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rot;

  const pole = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.9, 6), toon(PAPER.trunk)));
  pole.position.y = 0.95;
  group.add(pole);

  const boards: { y: number; w: number; dir: number }[] = [
    { y: 1.72, w: 0.86, dir: 1 },
    { y: 1.46, w: 0.72, dir: -1 },
    { y: 1.2, w: 0.64, dir: 1 },
  ];

  boards.forEach((board) => {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(board.w, 0.16, 0.04), toon(PAPER.wall));
    plank.position.set((board.w / 2) * board.dir * 0.9, board.y, 0);
    group.add(plank);
  });

  return group;
}

export function createIvy(wallWidth: number, wallHeight: number, accent = PAPER.leaf): THREE.Group {
  const group = new THREE.Group();
  const patches = 5;
  for (let i = 0; i < patches; i += 1) {
    const scale = 0.24 + hash(i + 30) * 0.26;
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(scale, 0), toon(i % 2 === 0 ? accent : PAPER.leafDark));
    leaf.position.set(
      (hash(i + 31) - 0.5) * wallWidth * 0.7,
      0.4 + hash(i + 32) * wallHeight * 0.7,
      0.06,
    );
    leaf.scale.z = 0.35;
    group.add(leaf);
  }
  return group;
}

export function createChimneySmoke(x: number, y: number, z: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  for (let i = 0; i < 3; i += 1) {
    const puff = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.14 + i * 0.05, 0),
      new THREE.MeshBasicMaterial({
        color: 0xf6f1e6,
        transparent: true,
        opacity: 0.42 - i * 0.1,
        toneMapped: false,
      }),
    );
    puff.position.set(i * 0.12, i * 0.3, 0);
    group.add(puff);
  }
  return group;
}
