/** 浏览器端图片加载与 Canvas 导出辅助（全部在前端完成）。 */

export type LoadedImage = {
  source: ImageBitmap | HTMLImageElement;
  width: number;
  height: number;
  close: () => void;
};

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片解码失败，请换一张图片试试"));
    image.src = src;
  });
}

/** 读取图片文件；优先使用 createImageBitmap 以自动应用 EXIF 方向。 */
export async function loadImageFile(file: File): Promise<LoadedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // 某些格式 / 浏览器不支持 createImageBitmap，退回 img 元素
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await loadHtmlImage(url);
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      close: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  return canvas;
}

/** 把图片整体绘制到指定尺寸的 canvas；background 用于 JPEG 铺底。 */
export function drawImageToCanvas(
  source: CanvasImageSource,
  width: number,
  height: number,
  background?: string,
): HTMLCanvasElement {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器不支持 Canvas 2D");
  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** 顺时针旋转 90° 的倍数，返回新 canvas（尺寸随旋转交换） */
export function rotateImage(
  source: CanvasImageSource,
  width: number,
  height: number,
  rotation: 0 | 90 | 180 | 270,
): HTMLCanvasElement {
  const swapped = rotation === 90 || rotation === 270;
  const canvas = createCanvas(swapped ? height : width, swapped ? width : height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器不支持 Canvas 2D");
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((rotation * Math.PI) / 180);
  context.drawImage(source, -width / 2, -height / 2, width, height);
  return canvas;
}

/** 从源图裁剪一块区域并缩放到目标尺寸 */
export function cropToCanvas(
  source: CanvasImageSource,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  outWidth: number,
  outHeight: number,
  background?: string,
): HTMLCanvasElement {
  const canvas = createCanvas(outWidth, outHeight);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("当前浏览器不支持 Canvas 2D");
  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(source, sx, sy, Math.max(1, sw), Math.max(1, sh), 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("导出图片失败，可能是图片尺寸过大"));
      },
      type,
      quality,
    );
  });
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 去掉扩展名，用作下载文件名 */
export function baseName(filename: string): string {
  return filename.replace(/\.[^./\\]+$/, "") || "image";
}
