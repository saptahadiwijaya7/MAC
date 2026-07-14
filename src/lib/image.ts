"use client";

/** Read an image File, downscale it, and return JPEG base64 (no data: prefix). */
export async function fileToCompressedBase64(
  file: File,
  maxDim = 1280,
  quality = 0.75
): Promise<{ base64: string; mimeType: string }> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error("Gagal membaca file"));
    r.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("File bukan gambar yang valid"));
    i.src = dataUrl;
  });

  let { width, height } = img;
  if (width > height && width > maxDim) {
    height = Math.round((height * maxDim) / width);
    width = maxDim;
  } else if (height >= width && height > maxDim) {
    width = Math.round((width * maxDim) / height);
    height = maxDim;
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia");
  ctx.drawImage(img, 0, 0, width, height);

  const out = canvas.toDataURL("image/jpeg", quality);
  return { base64: out.split(",")[1], mimeType: "image/jpeg" };
}
