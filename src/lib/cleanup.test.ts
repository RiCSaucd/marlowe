import assert from "node:assert/strict";
import test from "node:test";
import { countWords, lightClean } from "./cleanup.ts";

test("countWords ignores surrounding space", () => {
  assert.equal(countWords("  one two  "), 2);
  assert.equal(countWords("   "), 0);
});

test("lightClean strips fillers and capitalizes", () => {
  assert.equal(lightClean("um so I was thinking we ship Friday", "message"), "So I was thinking we ship Friday.");
});

test("literal cleanup keeps the wording", () => {
  assert.equal(lightClean("kind of send the deck", "literal"), "Send the deck.");
});

test("cleanup drops a stutter and keeps a dictionary spelling", () => {
  assert.equal(lightClean("um the the launch is friday", "message"), "The launch is friday.");
  assert.equal(lightClean("email priya about the clause", "email", ["Priya"]), "Email Priya about the clause.");
});
test("code mode keeps a single sentence", () => {
  const out = lightClean("rename fetchUser in auth.ts", "code");
  assert.equal(out, "Rename fetchUser in auth.ts.");
});
