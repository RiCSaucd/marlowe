import { useRef, useState } from "react";
import { Copy, Mic, Trash2, Upload } from "lucide-react";
import { lightClean } from "@/lib/cleanup";
import { dictate, polishSpeech, speakText } from "@/lib/dictate.functions";
import { useMarlowe, type Transcript } from "@/lib/store";
import { blobToBase64, useRecorder } from "@/lib/use-recorder";

const CLOUD_CAP = 6;
const TTS_CAP = 3;
const SAMPLE =
  "um hey so I was thinking we should push the launch to Thursday if that's okay uh I can send the notes tonight you know after dinner";

function cloudUses(): number {
  if (typeof sessionStorage === "undefined") return 0;
  return Number(sessionStorage.getItem("marlowe-cloud") || "0");
}

function bumpCloud() {
  sessionStorage.setItem("marlowe-cloud", String(cloudUses() + 1));
}

function ttsUses(): number {
  if (typeof sessionStorage === "undefined") return 0;
  return Number(sessionStorage.getItem("marlowe-tts") || "0");
}

function bumpTts() {
  sessionStorage.setItem("marlowe-tts", String(ttsUses() + 1));
}

function clock(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safe / 60);
  const rest = safe - minutes * 60;
  return `${minutes}:${rest.toFixed(1).padStart(4, "0")}`;
}

async function bytesToBase64(file: Blob): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const size = 0x8000;
  for (let i = 0; i < bytes.length; i += size) {
    binary += String.fromCharCode(...bytes.subarray(i, i + size));
  }
  return btoa(binary);
}

function exportText(item: Transcript) {
  const lines = [
    `Marlowe transcript`,
    `Date: ${item.at}`,
    `Language: ${item.language || "unknown"}`,
    `Source: ${item.source}`,
    "",
    "Raw",
    item.raw,
    "",
    "Refined",
    item.refined,
  ];
  if (item.segments.length > 0) {
    lines.push("", "Timings");
    for (const segment of item.segments) {
      lines.push(`${clock(segment.start)}–${clock(segment.end)}  ${segment.text}`);
    }
  }
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const day = item.at.slice(0, 10) || "transcript";
  link.href = url;
  link.download = `marlowe-transcript-${day}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

export function Transcriptions() {
  const transcripts = useMarlowe((s) => s.transcripts);
  const language = useMarlowe((s) => s.language);
  const dictionary = useMarlowe((s) => s.dictionary);
  const pushTranscript = useMarlowe((s) => s.pushTranscript);
  const removeTranscript = useMarlowe((s) => s.removeTranscript);
  const clearTranscripts = useMarlowe((s) => s.clearTranscripts);
  const setTarget = useMarlowe((s) => s.setTarget);
  const setMode = useMarlowe((s) => s.setMode);
  const setDoc = useMarlowe((s) => s.setDoc);

  const recorder = useRecorder();
  const fileRef = useRef<HTMLInputElement>(null);
  const holding = useRef(false);
  const downAt = useRef(0);
  const busy = useRef(false);
  const [lockUi, setLockUi] = useState(false);
  const locked = useRef(false);
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const list = transcripts ?? [];
  const visible = list.filter((item) => {
    const hay = `${item.raw} ${item.refined}`.toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });

  function save(item: Omit<Transcript, "id" | "at">) {
    const next: Transcript = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: new Date().toISOString(),
    };
    pushTranscript(next);
    setOpenId(next.id);
    setStatus(item.note || "Saved to history.");
  }

  async function fromAudio(blob: Blob, source: "dictation" | "upload") {
    if (cloudUses() >= CLOUD_CAP) {
      setStatus("Preview limit for this session. Try the sample line, which can stay on device.");
      return;
    }
    const audioBase64 = source === "dictation" ? await blobToBase64(blob) : await bytesToBase64(blob);
    const response = await dictate({
      data: {
        audioBase64,
        mimeType: blob.type || "audio/webm",
        mode: "clean",
        keyterms: useMarlowe.getState().dictionary,
        language: useMarlowe.getState().language,
      },
    });
    if (!response.ok) {
      setStatus(response.error);
      return;
    }
    bumpCloud();
    save({
      raw: response.raw,
      refined: response.polished,
      language: response.language,
      source,
      duration: response.duration,
      segments: response.segments,
      note: response.note,
    });
  }

  async function finish() {
    if (busy.current) return;
    busy.current = true;
    holding.current = false;
    locked.current = false;
    setLockUi(false);
    setWorking(true);
    setStatus("Transcribing…");
    try {
      const take = await recorder.end();
      if (take.blob) {
        await fromAudio(take.blob, "dictation");
        return;
      }
      if (take.speech) {
        const state = useMarlowe.getState();
        if (cloudUses() >= CLOUD_CAP) {
          save({
            raw: take.speech,
            refined: lightClean(take.speech, "clean"),
            language: state.language,
            source: "dictation",
            duration: 0,
            segments: [],
            note: "Preview limit — cleaned up on this device.",
          });
          return;
        }
        const response = await polishSpeech({
          data: { text: take.speech, mode: "clean", keyterms: state.dictionary },
        });
        if (response.ok && response.engine === "cloud") bumpCloud();
        save({
          raw: take.speech,
          refined: response.ok ? response.polished : lightClean(take.speech, "clean"),
          language: state.language,
          source: "dictation",
          duration: 0,
          segments: [],
          note: response.ok ? response.note : response.error,
        });
        return;
      }
      setStatus("Didn't catch any speech.");
    } finally {
      busy.current = false;
      setWorking(false);
    }
  }

  recorder.autoStopRef.current = () => {
    void finish();
  };

  async function onFile(file: File | undefined) {
    if (!file || working) return;
    if (file.size > 500_000) {
      setStatus("Keep an upload under about 20 seconds.");
      return;
    }
    setWorking(true);
    setStatus("Transcribing the file…");
    try {
      await fromAudio(file, "upload");
    } finally {
      setWorking(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function saveSample() {
    if (working) return;
    setWorking(true);
    setStatus("Writing the sample…");
    try {
      const state = useMarlowe.getState();
      if (cloudUses() >= CLOUD_CAP) {
        save({
          raw: SAMPLE,
          refined: lightClean(SAMPLE, "clean"),
          language: state.language,
          source: "dictation",
          duration: 0,
          segments: [],
          note: "Preview limit — cleaned up on this device.",
        });
        return;
      }
      const response = await polishSpeech({
        data: { text: SAMPLE, mode: "clean", keyterms: state.dictionary },
      });
      if (response.ok && response.engine === "cloud") bumpCloud();
      save({
        raw: SAMPLE,
        refined: response.ok ? response.polished : lightClean(SAMPLE, "clean"),
        language: state.language,
        source: "dictation",
        duration: 0,
        segments: [],
        note: response.ok ? response.note : "On-device cleanup",
      });
    } finally {
      setWorking(false);
    }
  }

  function sendToKeyboard(item: Transcript) {
    setTarget("message");
    setMode("message");
    setDoc("message", item.refined || item.raw);
    document.getElementById("keyboard")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function readAloud(item: Transcript) {
    const text = (item.refined || item.raw).slice(0, 500);
    if (!text) return;
    if (ttsUses() >= TTS_CAP) {
      setStatus("Preview limit for read-aloud in this session.");
      return;
    }
    setSpeakingId(item.id);
    try {
      const response = await speakText({ data: { text } });
      if (!response.ok) {
        setStatus(response.error);
        return;
      }
      bumpTts();
      const binary = atob(response.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([bytes], { type: response.mime }));
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch {
      setStatus("Couldn't play that line.");
    } finally {
      setSpeakingId(null);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("Copied.");
    } catch {
      setStatus("Copy was blocked by the browser.");
    }
  }

  const recording = recorder.phase === "recording";

  return (
    <section id="transcriptions" className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-sm font-medium text-brass">From VoiceStudio</p>
        <h2 className="mt-2 font-display text-3xl font-medium sm:text-4xl">Transcriptions</h2>
        <p className="mt-3 max-w-2xl text-muted">
          The Electron workspace from VoiceStudio: dictate or upload, keep the raw transcript and the refined line
          apart, and store the newest 200. Timings show up when the engine returns them. VoiceStudio is AGPL-3.0 — this
          is Marlowe’s own screen of that workflow, not a copy of their app.
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="sheet rounded-card border border-line bg-foam p-4 sm:p-5">
            <h3 className="font-display text-2xl">Transcribe</h3>
            <p className="mt-2 text-sm text-muted">
              {list.length === 0
                ? "Nothing saved yet. Start dictation or upload audio."
                : "Raw text stays in history. Refined text is the writing pass."}
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                disabled={working}
                aria-pressed={recording}
                onPointerDown={(event) => {
                  if (working) return;
                  if (locked.current) {
                    void finish();
                    return;
                  }
                  event.currentTarget.setPointerCapture(event.pointerId);
                  holding.current = true;
                  downAt.current = performance.now();
                  void recorder.begin(language);
                }}
                onPointerUp={() => {
                  if (!holding.current) return;
                  holding.current = false;
                  if (performance.now() - downAt.current < 320) {
                    locked.current = true;
                    setLockUi(true);
                    return;
                  }
                  void finish();
                }}
                className={
                  recording
                    ? "marlowe-pulse inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brass-deep px-5 text-sm font-medium text-foam"
                    : "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brass px-5 text-sm font-medium text-foam"
                }
              >
                <Mic className="size-4" aria-hidden="true" />
                {working ? "Transcribing" : lockUi ? "Tap to finish" : recording ? "Release to save" : "Start dictation"}
              </button>
              <button
                type="button"
                disabled={working}
                onClick={() => fileRef.current?.click()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-line px-5 text-sm font-medium"
              >
                <Upload className="size-4" aria-hidden="true" />
                Upload audio
              </button>
              <button
                type="button"
                disabled={working}
                onClick={() => void saveSample()}
                className="inline-flex h-12 items-center justify-center rounded-full border border-line px-5 text-sm font-medium"
              >
                Save a sample transcript
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="audio/*,video/webm"
                className="sr-only"
                onChange={(event) => void onFile(event.target.files?.[0])}
              />
            </div>
            {recorder.error ? <p className="mt-3 text-sm text-brass-deep">{recorder.error}</p> : null}
            {recording ? (
              <p className="mt-3 text-sm text-muted tabular-nums">
                {recorder.interim || `Listening · ${recorder.seconds.toFixed(1)}s`}
              </p>
            ) : null}
            {status ? <p className="mt-3 text-sm text-muted">{status}</p> : null}
            <p className="mt-4 text-sm text-muted">
              Dictionary words in the keyboard ({dictionary.length === 0 ? "none yet" : dictionary.join(", ")}) are sent
              with each take.
            </p>
          </div>

          <div className="rounded-card border border-line bg-paper p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-2xl">History</h3>
              <span className="text-sm text-muted tabular-nums">{list.length} / 200</span>
            </div>
            {list.length === 0 ? (
              <p className="mt-3 text-sm text-muted">History stays empty until the first transcript.</p>
            ) : (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    aria-label="Search transcripts"
                    placeholder="Search"
                    className="h-11 min-w-0 flex-1 rounded-lg border border-line bg-foam px-3 text-sm"
                  />
                  {confirmClear ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          clearTranscripts();
                          setConfirmClear(false);
                          setStatus("History cleared.");
                        }}
                        className="h-11 rounded-full bg-ink px-4 text-sm text-foam"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmClear(false)}
                        className="h-11 rounded-full border border-line px-4 text-sm"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmClear(true)}
                      className="h-11 rounded-full border border-line px-4 text-sm"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <ul className="mt-4 grid max-h-96 gap-3 overflow-y-auto">
                  {visible.length === 0 ? <li className="text-sm text-muted">No matches.</li> : null}
                  {visible.map((item) => (
                    <li key={item.id} className="rounded-xl border border-line bg-foam p-3">
                      <p className="text-sm text-muted">
                        {item.source === "upload" ? "Upload" : "Dictation"} · {item.language || "—"} ·{" "}
                        {item.at.slice(0, 16).replace("T", " ")}
                      </p>
                      <p className="mt-2 text-sm">{item.raw}</p>
                      <button
                        type="button"
                        onClick={() => setOpenId(openId === item.id ? null : item.id)}
                        className="mt-2 text-sm font-medium text-brass"
                      >
                        {openId === item.id ? "Hide refined" : "Refined"}
                      </button>
                      {openId === item.id ? (
                        <div className="mt-2">
                          <p>{item.refined}</p>
                          {item.segments.length > 0 ? (
                            <ul className="mt-2 grid gap-1">
                              {item.segments.slice(0, 12).map((segment, index) => (
                                <li key={`${item.id}-${index}`} className="text-sm text-muted tabular-nums">
                                  {clock(segment.start)}–{clock(segment.end)} {segment.text}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void copy(item.raw)}
                          className="inline-flex h-10 items-center gap-1 rounded-full border border-line px-3 text-sm"
                        >
                          <Copy className="size-3.5" aria-hidden="true" />
                          Copy raw
                        </button>
                        <button
                          type="button"
                          onClick={() => void copy(item.refined)}
                          className="h-10 rounded-full border border-line px-3 text-sm"
                        >
                          Copy refined
                        </button>
                        <button
                          type="button"
                          onClick={() => exportText(item)}
                          className="h-10 rounded-full border border-line px-3 text-sm"
                        >
                          Export
                        </button>
                        <button
                          type="button"
                          onClick={() => void readAloud(item)}
                          disabled={speakingId === item.id}
                          className="h-10 rounded-full border border-line px-3 text-sm"
                        >
                          {speakingId === item.id ? "Speaking" : "Read aloud"}
                        </button>
                        <button
                          type="button"
                          onClick={() => sendToKeyboard(item)}
                          className="h-10 rounded-full border border-line px-3 text-sm"
                        >
                          Send to keyboard
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTranscript(item.id)}
                          className="inline-flex h-10 items-center gap-1 rounded-full border border-line px-3 text-sm"
                        >
                          <Trash2 className="size-3.5" aria-hidden="true" />
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
