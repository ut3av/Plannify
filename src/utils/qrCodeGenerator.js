import QRCode from 'qrcode';

/**
 * Standard ISO/IEC 18004 compliant QR Code Matrix Generator powered by the industry-standard qrcode engine.
 * Generates camera-scannable QR code matrices and Data URLs with Error Correction Level H (30% recovery).
 */

/**
 * Generates a 2D binary matrix [row][col] (1 for dark, 0 for light)
 * @param {string} text The target URL or data string
 * @param {object} [options]
 * @returns {number[][]} 2D array representing QR code pixels
 */
export function generateQRCodeMatrix(text, options = {}) {
  try {
    const errorCorrectionLevel = options.errorCorrectionLevel || 'H';
    const qr = QRCode.create(text, { errorCorrectionLevel });
    const size = qr.modules.size;
    const data = qr.modules.data;
    const matrix = [];

    for (let r = 0; r < size; r++) {
      const row = [];
      for (let c = 0; c < size; c++) {
        row.push(data[r * size + c] ? 1 : 0);
      }
      matrix.push(row);
    }

    return matrix;
  } catch (error) {
    console.error("QR Code matrix generation error:", error);
    return [];
  }
}

/**
 * Generates a high-resolution PNG Data URL for direct scannability & download.
 * @param {string} text The target URL or data string
 * @param {object} [options]
 * @returns {Promise<string>} Base64 Data URL (image/png)
 */
export async function generateQRCodeDataURL(text, options = {}) {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: options.errorCorrectionLevel || 'H',
      margin: options.margin ?? 2,
      width: options.width ?? 600,
      color: {
        dark: options.darkColor || '#047857',
        light: options.lightColor || '#ffffff',
      },
    });
  } catch (error) {
    console.error("QR Code DataURL generation error:", error);
    return "";
  }
}
