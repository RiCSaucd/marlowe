export const MODES = ["literal", "clean", "message", "email", "code"] as const;
export type Mode = (typeof MODES)[number];

export const TARGETS = ["message", "email", "notes", "code"] as const;
export type Target = (typeof TARGETS)[number];

export const MODE_LABEL: Record<Mode, string> = {
  literal: "Literal",
  clean: "Clean",
  message: "Message",
  email: "Email",
  code: "Code",
};

export const TARGET_MODE: Record<Target, Mode> = {
  message: "message",
  email: "email",
  notes: "clean",
  code: "code",
};

const FILLER =
  /\b(um+|uh+|erm+|er+|ah+|hmm+|you know|i mean|sort of|kind of)\b[,]?/gi;

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function tidySpaces(text: string): string {
  return text
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function capitalizeSentence(text: string): string {
  return text.replace(/(^|[.!?]\s+)([a-z])/g, (_, lead: string, ch: string) => lead + ch.toUpperCase());
}

export function lightClean(raw: string, mode: Mode): string {
  let text = raw.replace(FILLER, " ");
  text = tidySpaces(text);
  if (!text) return "";
  text = capitalizeSentence(text);
  if (mode === "literal") {
    if (!/[.!?]$/.test(text)) text += ".";
    return text;
  }
  if (mode === "code") {
    const sentence = text.endsWith(".") ? text : `${text}.`;
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
  }
  if (!/[.!?]$/.test(text)) text += ".";
  if (mode === "message") {
    return text;
  }
  if (mode === "email") {
    return text;
  }
  return text;
}

export function modeGuide(mode: Mode): string {
  switch (mode) {
    case "literal":
      return "Light cleanup only: capitalization and punctuation. Keep the speaker's wording, including casual tone.";
    case "clean":
      return "Turn it into clear prose. Same meaning. No new facts, no extra greeting.";
    case "message":
      return "A short chat message. Casual, direct, no subject line, no sign-off unless they said one.";
    case "email":
      return "An email body. Include a greeting or sign-off only if the speaker included one. Do not invent news.";
    case "code":
      return "One concise code comment. Keep identifiers, file names, numbers, and API names exactly as spoken or spelled.";
  }
}

export const SAMPLES: { id: string; label: string; target: Target; text: string }[] = [
  {
    id: "slack",
    label: "Try a Slack line",
    target: "message",
    text: "um hey so I was thinking we should push the launch to Thursday if that's okay uh I can send the notes tonight you know after dinner",
  },
  {
    id: "email",
    label: "Try an email",
    target: "email",
    text: "hi jordan hope you're well just wanted to follow up on the contract um the indemnity clause on page four still looks off can you take another look and send a redline by Friday thanks so much",
  },
  {
    id: "code",
    label: "Try a code comment",
    target: "code",
    text: "add a null check before we call user dot email trim because uh signup sometimes sends an empty string and it throws",
  },
];

export const SUGGESTED_TERMS = ["Priya", "Northwind", "indemnity"];

export function spliceAtCaret(
  value: string,
  start: number,
  end: number,
  text: string,
  target: Target,
): { next: string; caret: number } {
  const before = value.slice(0, start);
  const after = value.slice(end);
  let insert = text.trim();
  if (!insert) return { next: value, caret: start };
  if (before.trim() && !/\s$/.test(before)) {
    insert = `${target === "message" || target === "code" ? " " : "\n\n"}${insert}`;
  }
  if (after.length > 0 && !/^\s/.test(after)) {
    insert = `${insert}${target === "code" ? " " : " "}`;
  }
  const next = before + insert + after;
  return { next, caret: before.length + insert.length };
}
