import { describe, it, expect } from "vitest";
import {
  toSigned64BitInt,
  toUnsigned64BitInt,
  toHexHash,
  computeHammingDistance,
  computeDCT8x8,
  dctToHash,
} from "./phash";

describe("64-bit DCT Perceptual Hash & Hamming Distance Utilities", () => {
  it("computes DCT and generates median-thresholded 64-bit hash", () => {
    // Synthetic gradient pixels for 32x32
    const pixels = new Uint8Array(1024);
    for (let i = 0; i < 1024; i++) {
      pixels[i] = (i % 32) * 8;
    }

    const dct = computeDCT8x8(pixels);
    expect(dct.length).toBe(64);

    const hash = dctToHash(dct);
    expect(typeof hash).toBe("bigint");

    // The hash should have approximately 32 bits set because of median split
    const unsigned = toUnsigned64BitInt(hash);
    let count = 0;
    let n = unsigned;
    while (n > 0n) {
      n &= n - 1n;
      count++;
    }
    expect(count).toBeGreaterThanOrEqual(30);
    expect(count).toBeLessThanOrEqual(34);
  });

  it("produces identical hashes for identical pixel matrices", () => {
    const pixels1 = new Uint8Array(1024).fill(128);
    const pixels2 = new Uint8Array(1024).fill(128);

    const hash1 = dctToHash(computeDCT8x8(pixels1));
    const hash2 = dctToHash(computeDCT8x8(pixels2));

    expect(computeHammingDistance(hash1, hash2)).toBe(0);
  });

  it("correctly converts between unsigned, signed 64-bit BigInt, and hex string", () => {
    // 0xFFFFFFFFFFFFFFFFn is -1n as signed 64-bit int
    const maxUnsigned = 0xffffffffffffffffn;
    const signedVal = toSigned64BitInt(maxUnsigned);
    expect(signedVal).toBe(-1n);

    // Roundtrip back to unsigned
    const unsignedVal = toUnsigned64BitInt(signedVal);
    expect(unsignedVal).toBe(maxUnsigned);

    // Hex string conversion
    const hex = toHexHash(signedVal);
    expect(hex).toBe("ffffffffffffffff");
  });

  it("handles zero correctly", () => {
    const signedZero = toSigned64BitInt(0n);
    expect(signedZero).toBe(0n);
    expect(toHexHash(0n)).toBe("0000000000000000");
    expect(computeHammingDistance(0n, 0n)).toBe(0);
  });

  it("calculates exact Hamming distance between BigInt hashes (BigInt-safe)", () => {
    const hashA = 0b10101010n;
    const hashB = 0b10101011n; // 1 bit diff
    expect(computeHammingDistance(hashA, hashB)).toBe(1);

    const hashC = 0n;
    const hashD = 0xffffffffffffffffn; // all 64 bits diff
    expect(computeHammingDistance(hashC, hashD)).toBe(64);
  });

  it("calculates Hamming distance when inputs are negative signed BigInts", () => {
    const hashA = -1n; // 64 ones
    const hashB = -2n; // 63 ones, last bit zero
    expect(computeHammingDistance(hashA, hashB)).toBe(1);

    const hashDiff = 0x7fffffffffffffffn; // MSB is 0 (positive signed max)
    const hashAllOnes = -1n; // MSB is 1 (all ones)
    expect(computeHammingDistance(hashDiff, hashAllOnes)).toBe(1);
  });

  it("supports hex string inputs in computeHammingDistance", () => {
    const hexA = "0000000000000001";
    const hexB = "0000000000000003"; // 1 bit diff
    expect(computeHammingDistance(hexA, hexB)).toBe(1);
  });
});
