# Marlowe

Hold a key, speak, and finished writing lands at the cursor. Marlowe is a talk-to-text keyboard aimed at the same motion as [Wispr Flow](https://wisprflow.ai), priced at $4 a month or $3 billed yearly.

This repository is the browser preview: a dictation keyboard, a transcription workspace, and the marketing page. It is not a compiled Mac or Windows installer.

## What it combines

| Piece | Source | License | Role |
|---|---|---|---|
| Whisper | [openai/whisper](https://github.com/openai/whisper) | MIT | Accuracy target for the desktop engines |
| whisper.cpp | [ggml-org/whisper.cpp](https://github.com/ggml-org/whisper.cpp) | MIT | Apple Silicon and Windows CPU runtime |
| faster-whisper | [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper) | MIT | NVIDIA Windows runtime |
| Handy | [cjpais/Handy](https://github.com/cjpais/Handy) | MIT | Push-to-talk and paste-at-cursor shell |
| VoiceStudio | [debpalash/VoiceStudio](https://github.com/debpalash/VoiceStudio) | AGPL-3.0 | Transcription workspace this preview follows. Not vendored here |

Marlowe does not relicense those projects. Wispr Flow is their trademark. This project is independent.

The preview transcribes with a cloud speech model when `XAI_API_KEY` is set, then runs a writing pass. Without that key, local cleanup still strips fillers and fixes capitalization. The Mac and Windows builds described on the site are the planned native shells. They are not binaries in this repo.

## Run

```sh
npm install
npm run dev
```

Open `http://localhost:8080`.

```sh
npm test
npm run typecheck
```

## License

Marlowe’s own source in this repository is MIT. Linked engines keep the licenses in the table above.
