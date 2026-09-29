import { useEffect, useRef, useState } from "react";

type SpeechResult = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
};

type SpeechRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechResult) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function speechCtor(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const host = window as Window & {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm";
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  return options.find((item) => MediaRecorder.isTypeSupported(item)) ?? "";
}

export type Take = { blob: Blob | null; speech: string };

const MAX_SECONDS = 20;

export function useRecorder() {
  const [phase, setPhase] = useState<"idle" | "recording">("idle");
  const [seconds, setSeconds] = useState(0);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const mimeRef = useRef("audio/webm");
  const speechRef = useRef<SpeechRec | null>(null);
  const heardRef = useRef("");
  const interimRef = useRef("");
  const startedAt = useRef(0);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const autoStopRef = useRef<() => void>(() => {});
  const liveRef = useRef(false);
  const startGate = useRef<Promise<boolean> | null>(null);

  function clearTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function releaseStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    speechRef.current = null;
    recRef.current = null;
    void audioRef.current?.close();
    audioRef.current = null;
    setAnalyser(null);
  }

  async function actuallyBegin(language: string): Promise<boolean> {
    if (liveRef.current) return true;
    setError(null);
    setInterim("");
    heardRef.current = "";
    interimRef.current = "";
    chunks.current = [];

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser can't use the microphone. Try one of the sample lines.");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
      streamRef.current = stream;
      const mime = pickMime();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mimeRef.current = recorder.mimeType || mime || "audio/webm";
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      recRef.current = recorder;
      recorder.start();
      liveRef.current = true;

      const audio = new AudioContext();
      audioRef.current = audio;
      const source = audio.createMediaStreamSource(stream);
      const node = audio.createAnalyser();
      node.fftSize = 1024;
      source.connect(node);
      setAnalyser(node);

      const Ctor = speechCtor();
      if (Ctor) {
        const recognition = new Ctor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language === "zh" ? "zh-CN" : language === "pt" ? "pt-BR" : language;
        recognition.onresult = (event) => {
          let live = "";
          let finals = heardRef.current;
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const piece = event.results[i]?.[0]?.transcript ?? "";
            if (event.results[i]?.isFinal) finals = `${finals} ${piece}`.trim();
            else live += piece;
          }
          heardRef.current = finals;
          interimRef.current = live;
          setInterim(`${finals} ${live}`.trim());
        };
        recognition.onerror = () => {};
        try {
          recognition.start();
          speechRef.current = recognition;
        } catch {
          speechRef.current = null;
        }
      }

      startedAt.current = performance.now();
      setSeconds(0);
      setPhase("recording");
      clearTimer();
      timerRef.current = window.setInterval(() => {
        const elapsed = (performance.now() - startedAt.current) / 1000;
        setSeconds(elapsed);
        if (elapsed >= MAX_SECONDS) {
          clearTimer();
          autoStopRef.current();
        }
      }, 200);
      return true;
    } catch {
      liveRef.current = false;
      releaseStream();
      setPhase("idle");
      setError("Microphone is blocked. Allow it in the browser, or try a sample line.");
      return false;
    }
  }

  function begin(language: string): Promise<boolean> {
    if (liveRef.current) return Promise.resolve(true);
    if (startGate.current) return startGate.current;
    const run = actuallyBegin(language).finally(() => {
      startGate.current = null;
    });
    startGate.current = run;
    return run;
  }

  function stopCollect(): Promise<Blob | null> {
    clearTimer();
    const recorder = recRef.current;
    liveRef.current = false;
    try {
      speechRef.current?.stop();
    } catch {
      /* already stopped */
    }
    if (!recorder || recorder.state === "inactive") {
      releaseStream();
      setPhase("idle");
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: mimeRef.current });
        releaseStream();
        setPhase("idle");
        resolve(blob.size > 700 ? blob : null);
      };
      try {
        recorder.stop();
      } catch {
        releaseStream();
        setPhase("idle");
        resolve(null);
      }
    });
  }

  async function end(): Promise<Take> {
    if (startGate.current) await startGate.current;
    const speech = `${heardRef.current} ${interimRef.current}`.trim();
    if (!recRef.current && !liveRef.current) {
      setPhase("idle");
      setSeconds(0);
      return { blob: null, speech };
    }
    const blob = await stopCollect();
    setSeconds(0);
    return { blob, speech };
  }

  async function cancel() {
    if (startGate.current) await startGate.current;
    await stopCollect();
    setInterim("");
    setSeconds(0);
  }

  useEffect(() => {
    return () => {
      clearTimer();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      void audioRef.current?.close();
    };
  }, []);

  return {
    phase,
    seconds,
    interim,
    error,
    analyser,
    setError,
    begin,
    end,
    cancel,
    autoStopRef,
    isLive: () => liveRef.current,
    mime: () => mimeRef.current,
  };
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const size = 0x8000;
  for (let i = 0; i < bytes.length; i += size) {
    binary += String.fromCharCode(...bytes.subarray(i, i + size));
  }
  return btoa(binary);
}
