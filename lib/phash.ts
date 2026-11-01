/**
 * 64-bit Perceptual Hash (DCT pHash) and Hamming Distance Computation
 * Algorithm:
 * 1. Resize image to 32x32 grayscale using Sharp (1,024 pixels).
 * 2. Compute 2D Discrete Cosine Transform (DCT-II) for the low-frequency 8x8 region.
 * 3. Calculate the median value across the 8x8 frequency matrix.
 * 4. Generate 64 bits: bit is 1 if coefficient > median, else 0.
 * 5. Return signed 64-bit BigInt via BigInt.asIntN(64) for Postgres BIGINT storage.
 */

// Global JSON serializer patch for BigInt to prevent "Do not know how to serialize a BigInt" in JSON.stringify / NextResponse.json
if (typeof BigInt !== "undefined" && !(BigInt.prototype as unknown as { toJSON?: unknown }).toJSON) {
  (BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
    return this.toString();
  };
}

const N = 32;
const SQRT_1_OVER_N = 1 / Math.sqrt(N);
const SQRT_2_OVER_N = Math.sqrt(2 / N);

// Precompute 1D cosine lookup table: cosTable[u][x] = cos(((2x + 1) * u * PI) / (2 * N))
const cosTable: number[][] = Array.from({ length: 8 }, (_, u) =>
  Array.from({ length: N }, (_, x) =>
    Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N))
  )
);

/**
 * Computes 2D DCT-II for the top-left 8x8 frequency matrix from 32x32 grayscale pixel intensities.
 */
export function computeDCT8x8(pixels32x32: number[] | Uint8Array): number[] {
  // Intermediate row-wise 1D DCT for u in 0..7 and all y in 0..31
  const intermediate: number[][] = Array.from({ length: 8 }, () =>
    new Array<number>(N).fill(0)
  );

  for (let u = 0; u < 8; u++) {
    const alphaU = u === 0 ? SQRT_1_OVER_N : SQRT_2_OVER_N;
    const cosU = cosTable[u];

    for (let y = 0; y < N; y++) {
      let sum = 0;
      const rowOffset = y * N;
      for (let x = 0; x < N; x++) {
        sum += pixels32x32[rowOffset + x] * cosU[x];
      }
      intermediate[u][y] = alphaU * sum;
    }
  }

  // Column-wise 1D DCT for v in 0..7 and u in 0..7
  const dct64: number[] = new Array<number>(64);

  for (let u = 0; u < 8; u++) {
    for (let v = 0; v < 8; v++) {
      const alphaV = v === 0 ? SQRT_1_OVER_N : SQRT_2_OVER_N;
      const cosV = cosTable[v];

      let sum = 0;
      const rowU = intermediate[u];
      for (let y = 0; y < N; y++) {
        sum += rowU[y] * cosV[y];
      }

      dct64[u * 8 + v] = alphaV * sum;
    }
  }

  return dct64;
}

/**
 * Computes the 64-bit DCT perceptual hash from a 64-element DCT array.
 */
export function dctToHash(dct64: number[]): bigint {
  // Copy to calculate median
  const sorted = [...dct64].sort((a, b) => a - b);
  const median = (sorted[31] + sorted[32]) / 2;

  let hash = 0n;
  for (let i = 0; i < 64; i++) {
    hash = (hash << 1n) | (dct64[i] > median ? 1n : 0n);
  }

  return BigInt.asIntN(64, hash);
}

/**
 * Converts any 64-bit representation (hex string or bigint) to a signed 64-bit BigInt
 * suitable for Postgres BIGINT columns.
 */
export function toSigned64BitInt(val: bigint | string): bigint {
  const b = typeof val === "string" ? BigInt(val.startsWith("0x") ? val : `0x${val}`) : val;
  return BigInt.asIntN(64, b);
}

/**
 * Converts a signed 64-bit BigInt back to an unsigned 64-bit BigInt for bitwise operations.
 */
export function toUnsigned64BitInt(val: bigint): bigint {
  return BigInt.asUintN(64, val);
}

/**
 * Formats a 64-bit hash as a 16-character lowercase hex string.
 */
export function toHexHash(val: bigint): string {
  const unsigned = BigInt.asUintN(64, val);
  return unsigned.toString(16).padStart(16, "0");
}

/**
 * Computes the Hamming distance (number of differing bits) between two 64-bit hashes in TypeScript.
 * BigInt-safe for both positive and negative signed values.
 */
export function computeHammingDistance(
  hashA: bigint | string,
  hashB: bigint | string
): number {
  const a = typeof hashA === "string" ? toSigned64BitInt(hashA) : hashA;
  const b = typeof hashB === "string" ? toSigned64BitInt(hashB) : hashB;

  let xor = BigInt.asUintN(64, a ^ b);
  let distance = 0;

  // Brian Kernighan's bit-counting algorithm on 64-bit BigInt
  while (xor > 0n) {
    xor &= xor - 1n;
    distance++;
  }

  return distance;
}

/**
 * Computes the 64-bit DCT perceptual hash directly from an image Buffer using Sharp.
 */
export async function computeImagePHash(imageBuffer: Buffer): Promise<bigint> {
  const sharp = (await import("sharp")).default;

  const rawPixels = await sharp(imageBuffer)
    .grayscale()
    .resize(32, 32, { fit: "fill" })
    .raw()
    .toBuffer();

  const dct = computeDCT8x8(rawPixels);
  return dctToHash(dct);
}
