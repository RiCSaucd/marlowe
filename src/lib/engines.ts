/** Writing model for the cloud polish pass. */
export const WRITING_MODEL = "grok-4.7";

/** Speech model this browser preview actually calls. */
export const SPEECH_MODEL = "grok-voice-transcribe-2.0";

export const DEFAULT_ENGINE = "parakeet-tdt-0.6b-v3";

/**
 * Desktop speech engines. The browser preview does not download or run these
 * weights. Parakeet is the hold-to-talk default. The others win a narrower job.
 */
export const DESKTOP_ENGINES = [
  {
    id: "parakeet-tdt-0.6b-v3",
    name: "Parakeet TDT 0.6B v3",
    runtime: "sherpa-onnx",
    when: "Default for the keyboard. English and 24 other European languages, fast on a CPU.",
  },
  {
    id: "granite-speech-4.1",
    name: "Granite Speech 4.1",
    runtime: "2B",
    when: "Last point of English accuracy. Spends more compute than Parakeet.",
  },
  {
    id: "cohere-transcribe",
    name: "Cohere Transcribe",
    runtime: "Apache-2.0",
    when: "Same accuracy tier as Granite, across 14 languages, if you can spend the compute.",
  },
  {
    id: "whisper-large-v3",
    name: "Whisper large-v3",
    runtime: "whisper.cpp",
    when: "About ninety-nine languages. MIT, and the model every desktop tool can run. Not the accuracy leader.",
  },
  {
    id: "nemotron-3.5-asr",
    name: "Nemotron 3.5 ASR",
    runtime: "streaming",
    when: "Words appear while the person is still talking. Not the lowest error rate.",
  },
  {
    id: "qwen3-asr-1.7b",
    name: "Qwen3-ASR",
    runtime: "1.7B",
    when: "Mandarin and mixed languages, when that matters more than raw speed.",
  },
] as const;

export type EngineId = (typeof DESKTOP_ENGINES)[number]["id"];

export function engineById(id: string) {
  return DESKTOP_ENGINES.find((engine) => engine.id === id) ?? DESKTOP_ENGINES[0];
}
