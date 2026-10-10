# Crab kit

Every crab is Clawd's body on a 32×20 grid of square art pixels, with a look applied on top. The sprite data lives in `assets/Crabs/sprites.json`; the `Crab` component and `CrabCrew.crabs.crabSvg` draw it.

## A look

A look is five choices, made once and kept for the life of the thing the crab stands for.

| Part | Choices |
| --- | --- |
| Colour (`palette`) | Clawd, Amber, Sand, Moss, Sage, Jade, Teal, Sky, Periwinkle, Lavender, Plum, Rose, Cherry, Cocoa, Slate, Graphite |
| Eyes (`eye`) | classic, wide, sparkly, beady, side-eye, happy, sleepy, determined, tall, glint |
| Markings (`texture`) | plain, freckles, underside, stripes, spots, cap, cheeks, claws, peak, patch, mottled |
| Costume (`tier`) | astronaut, detective, engineer, chef, racer |
| Name | 80 names from Pinch and Bobbin to Bramble and Crumpet; a repeat gets a number ("Kelp 2") |

- Give out looks with `CrabCrew.crabs.pickLook(seed, taken)`. The seed (an id) makes the pick stable; `taken` (the looks already on screen) steers each part to the least-used choice, so no two crabs on one screen match.
- Clawd (`palette` 0, classic eyes, plain) is Claude's own crab. Give it to nothing else.
- Each palette is a body and a shade colour (`crab-<name>` and `crab-<name>-shade` in the tokens). Markings paint shade pixels onto the body; eyes are always `crab-eye`.

## Costumes

Each costume animates a prop. Costumes can be handed out for variety (every crab different) or to mean something; the source maps them to effort, top first.

| Costume | Prop | Motion | Frame | Effort in the source |
| --- | --- | --- | --- | --- |
| astronaut | a glass helmet and an air tank, rising bubbles | floats, 3 art px/s | 180 ms × 8 | max |
| detective | a hat and a sweeping magnifier | walks, 9 art px/s | 170 ms × 8 | xhigh |
| engineer | a hard hat and a turning wrench | walks, 9 art px/s | 150 ms × 8 | high |
| chef | a toque and an omelette tossed from the pan | walks, 9 art px/s | 150 ms × 8 | medium |
| racer | a trailing red headband and a checkered flag, kicking up dust | runs, 24 art px/s | 100 ms × 4 | low |

## Poses

| Pose | Means | Frames |
| --- | --- | --- |
| walk | working, no costume | 160 ms × 4 |
| done | finished: happy eyes and a twinkling star | 160 ms × 6 |
| failed | stopped: crossed-out eyes and a grey puff | 300 ms × 4 |
| sleep | waiting its turn: Zs rising | 260 ms × 6 |

A crab that has not started yet can also be drawn as a `ghost` (desaturated and lighter).

## Crops

| Crop | Grid | Use |
| --- | --- | --- |
| full | 32×20 | a crab in its lane, illustrations |
| portrait | 24×15 from (4, 4) | rows, empty states, speech bubbles |
| body | 18×11 from (7, 7) | the band, small headers |
| pile | 18×10 faces, 2 apart | `CrabPile` in buttons and counts |

## Lanes

A working crab walks a lane: its image is `lane` art pixels wide, it steps one art pixel at a time to the far end, turns, and walks back. The source uses a 56-pixel lane on cards. `ground` draws the dashed ground line (2 on, 1 off) along its feet. Give crabs side by side different `offset`s so they don't march in step.

## Sprite format

`sprites.json` has `tiers` (the five costumes), `poses` (walk, done, failed, sleep) and `kit` (eye colour, glint, palettes, eyes, textures, names). Each sheet has `motion`, `frameMs`, a `palette` of letter → colour, the body's position per frame, and `frames`: arrays of 20 strings, 32 characters each, one character per art pixel. `.` is clear, `B` body, `S` shade, `K` eye, `W` glint; other letters are the costume's own colours. Recolour a crab by mapping `B` and `S` to a palette; restyle eyes by replacing the two `K` columns.
