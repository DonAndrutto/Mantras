# Mantras Visualised

Mantra garlands turning around their seed syllables, as visualised during recitation in
Vajrayāna practice. The page is a single static site for GitHub Pages: no build step,
nothing to install, everything (three.js, fonts) served from this repository.

**Mantras so far**

| address | mantra |
| --- | --- |
| `#vajrasattva` | Vajrasattva's hundred-syllable mantra turning around ཧཱུྃ, with ཨོཾ་བཛྲ་སཏྭ་ཨཱཿ standing still around the seed; nectar falling |
| `#vajra-guru` | The Vajra Guru mantra written round the outside wall of a ring around ཧྲཱིཿ |

## Using it

- **Speed** is in *seconds per round*, and one round is one recitation, so the syllable
  passing the front is the one being recited. Set it with the slider (0.5–180 s), type it
  (to 0.01 s), step it by ±0.05 or ±1 s (hold to repeat), or **Tap** at the start of each
  recitation: the garland takes the pace of your last taps and brings the first syllable
  to the front.
- **Counter**: counts each round, or counts taps on the counter (*By tapping*). Shown as
  beads on the current mala · malas completed. Kept per mantra in this browser.
- **Size**: garland, letters and seed separately, ×0.30–×3.00.
- **View**: *Fixed* is the designed view (angle adjustable); *Free* is the World System's
  camera — drag to go round, pinch or scroll to come nearer, two fingers to slide.
- **VR**: an *Enter VR* button appears only where the browser can show VR (a headset's
  browser, or a desktop browser with a headset). The garland is placed in front of you.
- **Script**: Tibetan or phonetics (top bar *Aa* / ཀ).
- **Light & effects**: glow, front highlight, light rays, background (night / black / stars),
  and the mantra's own effects (Vajrasattva: nectar falling).
- **Turning / Syllables follow**: the direction of the spin and of the syllables' order,
  both *seen from above*. Each mantra file sets its own defaults.
- Tap the scene to hide or show the bars. Keys: Space pause · T tap · [ ] ±0.05 s ·
  { } ±1 s · H hide · F full screen · P script.

Settings are remembered per mantra in this browser; *Restore defaults* is under Screen.

## Adding a mantra

1. Copy `mantras/vajra-guru.js` to `mantras/<id>.js` and change it: the text (Tibetan,
   with tsheg), phonetics, seed, colours, ring layout, speed and view.
2. Add one line to `mantras/index.js`.
3. Run `npm test` (or `node --test`).

A ring can turn (`turns: 1`) or stand still (`turns: 0`); there can be several. Syllables
can face the viewer (`billboard`), outward or inward. A mantra-specific effect is a module
in `js/effects/` named in the mantra's `effects` list and registered in `js/app.js`.

## Files

| file | what it is |
| --- | --- |
| `index.html`, `app.css` | The page and its one style; each mantra recolours it. |
| `js/app.js` | Renderer and loop, the clock, tap tempo, counter, bars, keys, wake lock, VR button. |
| `js/stage.js` | One mantra in 3D: rings, seed, halo and pool of light. |
| `js/glyphs.js` | Syllables drawn once into textures (letter and halo in one), and their shader. |
| `js/camera.js` | The fixed, framed view and the free orbit camera. |
| `js/xr.js` | WebXR detection and session start. |
| `js/ui.js` | The settings sheet and the mantra menu. |
| `js/settings.js` | Defaults from the mantra file; the viewer's changes and counts, per mantra. |
| `js/tibetan.js` | Splitting Tibetan into syllables, phonetics into words. |
| `js/effects/` | `nectar.js` (Vajrasattva), `rays.js`, `stars.js`. |
| `mantras/` | One file per mantra, and the list. |
| `design/` | The original Claude Design sources. |
| `vendor/three@0.184.0/` | three.js, byte for byte as in the World System repository (same integrity hashes). |
| `fonts/` | Jomolhari and EB Garamond, both OFL. |
| `tests/` | `mantras.test.mjs` (data, syllables, vendored file hashes); `serve.mjs`, a local server. |

## Trying it locally

ES modules do not load from `file://`, so serve the folder:

```bash
node tests/serve.mjs
```

then open http://localhost:8000/.

## Publishing

Settings → Pages → Deploy from a branch → `main` / root. `.nojekyll` is included.
