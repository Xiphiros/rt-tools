# Default Hitsounds

Please place the following `.wav` (or `.mp3`) files in this directory.
These are the standard sound samples used by the Editor for feedback.

## Required Filenames

### Normal Set
- `normal-hitnormal.wav`
- `normal-hitwhistle.wav`
- `normal-hitfinish.wav`
- `normal-hitclap.wav`

### Soft Set
- `soft-hitnormal.wav`
- `soft-hitwhistle.wav`
- `soft-hitfinish.wav`
- `soft-hitclap.wav`

### Drum Set
- `drum-hitnormal.wav`
- `drum-hitwhistle.wav`
- `drum-hitfinish.wav`
- `drum-hitclap.wav`

## Implementation Note
The `index.ts` file in this directory uses `new URL(..., import.meta.url)` to resolve these files via Vite. Ensure the files exist to avoid 404 errors during playback.