Crab Crew is a pixel-art interface where every worker is a crab. Claude's own crab, Clawd, leads; each helper gets a crab of its own colour, eyes, markings, name and costume, and that crab walks while it works, cheers when it is done, and sleeps while it waits. Everything else on screen is built from the same pixels: notched corners, highlight and shade rows, a dashed ground line, hard shadows.

Use it for tools that show work happening: agents, jobs, queues, builds, multiplayer lists, progress of any kind. The crabs make status readable at a glance and give each running thing an identity people remember.

## Voice and content

- Speak plainly, in the present tense, about what is happening: "Migrating callers", "Editing store.ts", "Searching for getToken(".
- Activities start with a verb in the -ing form and name the thing: "Reading session.ts", "Running the e2e suite", "Briefing a helper: audit auth".
- Crabs are characters, not mascots that talk down. Names come from the kit (Barnacle, Quill, Pebble, Kelp…) and are said with "the" plus a costume: "Barnacle the engineer".
- State words are short and lowercase in running text: "done", "stopped", "planned", "running". Section labels are the same words in the label face: RUNNING 2.
- Empty states say what will appear and how: "The beach is quiet. Each subagent shows up here as a crab of its own."
- Facts are numbers, not sentences, joined by a spaced middle dot: `Opus 5.5 · high · 3/7 tasks · ctx 84.2k/1M · ~$0.412 · ~2m 58s left`. An estimate starts with `~`.
- No emoji. The crabs and the pixel icons carry the warmth.

## Colour

- Put pages on `sand`, anything that sits on the page on `sand-raised`, and wells (inputs, crab lanes, code) in `sand-sunken`.
- Set text in `ink`; secondary text, phases and facts in `ink-muted`. Both read on every sand surface in Day and Night.
- `clawd` is Claude's crab and the system's one accent. Fill the primary button, the done part of a bar and Claude's own panel frame with it. As text, always use `clawd-text`; on a clawd fill, always `on-clawd`.
- A clawd fill carries its two pixel rows: `clawd-light` along the top, `clawd-shade` along the bottom (`shadow-press`).
- Each helper crab owns one of the sixteen `crab-*` palettes. Use a crab's body colour for its card frame, its swatch square and its own PixelBar; never for text.
- Status colours (`success`, `danger`, `warning`, `info`, each with a `-soft` ground) always travel with a word and, for crabs, a pose: done crab plus "done", failed crab plus "stopped".
- `ground`, `track`, `notch` and `glint` are the crab world's own translucent greys and white: the dashed ground line, the empty bar, the task notches, the eye sparkle and the bar's glint.

## Type

- `pixel` (Pixelify Sans) is the display face: `display`, `title`, `heading` and `crab-name`. One display line per screen at most.
- `label` (Silkscreen) is for short uppercase labels only: section labels, chips, tabs, field labels and buttons (`label`, `label-lg`). Never for sentences.
- `mono` (Geist Mono) carries everything that is read: `body`, `body-strong`, `meta` for facts and hints, `numeral` for counts, costs and durations with tabular figures. The mono face keeps the terminal feel the crabs come from.
- All three are on Google Fonts; `components/bundle.css` imports them. Load them with `display=swap` and keep the fallback stacks.

## Pixels, space and shape

- The art pixel is 2 CSS px (`pixel`). Crabs, bars and icons draw at whole multiples of it: scale 2 in lists, 3 in empty states and bubbles, 4 for illustrations. Never scale a crab by a fraction.
- Spacing runs on a 4px grid: `space-2` between items in a row, `space-3` between cards, `space-4` inside panels and as the phone gutter, `space-6` between sections.
- Nothing is rounded (`radius-0`). Corners are notched by one art pixel (`notch-1`, `notch-2` for big surfaces), the way the bar's ends are cut: a stepped clip, not a curve.
- Frames are whole pixels: `border-1` everywhere, `border-2` for a focused control and the active tab's bar.
- Shadows are hard and offset, never blurred: `shadow-step` for a slight lift, `shadow-lift` for anything floating. Notched corners clip a box-shadow, so apply them as `filter: drop-shadow(var(--shadow-lift))` on a wrapper.
- Keyboard focus turns a control's frame to `focus` and adds `focus-ring` inside it, a 4px frame in ink; on a clawd fill it uses `on-clawd`.

## Motion

Motion is stepped, never eased. Crabs change frames on a fixed beat (100 ms racing, 150–180 ms walking and floating, 260–300 ms asleep or stopped) and move one art pixel at a time: 9 art px a second walking, 24 running, 3 floating. A working bar pulses its in-progress stretch over 1.6 s and runs a 3-pixel glint along the done part. Only things that are working move; finished and waiting crabs hold still. Under `prefers-reduced-motion` every crab holds its first frame and bars stop pulsing.

## Crabs

The crab kit (palettes, eyes, markings, costumes, poses and names) and the rules for giving out looks are in the Crab kit section. The short version: one crab per thing, picked with `CrabCrew.crabs.pickLook(seed, taken)` so no two on screen match, and pose follows state.

## Iconography

- The crabs are the illustrations. Use a pose before reaching for an icon: a sleeping crab for "nothing yet", a done crab for success, a failed crab for an error.
- For controls, use `PixelIcon`: eighteen icons on a 12×12 grid of square art pixels, filled with the current text colour (assets in the Icons group).
- Where only text is possible (a terminal, plain logs), use the source's glyphs: `■` in the crab's colour for a crab, `━` for done and `─` for the track of a text bar, `·` between facts.

## Intentional additions

The source was a Claude Code mod drawn in the host's own fonts and colours. To reuse it anywhere, this system adds: the sand surfaces and ink for both themes, the three typefaces, the status colours, and the components TextField, Checkbox, Tabs, Chip, SpeechBubble, Panel, EmptyState and PixelIcon, all built from the mod's own pieces (notched ends, highlight and shade rows, the ground line, the crab palettes).

## Using it in a project

Load the generated `tokens.css`, then `components/bundle.css`, then React 18 and `components/bundle.js`; everything is on `window.CrabCrew`. Without React, `window.CrabCrew.crabs` draws crabs and bars as SVG strings (`crabSvg`, `progressSvg`, `pileSvg`, `dataUri`), and `assets/Crabs/sprites.json` holds every sprite frame as text grids for any other renderer (canvas, a game engine, a terminal).
