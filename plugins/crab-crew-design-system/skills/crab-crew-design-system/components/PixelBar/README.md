# PixelBar

A slim pixel progress bar: done in the crab's colour with a highlight row, work under way as a softer pulsing stretch, notches between tasks, and a glint that runs along it while working.

**Use it** for any count of finished things out of a total. It always fills its container's width.

**You provide** `done`, `total`, optional `active` (started, not done), `working` (animates the pulse and glint), `color` (a crab palette name, a look, or `{body, light, shade}`; Clawd by default), `height` in CSS pixels (6 in bands, up to 10 standalone) and `label` for screen readers.

**Do** colour a crab's own bar in that crab's palette. Notches appear by themselves when each task gets at least 6 units of width.

**Don't** use it for an indeterminate wait: show a walking crab instead.
