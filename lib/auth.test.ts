import { describe, it, expect, beforeEach } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
  verifyAppPassword,
} from "./auth";

describe("Password Gate & Session Token Verification", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test_super_secret_session_key_with_32_chars_long";
    process.env.APP_PASSWORD = "my_secure_stockflow_password";
  });

  it("verifies application password correctly", () => {
    expect(verifyAppPassword("my_secure_stockflow_password")).toBe(true);
    expect(verifyAppPassword("wrong_password")).toBe(false);
  });

  it("signs and successfully verifies valid session token", async () => {
    const token = await createSessionToken();
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);

    const payload = await verifySessionToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.authenticated).toBe(true);
  });

  it("rejects tampered or malformed tokens", async () => {
    const validToken = await createSessionToken();
    const tampered = validToken.slice(0, -5) + "abcde";

    const payload = await verifySessionToken(tampered);
    expect(payload).toBeNull();
    expect(await verifySessionToken(null)).toBeNull();
    expect(await verifySessionToken("not-a-token")).toBeNull();
  });
});

