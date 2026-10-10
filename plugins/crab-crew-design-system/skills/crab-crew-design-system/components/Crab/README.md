# Crab

A pixel-art crab on the 32×20 art grid, drawn as a self-animating SVG image that stays crisp at any whole-number scale.

**Use it** to give a person, an agent, a job or a record a face. One crab stands for one thing, and that thing keeps its crab for its whole life.

**You provide**
- `look`: a seed string (`look="agent-7f3a"` always draws the same crab), a look object (`{ palette: 'Jade', eye: 'happy', texture: 'stripes', tier: 'chef', name: 'Barnacle' }`), or nothing for Clawd.
- `pose`: `walk`, `done`, `failed`, `sleep`, a costume (`astronaut`, `detective`, `engineer`, `chef`, `racer`), or `costume` for the look's own.
- `moving` with a `lane` wider than 32 makes it walk across and turn at the ends; `ground` draws the dashed ground line under it.
- `crop`: `full` (32×20), `portrait` (24×15, for rows), `body` (18×11, for a band or a button), or exact rows and columns.
- `scale`: CSS pixels per art pixel. Use whole numbers: 2 in lists, 3 for empty states, 4 for illustrations.
- `alt`: what the crab means here ("Barnacle the engineer, working"). Pass `alt=""` when the text beside it already says so.

**Do**
- Pick looks with `CrabCrew.crabs.pickLook(seed, taken)` so crabs on one screen never match.
- Let pose carry state: walking means working, `done` means finished, `failed` means stopped, `sleep` means waiting.
- Pair every state pose with a word for people who cannot see it.

**Don't**
- Scale by fractions, blur, rotate or recolor a crab outside its palettes.
- Use a crab as decoration with no meaning: if nothing on screen is a crab, draw none.

Motion respects `prefers-reduced-motion`: crabs hold their first frame.
