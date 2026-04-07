const MAX_WIDTH = 1024;
const INITIAL_QUALITY = 0.6;
const MAX_BASE64_LENGTH = 2_600_000; // ~2MB binary — stays under Vercel's 4.5MB limit after JSON+base64 overhead

export async function compressImage(
  file: File
): Promise<{ base64: string; mimeType: "image/jpeg" }> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const img = await loadImage(objectUrl);
    const { width, height } = scaleDimensions(
      img.naturalWidth,
      img.naturalHeight
    );

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0, width, height);

    let quality = INITIAL_QUALITY;
    let base64 = stripDataUriPrefix(
      canvas.toDataURL("image/jpeg", quality)
    );

    while (base64.length > MAX_BASE64_LENGTH && quality > 0.1) {
      quality -= 0.1;
      base64 = stripDataUriPrefix(
        canvas.toDataURL("image/jpeg", quality)
      );
    }

    return { base64, mimeType: "image/jpeg" };
  } catch {
    // Fallback for unsupported formats (e.g. HEIC on Chrome/Firefox)
    const base64 = await readFileAsBase64(file);
    return { base64, mimeType: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

function scaleDimensions(
  width: number,
  height: number
): { width: number; height: number } {
  if (width <= MAX_WIDTH) return { width, height };
  const ratio = MAX_WIDTH / width;
  return { width: MAX_WIDTH, height: Math.round(height * ratio) };
}

function stripDataUriPrefix(dataUri: string): string {
  return dataUri.split(",")[1];
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
