/**
 * 程序化贴图：招牌、钟面、任务板、纸纹。
 * 全部用 Canvas 现画，不引入任何图片资源。
 * 只能在浏览器端调用（依赖 document）。
 */

import * as THREE from "three";

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

const FONT = '"PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif';

/** 招牌：米白纸底 + 陶土细框 + 左侧色点 */
export function createSignTexture(text: string, accent: number, trim: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#FBF6EA";
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = hex(trim);
    ctx.lineWidth = 5;
    ctx.strokeRect(8, 8, 496, 112);

    ctx.fillStyle = hex(accent);
    ctx.beginPath();
    ctx.arc(52, 64, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#3A2A22";
    ctx.font = `600 64px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 290, 68);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** 钟面：白盘 + 刻度 + 指向十点十分的指针 */
export function createClockTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const c = size / 2;
    ctx.fillStyle = "#FBF6EA";
    ctx.beginPath();
    ctx.arc(c, c, c - 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#A2573A";
    ctx.lineWidth = 7;
    ctx.stroke();

    ctx.strokeStyle = "#3A2A22";
    ctx.lineWidth = 4;
    for (let i = 0; i < 12; i += 1) {
      const angle = (i / 12) * Math.PI * 2;
      const inner = c - 26;
      const outer = c - 12;
      ctx.beginPath();
      ctx.moveTo(c + Math.sin(angle) * inner, c - Math.cos(angle) * inner);
      ctx.lineTo(c + Math.sin(angle) * outer, c - Math.cos(angle) * outer);
      ctx.stroke();
    }

    ctx.lineCap = "round";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.lineTo(c + Math.sin(-Math.PI / 3) * 52, c - Math.cos(-Math.PI / 3) * 52);
    ctx.stroke();

    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.lineTo(c + Math.sin(Math.PI / 6) * 78, c - Math.cos(Math.PI / 6) * 78);
    ctx.stroke();

    ctx.fillStyle = "#A2573A";
    ctx.beginPath();
    ctx.arc(c, c, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** 任务板：木板 + 几张歪斜的纸条 */
export function createBoardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#C9A87C";
    ctx.fillRect(0, 0, 256, 320);

    ctx.strokeStyle = "rgba(120, 85, 50, 0.35)";
    ctx.lineWidth = 2;
    for (let y = 24; y < 320; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }

    const notes = [
      { x: 26, y: 30, w: 82, h: 66, r: -0.05, color: "#FDF3D8" },
      { x: 128, y: 44, w: 92, h: 58, r: 0.04, color: "#F6D9C8" },
      { x: 36, y: 132, w: 96, h: 72, r: 0.03, color: "#D8E8DA" },
      { x: 142, y: 158, w: 80, h: 62, r: -0.03, color: "#FDF3D8" },
      { x: 46, y: 238, w: 104, h: 56, r: 0.02, color: "#E1DCF2" },
    ];

    notes.forEach((note, index) => {
      ctx.save();
      ctx.translate(note.x, note.y);
      ctx.rotate(note.r);
      ctx.fillStyle = note.color;
      ctx.fillRect(0, 0, note.w, note.h);
      ctx.fillStyle = "rgba(58, 42, 34, 0.45)";
      for (let line = 0; line < 3; line += 1) {
        ctx.fillRect(10, 14 + line * 15, note.w - 24 - (line % 2) * 12, 4);
      }
      ctx.fillStyle = "#D9603C";
      ctx.beginPath();
      ctx.arc(note.w / 2, 6, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
      void index;
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** 一张极淡的纸纹，用作地面 */
export function createPaperTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#EFE6D3";
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 2600; i += 1) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const alpha = 0.02 + Math.random() * 0.05;
      ctx.fillStyle = Math.random() > 0.5
        ? `rgba(120, 96, 66, ${alpha})`
        : `rgba(255, 252, 240, ${alpha})`;
      ctx.fillRect(x, y, 1.4, 1.4);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(9, 9);
  texture.anisotropy = 4;
  return texture;
}
