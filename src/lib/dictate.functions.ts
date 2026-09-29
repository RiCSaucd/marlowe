import { createServerFn } from "@tanstack/react-start";
import { lightClean, modeGuide, MODES, type Mode } from "@/lib/cleanup";

type Segment = { text: string; start: number; end: number };

type Ok = {
  ok: true;
  raw: string;
  polished: string;
  engine: "cloud" | "local";
  language: string;
  duration: number;
  note: string;
  segments: Segment[];
};

type Err = { ok: false; error: string };

const LANGUAGES = new Set(["en", "es", "fr", "de", "pt", "ja", "zh"]);

function asMode(value: unknown): Mode {
  return typeof value === "string" && (MODES as readonly string[]).includes(value)
    ? (value as Mode)
    : "clean";
}

function asTerms(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().replace(/\s+/g, " "))
    .filter((item) => item.length > 0 && item.length <= 40)
    .slice(0, 12);
}

function asLanguage(value: unknown): string {
  return typeof value === "string" && LANGUAGES.has(value) ? value : "en";
}

function unwrap(text: string): string {
  let next = text.trim();
  if (
    (next.startsWith('"') && next.endsWith('"')) ||
    (next.startsWith("“") && next.endsWith("”"))
  ) {
    next = next.slice(1, -1).trim();
  }
  return next;
}

function contentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && "text" in part) {
        return String((part as { text: unknown }).text ?? "");
      }
      return "";
    })
    .join("");
}

async function rewrite(raw: string, mode: Mode, keyterms: string[], apiKey: string): Promise<string> {
  const dictionary = keyterms.length ? `Preferred spellings: ${keyterms.join(", ")}.` : "";
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(22000),
    body: JSON.stringify({
      model: "grok-4.5",
      temperature: 0.2,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: [
            "You are Marlowe, a dictation editor.",
            "Rewrite speech into finished writing.",
            "Remove filler (um, uh, you know) when it carries no meaning.",
            "Do not add information the speaker did not say.",
            "Do not explain the edit. Output only the finished text.",
            "Keep the original language.",
            modeGuide(mode),
            dictionary,
          ]
            .filter(Boolean)
            .join(" "),
        },
        { role: "user", content: raw.slice(0, 4000) },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Writing pass failed (${response.status})`);
  }
  const body = (await response.json()) as {
    choices?: { message?: { content?: unknown } }[];
  };
  const text = unwrap(contentToString(body.choices?.[0]?.message?.content));
  return text || raw;
}

export const polishSpeech = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Bad request");
    const data = input as Record<string, unknown>;
    const text = typeof data.text === "string" ? data.text.trim() : "";
    if (!text || text.length > 4000) throw new Error("Nothing to polish");
    return { text, mode: asMode(data.mode), keyterms: asTerms(data.keyterms) };
  })
  .handler(async ({ data }): Promise<Ok | Err> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return {
        ok: true,
        raw: data.text,
        polished: lightClean(data.text, data.mode),
        engine: "local",
        language: "",
        duration: 0,
        note: "Cloud writing isn't available here, so this pass stayed on device.",
        segments: [],
      };
    }
    try {
      const polished = await rewrite(data.text, data.mode, data.keyterms, apiKey);
      return {
        ok: true,
        raw: data.text,
        polished,
        engine: "cloud",
        language: "",
        duration: 0,
        note: "",
        segments: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Writing pass failed";
      return {
        ok: true,
        raw: data.text,
        polished: lightClean(data.text, data.mode),
        engine: "local",
        language: "",
        duration: 0,
        note: message,
        segments: [],
      };
    }
  });

function asSegments(words: unknown): Segment[] {
  if (!Array.isArray(words)) return [];
  const segments: Segment[] = [];
  for (const word of words) {
    if (!word || typeof word !== "object") continue;
    const row = word as { text?: unknown; start?: unknown; end?: unknown };
    const text = typeof row.text === "string" ? row.text.trim() : "";
    if (!text) continue;
    const start = typeof row.start === "number" ? row.start : 0;
    const end = typeof row.end === "number" ? row.end : start;
    segments.push({ text, start, end });
    if (segments.length >= 80) break;
  }
  return segments;
}

function extensionFor(mime: string): string {
  if (mime.includes("mp4") || mime.includes("m4a")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  return "webm";
}

export const dictate = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Bad request");
    const data = input as Record<string, unknown>;
    const audioBase64 = typeof data.audioBase64 === "string" ? data.audioBase64 : "";
    const mimeType = typeof data.mimeType === "string" ? data.mimeType.slice(0, 80) : "";
    if (audioBase64.length < 32 || audioBase64.length > 900_000) {
      throw new Error("Keep a take under 20 seconds.");
    }
    if (!/^(audio\/(webm|mp4|mpeg|ogg|wav|x-m4a|m4a)|video\/webm)/.test(mimeType)) {
      throw new Error("That audio format isn't supported.");
    }
    return {
      audioBase64,
      mimeType,
      mode: asMode(data.mode),
      keyterms: asTerms(data.keyterms),
      language: asLanguage(data.language),
    };
  })
  .handler(async ({ data }): Promise<Ok | Err> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "Cloud transcription isn't available in this preview." };
    }

    let bytes: Buffer;
    try {
      bytes = Buffer.from(data.audioBase64, "base64");
    } catch {
      return { ok: false, error: "Could not read that recording." };
    }
    if (bytes.length < 400) return { ok: false, error: "That clip was too short." };
    if (bytes.length > 700_000) return { ok: false, error: "Keep a take under 20 seconds." };

    const form = new FormData();
    form.append("model", "grok-voice-transcribe-2.0");
    form.append("format", "true");
    form.append("language", data.language);
    for (const term of data.keyterms) form.append("keyterm", term);
    const ext = extensionFor(data.mimeType);
    form.append("file", new Blob([new Uint8Array(bytes)], { type: data.mimeType }), `speech.${ext}`);

    try {
      const response = await fetch("https://api.x.ai/v1/stt", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: AbortSignal.timeout(28000),
      });
      if (!response.ok) {
        return { ok: false, error: `Transcription failed (${response.status}).` };
      }
      const body = (await response.json()) as {
        text?: string;
        language?: string;
        duration?: number;
        words?: unknown;
      };
      const raw = (body.text ?? "").trim();
      if (!raw) return { ok: false, error: "No speech in that take." };
      const segments = asSegments(body.words);
      let polished = raw;
      let note = "";
      try {
        polished = await rewrite(raw, data.mode, data.keyterms, apiKey);
      } catch (error) {
        polished = lightClean(raw, data.mode);
        note = error instanceof Error ? error.message : "Writing pass failed";
      }
      return {
        ok: true,
        raw,
        polished,
        engine: "cloud",
        language: body.language ?? data.language,
        duration: typeof body.duration === "number" ? body.duration : 0,
        note,
        segments,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Transcription failed.";
      return { ok: false, error: message };
    }
  });

export const speakText = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Bad request");
    const text = typeof (input as { text?: unknown }).text === "string" ? (input as { text: string }).text.trim() : "";
    if (!text || text.length > 500) throw new Error("Keep the spoken line under 500 characters.");
    return { text };
  })
  .handler(async ({ data }): Promise<{ ok: true; audioBase64: string; mime: string } | Err> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false, error: "Speech isn't available in this preview." };
    try {
      const response = await fetch("https://api.x.ai/v1/tts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({ text: data.text, voice_id: "eve" }),
      });
      if (!response.ok) return { ok: false, error: `Speech failed (${response.status}).` };
      const mime = response.headers.get("content-type") || "audio/mpeg";
      if (!mime.includes("audio") && !mime.includes("mpeg") && !mime.includes("octet-stream")) {
        return { ok: false, error: "Speech didn't return audio." };
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 80 || bytes.length > 1_500_000) return { ok: false, error: "That speech clip was the wrong size." };
      return { ok: true, audioBase64: bytes.toString("base64"), mime };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Speech failed.";
      return { ok: false, error: message };
    }
  });
