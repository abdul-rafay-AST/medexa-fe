const TARGET_SAMPLE_RATE = 16_000;

/** Downsample mono PCM to 16 kHz (linear interpolation). */
export function downsampleTo16k(samples: Float32Array, sampleRate: number): Float32Array {
  if (sampleRate <= TARGET_SAMPLE_RATE) {
    return samples;
  }
  const ratio = sampleRate / TARGET_SAMPLE_RATE;
  const outputLength = Math.max(1, Math.floor(samples.length / ratio));
  const output = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i += 1) {
    const position = i * ratio;
    const index = Math.floor(position);
    const fraction = position - index;
    const next = samples[Math.min(index + 1, samples.length - 1)];
    output[i] = samples[index] * (1 - fraction) + next * fraction;
  }
  return output;
}

/** Encode mono float PCM (-1..1) as 16-bit WAV for reliable STT upload. */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const pcm = downsampleTo16k(samples, sampleRate);
  const rate = sampleRate > TARGET_SAMPLE_RATE ? TARGET_SAMPLE_RATE : sampleRate;
  const bytesPerSample = 2;
  const dataSize = pcm.length * bytesPerSample;
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
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < pcm.length; i += 1) {
    const sample = pcm[i] > 1 ? 1 : pcm[i] < -1 ? -1 : pcm[i];
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export { TARGET_SAMPLE_RATE };
