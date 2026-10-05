/** Writing model for the cloud polish pass. */
export const WRITING_MODEL = "grok-4.7";

/** Speech model this browser preview actually calls. */
export const SPEECH_MODEL = "grok-voice-transcribe-2.0";

/**
 * Local engines a desktop build can run. The browser preview does not download
 * or execute these weights. Names follow the public model cards, the same set
 * OpenWhispr (MIT) ships behind one picker.
 */
export const DESKTOP_ENGINES = [
  {
    id: "whisper-large-v3",
    name: "Whisper large-v3",
    runtime: "whisper.cpp",
    note: "About ninety-nine languages. The accuracy target when the language is outside the NVIDIA set.",
  },
  {
    id: "parakeet-tdt-0.6b-v3",
    name: "Parakeet TDT 0.6B v3",
    runtime: "sherpa-onnx",
    note: "One-pass English and European speech. Smaller and faster than large-v3 on a plain CPU.",
  },
  {
    id: "nemotron-3.5-asr",
    name: "Nemotron 3.5 ASR",
    runtime: "sherpa-onnx",
    note: "Streaming. Words can appear while you are still talking.",
  },
] as const;
