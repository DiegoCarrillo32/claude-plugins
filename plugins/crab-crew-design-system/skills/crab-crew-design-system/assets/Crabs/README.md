# Crabs

Clawd in every pose and costume, plus reference sheets of the kit, generated from `sprites.json` by the crab engine. All are SVG on whole art pixels (`shape-rendering: crispEdges`) in the crabs' own fixed colours, so they read on both Day and Night sand.

- `clawd-walk.svg`, `clawd-done.svg`, `clawd-failed.svg`, `clawd-sleep.svg`: the four poses, portrait crop, 4 CSS px an art pixel, animated (SMIL) when shown as an image.
- `clawd-astronaut.svg`, `clawd-detective.svg`, `clawd-engineer.svg`, `clawd-chef.svg`, `clawd-racer.svg`: Clawd in each costume, full 32×20 grid, animated in place.
- `sheet-colours.svg`, `sheet-eyes.svg`, `sheet-markings.svg`: still reference sheets of the 16 palettes, 10 eye styles and 11 markings, in kit order.
- `sprites.json`: every frame of every sheet as text grids, plus palettes, eyes, markings and names. The source of truth; format in the Crab kit section.

For anything live (other colours, walking lanes, ghosts), draw crabs with the `Crab` component or `CrabCrew.crabs.crabSvg` instead of these files.
