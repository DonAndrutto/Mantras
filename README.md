# Mantras Visualised

Mantra garlands turning around their seed syllables, as visualised during recitation in
Vajrayāna practice. The page is a single static site for GitHub Pages: no build step,
no build dependencies, with everything (three.js, fonts) served from this repository.

**Mantras so far**

| address | mantra |
| --- | --- |
| `#vajrasattva` | Vajrasattva's hundred-syllable mantra turning around ཧཱུྃ, with ཨོཾ་བཛྲ་སཏྭ་ཨཱཿ standing still around the seed; nectar falling |
| `#vajra-guru` | The Vajra Guru mantra around ཧྲཱིཿ |
| `#green-tara` | Green Tara's mantra around ཏཱྃ |
| `#white-tara` | White Tara's long-life mantra around ཏཱྃ |
| `#dzambhala` | Dzambhala's mantra around ཛྃ |
| `#kurukulle` | Kurukulle's approach and accomplishment mantras (switch in Settings → Practice → Mantra) around ཧྲཱིཿ |
| `#chenrezig` | Om Mani Padme Hum, ཨོཾ་མ་ཎི་པདྨེ་ཧཱུྃ, around ཧྲཱི༔ |
| `#amitabha` | Om Ami Dewa Hrih, ༀ་ཨ་མི་དྷེ་ཝ་ཧྲཱི༔, around ཧྲཱི༔ |

Every mantra moves the same way: the syllables stand upright facing you from any
angle, in the fixed view and in the free camera, by default. Enable **Face syllables
away from the seed** in **Settings → Practice → Script** to turn each syllable
outward around the seed as the garland rotates. Latin labels turn with their
Tibetan syllables; the seed still faces you. This option is saved per mantra and
can be switched off at any time.

## Using it

- **Pace** opens directly from the bottom bar and is in *seconds per recitation*; one round of the garland is one recitation (or two
  or three, when it holds the mantra more than once), so the syllable passing the front is the
  one being recited. Set it with the slider (0.5–180 s), type it
  (to 0.01 s), step it by ±0.05 or ±1 s (hold to repeat), or **Tap** at the start of each
  recitation: the garland takes the pace of your last taps and brings the first syllable
  to the front. Tap tempo can be pinned to the bottom bar.
- **Counter**: counts each round, or counts presses of +1 in the counter panel (*By tapping*). Tap the bottom counter to open its controls. Shown as
  beads on the current mala · malas completed. Kept per mantra in this browser.
- **Size**: garland, letters and seed separately, ×0.30–×3.00.
- **View**: *Fixed* is the designed view (angle adjustable); *Free* is the World System's
  camera — drag to go round, pinch or scroll to come nearer, two fingers to slide.
- **VR**: an *Enter VR* button appears only where the browser can show VR (a headset's
  browser, or a desktop browser with a headset). The garland is placed in front of you.
- **Phonetics**: Settings → Practice → Script → *Show phonetic readout* shows the syllable at the front, in Tibetan and in
  phonetics, at the side of the screen (as in the Ngöndro app). Settings → Practice → Script can also
  write the ring itself in phonetics. Phonetics are one entry per Tibetan syllable (IAST,
  after the Ngöndro app's transliteration).
- **Seat**: lotus, sun disc and moon disc, any of them, stacked in that order. The discs are
  paper thin and a little wider than the garland, which turns above them within their rim;
  the lotus has 4, 8, 16 or a symbolic thousand-petalled form with dense overlapping tiers. Rose and white palettes are available. The seed hovers just above the uppermost seat.
- **Translucency**: Settings → Visualization → Lotus & discs offers Solid / Translucent.
  One opacity slider controls all enabled seats; *Adjust separately* exposes each seat's
  opacity. Zero-opacity surfaces do not hide the letters. Settings are kept per mantra.
- **Vajrasattva vajra**: Settings → Visualization → Vajrasattva vajra can enclose HŪṂ,
  the stationary heart mantra and the rotating hundred-syllable garland within the
  central hub of a large upright five-pronged vajra. The top selector offers **Mantra**
  (close-up at the letters), **Hub** (the isolated central hub) and **Whole vajra**
  (including its seat). Selecting a view returns to the fixed camera without resetting
  the rotation, pace or count. The two close views isolate the hub; Whole vajra restores both ends and the supporting seat. Vajra opacity applies to the entire form, including its prongs, collars and hub, independently of the seat opacity.
  *Use Ngondro arrangement* enables the vajra, a white lotus and moon, leaving the sun off.
  The seat supports the lower tip of the vajra. The upright orientation and enlarged
  scale are presentation choices; see the source note below.
- **Garland**: the mantra once, twice or three times round the same garland (Settings → Practice →
  Garland & direction); held more than once it runs closer together. The speed stays per recitation, and
  every recitation is counted.
- **Offering lights**: lights rise from the seed and syllables to the buddhas, return and
  dissolve into the seed and the mantra, then go down to beings in saṃsāra — round and round,
  each phase 10 s, 30 s or a minute. The phase shows under the top bar.
- **Syllables keep their marks**: tsheg, shad, visarga and terma marks stay with the syllable
  they are written with.
- **Even spacing**: every two neighbouring syllables have the same air between their ink,
  whatever their widths (a little more between one recitation and the next).
- **Light & effects**: glow (×0–×3, fine steps; drawn from the letter's own outline, so it stays
  smooth at any zoom), front highlight, the syllables' opacity, the
  seed's opacity, how much syllables passing in front veil the seed (even when faint), light
  rays, background (night / black / stars), and the mantra's own effects (Vajrasattva: nectar).
- **Turning / Syllables follow**: the direction of the spin and of the syllables' order,
  both *seen from above*. Each mantra file sets its own defaults.
- **Settings** have three categories: Practice, Visualization and View, with expandable
  groups. Pace and Counter also have their own direct panels. Escape closes a panel and
  returns focus to its opener; arrow keys move between settings tabs.
- **Stillness** under Practice freezes rotation, nectar, lights, pulsing and automatic
  counting; manual counting stays available. Play resumes animation. It is initially
  enabled when the device requests reduced motion, and the preference can be changed.
- **Rendering quality** under View → Screen & performance offers Automatic, Light and
  High. Automatic reduces pixel resolution and lotus detail after sustained slow frames,
  and recovers gradually when there is spare capacity.
- Tap the scene to hide or show the bars. Keys: Space pause · T tap · [ ] ±0.05 s ·
  { } ±1 s · H hide · F full screen · P phonetics at the side · R phonetics on the ring.

Settings and counts are remembered per mantra (per variant for Kurukulle) in this browser;
*Restore defaults* is under View → Screen & performance. Counts are preserved.

## Adding a mantra

1. Copy `mantras/green-tara.js` to `mantras/<id>.js` and change it: the Tibetan (with
   tsheg), the phonetics (one entry per syllable), the seed, a palette from
   `mantras/shared.js` and the pace.
2. Add one line to `mantras/index.js`.
3. Run `npm test` (or `node --test`): it checks that the phonetics line up with the syllables.

A mantra can offer several mantras around one seed (`variants`, as `kurukulle.js` does).
A ring can turn (`turns: 1`) or stand still (`turns: 0`); there can be several
(`vajrasattva.js`). A mantra-specific effect is a module in `js/effects/` named in the
mantra's `effects` list and registered in `js/app.js`.

## Files

| file | what it is |
| --- | --- |
| `index.html`, `app.css` | The page and its one style; each mantra recolours it. |
| `js/app.js` | Renderer and loop, the clock, tap tempo, counter, bars, keys, wake lock, VR button. |
| `js/backdrop.js` | The night sky, drawn in WebGL so the canvas is opaque and light shows the same on every screen. |
| `js/stage.js` | One mantra in 3D: rings, seed, halo and pool of light; the veil over the seed. |
| `js/seats.js` | Shaded lotus petals, sun/moon seats and shared or independent opacity. |
| `js/vajra.js` | Five-pronged vajra, central hub and scene bounds. |
| `js/dialogs.js` | Modal sheets, nested focus return and keyboard focus trapping. |
| `js/quality.js` | Adaptive rendering quality with hysteresis. |
| `js/glyphs.js` | Syllables as distance fields with their blurred glow (kept for reuse), and the shader that draws them sharp at any size. |
| `js/camera.js` | The fixed, framed view and the free orbit camera. |
| `js/xr.js` | WebXR detection and session start. |
| `js/ui.js` | The settings sheet and the mantra menu. |
| `js/settings.js` | Defaults from the mantra file; the viewer's changes and counts, per mantra. |
| `js/tibetan.js` | Splitting Tibetan into syllables, phonetics into words. |
| `js/effects/` | `nectar.js` (Vajrasattva), `offerings.js` (offering lights), `rays.js`, `stars.js`. |
| `mantras/` | One file per mantra, `shared.js` (palettes, the common ring), and the list. |
| `design/` | The original Claude Design sources. |
| `vendor/three@0.184.0/` | three.js, byte for byte as in the World System repository (same integrity hashes). |
| `fonts/` | Jomolhari and EB Garamond, both OFL. |
| `tests/` | Data/integrity tests, settings/geometry/framing tests, optional browser checks, and local server. |

## Trying it locally

ES modules do not load from `file://`, so serve the folder:

```bash
node tests/serve.mjs
```

then open http://localhost:8000/.

## Publishing

Settings → Pages → Deploy from a branch → `main` / root. `.nojekyll` is included.

## Vajrasattva source and design

The visualization follows [Ngondro, blocks ng-5-8–ng-5-11](https://github.com/DonAndrutto/Ngondro/blob/c1759e9962e080e3cbdac6114cc54f8266cf8c45/index.html#L4139):
HUNG at the vajra's centre, the heart mantra in four directions, the hundred-syllable
garland surrounding it, and descending nectar. The five-pronged form, enlarged scale,
and enclosure of the complete existing mantra arrangement were requested for this app.
The current mantra text, phonetic mapping and four-position heart-mantra layout are preserved.

Form references: [vajra anatomy](https://www.himalayanart.org/search/set.cfm?setID=6657)
and [lotus design variations](https://www.himalayanart.org/search/set.cfm?setID=6944).
The vajra proportions and carved forms follow the supplied ritual-vajra photograph and line drawing: broad bowed blades, a slightly flattened hub, lotus cups, beaded bands and makara-inspired prong roots. Pale translucent surfaces have view-dependent highlights. The geometry is original procedural work; no third-party images are bundled.

## Validation

`npm test` uses Node 22.15+ (including Node 24) and needs no dependencies. It checks
mantra text integrity, saved-setting compatibility and bounds, translucent seats,
five-pronged geometry, viewport framing and adaptive-quality behaviour.

The optional browser suite needs Playwright and a Chromium installation:

```bash
PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_EXECUTABLE_PATH=/path/to/chromium node tests/browser.cjs
```

Set `SCREENSHOT_DIR` to capture review images. The suite starts its own local server,
checks 320px/390px portrait, phone landscape and desktop layouts, three vajra views,
count preservation, stillness, keyboard focus, per-seat opacity and mantra switching.


## Welcome, help and installation

The opening screen previews Vajra Guru using the live renderer. It does not read
its saved appearance settings, change the last-used mantra or write recitation
counts. “Tap to explore” opens a valid URL fragment, otherwise the last-used
mantra, otherwise Vajra Guru. Home returns to the welcome screen. Reduced motion
pauses the preview; the preview also has its own pause control.

The How to use tab and the guide reached through **?** share one HTML template.
The question mark labels visible controls in place, following Ngondro and BardoOS.
The scene clock is held while modal panels are open. The heart uses the same
PayPal donation destination as those apps. English UI only for this pass;
interface language selection and Polish remain a separate follow-up.

A dismissible install invitation appears on first entry, with explicit browser
installation on supported Chromium devices and manual instructions for iOS,
iPadOS and Safari for Mac. Dismissal is remembered; installation remains available
from the welcome footer. Installed windows suppress the invitation.

### Offline release procedure

The service worker downloads all shipped modules, all eight mantra definitions,
fonts, icons, styles and the shell before reporting **Ready offline**. A failed
download does not activate a partial release. Paths work at the domain root and
under `/Mantras/`. Each cache is namespaced to this app and its scope, so it does
not delete BardoOS or Ngondro data. Offline support requires HTTPS or localhost
and browser storage; clearing site data removes counts, settings and caches.

After changing any shipped file, run **`npm run precache`** and commit `sw.js`
with the changes. `npm test` checks that the asset list and content fingerprint
are current. Deploy the complete repository together. An updated worker waits
until all existing Mantras windows close; the app reports “Update ready”. It
never forces a reload in the middle of practice. Counts and preferences remain
in local storage across releases.

The additional optional integration suite is:

```bash
PLAYWRIGHT_MODULE=/path/to/playwright CHROMIUM_EXECUTABLE_PATH=/path/to/chromium node tests/welcome-browser.cjs
```

It checks a full welcome rotation without counting, saved preferences, small
portrait/landscape/tablet layouts, guide tabs, modal focus, donation destination,
installation invitation and dismissal, reduced motion, renderer recovery, and
fresh offline launches at both root and subpath URLs. The latter switches through
all mantras, including ones never opened online. `npm run test:browser` runs all
browser suites. Native browser installation UI still needs a real-device check
in Safari and Chrome/Edge; the suite tests the app’s prompt handling.


### Paired phonetics and camera shortcuts

The **Aa Phonetics** button above playback adds small Latin syllables directly
beneath each Tibetan syllable in the rotating garland. Both share the same
highlight signal and scale together. Labels stay beneath their syllables when
orbiting, and the camera/seat/vajra bounds include the extra text. The preference
is remembered across mantras; Latin-only lettering and the larger front-syllable
readout remain available in Settings → Practice → Script.

The adjacent **Fixed / Free** switch unlocks orbiting without moving the camera.
Drag to turn; pinch or scroll to zoom. Fixed recentres the selected view. Press
**C** to switch modes when focus is outside a control. The guide and question-mark
overlay describe both shortcuts. `tests/phonetics-camera.cjs` checks paired glyph
alignment and synchronized highlighting, rotation continuity, camera transitions,
saved preferences and responsive control layout.

`tests/outward-browser.cjs` additionally exercises Vajrasattva's elliptical ring
in both rotation directions and syllable orders, Tibetan with paired Latin and
Latin-only script, Fixed and Free cameras, live and paused recitation, automatic
counting, per-mantra preferences, and a cold offline launch under `/Mantras/`.
Node tests also check that Kurukulle's variants retain independent preferences
without changing their saved counts. Set `SCREENSHOT_DIR` for visual snapshots;
set `APP_URL` to run this integration check against a deployed app instead.
