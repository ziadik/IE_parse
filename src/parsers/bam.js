// src/parsers/bam.js
// BAM V1 (BG1, BG2, IWD)

function parseBamFile(buffer) {
  const sig = buffer.toString("ascii", 0, 4);
  if (sig !== "BAM ") throw new Error(`Not BAM: ${sig}`);
  const version = buffer.toString("ascii", 4, 8);

  const frameCount = buffer.readUInt16LE(0x08);
  const cycleCount = buffer.readUInt8(0x0a);
  const colorCount = buffer.readUInt8(0x0b);
  const frameEntryOff = buffer.readUInt32LE(0x0c);
  const paletteOff = buffer.readUInt32LE(0x10);
  const frameLookupOff = buffer.readUInt32LE(0x14);

  // ---- Frame entries ----
  const frames = [];
  for (let i = 0; i < frameCount; i++) {
    const o = frameEntryOff + i * 12;
    frames.push({
      width: buffer.readUInt16LE(o + 0x00),
      height: buffer.readUInt16LE(o + 0x02),
      x: buffer.readInt16LE(o + 0x04),
      y: buffer.readInt16LE(o + 0x06),
      dataOffset: buffer.readUInt32LE(o + 0x08),
    });
  }

  // ---- Palette ----
  const palette = new Uint8Array(256 * 3); // RGB
  if (colorCount > 0 && paletteOff > 0) {
    // colorCount — количество цветов в palette (не 256).
    // В BG1 BAM это обычно 256, но может быть меньше.
    for (let i = 0; i < colorCount; i++) {
      const p = paletteOff + i * 4;
      palette[i * 3 + 0] = buffer[p + 2]; // R
      palette[i * 3 + 1] = buffer[p + 1]; // G
      palette[i * 3 + 2] = buffer[p + 0]; // B
    }
  } else {
    // fallback — серая палитра
    for (let i = 0; i < 256; i++) {
      palette[i * 3 + 0] = i;
      palette[i * 3 + 1] = i;
      palette[i * 3 + 2] = i;
    }
  }

  // ---- Cycles (4 байта каждая, сразу после frame entries) ----
  const cycleEntryOffset = frameEntryOff + frameCount * 12;
  const cycleEntries = [];
  for (let c = 0; c < cycleCount; c++) {
    const o = cycleEntryOffset + c * 4;
    cycleEntries.push({
      framesCount: buffer.readUInt16LE(o + 0x00),
      firstFrame: buffer.readUInt16LE(o + 0x02),
    });
  }

  // ---- Frame lookup table (word'ы) ----
  // frameLookupOff указывает на массив word'ов,
  // где лежат реальные индексы кадров для каждого цикла.
  const frameLookup = [];
  // сколько word'ов — не знаем заранее.
  // Максимум — все индексы, до которых дотягиваются циклы.
  let maxLookupIdx = 0;
  for (const c of cycleEntries) {
    const end = c.firstFrame + c.framesCount;
    if (end > maxLookupIdx) maxLookupIdx = end;
  }
  for (let i = 0; i < maxLookupIdx; i++) {
    frameLookup.push(buffer.readUInt16LE(frameLookupOff + i * 2));
  }

  // ---- Собираем индексы кадров для каждого цикла ----
  const cycles = [];
  for (const c of cycleEntries) {
    const indices = [];
    for (let i = 0; i < c.framesCount; i++) {
      indices.push(frameLookup[c.firstFrame + i]);
    }
    cycles.push(indices);
  }
  // ---- Декодируем каждый кадр в RGBA ----
  const decodedFrames = frames.map((f) =>
    decodeBamFrame(buffer, f, palette, colorCount),
  );

  return {
    version,
    frameCount,
    cycleCount,
    colorCount,
    frames, // метаданные: width, height, x, y
    cycles, // массивы индексов кадров
    decodedFrames, // RGBA Uint8ClampedArray для каждого кадра
    palette,
  };
}

function decodeBamFrame(buffer, frame, palette, colorKey = 0) {
  const w = frame.width,
    h = frame.height;
  const pixelCount = w * h;
  const indices = new Uint8Array(pixelCount);

  let p = frame.dataOffset;
  let i = 0;
  while (i < pixelCount) {
    const px = buffer[p++];
    if (px === colorKey) {
      const count = buffer[p++];
      const len = Math.min(1 + count, pixelCount - i);
      i += len;
    } else {
      indices[i++] = px;
    }
  }

  const rgba = new Uint8ClampedArray(pixelCount * 4);
  for (let j = 0; j < pixelCount; j++) {
    const idx = indices[j];
    if (idx === colorKey) {
      rgba[j * 4 + 3] = 0;
    } else {
      rgba[j * 4 + 0] = palette[idx * 3 + 0];
      rgba[j * 4 + 1] = palette[idx * 3 + 1];
      rgba[j * 4 + 2] = palette[idx * 3 + 2];
      rgba[j * 4 + 3] = 255;
    }
  }

  return { rgba, indices };
}

module.exports = { parseBamFile };
