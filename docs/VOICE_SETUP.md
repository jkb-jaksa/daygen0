# Voice Modality Setup & QA

The voice studio at `/create/audio` relies on the ElevenLabs platform for voice cloning and text-to-speech. Follow these steps to configure the environment and validate the experience locally.

## 1. Configure backend secrets

1. In `daygen-backend`, set the ElevenLabs key in your environment (do **not** commit real keys):
   ```bash
   # daygen-backend/.env
   ELEVENLABS_API_KEY="sk_your_elevenlabs_key"
   ```
2. Restart the Nest server so the updated env variable is loaded:
   ```bash
   cd daygen-backend
   npm install
   npm run start:dev
   ```

## 2. Run the frontend

```bash
cd daygen0-fresh
pnpm install
pnpm dev
```

Optional: set `VITE_API_BASE_URL=http://localhost:3000` if you are not relying on the Vite proxy.

## 3. Manual QA checklist

- **Open the studio**: navigate to `http://localhost:5173/create/audio` and verify the modal opens automatically.
- **Clone via upload**: drag an audio file (≤25 MB, e.g. `.wav`) into the upload step, then click “Save to ElevenLabs”. Confirm the success toast and that the “Last saved voice” card appears.
- **Clone via recording**: switch to “Record”, capture a short clip, stop the recording, and save it to ElevenLabs. Ensure microphone permissions are requested and the recording preview works.
- **Generate preview**: open “Design”, enter a short script, choose a voice, and click “Generate preview”. Confirm audio playback for the generated sample.
- **Error handling**: try saving without selecting a file/recording to confirm inline validation, and disconnect networking while generating to observe toast-level errors.

## 4. Automated checks

From the repo root run:

```bash
# Backend unit tests (includes audio service coverage)
cd daygen-backend
npm run test -- audio

# Frontend unit tests (audio helpers)
cd ../daygen0-fresh
pnpm test --filter "audioApi"
```

These commands cover the Nest `AudioService` behaviour, the frontend API helpers, and validate that the voice studio wiring remains healthy.



