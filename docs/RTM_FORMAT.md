# RTM File Format Specification

**Version:** 1.0  
**Status:** Active  
**Context:** RhythmTyper Beatmap Format

## Overview

The **RTM** format describes a beatmap (song chart) for RhythmTyper.
Physically, an `.rtm` file is a **ZIP archive** containing:
1.  A root metadata file (`meta.json`).
2.  One or more difficulty definition files (JSON).
3.  Asset files (Audio `.mp3`/`.ogg`, Images `.jpg`/`.png`, etc.).

---

## 1. Metadata (`meta.json`)

This file resides at the root of the archive and acts as the entry point for the mapset.

```json
{
  "mapsetId": "string (unique identifier)",
  "songName": "string",
  "artistName": "string",
  "mapper": "string",
  "description": "string",
  "tags": "string (space separated)",
  "language": "string (e.g. 'instrumental', 'english')",
  "explicit": boolean,
  "audioFile": "string (filename relative to root)",
  "backgroundFiles": ["string (filename)"],
  "bpm": number (display BPM),
  "offset": number (audio offset in ms),
  "previewTime": number (preview start point in ms),
  "difficulties": [
    {
      "diffId": "string (unique difficulty ID)",
      "name": "string (difficulty name)",
      "filename": "string (path to difficulty json)"
    }
  ],
  "timingPoints": [ ... ]
}
```

### Field Details

| Field | Type | Description |
| :--- | :--- | :--- |
| `mapsetId` | String | Unique ID for the mapset. Often alphanumeric (e.g., `ws1bzun0bv0k`). |
| `songName` | String | Title of the track. |
| `artistName` | String | Artist/Composer of the track. |
| `mapper` | String | Creator of the beatmap. |
| `audioFile` | String | Filename of the audio track within the zip. |
| `difficulties` | Array | Registry of difficulties included in this set. |

### Timing Points

Used for metronome and beat-snapping logic.

> **CRITICAL NOTE ON UNITS:**
> *   `time` is expressed in **Seconds** (Float).
> *   `offset` is expressed in **Milliseconds** (Integer/Float).
> *   The `offset` field is the authoritative source for millisecond-level precision.

```json
{
  "id": number,
  "time": number,   // SECONDS (e.g., 0.75)
  "bpm": number,
  "offset": number, // MILLISECONDS (e.g., 750)
  "timeSignature": [number, number] // e.g., [4, 4]
}
```

---

## 2. Difficulty Definition (`*.rtm.json`)

Each difficulty is a separate JSON file linked by the `difficulties` array in `meta.json`.

```json
{
  "mapsetId": "string (ref)",
  "diffId": "string (ref)",
  "name": "string",
  "overallDifficulty": number (0-11),
  "bgFile": "string",
  "notes": [ ... ],
  "typingSections": [ ... ],
  "starRating": number,
  "starRatingNC": number,
  "starRatingHT": number
}
```

### Field Details

| Field | Type | Description |
| :--- | :--- | :--- |
| `overallDifficulty` | Number | OD Value. Determines the timing window strictness. |
| `bgFile` | String | The specific background image used for this difficulty level. |
| `notes` | Array | List of gameplay objects (Tap or Hold). |
| `typingSections` | Array | Optional lyric/storyboard text sections. |
| `starRating` | Number | Pre-calculated difficulty rating (Nomod). |

---

## 3. Note Objects

Notes define the gameplay inputs. They can be **Tap** notes or **Hold** notes.

### Common Structure

All notes share these properties, though timestamps differ by type:

```json
{
  "key": "string (single character)",
  "type": "tap" | "hold",
  "hitsound": { ... }
}
```

### Tap Note

A single keystroke.

```json
{
  "time": number (milliseconds),
  "key": "j",
  "type": "tap",
  "hitsound": {
    "sampleSet": "normal" | "soft" | "drum",
    "volume": number (0-100),
    "sounds": {
      "hitnormal": boolean,
      "hitclap": boolean,
      "hitwhistle": boolean,
      "hitfinish": boolean
    }
  }
}
```

### Hold Note (Long Note)

A keystroke that must be pressed at `startTime` and released at `endTime`.

```json
{
  "startTime": number (milliseconds),
  "endTime": number (milliseconds),
  "key": "z",
  "type": "hold",
  "hitsound": {
    "sampleSet": "normal",
    "start": { ...HitsoundConfig },
    "hold": { "volume": number, "loop": "string" },
    "end": { ...HitsoundConfig }
  }
}
```

> **Note on Hitsounds:** Hold notes define hitsounds for three phases: the initial press (`start`), the loop during the hold (`hold`), and the release (`end`).

---

## 4. Typing Sections

Used for displaying lyrics or narrative text at the bottom of the screen during gameplay breaks.

```json
{
  "startTime": number (milliseconds),
  "endTime": number (milliseconds),
  "text": "string (content to display)"
}
```