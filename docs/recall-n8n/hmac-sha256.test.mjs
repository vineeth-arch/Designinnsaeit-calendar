import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// hmac-sha256.js is plain script text (pasted into n8n), so evaluate it instead of importing it.
const src = readFileSync(new URL("./hmac-sha256.js", import.meta.url), "utf8");
const { sha256, hmacSha256Hex, timingSafeEqualStr } = new Function(
  `${src}\nreturn { sha256, hmacSha256Hex, timingSafeEqualStr };`
)();

const hex = (u8) => Buffer.from(u8).toString("hex");

test("sha256 matches node:crypto for empty, short, block-boundary and long inputs", () => {
  for (const len of [0, 1, 3, 55, 56, 57, 63, 64, 65, 119, 120, 1000, 100000]) {
    const data = Buffer.alloc(len, 0xab);
    assert.equal(hex(sha256(data)), createHash("sha256").update(data).digest("hex"), `len ${len}`);
  }
});

test("hmac matches node:crypto for short, exact-block and over-block keys", () => {
  const body = Buffer.from(JSON.stringify({ triggerEvent: "BOOKING_CREATED", payload: { uid: "u1" } }));
  for (const key of ["s", "a-normal-webhook-secret", "k".repeat(64), "k".repeat(65), "k".repeat(200)]) {
    assert.equal(hmacSha256Hex(key, body), createHmac("sha256", key).update(body).digest("hex"), key.length);
  }
});

test("hmac handles a non-ASCII body byte for byte", () => {
  const body = Buffer.from("Zoë – 你好", "utf8");
  assert.equal(hmacSha256Hex("secret", body), createHmac("sha256", "secret").update(body).digest("hex"));
});

test("timingSafeEqualStr", () => {
  assert.equal(timingSafeEqualStr("abc", "abc"), true);
  assert.equal(timingSafeEqualStr("abc", "abd"), false);
  assert.equal(timingSafeEqualStr("abc", "abcd"), false);
});
