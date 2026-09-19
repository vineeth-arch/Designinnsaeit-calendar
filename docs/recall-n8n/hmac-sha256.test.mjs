import assert from "node:assert/strict";
import { createHash, createHmac, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// hmac-sha256.js is plain script text (pasted into n8n), so evaluate it instead of importing it.
const src = readFileSync(new URL("./hmac-sha256.js", import.meta.url), "utf8");
const { sha256, hmacSha256Hex, timingSafeEqualStr, base64Encode, base64Decode, verifyStandardWebhook } = new Function(
  `${src}\nreturn { sha256, hmacSha256Hex, timingSafeEqualStr, base64Encode, base64Decode, verifyStandardWebhook };`
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

test("base64 encode and decode match Buffer for every length remainder", () => {
  for (const len of [0, 1, 2, 3, 4, 5, 31, 32, 33, 100]) {
    const data = randomBytes(len);
    assert.equal(base64Encode(data), data.toString("base64"), `encode ${len}`);
    assert.deepEqual(Buffer.from(base64Decode(data.toString("base64"))), data, `decode ${len}`);
  }
});

const secretBytes = randomBytes(24);
const secret = `whsec_${secretBytes.toString("base64")}`;
const body = Buffer.from(JSON.stringify({ event: "bot.done", data: { bot: { id: "b1" } } }));
const NOW = 1_800_000_000_000;
const sign = (id, ts, payload = body, key = secretBytes) =>
  `v1,${createHmac("sha256", key).update(`${id}.${ts}.`).update(payload).digest("base64")}`;
const headersFor = (over = {}) => ({
  "webhook-id": "msg_1",
  "webhook-timestamp": String(NOW / 1000),
  "webhook-signature": sign("msg_1", NOW / 1000),
  ...over,
});

test("verifyStandardWebhook accepts a valid Recall.ai signature", () => {
  assert.equal(verifyStandardWebhook(secret, headersFor(), body, NOW), true);
});

test("verifyStandardWebhook rejects a wrong secret", () => {
  assert.equal(verifyStandardWebhook(`whsec_${randomBytes(24).toString("base64")}`, headersFor(), body, NOW), false);
});

test("verifyStandardWebhook rejects a tampered body", () => {
  assert.equal(verifyStandardWebhook(secret, headersFor(), Buffer.from('{"event":"bot.fatal"}'), NOW), false);
});

test("verifyStandardWebhook rejects a stale or future timestamp", () => {
  const stale = String(NOW / 1000 - 301);
  const future = String(NOW / 1000 + 301);
  assert.equal(verifyStandardWebhook(secret, headersFor({ "webhook-timestamp": stale, "webhook-signature": sign("msg_1", stale) }), body, NOW), false);
  assert.equal(verifyStandardWebhook(secret, headersFor({ "webhook-timestamp": future, "webhook-signature": sign("msg_1", future) }), body, NOW), false);
});

test("verifyStandardWebhook accepts any matching signature in a rotated list", () => {
  const rotated = `${sign("msg_1", NOW / 1000, body, randomBytes(24))} ${sign("msg_1", NOW / 1000)}`;
  assert.equal(verifyStandardWebhook(secret, headersFor({ "webhook-signature": rotated }), body, NOW), true);
});

test("verifyStandardWebhook accepts the legacy svix-* header names", () => {
  const legacy = {
    "svix-id": "msg_1",
    "svix-timestamp": String(NOW / 1000),
    "svix-signature": sign("msg_1", NOW / 1000),
  };
  assert.equal(verifyStandardWebhook(secret, legacy, body, NOW), true);
});

test("verifyStandardWebhook rejects missing headers and non-v1 signatures", () => {
  assert.equal(verifyStandardWebhook(secret, {}, body, NOW), false);
  assert.equal(verifyStandardWebhook(secret, headersFor({ "webhook-signature": sign("msg_1", NOW / 1000).replace("v1", "v2") }), body, NOW), false);
});
