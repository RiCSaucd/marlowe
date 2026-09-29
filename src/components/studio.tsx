import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Copy, Mic, Plus, RotateCcw, X } from "lucide-react";
import { Waveform } from "@/components/waveform";
import {
  MODE_LABEL,
  MODES,
  SAMPLES,
  SUGGESTED_TERMS,
  TARGET_MODE,
  countWords,
  lightClean,
  spliceAtCaret,
  type Mode,
  type Target,
} from "@/lib/cleanup";
import { dictate, polishSpeech } from "@/lib/dictate.functions";
import { useMarlowe, type Docs } from "@/lib/store";
import { blobToBase64, useRecorder } from "@/lib/use-recorder";

const CLOUD_CAP = 6;
const FIELD: Record<Target, keyof Docs> = {
  message: "message",
  email: "emailBody",
  notes: "notes",
  code: "code",
};

const LANGUAGES: { id: string; label: string }[] = [
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "fr", label: "French" },
  { id: "de", label: "German" },
  { id: "pt", label: "Portuguese" },
  { id: "ja", label: "Japanese" },
  { id: "zh", label: "Chinese" },
];

type Result = {
  raw: string;
  polished: string;
  engine: "cloud" | "local";
  note: string;
};

function cloudUses(): number {
  if (typeof sessionStorage === "undefined") return 0;
  return Number(sessionStorage.getItem("marlowe-cloud") || "0");
}

function bumpCloud() {
  sessionStorage.setItem("marlowe-cloud", String(cloudUses() + 1));
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
}

export function Studio() {
  const target = useMarlowe((s) => s.target);
  const mode = useMarlowe((s) => s.mode);
  const language = useMarlowe((s) => s.language);
  const dictionary = useMarlowe((s) => s.dictionary);
  const docs = useMarlowe((s) => s.docs);
  const history = useMarlowe((s) => s.history);
  const setTarget = useMarlowe((s) => s.setTarget);
  const setMode = useMarlowe((s) => s.setMode);
  const setLanguage = useMarlowe((s) => s.setLanguage);
  const addTerm = useMarlowe((s) => s.addTerm);
  const removeTerm = useMarlowe((s) => s.removeTerm);
  const setDoc = useMarlowe((s) => s.setDoc);
  const pushHistory = useMarlowe((s) => s.pushHistory);
  const setHydrated = useMarlowe((s) => s.setHydrated);

  const recorder = useRecorder();
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const termRef = useRef<HTMLInputElement>(null);
  const holding = useRef(false);
  const keyHold = useRef(false);
  const locked = useRef(false);
  const busy = useRef(false);
  const downAt = useRef(0);
  const finishRef = useRef<() => Promise<void>>(async () => {});
  const armRef = useRef<(fromKey: boolean) => Promise<void>>(async () => {});
  const cancelRef = useRef<() => Promise<void>>(async () => {});
  const [lockUi, setLockUi] = useState(false);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [undo, setUndo] = useState<{ key: keyof Docs; value: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void useMarlowe.persist.rehydrate();
    setHydrated(true);
  }, [setHydrated]);

  function chooseTarget(next: Target) {
    setTarget(next);
    setMode(TARGET_MODE[next]);
  }

  function remember(raw: string, polished: string, engine: "cloud" | "local", note: string) {
    const state = useMarlowe.getState();
    const targetNow = state.target;
    const modeNow = state.mode;
    pushHistory({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      raw,
      polished,
      mode: modeNow,
      target: targetNow,
      engine,
      at: new Date().toISOString(),
    });
    setResult({ raw, polished, engine, note });
    if (!polished.trim()) return;
    const key = FIELD[targetNow];
    const current = state.docs[key];
    const el = areaRef.current;
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    const { next, caret } = spliceAtCaret(current, start, end, polished, targetNow);
    setUndo({ key, value: current });
    setDoc(key, next);
    requestAnimationFrame(() => {
      const node = areaRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(caret, caret);
    });
  }

  async function polishKnown(raw: string) {
    const state = useMarlowe.getState();
    if (cloudUses() >= CLOUD_CAP) {
      remember(
        raw,
        lightClean(raw, state.mode),
        "local",
        "Preview limit for this session — cleaned up on this device.",
      );
      return;
    }
    const response = await polishSpeech({
      data: { text: raw, mode: state.mode, keyterms: state.dictionary },
    });
    if (!response.ok) {
      remember(raw, lightClean(raw, state.mode), "local", response.error);
      return;
    }
    if (response.engine === "cloud") bumpCloud();
    remember(response.raw, response.polished, response.engine, response.note);
  }

  async function finish() {
    if (busy.current) return;
    busy.current = true;
    holding.current = false;
    keyHold.current = false;
    locked.current = false;
    setLockUi(false);
    setWorking(true);
    try {
      const take = await recorder.end();
      const state = useMarlowe.getState();
      if (!take.blob && !take.speech) {
        recorder.setError("Didn't catch any speech. Hold a little longer, or try a sample line.");
        return;
      }
      if (take.blob && cloudUses() < CLOUD_CAP) {
        const audioBase64 = await blobToBase64(take.blob);
        const response = await dictate({
          data: {
            audioBase64,
            mimeType: take.blob.type || recorder.mime(),
            mode: state.mode,
            keyterms: state.dictionary,
            language: state.language,
          },
        });
        if (response.ok) {
          bumpCloud();
          remember(response.raw, response.polished, response.engine, response.note);
          return;
        }
        if (take.speech) {
          remember(take.speech, lightClean(take.speech, state.mode), "local", response.error);
          return;
        }
        recorder.setError(response.error);
        return;
      }
      if (take.speech && cloudUses() < CLOUD_CAP) {
        await polishKnown(take.speech);
        return;
      }
      if (take.speech) {
        remember(
          take.speech,
          lightClean(take.speech, state.mode),
          "local",
          "Preview limit for this session — cleaned up on this device.",
        );
        return;
      }
      recorder.setError("Preview limit reached, and the browser didn't return a transcript. Try a sample line.");
    } finally {
      busy.current = false;
      setWorking(false);
    }
  }

  async function arm(fromKey: boolean) {
    if (busy.current || working || recorder.isLive()) return;
    downAt.current = performance.now();
    if (fromKey) keyHold.current = true;
    else holding.current = true;
    const ok = await recorder.begin(useMarlowe.getState().language);
    if (!ok) {
      holding.current = false;
      keyHold.current = false;
      locked.current = false;
      setLockUi(false);
    }
  }

  finishRef.current = finish;
  armRef.current = arm;
  cancelRef.current = () => recorder.cancel();
  recorder.autoStopRef.current = () => {
    void finishRef.current();
  };

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const chord = event.code === "Space" && (event.ctrlKey || event.metaKey);
      const bare =
        event.code === "Space" && !event.ctrlKey && !event.metaKey && !event.altKey && !isTypingTarget(event.target);
      if (!chord && !bare) return;
      event.preventDefault();
      if (event.repeat) return;
      void armRef.current(true);
    };
    const up = (event: KeyboardEvent) => {
      if (event.code !== "Space" || !keyHold.current) return;
      const elapsed = performance.now() - downAt.current;
      keyHold.current = false;
      if (elapsed < 350) {
        void cancelRef.current();
        return;
      }
      void finishRef.current();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (working) return;
    if (locked.current) {
      void finishRef.current();
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    void arm(false);
  }

  function onPointerUp() {
    if (!holding.current) return;
    const elapsed = performance.now() - downAt.current;
    holding.current = false;
    if (elapsed < 320) {
      locked.current = true;
      setLockUi(true);
      return;
    }
    void finishRef.current();
  }

  const recording = recorder.phase === "recording";
  const field = FIELD[target];
  const words = countWords(docs[field]);

  async function copyPolished() {
    if (!result?.polished) return;
    try {
      await navigator.clipboard.writeText(result.polished);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  function undoPaste() {
    if (!undo) return;
    setDoc(undo.key, undo.value);
    setUndo(null);
  }

  return (
    <section id="keyboard" className="sheet rounded-card border border-line bg-foam">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Where the words land">
          {(
            [
              ["message", "Message"],
              ["email", "Mail"],
              ["notes", "Notes"],
              ["code", "Code"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={target === id}
              onClick={() => chooseTarget(id)}
              className={
                target === id
                  ? "h-11 rounded-full bg-ink px-4 text-sm font-medium text-foam"
                  : "h-11 rounded-full px-4 text-sm font-medium text-muted"
              }
            >
              {label}
            </button>
          ))}
        </div>
        <p className="hidden text-sm text-muted tabular-nums sm:block">{words} words</p>
      </div>

      <div className="px-4 py-4 sm:px-5">
        {target === "message" ? (
          <div className="mb-3 rounded-xl bg-paper px-3 py-3">
            <p className="text-sm font-medium">Priya</p>
            <p className="text-sm text-muted">Can you push the launch note before tomorrow?</p>
          </div>
        ) : null}

        {target === "email" ? (
          <div className="mb-3 grid gap-2">
            <label className="grid gap-1 text-sm text-muted">
              To
              <input
                value={docs.emailTo}
                onChange={(event) => setDoc("emailTo", event.target.value)}
                className="h-11 rounded-lg border border-line bg-paper px-3 text-base text-ink"
              />
            </label>
            <label className="grid gap-1 text-sm text-muted">
              Subject
              <input
                value={docs.emailSubject}
                onChange={(event) => setDoc("emailSubject", event.target.value)}
                className="h-11 rounded-lg border border-line bg-paper px-3 text-base text-ink"
              />
            </label>
          </div>
        ) : null}

        {target === "notes" ? <p className="mb-2 font-display text-2xl">Monday</p> : null}
        {target === "code" ? <p className="mb-2 text-sm text-muted">welcome.ts</p> : null}

        <label className="sr-only" htmlFor="marlowe-doc">
          Document
        </label>
        <textarea
          id="marlowe-doc"
          ref={areaRef}
          value={docs[field]}
          onChange={(event) => setDoc(field, event.target.value)}
          placeholder={
            target === "code"
              ? "Click where the comment should land, then hold to talk."
              : "Click where the words should land, then hold to talk."
          }
          className="h-36 w-full resize-none rounded-xl bg-paper px-3 py-3 text-base text-ink outline-none"
        />
      </div>

      {result ? (
        <div className="mx-4 mb-3 rounded-xl border border-line px-3 py-3 sm:mx-5" aria-live="polite">
          <p className="text-sm text-muted">Heard</p>
          <p className="text-sm">{result.raw}</p>
          <p className="mt-2 text-sm text-muted">Wrote</p>
          <p className="text-base">{result.polished}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void copyPolished()}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium"
            >
              <Copy className="size-4" aria-hidden="true" />
              {copied ? "Copied" : "Copy"}
            </button>
            {undo ? (
              <button
                type="button"
                onClick={undoPaste}
                className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-medium"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Undo paste
              </button>
            ) : null}
            <span className="text-sm text-muted">
              {result.engine === "cloud" ? "Cloud writing pass" : "On-device cleanup"}
              {result.note ? ` · ${result.note}` : ""}
            </span>
          </div>
        </div>
      ) : null}

      <div className="border-t border-line px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            disabled={working}
            aria-pressed={recording}
            className={
              recording
                ? "marlowe-pulse inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-full bg-brass-deep px-5 text-base font-medium text-foam sm:min-w-44"
                : "inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-full bg-brass px-5 text-base font-medium text-foam sm:min-w-44"
            }
          >
            <Mic className="size-5" aria-hidden="true" />
            {working ? "Writing" : lockUi ? "Tap to finish" : recording ? "Release to write" : "Hold to talk"}
          </button>
          <div className="min-w-0 flex-1">
            <Waveform analyser={recorder.analyser} active={recording} />
            <p className="text-sm text-muted tabular-nums">
              {working
                ? "Transcribing, then the writing pass…"
                : recording
                  ? recorder.interim || `Listening · ${recorder.seconds.toFixed(1)}s`
                  : "Hold the button, or Ctrl + Space. A short tap locks until you tap again."}
            </p>
          </div>
          <label className="grid gap-1 text-sm text-muted">
            Language
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="h-11 rounded-lg border border-line bg-paper px-3 text-base text-ink"
            >
              {LANGUAGES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {recorder.error ? <p className="mt-3 text-sm text-brass-deep">{recorder.error}</p> : null}

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="How it writes">
          {MODES.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={mode === item}
              onClick={() => setMode(item)}
              className={
                mode === item
                  ? "h-11 rounded-full bg-ink px-4 text-sm font-medium text-foam"
                  : "h-11 rounded-full border border-line px-4 text-sm font-medium"
              }
            >
              {MODE_LABEL[item]}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <p className="text-sm text-muted">Names it should spell</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {dictionary.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => removeTerm(term)}
                className="inline-flex h-10 items-center gap-1 rounded-full border border-line bg-paper px-3 text-sm"
              >
                {term}
                <X className="size-3.5" aria-hidden="true" />
                <span className="sr-only">Remove {term}</span>
              </button>
            ))}
            {SUGGESTED_TERMS.filter((term) => !dictionary.some((item) => item.toLowerCase() === term.toLowerCase())).map(
              (term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => addTerm(term)}
                  className="h-10 rounded-full border border-dashed border-line px-3 text-sm text-muted"
                >
                  Add {term}
                </button>
              ),
            )}
            <form
              className="flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const value = termRef.current?.value ?? "";
                addTerm(value);
                if (termRef.current) termRef.current.value = "";
              }}
            >
              <input
                ref={termRef}
                aria-label="Add a dictionary word"
                placeholder="Add a word"
                className="h-10 w-36 rounded-full border border-line bg-paper px-3 text-sm"
              />
              <button
                type="submit"
                className="inline-flex size-11 items-center justify-center rounded-full border border-line"
                aria-label="Add word"
              >
                <Plus className="size-4" aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {SAMPLES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              disabled={working}
              onClick={() => {
                chooseTarget(sample.target);
                setWorking(true);
                void polishKnown(sample.text).finally(() => setWorking(false));
              }}
              className="h-11 rounded-full border border-line px-4 text-sm font-medium"
            >
              {sample.label}
            </button>
          ))}
        </div>

        <p className="mt-4 text-sm text-muted">
          This preview transcribes with a cloud speech model, then runs the Marlowe writing pass. The Mac and Windows
          apps can run the same pass on Whisper, on the machine.
        </p>
      </div>

      {history.length > 0 ? (
        <div className="border-t border-line px-4 py-4 sm:px-5">
          <p className="text-sm font-medium">Recent</p>
          <ul className="mt-2 grid gap-2">
            {history.slice(0, 3).map((item) => (
              <li key={item.id} className="text-sm text-muted">
                <span className="text-ink">{item.polished}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
