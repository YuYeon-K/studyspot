/**
 * Noise detection using Web Audio API.
 * Computes RMS (root mean square) and maps to Quiet / Moderate / Loud.
 * Calibrate thresholds based on your environment.
 */

export type NoiseLabel = 'Quiet' | 'Moderate' | 'Loud'

// Thresholds: calibrate in a quiet room vs busy hallway
// Lower RMS = quieter. Adjust based on your mic sensitivity.
const QUIET_THRESHOLD = 0.015
const MODERATE_THRESHOLD = 0.06

export function getNoiseLabel(rms: number): NoiseLabel {
  if (rms < QUIET_THRESHOLD) return 'Quiet'
  if (rms < MODERATE_THRESHOLD) return 'Moderate'
  return 'Loud'
}

/**
 * Compute RMS from Float32Array audio samples.
 */
function computeRMS(samples: Float32Array): number {
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i]
  }
  return Math.sqrt(sum / samples.length)
}

export interface NoiseSnapshot {
  rms: number
  label: NoiseLabel
  timestamp: number
}

/**
 * Sample audio for durationMs (default 3–5 seconds), average RMS.
 */
export async function measureNoise(durationMs: number = 4000): Promise<NoiseSnapshot> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const audioContext = new AudioContext()
  const source = audioContext.createMediaStreamSource(stream)
  const processor = audioContext.createScriptProcessor(4096, 1, 1)

  const rmsValues: number[] = []

  processor.onaudioprocess = (e) => {
    const input = e.inputBuffer.getChannelData(0)
    rmsValues.push(computeRMS(input))
  }

  source.connect(processor)
  processor.connect(audioContext.destination)

  await new Promise((resolve) => setTimeout(resolve, durationMs))

  processor.disconnect()
  source.disconnect()
  stream.getTracks().forEach((t) => t.stop())
  await audioContext.close()

  // Average over the last 70% of samples (ignore startup)
  const start = Math.floor(rmsValues.length * 0.3)
  const subset = rmsValues.slice(start)
  const avgRms = subset.reduce((a, b) => a + b, 0) / subset.length

  return {
    rms: avgRms,
    label: getNoiseLabel(avgRms),
    timestamp: Date.now(),
  }
}
