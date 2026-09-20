// Minimal animated GIF89a writer. sharp 0.33 cannot assemble frames into an animation, and this is small
// enough (few colours, no transparency) that a dependency is not worth it.

function lzw(indices: Uint8Array, minCode: number): number[] {
  const clear = 1 << minCode;
  const eoi = clear + 1;
  const out: number[] = [];
  let bitBuf = 0;
  let bitLen = 0;
  const emit = (code: number, size: number) => {
    bitBuf |= code << bitLen;
    bitLen += size;
    while (bitLen >= 8) {
      out.push(bitBuf & 255);
      bitBuf >>>= 8;
      bitLen -= 8;
    }
  };
  let size = minCode + 1;
  let next = eoi + 1;
  let dict = new Map<number, number>();
  emit(clear, size);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = (prefix << 8) | k;
    const hit = dict.get(key);
    if (hit !== undefined) {
      prefix = hit;
      continue;
    }
    emit(prefix, size);
    if (next > (1 << size) - 1 && size < 12) size++;
    if (next < 4096) {
      dict.set(key, next++);
    } else {
      emit(clear, size);
      dict = new Map();
      next = eoi + 1;
      size = minCode + 1;
    }
    prefix = k;
  }
  emit(prefix, size);
  emit(eoi, size);
  if (bitLen > 0) out.push(bitBuf & 255);
  return out;
}

/**
 * `frames` hold palette indices (palette length must be 8). Plays once (no loop extension) and holds the
 * last frame. `delays` are in hundredths of a second.
 */
export function encodeGif(a: {
  width: number;
  height: number;
  palette: [number, number, number][];
  frames: Uint8Array[];
  delays: number[];
}): Buffer {
  const minCode = 3;
  const bytes: number[] = Array.from(Buffer.from("GIF89a"));
  const le = (n: number) => [n & 255, (n >> 8) & 255];
  bytes.push(...le(a.width), ...le(a.height), 0x80 | 0x70 | (minCode - 1), 0, 0);
  for (const [r, g, b] of a.palette) bytes.push(r, g, b);
  a.frames.forEach((frame, i) => {
    bytes.push(0x21, 0xf9, 4, 0x04, ...le(a.delays[i]), 0, 0);
    bytes.push(0x2c, 0, 0, 0, 0, ...le(a.width), ...le(a.height), 0, minCode);
    const data = lzw(frame, minCode);
    for (let p = 0; p < data.length; p += 255) {
      const chunk = data.slice(p, p + 255);
      bytes.push(chunk.length, ...chunk);
    }
    bytes.push(0);
  });
  bytes.push(0x3b);
  return Buffer.from(bytes);
}
