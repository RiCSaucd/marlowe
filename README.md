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

## Apple App Store and Google Play

The store projects are in this repository. They are not submitted yet.

| Store | Project | Id |
|---|---|---|
| App Store | [ios/](ios/) | `com.ricsaucd.marlowe` |
| Play Store | [android/](android/) | `com.ricsaucd.marlowe` |

The phone app is the dictation keyboard. It asks for the microphone. Cloud polish still needs a hosted `XAI_API_KEY` backend. On the phone, speech that the WebView recognizes is cleaned up on the device when that backend is absent.

```sh
npm run mobile:sync
```

Then open `ios/App/App.xcodeproj` in Xcode, set your team, and archive for App Store Connect. Open `android/` in Android Studio and build a signed app bundle for Play Console. Both stores also want a privacy policy URL before the listing can go live.

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
