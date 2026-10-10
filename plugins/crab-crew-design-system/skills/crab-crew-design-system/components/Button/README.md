# Button

A pixel slab with a highlight row on top and a shade row below. Pressed, it drops 2px and loses its shade.

**Variants**
- `primary`: a clawd fill with on-clawd text. One per view, for the action that starts work.
- `secondary`: sand-raised with a line-strong frame. The default, and what the source's panel buttons use ("Crew 3", "Clear done").
- `quiet`: no frame. For low-stakes actions beside others ("Reset").

**You provide** `children` (a verb, or a noun with a count: "Start flow", "Clear done", "Crew 3"), `size` (`md` 36px, `sm` 28px), and an optional `icon` (a PixelIcon at 16 or a CrabPile). All native button attributes pass through.

Labels set in the label face, uppercase by CSS: write them in sentence case in code.
