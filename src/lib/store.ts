import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Mode, Target } from "@/lib/cleanup";

export type Segment = { text: string; start: number; end: number };

export type Transcript = {
  id: string;
  raw: string;
  refined: string;
  language: string;
  source: "dictation" | "upload";
  at: string;
  duration: number;
  segments: Segment[];
  note: string;
};

const TRANSCRIPT_CAP = 200;

export type HistoryItem = {
  id: string;
  raw: string;
  polished: string;
  mode: Mode;
  target: Target;
  engine: "cloud" | "local";
  at: string;
};

export type Docs = {
  message: string;
  emailTo: string;
  emailSubject: string;
  emailBody: string;
  notes: string;
  code: string;
};

type MarloweState = {
  target: Target;
  mode: Mode;
  language: string;
  dictionary: string[];
  history: HistoryItem[];
  transcripts: Transcript[];
  docs: Docs;
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
  setTarget: (target: Target) => void;
  setMode: (mode: Mode) => void;
  setLanguage: (language: string) => void;
  addTerm: (term: string) => void;
  removeTerm: (term: string) => void;
  setDoc: (key: keyof Docs, value: string) => void;
  pushHistory: (item: HistoryItem) => void;
  clearHistory: () => void;
  pushTranscript: (item: Transcript) => void;
  removeTranscript: (id: string) => void;
  clearTranscripts: () => void;
};

const EMPTY_DOCS: Docs = {
  message: "",
  emailTo: "jordan@northwind.co",
  emailSubject: "Page four of the contract",
  emailBody: "",
  notes: "Monday — launch\n",
  code: "function welcome(user) {\n  // \n  return user.email.trim();\n}\n",
};

export const useMarlowe = create<MarloweState>()(
  persist(
    (set) => ({
      target: "message",
      mode: "message",
      language: "en",
      dictionary: [],
      history: [],
      transcripts: [],
      docs: EMPTY_DOCS,
      hydrated: false,
      setHydrated: (value) => set({ hydrated: value }),
      setTarget: (target) => set({ target }),
      setMode: (mode) => set({ mode }),
      setLanguage: (language) => set({ language }),
      addTerm: (term) =>
        set((state) => {
          const clean = term.trim().replace(/\s+/g, " ");
          if (!clean || clean.length > 40) return state;
          if (state.dictionary.some((item) => item.toLowerCase() === clean.toLowerCase())) return state;
          return { dictionary: [...state.dictionary, clean].slice(0, 16) };
        }),
      removeTerm: (term) =>
        set((state) => ({ dictionary: state.dictionary.filter((item) => item !== term) })),
      setDoc: (key, value) => set((state) => ({ docs: { ...state.docs, [key]: value } })),
      pushHistory: (item) =>
        set((state) => ({ history: [item, ...state.history].slice(0, 12) })),
      clearHistory: () => set({ history: [] }),
      pushTranscript: (item) =>
        set((state) => ({ transcripts: [item, ...state.transcripts].slice(0, TRANSCRIPT_CAP) })),
      removeTranscript: (id) =>
        set((state) => ({ transcripts: state.transcripts.filter((item) => item.id !== id) })),
      clearTranscripts: () => set({ transcripts: [] }),
    }),
    {
      name: "marlowe",
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        target: state.target,
        mode: state.mode,
        language: state.language,
        dictionary: state.dictionary,
        history: state.history,
        transcripts: state.transcripts,
        docs: state.docs,
      }),
    },
  ),
);
