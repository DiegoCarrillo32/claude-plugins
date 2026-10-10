---
name: crab-crew-design-system
description: The Crab Crew pixel-art design system. Use when building or styling UI in the Crab Crew look (Claude's crab Clawd and a crew of pixel crabs for agents, jobs, queues, builds or any progress), or when asked for the crab crew, Clawd or pixel-crab style: brand rules, colour and type tokens, the crab kit and sprites, and React components.
---

# Crab Crew design system

A pixel-art interface where every worker is a crab: Claude's own crab, Clawd, leads, and each helper gets a crab of its own colour, eyes, markings, name and costume. Everything else is built from the same pixels: notched corners, highlight and shade rows, a dashed ground line, hard shadows.

## Read first

1. `README.md`: the brand book. Voice, colour, type, pixels and spacing, motion, iconography. Follow its rules; they name the tokens to use.
2. `crab-kit.md`: how a crab's look is chosen (palettes, eyes, markings, costumes, poses, names) and the sprite format.
3. `components/<Name>/README.md` for each component you use, and `components/index.d.ts` for its props.

## Files

| Path | What |
| --- | --- |
| `tokens.json` | Every token with a usage note: colours for the Day and Night themes, type, spacing, notches, borders, shadows |
| `tokens.css` | The same tokens as CSS custom properties; Night applies under `prefers-color-scheme: dark` or `data-theme="dark"` |
| `components/bundle.css` | Component styles (`cc-` prefix); imports the three Google Fonts |
| `components/bundle.js` | React 18 components plus `CrabCrew.crabs` (crab and bar SVG helpers), all on `window.CrabCrew` |
| `components/<Name>/preview.html` | A small live example of each component |
| `assets/Crabs/` | Clawd in every pose and costume as SVG, reference sheets, and `sprites.json` with every frame as text grids |
| `assets/Icons/` | Eighteen 12×12 pixel icons as SVG |

Components: Button, Checkbox, Chip, Crab, CrabPile, CrewCard, CrewRow, EmptyState, Facts, Panel, PixelBar, PixelIcon, ProgressBand, SectionLabel, SpeechBubble, Tabs, TextField.

## Using it in a project

Copy the files you need into the project. In a page, load `tokens.css`, then `components/bundle.css`, then React 18 and `components/bundle.js`; everything is on `window.CrabCrew`. Without React, `CrabCrew.crabs` draws crabs and bars as SVG strings (`crabSvg`, `progressSvg`, `pileSvg`, `dataUri`), and `assets/Crabs/sprites.json` feeds any other renderer (canvas, a game engine, a terminal).

Keep to the system: no rounded corners (notch instead), no blurred shadows, no emoji, crabs at whole-pixel scales only, and `clawd` as the single accent.
