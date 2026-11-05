/**
 * 小镇寻路：1 米网格 + A*。
 * 建筑按矩形占地标记为不可走（大建筑用圆会把窄巷堵死），
 * 广场、水井、院落小品等圆形物件仍用圆。
 * 只处理平面（x, z），高度由场景决定。
 */

import { TOWN_SIZE } from "./data";

export type Point = { x: number; z: number };

const N = TOWN_SIZE * 2 + 1;

export type Obstacle = { x: number; z: number; r: number };
export type RectObstacle = { x: number; z: number; hw: number; hd: number };

export type WalkGrid = {
  blocked: Uint8Array;
  /** 圆形障碍（广场、水井、院落小品） */
  obstacles: Obstacle[];
  /** 矩形障碍（建筑与装饰房） */
  rects: RectObstacle[];
};

export function createWalkGrid(obstacles: Obstacle[], rects: RectObstacle[] = []): WalkGrid {
  const blocked = new Uint8Array(N * N);

  for (let iz = 0; iz < N; iz += 1) {
    for (let ix = 0; ix < N; ix += 1) {
      const x = ix - TOWN_SIZE;
      const z = iz - TOWN_SIZE;
      const outOfBounds = Math.abs(x) > TOWN_SIZE - 1.2 || Math.abs(z) > TOWN_SIZE - 1.2;
      const hitCircle = obstacles.some((o) => (x - o.x) ** 2 + (z - o.z) ** 2 < o.r ** 2);
      const hitRect = !hitCircle && rects.some((r) => Math.abs(x - r.x) < r.hw && Math.abs(z - r.z) < r.hd);
      if (outOfBounds || hitCircle || hitRect) blocked[iz * N + ix] = 1;
    }
  }

  return { blocked, obstacles, rects };
}

function inBounds(ix: number, iz: number): boolean {
  return ix >= 0 && ix < N && iz >= 0 && iz < N;
}

function isBlocked(grid: WalkGrid, ix: number, iz: number): boolean {
  if (!inBounds(ix, iz)) return true;
  return grid.blocked[iz * N + ix] === 1;
}

function toCell(x: number, z: number): [number, number] {
  return [Math.round(x) + TOWN_SIZE, Math.round(z) + TOWN_SIZE];
}

function toWorld(ix: number, iz: number): Point {
  return { x: ix - TOWN_SIZE, z: iz - TOWN_SIZE };
}

/** 找到离目标最近的可走格子（目标落进建筑或广场时用） */
export function nearestWalkable(grid: WalkGrid, point: Point): Point {
  const [cx, cz] = toCell(point.x, point.z);
  if (!isBlocked(grid, cx, cz)) {
    return { x: clampWorld(point.x), z: clampWorld(point.z) };
  }

  for (let radius = 1; radius < 10; radius += 1) {
    for (let dz = -radius; dz <= radius; dz += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.abs(dx) !== radius && Math.abs(dz) !== radius) continue;
        if (!isBlocked(grid, cx + dx, cz + dz)) {
          const world = toWorld(cx + dx, cz + dz);
          return { x: world.x, z: world.z };
        }
      }
    }
  }

  return { x: 0, z: 0 };
}

function clampWorld(value: number): number {
  return Math.max(-TOWN_SIZE + 1.5, Math.min(TOWN_SIZE - 1.5, value));
}

type Node = { ix: number; iz: number; g: number; f: number; parent: number };

const DIRECTIONS: { dx: number; dz: number; cost: number }[] = [
  { dx: 1, dz: 0, cost: 1 },
  { dx: -1, dz: 0, cost: 1 },
  { dx: 0, dz: 1, cost: 1 },
  { dx: 0, dz: -1, cost: 1 },
  { dx: 1, dz: 1, cost: Math.SQRT2 },
  { dx: 1, dz: -1, cost: Math.SQRT2 },
  { dx: -1, dz: 1, cost: Math.SQRT2 },
  { dx: -1, dz: -1, cost: Math.SQRT2 },
];

function octile(ax: number, az: number, bx: number, bz: number): number {
  const dx = Math.abs(ax - bx);
  const dz = Math.abs(az - bz);
  return dx + dz + (Math.SQRT2 - 2) * Math.min(dx, dz);
}

/** A*：返回从起点到终点的格子中心路径（不含起点），失败返回 null */
export function findPath(grid: WalkGrid, start: Point, goal: Point): Point[] | null {
  const [sx, sz] = toCell(start.x, start.z);
  const [gx, gz] = toCell(goal.x, goal.z);

  const startCell: [number, number] = isBlocked(grid, sx, sz)
    ? (() => {
        const p = nearestWalkable(grid, start);
        return toCell(p.x, p.z);
      })()
    : [sx, sz];

  const goalCell: [number, number] = isBlocked(grid, gx, gz)
    ? (() => {
        const p = nearestWalkable(grid, goal);
        return toCell(p.x, p.z);
      })()
    : [gx, gz];

  const total = N * N;
  const gScore = new Float32Array(total).fill(Infinity);
  const closed = new Uint8Array(total);
  const parents = new Int32Array(total).fill(-1);
  const open: Node[] = [];

  const startIndex = startCell[1] * N + startCell[0];
  const goalIndex = goalCell[1] * N + goalCell[0];

  gScore[startIndex] = 0;
  open.push({ ix: startCell[0], iz: startCell[1], g: 0, f: octile(startCell[0], startCell[1], goalCell[0], goalCell[1]), parent: -1 });

  while (open.length > 0) {
    let bestIndex = 0;
    for (let i = 1; i < open.length; i += 1) {
      if (open[i].f < open[bestIndex].f) bestIndex = i;
    }
    const current = open.splice(bestIndex, 1)[0];
    const currentIndex = current.iz * N + current.ix;

    if (currentIndex === goalIndex) {
      const path: Point[] = [];
      let cursor = currentIndex;
      while (cursor !== startIndex && cursor >= 0) {
        const ix = cursor % N;
        const iz = Math.floor(cursor / N);
        path.push(toWorld(ix, iz));
        cursor = parents[cursor];
      }
      path.reverse();
      return path;
    }

    if (closed[currentIndex]) continue;
    closed[currentIndex] = 1;

    for (const dir of DIRECTIONS) {
      const nx = current.ix + dir.dx;
      const nz = current.iz + dir.dz;
      if (!inBounds(nx, nz)) continue;
      if (isBlocked(grid, nx, nz)) continue;
      if (dir.dx !== 0 && dir.dz !== 0) {
        if (isBlocked(grid, current.ix + dir.dx, current.iz) || isBlocked(grid, current.ix, current.iz + dir.dz)) {
          continue;
        }
      }
      const nextIndex = nz * N + nx;
      if (closed[nextIndex]) continue;
      const tentative = current.g + dir.cost;
      if (tentative < gScore[nextIndex]) {
        gScore[nextIndex] = tentative;
        parents[nextIndex] = currentIndex;
        open.push({
          ix: nx,
          iz: nz,
          g: tentative,
          f: tentative + octile(nx, nz, goalCell[0], goalCell[1]),
          parent: currentIndex,
        });
      }
    }
  }

  return null;
}

/** 简单碰撞：给键盘自由移动用 */
export function isWalkable(grid: WalkGrid, x: number, z: number): boolean {
  if (Math.abs(x) > TOWN_SIZE - 1.2 || Math.abs(z) > TOWN_SIZE - 1.2) return false;
  if (grid.rects.some((r) => Math.abs(x - r.x) < r.hw + 0.15 && Math.abs(z - r.z) < r.hd + 0.15)) return false;
  return !grid.obstacles.some((o) => (x - o.x) ** 2 + (z - o.z) ** 2 < (o.r - 0.35) ** 2);
}
