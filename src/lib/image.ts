// 휴대폰 사진은 수 MB라 그대로 올리면 느리고 무겁다.
// 화면에서 가로 최대 1000px JPG로 줄여 data URL로 만든 뒤 백엔드에 보낸다.

const MAX_WIDTH = 1000;
const QUALITY = 0.8;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export class ImageError extends Error {}

export async function compressImage(file: File): Promise<string> {
  if (!ACCEPTED.includes(file.type)) throw new ImageError("사진은 JPG, PNG, WEBP 파일만 올릴 수 있어요.");

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new ImageError("사진을 읽지 못했어요. 다른 사진을 골라 주세요.");
  });
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", QUALITY);
  if (dataUrl.length > 1_400_000) throw new ImageError("사진 용량이 너무 커요. 더 작은 사진을 골라 주세요.");
  return dataUrl;
}
