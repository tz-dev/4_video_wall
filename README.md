# 4 Video Wall

A browser-based 4-video wall player for up to four simultaneous videos, with independent looping, per-video audio/speed/pan/zoom/filter control, solo mode, layout switching, fullscreen, keyboard shortcuts, JSON config save/load, and a live HUD.

## Features

- Up to 4 simultaneous video panels
- Layouts: `4x1`, `2x2`, `2x1-left`, `2x1-right`
- Adjustable grid gap (`0–32px`)
- Per-video controls:
  - title
  - source via URL or local file
  - volume, mute, play / pause
  - playback speed (`0.25×–4×`) with presets
  - loop start / loop end
  - seek / current time
  - pan X / pan Y
  - zoom (`100–300%`)
  - filters: brightness, contrast, saturation, grayscale
  - reset for pan/zoom and filters
- Global controls:
  - play / pause all
  - mute / unmute all
  - global playback speed with presets
  - layout switching
  - fullscreen
- Solo mode per video
- Active panel count (`1–4` visible panels)
- Hidden-HUD interaction:
  - drag to pan
  - scroll to zoom
  - quick action bar
- Help overlay
- Toast / action overlay feedback
- Save / load JSON configs
- Config persistence for layout gap, playback, pan/zoom, filters, and per-video settings
- Local-file aware restore behavior

---

## Preview / Use Case

Designed for installations, visual walls, live performance setups, moodboards, editing previews, exhibition displays, and other browser-based multi-video setups.

## Screenshots

![HUD Screenshot](img/screenshot_hud.png)

![Layout 1 Screenshot](img/screenshot_layout1.png)

![Layout 2 Screenshot](img/screenshot_layout2.png)

![Layout 3 Screenshot](img/screenshot_layout3.png)

---

## Project Structure

```text
├─ index.html
├─ configs/
│  └─ default.json
├─ css/
│  └─ style.css
└─ js/
   └─ script.js
````

## Usage

For local files, serve the project through a local web server. Opening `index.html` via `file:///` will usually block local file loading due to browser security restrictions.
If you only use URLs, opening `index.html` directly is enough.

### Quick start with Python

```bash
python -m http.server 8080
```

Then open [http://localhost:8080](http://localhost:8080).

---

## Controls

### Keyboard Shortcuts

| Key                 | Action                                           |
| ------------------- | ------------------------------------------------ |
| `Enter`             | Toggle HUD                                       |
| `H`                 | Toggle help overlay                              |
| `Space` / `P`       | Pause / resume all                               |
| `M`                 | Mute / unmute all                                |
| `1` - `4`           | Mute / unmute video 1-4                          |
| `Shift` + `1` - `4` | Pause / resume video 1-4                         |
| `Ctrl` + `1` - `4`  | Toggle solo mode for video 1-4                   |
| `Alt` + `1` - `4`   | Show only first N panels; press again to restore |
| `L`                 | Cycle layout                                     |
| `Esc`               | Exit solo mode                                   |

### Mouse Behavior (HUD hidden)

| Action       | Effect                    |
| ------------ | ------------------------- |
| Move mouse   | Show quick action bar     |
| Drag         | Pan video inside its cell |
| Scroll       | Zoom (`100–300%`)         |
| Double-click | Reset pan and zoom        |

---

## Interface

The HUD contains global controls plus one control block per video.

Each video block includes:

* title and source loading (URL or local file)
* source status
* volume
* playback speed with presets
* loop start / end
* seek bar and time readout
* zoom
* pan X / pan Y
* play / pause
* jump/set loop controls
* mute toggle
* filter toggle with collapsible filter panel
* filter reset
* brightness, contrast, saturation, grayscale

---

## Behavior

### Layouts

The player supports four layouts:

* `4x1` — one row, four videos
* `2x2` — two rows, two videos each
* `2x1-left` — videos 1-2 side by side on the left, videos 3-4 stacked on the right
* `2x1-right` — videos 1-2 stacked on the left, videos 3-4 side by side on the right

`L`, the HUD selector, and the quick bar all switch or reflect the current layout.

### Solo Mode

Solo mode shows one selected video centered with `object-fit: contain`.

* toggled with `Ctrl` + `1`-`4`
* pressing the same shortcut again disables it
* `Esc` exits solo mode
* pan/zoom are preserved but visually ignored while solo mode is active
* when solo mode ends, pan/zoom resume as previously configured
* when solo mode is cleared, all videos resume playback

### Active Panel Count

`Alt` + `1`-`4` limits the wall to the first `1–4` visible panels.

* pressing the same shortcut again restores all four
* hidden panels keep their playback state, loop points, volume, speed, pan, zoom, and filters
* visible panels expand to fill the available width
* the normal layout is temporarily overridden while panel count mode is active

### Playback

* videos do **not** start muted by default
* each video uses its configured volume and playback rate
* looping is handled manually through `loopStart` and `loopEnd`
* reaching `loopEnd` jumps playback back to `loopStart`
* playback rate is re-applied after source changes to avoid browser reset behavior
* autoplay still depends on browser interaction policies and is unlocked on first pointer/key interaction

---

## Config Save / Load

The app can export and import JSON configs.

Saved data includes:

* config version, name, export timestamp
* layout mode
* grid gap
* per video:

  * id
  * title
  * source mode / value / file name
  * loop start / loop end
  * volume
  * playback rate
  * muted state
  * pan X / pan Y
  * zoom
  * brightness
  * contrast
  * saturation
  * grayscale

### Version notes

* current config version: `5`
* `gridGap` is stored globally
* filter values are stored per video
* loading restores saved gap and syncs it back to the HUD
* loading restores all saved filter values

### Local file limitation

If a source was loaded via the browser file picker, the config can remember that state and the file name, but the file itself must be re-selected manually after reload for security reasons.

---

## Example Config Format

```json
{
  "version": 5,
  "name": "Wall Of Cats",
  "layoutMode": "2x2",
  "gridGap": 14,
  "exportedAt": "2026-03-28T10:41:37.367Z",
  "videos": [
    {
      "id": "video1",
      "title": "Window Watch",
      "sourceMode": "url",
      "sourceValue": "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      "sourceFileName": "",
      "loopStart": 0,
      "loopEnd": 6.5,
      "volume": 0.25,
      "playbackRate": 1,
      "muted": false,
      "panX": 42,
      "panY": 56,
      "zoom": 112,
      "brightness": 108,
      "contrast": 104,
      "saturation": 118,
      "grayscale": 0
    },
    {
      "id": "video2",
      "title": "Soft Landing",
      "sourceMode": "url",
      "sourceValue": "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
      "sourceFileName": "",
      "loopStart": 3,
      "loopEnd": 15.2,
      "volume": 0.8,
      "playbackRate": 1,
      "muted": false,
      "panX": 61,
      "panY": 47,
      "zoom": 105,
      "brightness": 96,
      "contrast": 112,
      "saturation": 106,
      "grayscale": 8
    },
    {
      "id": "video3",
      "title": "Quiet Patrol",
      "sourceMode": "url",
      "sourceValue": "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      "sourceFileName": "",
      "loopStart": 12,
      "loopEnd": 24,
      "volume": 0.5,
      "playbackRate": 0.75,
      "muted": false,
      "panX": 38,
      "panY": 63,
      "zoom": 120,
      "brightness": 102,
      "contrast": 98,
      "saturation": 92,
      "grayscale": 18
    },
    {
      "id": "video4",
      "title": "Late Night Zoomies",
      "sourceMode": "url",
      "sourceValue": "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      "sourceFileName": "",
      "loopStart": 5,
      "loopEnd": 17.5,
      "volume": 0.65,
      "playbackRate": 1.25,
      "muted": false,
      "panX": 54,
      "panY": 41,
      "zoom": 110,
      "brightness": 115,
      "contrast": 121,
      "saturation": 128,
      "grayscale": 0
    }
  ]
}
```

---

## Source Modes

* **URL source**: relative path, project path, or remote URL
* **Local file source**: loaded through the HUD file picker

---

## Responsive / Browser Notes

On smaller screens, loop and pan fields stack vertically, filter controls flow naturally, the HUD stays scrollable, and the quick bar remains compact.

Best tested in modern Chromium-based browsers and Firefox. Browser differences may affect autoplay permissions, fullscreen handling, file URL behavior, codec support, filter rendering, and supported playback-rate range.

---

## Customization

Common changes in `js/script.js`:

* default video files, loop points, volume, speed, filters
* speed presets via `SPEED_PRESETS`
* default layout and grid gap
* keyboard shortcuts
* config structure
* layout order via `LAYOUT_MODES`

Common changes in `css/style.css`:

* HUD, overlay, quick bar, and help styling
* solo mode sizing
* filter panel appearance
* responsive breakpoints
* layout grid definitions
* active panel count overrides
* grid-gap related spacing

---

## Known Limitations

* Local files cannot be restored automatically from saved configs
* Browser autoplay restrictions may require user interaction first
* Synchronization is visual/manual, not frame-accurate
* Supported playback-rate range depends on browser and codec support
* Pan/zoom have no visible effect in solo mode, but remain preserved
* Active panel count temporarily overrides the selected layout until cleared
* Filter rendering depends on browser support, though modern Chromium-based browsers and Firefox generally work well

---

## License

GNU GENERAL PUBLIC LICENSE Version 3
