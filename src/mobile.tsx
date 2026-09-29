import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Studio } from "@/components/studio";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing root");

createRoot(root).render(
  <StrictMode>
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line px-4 py-3">
        <p className="font-display text-xl">Marlowe</p>
        <p className="text-sm text-muted">Hold to talk. Release to write.</p>
      </header>
      <main className="px-4 py-4">
        <Studio />
      </main>
    </div>
  </StrictMode>,
);
