# Crab Crew design system

The pixel-art design system behind [crab-crew](../crab-crew), packaged as a Claude Code skill. Once installed, Claude uses it whenever you build UI in the Crab Crew style: Claude's crab Clawd and a crew of pixel crabs for agents, jobs, queues and progress, on sand surfaces with notched corners.

## Install

```
/plugin install crab-crew-design-system --marketplace DiegoCarrillo32/claude-plugins
```

## What's inside

Everything is in [`skills/crab-crew-design-system`](skills/crab-crew-design-system):

- **Brand book** (`README.md`): voice, colour, type, pixels, motion, iconography.
- **Crab kit** (`crab-kit.md`): 16 palettes, 10 eye styles, 11 markings, 5 costumes, 4 poses, 80 names, and the sprite format.
- **Tokens**: `tokens.json` and `tokens.css`, Day and Night themes.
- **Components**: 17 React 18 components in `components/bundle.js` and `bundle.css`, each with a README and a live preview.
- **Assets**: Clawd in every pose and costume, kit reference sheets and 18 pixel icons as SVG; every sprite frame in `assets/Crabs/sprites.json`.

Fonts (Pixelify Sans, Silkscreen, Geist Mono) load from Google Fonts.
