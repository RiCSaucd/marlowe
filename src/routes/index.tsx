import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, Laptop, Monitor } from "lucide-react";
import { Studio } from "@/components/studio";
import { Transcriptions } from "@/components/transcriptions";

export const Route = createFileRoute("/")({ component: Home });

const STACK = [
  {
    n: "01",
    name: "Whisper",
    repo: "openai/whisper",
    href: "https://github.com/openai/whisper",
    license: "MIT",
    role: "The accuracy target. Large-v3 is the open model the desktop apps are built to run — punctuation, casing, and about ninety-nine languages from the same weights.",
  },
  {
    n: "02",
    name: "whisper.cpp",
    repo: "ggml-org/whisper.cpp",
    href: "https://github.com/ggml-org/whisper.cpp",
    license: "MIT",
    role: "The Apple and Windows CPU runtime. Metal on Apple silicon, AVX on Intel and AMD, a small native binary. This is what a Mac menu-bar build actually calls.",
  },
  {
    n: "03",
    name: "faster-whisper",
    repo: "SYSTRAN/faster-whisper",
    href: "https://github.com/SYSTRAN/faster-whisper",
    license: "MIT",
    role: "The NVIDIA Windows runtime. CTranslate2, int8, often about four times the original PyTorch Whisper at the same transcript. Used when a Windows PC has an NVIDIA GPU.",
  },
  {
    n: "04",
    name: "Handy",
    repo: "cjpais/Handy",
    href: "https://github.com/cjpais/Handy",
    license: "MIT",
    role: "The dictation shell. Push-to-talk, a history of takes, and paste-at-the-cursor — the interaction people already trust from the best open-source desktop dictation app.",
  },
  {
    n: "05",
    name: "VoiceStudio",
    repo: "debpalash/VoiceStudio",
    href: "https://github.com/debpalash/VoiceStudio",
    license: "AGPL-3.0",
    role: "The transcription workspace this page uses: dictate or upload, raw and refined text kept apart, newest-first history of 200, timings, copy, export, and handoff into the keyboard. Their Electron app is the local desktop. Marlowe does not relicense it.",
  },
] as const;

const COMPARE = [
  {
    label: "Price",
    marlowe: "$4 a month, or $3 billed yearly",
    wispr: "About $15 a month after a small free cap",
  },
  {
    label: "How you talk",
    marlowe: "Hold a key, speak, release",
    wispr: "Hold a key, speak, release",
  },
  {
    label: "What lands",
    marlowe: "Finished writing, not a raw transcript",
    wispr: "Finished writing, not a raw transcript",
  },
  {
    label: "Where",
    marlowe: "iPhone, Android, Mac, Windows, and this browser",
    wispr: "Mac, Windows, and iPhone",
  },
  {
    label: "Engine",
    marlowe: "Open Whisper on the desktop apps. Cloud speech in this preview.",
    wispr: "Proprietary cloud",
  },
  {
    label: "Dictionary",
    marlowe: "Your names are biased into the recognizer",
    wispr: "Yes",
  },
  {
    label: "Audio on the machine",
    marlowe: "Yes, in the Mac and Windows apps",
    wispr: "No — audio goes to their cloud",
  },
];

function Home() {
  return (
    <div className="min-h-screen overflow-x-clip bg-paper text-ink">
      <div className="h-1 bg-brass" />
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a href="#top" className="inline-flex items-center gap-2">
            <span className="inline-block size-2.5 rotate-45 bg-brass" aria-hidden="true" />
            <span className="font-display text-xl">Marlowe</span>
          </a>
          <nav className="flex items-center gap-1 text-sm">
            <div className="hidden items-center sm:flex">
              <a href="#keyboard" className="inline-flex h-11 items-center px-3">
                Keyboard
              </a>
              <a href="#transcriptions" className="inline-flex h-11 items-center px-3">
                Transcripts
              </a>
              <a href="#compare" className="inline-flex h-11 items-center px-3">
                Wispr Flow
              </a>
              <a href="#stack" className="inline-flex h-11 items-center px-3">
                Stack
              </a>
              <a href="#desktops" className="inline-flex h-11 items-center px-3">
                Mac & Windows
              </a>
            </div>
            <a href="#pricing" className="inline-flex h-11 items-center rounded-full bg-ink px-4 font-medium text-foam">
              $4 / month
            </a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="mx-auto grid max-w-6xl items-start gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-12 lg:gap-10">
          <div className="order-2 lg:order-1 lg:col-span-5 lg:pt-4">
            <p className="text-sm font-medium text-brass">Mac, Windows, and the browser</p>
            <h1 className="mt-3 font-display text-4xl leading-tight font-medium sm:text-5xl">
              As fluid as Wispr Flow.{" "}
              <em className="text-brass italic">Four dollars</em> a month.
            </h1>
            <p className="mt-4 text-base text-muted">
              Hold a key, talk the way you actually talk, and Marlowe puts finished text at your cursor. People search
              for this as WhisperFlow. The product is Wispr Flow, and it is excellent. Marlowe is the same motion —
              for a quarter of the price, on an engine you can actually read.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-b-2 border-line bg-foam px-2 text-sm font-medium">
                Ctrl
              </span>
              <span className="text-sm text-muted">+</span>
              <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-b-2 border-line bg-foam px-2 text-sm font-medium">
                Space
              </span>
              <span className="text-sm text-muted">hold, speak, release</span>
            </div>
            <dl className="mt-8 grid grid-cols-3 gap-3 border-t border-line pt-5">
              <div>
                <dt className="text-sm text-muted">Monthly</dt>
                <dd className="font-display text-3xl tabular-nums">$4</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Yearly</dt>
                <dd className="font-display text-3xl tabular-nums">$3</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Free cap</dt>
                <dd className="font-display text-3xl tabular-nums">2k</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-muted">Words a week on the free tier. Yearly is $36, paid once.</p>
          </div>
          <div className="order-1 lg:order-2 lg:col-span-7">
            <Studio />
          </div>
        </section>

        <Transcriptions />

        <section id="compare" className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <h2 className="font-display text-3xl font-medium sm:text-4xl">Built to stand next to Wispr Flow</h2>
            <p className="mt-3 max-w-2xl text-muted">
              Wispr Flow made dictation feel finished. Marlowe copies that behavior on purpose: the pause, the cleanup,
              the paste. It does not copy their invoice. This is a comparison, not an affiliation — Wispr Flow is their
              trademark.
            </p>
            <div className="mt-8 hidden grid-cols-3 gap-4 border-b border-line pb-3 text-sm font-medium md:grid">
              <span />
              <span>Marlowe</span>
              <span>Wispr Flow</span>
            </div>
            <div>
              {COMPARE.map((row) => (
                <div key={row.label} className="grid gap-2 border-b border-line py-4 md:grid-cols-3 md:gap-4">
                  <p className="font-medium">{row.label}</p>
                  <p>
                    <span className="text-muted md:hidden">Marlowe · </span>
                    {row.marlowe}
                  </p>
                  <p className="text-muted">
                    <span className="md:hidden">Wispr Flow · </span>
                    {row.wispr}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-8 grid gap-4 rounded-card border border-line bg-foam p-4 sm:grid-cols-2 sm:p-6">
              <div>
                <p className="text-sm text-muted">Heard</p>
                <p className="mt-2">
                  um hey so I was thinking we should push the launch to Thursday if that's okay uh I can send the notes
                  tonight
                </p>
              </div>
              <div>
                <p className="text-sm text-brass">Wrote</p>
                <p className="mt-2">
                  Hey — I think we should push the launch to Thursday. I can send the notes tonight.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="stack" className="border-t border-line bg-foam">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <h2 className="font-display text-3xl font-medium sm:text-4xl">Five open-source projects, one keyboard</h2>
            <p className="mt-3 max-w-2xl text-muted">
              Marlowe does not pretend to have invented speech recognition. Handy is the push-to-talk shell, Whisper is
              the accuracy target, and VoiceStudio is the transcription workspace — dictate, upload, history, and
              handoff.
            </p>
            <ol className="mt-6 flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center">
              <li className="rounded-full border border-line bg-paper px-3 py-2">You speak</li>
              <li className="hidden text-muted sm:block" aria-hidden="true">
                →
              </li>
              <li className="rounded-full border border-line bg-paper px-3 py-2">
                whisper.cpp or faster-whisper
              </li>
              <li className="hidden text-muted sm:block" aria-hidden="true">
                →
              </li>
              <li className="rounded-full border border-line bg-paper px-3 py-2">Writing pass</li>
              <li className="hidden text-muted sm:block" aria-hidden="true">
                →
              </li>
              <li className="rounded-full bg-ink px-3 py-2 text-foam">Cursor</li>
            </ol>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {STACK.map((item) => (
                <article key={item.repo} className="flex flex-col rounded-card border border-line bg-paper p-5">
                  <p className="text-sm tabular-nums text-brass">{item.n}</p>
                  <h3 className="mt-2 font-display text-2xl font-medium">{item.name}</h3>
                  <p className="mt-2 flex-1 text-sm text-muted">{item.role}</p>
                  <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted">{item.license}</span>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-11 items-center gap-1 font-medium text-brass"
                    >
                      {item.repo}
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
            <p className="mt-6 max-w-3xl text-sm text-muted">
              Whisper, whisper.cpp, faster-whisper, and Handy stay MIT. VoiceStudio is AGPL-3.0: Marlowe links it and
              follows its transcription workflow in original code. It does not ship their Electron binary or relicense
              their source. The writing pass — filler stripped, tone matched, names kept — is the part priced at four
              dollars. In this browser the speech step is cloud, because those local engines are multi-gigabyte
              downloads.
            </p>
          </div>
        </section>

        <section id="desktops" className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <h2 className="font-display text-3xl font-medium sm:text-4xl">Mac, Windows, and the VoiceStudio desktop</h2>
            <p className="mt-3 max-w-2xl text-muted">
              The local app is VoiceStudio’s Electron build. It runs on your machine. This preview cannot install it
              for you — these are their install commands, unchanged.
            </p>
            <div className="mt-6 overflow-x-auto rounded-card border border-line bg-foam p-4 sm:p-5">
              <p className="text-sm font-medium">Mac and Linux</p>
              <pre className="mt-3 overflow-x-auto text-sm leading-6">{`# Latest Electron release
curl -fsSL https://voicestudio.sh/install | sh

# A specific published Electron release (replace X.Y.Z)
curl -fsSL https://voicestudio.sh/install | sh -s -- --version X.Y.Z

# Build current main and install the desktop app
curl -fsSL https://voicestudio.sh/install | sh -s -- --main

# Uninstall the app, keeping your data
curl -fsSL https://voicestudio.sh/install | sh -s -- --uninstall`}</pre>
              <p className="mt-4 text-sm text-muted">
                Windows uses the Electron EXE from{" "}
                <a
                  href="https://github.com/debpalash/VoiceStudio/releases"
                  className="font-medium text-brass"
                  target="_blank"
                  rel="noreferrer"
                >
                  debpalash/VoiceStudio releases
                </a>
                . PowerShell can also run <span className="text-ink">irm https://voicestudio.sh/install | iex</span>.
              </p>
            </div>
            <div className="mt-8 grid gap-4 lg:grid-cols-2">
              <article className="overflow-hidden rounded-card bg-ink text-foam">
                <div className="flex items-center justify-between border-b bezel-line px-4 py-2 text-sm text-foam/70">
                  <span className="inline-flex items-center gap-2">
                    <Laptop className="size-4" aria-hidden="true" />
                    Marlowe
                  </span>
                  <span className="tabular-nums">9:41</span>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="rounded-xl bg-foam p-4 text-ink">
                    <p className="text-sm text-muted">Menu bar · hold Option</p>
                    <p className="mt-2 font-display text-2xl">Release to paste into the frontmost app.</p>
                    <ul className="mt-4 grid gap-2 text-sm">
                      <li>whisper.cpp with Metal on Apple silicon</li>
                      <li>Whisper large-v3 turbo while on battery, large-v3 when plugged in</li>
                      <li>Right Option is the hotkey. It never touches the key you use to type.</li>
                    </ul>
                  </div>
                </div>
              </article>
              <article className="overflow-hidden rounded-card bg-ink text-foam">
                <div className="p-4 sm:p-6">
                  <div className="rounded-xl bg-foam p-4 text-ink">
                    <p className="text-sm text-muted">System tray · hold Ctrl + Win</p>
                    <p className="mt-2 font-display text-2xl">Paste with the same writing pass.</p>
                    <ul className="mt-4 grid gap-2 text-sm">
                      <li>faster-whisper int8 when an NVIDIA GPU is present</li>
                      <li>whisper.cpp when it isn’t — same weights, no CUDA required</li>
                      <li>History, dictionary, and tone travel with the app, not with an account.</li>
                    </ul>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t bezel-line px-4 py-2 text-sm text-foam/70">
                  <span className="inline-flex items-center gap-2">
                    <Monitor className="size-4" aria-hidden="true" />
                    Windows
                  </span>
                  <span>Tray</span>
                </div>
              </article>
            </div>
            <div id="stores" className="mt-8 rounded-card border border-line bg-foam p-4 sm:p-5">
              <p className="text-sm font-medium">App Store and Play Store</p>
              <p className="mt-2 text-sm text-muted">
                The iPhone project is <span className="text-ink">ios/</span> and the Android project is{" "}
                <span className="text-ink">android/</span>, both bundle id{" "}
                <span className="text-ink">com.ricsaucd.marlowe</span>. They are in the open source repo and are not
                listed in either store yet. Submitting them needs an Apple Developer account and a Google Play Console
                account.
              </p>
            </div>
          </div>
        </section>

        <Pricing />

        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted sm:px-6">
            <p>
              Marlowe is independent. Wispr Flow is a trademark of its owner. Whisper, whisper.cpp, faster-whisper, and
              Handy remain MIT in their own repositories. VoiceStudio is AGPL-3.0 and remains theirs. This preview is
              the keyboard and the transcription workspace. It is not their desktop installer.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

function Pricing() {
  const [yearly, setYearly] = useState(false);
  return (
    <section id="pricing" className="border-t border-line bg-foam">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-medium sm:text-4xl">Three to five dollars. We picked four.</h2>
            <p className="mt-3 max-w-xl text-muted">
              A heavy day of dictation is minutes of audio, not hours. Priced so a month of talking still fits inside a
              coffee.
            </p>
          </div>
          <div className="inline-flex rounded-full border border-line bg-paper p-1" role="group" aria-label="Billing">
            <button
              type="button"
              aria-pressed={!yearly}
              onClick={() => setYearly(false)}
              className={!yearly ? "h-11 rounded-full bg-ink px-4 text-sm text-foam" : "h-11 rounded-full px-4 text-sm"}
            >
              Monthly
            </button>
            <button
              type="button"
              aria-pressed={yearly}
              onClick={() => setYearly(true)}
              className={yearly ? "h-11 rounded-full bg-ink px-4 text-sm text-foam" : "h-11 rounded-full px-4 text-sm"}
            >
              Yearly
            </button>
          </div>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="rounded-card border border-line bg-paper p-6">
            <h3 className="font-display text-2xl">Free</h3>
            <p className="mt-3 font-display text-5xl tabular-nums">$0</p>
            <ul className="mt-4 grid gap-2 text-sm">
              <li>2,000 words a week</li>
              <li>Literal and clean tones</li>
              <li>Browser keyboard</li>
            </ul>
          </article>
          <article className="rounded-card border border-brass bg-paper p-6">
            <h3 className="font-display text-2xl">Marlowe</h3>
            <p className="mt-3 font-display text-5xl tabular-nums">
              ${yearly ? "3" : "4"}
              <span className="font-sans text-base font-normal text-muted">{yearly ? " / mo, billed $36" : " / month"}</span>
            </p>
            <ul className="mt-4 grid gap-2 text-sm">
              <li>Unlimited dictation for a real workday</li>
              <li>Message, email, notes, and code</li>
              <li>Personal dictionary</li>
              <li>Mac menu bar and Windows tray, with on-device Whisper</li>
            </ul>
            <a
              href="#keyboard"
              className="mt-6 inline-flex h-12 items-center rounded-full bg-brass px-5 font-medium text-foam"
            >
              Try the keyboard
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}
