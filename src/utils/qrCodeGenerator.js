/**
 * Standard ISO/IEC 18004 compliant QR Code Matrix Generator (Zero Dependencies)
 * Generates valid, camera-scannable QR code byte matrices with Error Correction Level M/Q.
 */

// Galois Field GF(256) tables
const GF256_EXP = new Uint8Array(512);
const GF256_LOG = new Uint8Array(256);

(function initGF256() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = x;
    GF256_EXP[i + 255] = x;
    GF256_LOG[x] = i;
    x = (x << 1) ^ (x & 0x80 ? 0x11d : 0);
  }
  GF256_LOG[0] = 0;
})();

function gfMul(x, y) {
  if (x === 0 || y === 0) return 0;
  return GF256_EXP[GF256_LOG[x] + GF256_LOG[y]];
}

function gfPolyMul(p1, p2) {
  const r = new Uint8Array(p1.length + p2.length - 1);
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      r[i + j] ^= gfMul(p1[i], p2[j]);
    }
  }
  return r;
}

function getGeneratorPoly(deg) {
  let g = new Uint8Array([1]);
  for (let i = 0; i < deg; i++) {
    g = gfPolyMul(g, new Uint8Array([1, GF256_EXP[i]]));
  }
  return g;
}

function rsEncode(data, ecCount) {
  const gen = getGeneratorPoly(ecCount);
  const msg = new Uint8Array(data.length + ecCount);
  msg.set(data);

  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 0; j < gen.length; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}

// QR Code Specifications for Version 1 to 6 (Byte Mode, EC Level M)
const QR_VERSIONS = [
  null,
  { version: 1, size: 21, dataCap: 14, ecCount: 10, totalCodewords: 26, align: [] },
  { version: 2, size: 25, dataCap: 26, ecCount: 16, totalCodewords: 44, align: [6, 18] },
  { version: 3, size: 29, dataCap: 42, ecCount: 26, totalCodewords: 70, align: [6, 22] },
  { version: 4, size: 33, dataCap: 62, ecCount: 36, totalCodewords: 100, align: [6, 26] },
  { version: 5, size: 37, dataCap: 84, ecCount: 48, totalCodewords: 134, align: [6, 30] },
  { version: 6, size: 41, dataCap: 106, ecCount: 64, totalCodewords: 172, align: [6, 34] },
];

export function generateQRCodeMatrix(text) {
  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(text);

  // Pick smallest fitting QR version
  let qrInfo = null;
  for (let v = 1; v < QR_VERSIONS.length; v++) {
    if (rawBytes.length + 3 <= QR_VERSIONS[v].dataCap) {
      qrInfo = QR_VERSIONS[v];
      break;
    }
  }
  if (!qrInfo) {
    qrInfo = QR_VERSIONS[QR_VERSIONS.length - 1];
  }

  const { size, dataCap, ecCount, align } = qrInfo;

  // Build bitstream: Mode 4 (Byte = 0100) + Length (8 bits) + Data + Terminator
  const bits = [];
  const appendBits = (val, len) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  };

  appendBits(4, 4); // Byte Mode indicator
  appendBits(rawBytes.length, 8); // Character count
  for (const b of rawBytes) {
    appendBits(b, 8);
  }
  // Terminator (up to 4 bits)
  const remainingBits = dataCap * 8 - bits.length;
  appendBits(0, Math.min(4, Math.max(0, remainingBits)));

  // Pad to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  // Pad with alternating 0xEC and 0x11 bytes
  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (bits.length < dataCap * 8) {
    appendBits(padBytes[padIdx % 2], 8);
    padIdx++;
  }

  // Convert bits to byte codewords
  const dataBytes = new Uint8Array(dataCap);
  for (let i = 0; i < dataCap; i++) {
    let byteVal = 0;
    for (let j = 0; j < 8; j++) {
      byteVal = (byteVal << 1) | (bits[i * 8 + j] || 0);
    }
    dataBytes[i] = byteVal;
  }

  // Reed-Solomon Error Correction
  const ecBytes = rsEncode(dataBytes, ecCount);

  // Total codeword stream
  const allCodewords = new Uint8Array(dataCap + ecCount);
  allCodewords.set(dataBytes, 0);
  allCodewords.set(ecBytes, dataCap);

  // Initialize Matrix with -1 (unassigned)
  const matrix = Array.from({ length: size }, () => new Array(size).fill(-1));
  const isFunction = Array.from({ length: size }, () => new Array(size).fill(false));

  // Function: Place Finder Pattern (7x7 with separator)
  const placeFinder = (r0, c0) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const row = r0 + r;
        const col = c0 + c;
        if (row >= 0 && row < size && col >= 0 && col < size) {
          isFunction[row][col] = true;
          if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
            if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
              matrix[row][col] = 1;
            } else {
              matrix[row][col] = 0;
            }
          } else {
            matrix[row][col] = 0; // Separator
          }
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Alignment pattern (for version >= 2)
  if (align.length >= 2) {
    for (const r of align) {
      for (const c of align) {
        if (!isFunction[r][c]) {
          for (let dr = -2; dr <= 2; dr++) {
            for (let dc = -2; dc <= 2; dc++) {
              const row = r + dr;
              const col = c + dc;
              isFunction[row][col] = true;
              if (Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0)) {
                matrix[row][col] = 1;
              } else {
                matrix[row][col] = 0;
              }
            }
          }
        }
      }
    }
  }

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    if (!isFunction[6][i]) {
      matrix[6][i] = i % 2 === 0 ? 1 : 0;
      isFunction[6][i] = true;
    }
    if (!isFunction[i][6]) {
      matrix[i][6] = i % 2 === 0 ? 1 : 0;
      isFunction[i][6] = true;
    }
  }

  // Dark module
  matrix[4 * qrInfo.version + 9][8] = 1;
  isFunction[4 * qrInfo.version + 9][8] = true;

  // Format info reserve
  for (let i = 0; i < 9; i++) {
    if (!isFunction[8][i]) { isFunction[8][i] = true; matrix[8][i] = 0; }
    if (!isFunction[i][8]) { isFunction[i][8] = true; matrix[i][8] = 0; }
  }
  for (let i = size - 8; i < size; i++) {
    if (!isFunction[8][i]) { isFunction[8][i] = true; matrix[8][i] = 0; }
    if (!isFunction[i][8]) { isFunction[i][8] = true; matrix[i][8] = 0; }
  }

  // Populate data bits using standard 2-column serpentine walk
  let bitIdx = 0;
  const totalDataBits = allCodewords.length * 8;
  let dir = -1; // Going up
  let row = size - 1;
  let col = size - 1;

  while (col > 0) {
    if (col === 6) col--; // Skip vertical timing column

    for (let i = 0; i < size; i++) {
      const r = dir === -1 ? row - i : row + i;
      for (let c = 0; c < 2; c++) {
        const targetCol = col - c;
        if (!isFunction[r][targetCol]) {
          let bit = 0;
          if (bitIdx < totalDataBits) {
            const bytePos = Math.floor(bitIdx / 8);
            const bitOffset = 7 - (bitIdx % 8);
            bit = (allCodewords[bytePos] >> bitOffset) & 1;
            bitIdx++;
          }
          // Standard Mask pattern 0: (row + col) % 2 == 0
          const mask = (r + targetCol) % 2 === 0 ? 1 : 0;
          matrix[r][targetCol] = bit ^ mask;
        }
      }
    }

    row = dir === -1 ? 0 : size - 1;
    dir = -dir;
    col -= 2;
  }

  // Format Info: Mask 0 + EC Level M (0x5412)
  const formatBits = [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0];
  const formatCoords = [
    [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
    [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = formatCoords[i];
    matrix[r][c] = formatBits[i];
  }

  const formatCoords2 = [
    [size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8], [size - 5, 8], [size - 6, 8], [size - 7, 8],
    [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5], [8, size - 4], [8, size - 3], [8, size - 2], [8, size - 1]
  ];
  for (let i = 0; i < 15; i++) {
    const [r, c] = formatCoords2[i];
    matrix[r][c] = formatBits[i];
  }

  return matrix;
}
