# Crab Crew

A Claude Code mod that turns your subagents into a crew of pixel-art crabs, each one Claude Code's own crab (Clawd) with a look of its own.

Crab Crew is an extension of [savvy-progress](https://github.com/JohnnyVizz/claude-kit/tree/main/plugins/savvy-progress) by [JohnnyVizz](https://github.com/JohnnyVizz), where the idea comes from: a progress bar above the prompt and a panel of subagents as crabs. I liked the project and wanted more Clawds, so this version adds a crab of its own for every subagent, six more costumes, and a pixel-art desktop panel.

## What you get

**Progress bar above the prompt.** It appears as soon as there is something to follow: a flow reporting progress (a workflow, the task list, or the `report_progress` tool), or subagents running or planned. It shows the title, the phase, a bar of accepted tasks out of planned, and a **Crew** button that opens the panel.

**`/agents-info` panel.** Toggles a panel with running, planned and finished subagents: name, model, effort, task progress, context used, estimated cost, elapsed time and time left. `/agents-info reset` clears the flow and the finished crabs.

**The crabs.** Every crab gets its own color, eyes, markings and name, and a costume whose prop it animates while it works:

| Costume | Animation |
| --- | --- |
| Astronaut | floats in a glass helmet |
| Detective | sweeps a magnifying glass |
| Engineer | turns a wrench |
| Chef | tosses and flips an omelette |
| Racer | runs with a fluttering checkered flag |
| Swimmer | swims laps across the water and pushes its goggles up at every turn |
| Barista | pulls an espresso: the shot runs, crema forms, steam curls up |
| Coffee roaster | tends a little drum roaster while beans drop into the tray and smoke rises |
| Gamer | sits at the PC in a headset, playing a fantasy MMO on screen |
| Guitarist | strums an electric guitar with a pick, notes floating off |
| Miner | a blocky miner with a diamond pickaxe, riding a minecart along the rails |

Planned crabs doze until they start (and wake up as themselves), finished crabs celebrate, stopped ones get "x" eyes. On desktop they are animated SVG; in the terminal they are drawn with the same block glyphs as the Claude Code welcome banner.

## Credits

Based on [savvy-progress](https://github.com/JohnnyVizz/claude-kit/tree/main/plugins/savvy-progress) by JohnnyVizz (MIT). Clawd is Claude Code's own crab, drawn from its welcome banner.

## Setting

**Crab costumes** (`costume`): `crew` (default) gives every crab a different costume, drawn from all eleven; `effort` makes the costume follow the agent's effort level (max astronaut, xhigh detective, high engineer, medium chef, low racer). Change it with `/plugin configure crab-crew@diego-plugins`.

## Notes

- Cost is an estimate from Anthropic's first-party API prices.
- The `report_progress` tool is always in Claude's tool list so it can report flows, which adds a few tokens per request.

## Development

```bash
claude plugin validate plugins/crab-crew
claude plugin test plugins/crab-crew
```
