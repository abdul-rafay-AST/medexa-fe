/** Encode mono float PCM (-1..1) as 16-bit WAV for reliable STT upload. */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const clipped = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i += 1) {
    const value = samples[i];
    clipped[i] = value > 1 ? 1 : value < -1 ? -1 : value;
  }

  const bytesPerSample = 2;
  const dataSize = clipped.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < clipped.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, clipped[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}
