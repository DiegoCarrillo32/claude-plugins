# ProgressBand

The band that sits above a prompt or at the top of a work area: Claude's crab, the flow's title and phase, the count, the crew button, and a PixelBar.

**Use it** once per screen, for the one long job a person is watching.

**You provide** `title`, `phase`, `done`, `total`, `active`, `working`, `label` (defaults to `done/total`), `crew` (looks of the crabs at work) and `onCrew` (opens the crew panel).

The crab walks only while `working` is true. Titles and phases truncate with an ellipsis; keep the title under 40 characters.
