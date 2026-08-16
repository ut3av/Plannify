/**
 * Client-Side Image Optimizer for Gemini OCR Payload Compression
 * Downsamples high-resolution timetable photos/scans using HTML5 Canvas
 * prior to uploading or base64 transmission to Gemini 2.5 Flash.
 */

export async function compressImage(
  fileOrDataUrl,
  maxDimension = 1200,
  quality = 0.82,
  onProgress = null
) {
  return new Promise((resolve, reject) => {
    if (onProgress) onProgress(15);

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (onProgress) onProgress(45);

      let { width, height } = img;
      const originalSize = typeof fileOrDataUrl === "string" ? fileOrDataUrl.length : fileOrDataUrl.size;

      // Scale dimensions proportionally if larger than maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      if (onProgress) onProgress(70);

      // Render to HTML5 Canvas
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      // Smooth downsampling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      if (onProgress) onProgress(85);

      // Export as compressed JPEG
      const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
      const rawBase64 = compressedDataUrl.replace(/^data:image\/jpeg;base64,/, "");
      const compressedSize = compressedDataUrl.length;

      const compressionRatio = originalSize > 0
        ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
        : 0;

      if (onProgress) onProgress(100);

      resolve({
        dataUrl: compressedDataUrl,
        base64: rawBase64,
        width,
        height,
        originalSize,
        compressedSize,
        compressionRatio,
        format: "image/jpeg"
      });
    };

    img.onerror = (err) => {
      reject(new Error("Failed to load image for compression: " + err));
    };

    if (typeof fileOrDataUrl === "string") {
      img.src = fileOrDataUrl;
    } else if (fileOrDataUrl instanceof Blob || fileOrDataUrl instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrDataUrl);
    } else {
      reject(new Error("Invalid image source provided."));
    }
  });
}
