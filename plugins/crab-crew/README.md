# Crab Crew

A Claude Code mod that turns your subagents into a crew of pixel-art crabs. Every crab is Claude Code's own crab, Clawd, with a look of its own: its own colour, eyes, markings, name and costume, and it walks, swims, roasts or rocks while its subagent works.

![The whole crew: eleven costumes, each worn by a different crab](../../docs/clawds/crew.png)

Crab Crew is an extension of [savvy-progress](https://github.com/JohnnyVizz/claude-kit/tree/main/plugins/savvy-progress) by [JohnnyVizz](https://github.com/JohnnyVizz). The idea of a progress bar above the prompt and a panel of subagents as crabs comes from there. I liked the project and wanted more Clawds, so Crab Crew builds on it; see [what's different](#whats-different-from-savvy-progress).

## What you get

**Progress bar above the prompt.** Clawd, the flow's title and phase, a slim pixel bar of accepted tasks out of planned (one notch per task), and a **Crew** button that opens the panel. It appears whenever there is something to follow: a flow reporting progress (a workflow, the task list, or the `report_progress` tool), or subagents running or planned, so you can follow along without opening the panel.

**`/agents-info` panel.** Running, planned and finished subagents. Each running crab gets a card in its own colour: the crab at work in its lane, its name and costume, the task, what it is doing right now ("Reading session.ts"), model, effort, task progress, context used, estimated cost, elapsed time and time left. Planned crabs doze until they start and then wake up as themselves; finished crabs celebrate; stopped ones get crossed-out eyes. `/agents-info reset` clears the flow and the finished crabs.

## The Clawds

### Five classic costumes

The five tiers savvy-progress introduced, redrawn as pixel art on Clawd's exact banner proportions.

| | Costume | Animation |
| --- | --- | --- |
| <img src="../../docs/clawds/costumes/astronaut.svg" alt="Astronaut" width="224"> | Astronaut | floats in a glass helmet, an air tank puffing |
| <img src="../../docs/clawds/costumes/detective.svg" alt="Detective" width="224"> | Detective | sweeps a magnifying glass along the ground |
| <img src="../../docs/clawds/costumes/engineer.svg" alt="Engineer" width="224"> | Engineer | turns a wrench in a hard hat |
| <img src="../../docs/clawds/costumes/chef.svg" alt="Chef" width="224"> | Chef | tosses and flips an omelette |
| <img src="../../docs/clawds/costumes/racer.svg" alt="Racer" width="224"> | Racer | runs with a fluttering checkered flag |

### Six new Clawds

New in Crab Crew.

![The six new Clawds](../../docs/clawds/new-six.png)

| | Costume | Animation |
| --- | --- | --- |
| <img src="../../docs/clawds/costumes/swimmer.svg" alt="Swimmer" width="224"> | Swimmer | swims laps across the water and pushes its goggles up at every turn |
| <img src="../../docs/clawds/costumes/barista.svg" alt="Barista" width="224"> | Barista | pulls an espresso: the shot runs, crema forms, steam curls up |
| <img src="../../docs/clawds/costumes/roaster.svg" alt="Coffee roaster" width="224"> | Coffee roaster | tends a little drum roaster while beans drop into the tray and smoke rises |
| <img src="../../docs/clawds/costumes/gamer.svg" alt="Gamer" width="224"> | Gamer | sits at the PC in a headset, playing a fantasy MMO on screen |
| <img src="../../docs/clawds/costumes/guitarist.svg" alt="Guitarist" width="224"> | Guitarist | strums an electric guitar with a pick, notes floating off |
| <img src="../../docs/clawds/costumes/miner.svg" alt="Miner" width="224"> | Miner | a blocky miner with a diamond pickaxe, riding a minecart along the rails |

### Poses

| <img src="../../docs/clawds/poses/walk.svg" alt="Walk" width="128"> | <img src="../../docs/clawds/poses/done.svg" alt="Done" width="128"> | <img src="../../docs/clawds/poses/failed.svg" alt="Stopped" width="128"> | <img src="../../docs/clawds/poses/sleep.svg" alt="Planned" width="128"> |
| --- | --- | --- | --- |
| working | done | stopped | planned, dozing |

### Every crab is its own

Each subagent gets a look that no other crab on screen has: one of 16 colours, 10 eye styles and 11 markings, a costume, and one of 80 names ("Barnacle the engineer"). A planned crab keeps its look when it starts.

![Twelve crabs, no two alike](../../docs/clawds/individuality.png)

## What's different from savvy-progress

| | savvy-progress | Crab Crew |
| --- | --- | --- |
| Costumes | 5, one per savvy tier | 11: the five classics redrawn plus swimmer, barista, coffee roaster, gamer, guitarist and miner |
| Crab identity | by tier | every crab unique: 16 colours × 10 eyes × 11 markings, 80 names |
| Art | animated crabs | pixel art on Clawd's exact banner grid; animated SVG on desktop, banner-style block glyphs in the terminal |
| Lanes | working crabs walk | walking, swimming (water, goggles up at each turn), rolling on rails, floating, or at a desk or machine |
| Progress bar | appears when savvy-flow reports | also appears whenever subagents are running or planned |
| Design system | none | the [Crab Crew design system](../crab-crew-design-system): tokens, crab kit, sprites and React components to build more crab UIs |

## Design system

The look of Crab Crew is written down as the [Crab Crew design system](../crab-crew-design-system), a separate skill plugin: colour and type tokens for Day and Night themes, the crab kit, every sprite as text grids, and React components (crew cards, pixel bars, crab piles, speech bubbles and more). Install it to have Claude build other interfaces in the same style.

| ![Colours](../crab-crew-design-system/skills/crab-crew-design-system/assets/Crabs/sheet-colours.svg) | ![Eyes](../crab-crew-design-system/skills/crab-crew-design-system/assets/Crabs/sheet-eyes.svg) | ![Markings](../crab-crew-design-system/skills/crab-crew-design-system/assets/Crabs/sheet-markings.svg) |
| --- | --- | --- |
| 16 colours | 10 eye styles | 11 markings |

## Setting

**Crab costumes** (`costume`): `crew` (default) gives every crab a different costume, drawn from all eleven; `effort` makes the costume follow the agent's effort level (max astronaut, xhigh detective, high engineer, medium chef, low racer). Change it with `/plugin configure crab-crew@diego-plugins`.

## Notes

- Cost is an estimate from Anthropic's first-party API prices.
- The `report_progress` tool is always in Claude's tool list so it can report flows, which adds a few tokens per request.

## Credits

Based on [savvy-progress](https://github.com/JohnnyVizz/claude-kit/tree/main/plugins/savvy-progress) by JohnnyVizz (MIT). Clawd is Claude Code's own crab, drawn from its welcome banner.

## Development

```bash
claude plugin validate plugins/crab-crew
claude plugin test plugins/crab-crew
```
