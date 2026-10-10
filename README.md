# claude-plugins

Diego Carrillo's Claude Code plugins: mods that change Claude Code's own interface, and design systems packaged as skills.

| Plugin | What it does |
| --- | --- |
| [crab-crew](plugins/crab-crew) | Mod: a progress bar above the prompt and a `/agents-info` panel where every subagent is its own animated pixel-art Clawd crab |
| [crab-crew-design-system](plugins/crab-crew-design-system) | Design system skill: the Crab Crew brand book, tokens, crab kit and React components, used by Claude whenever you build UI in that style |

## Install

In a Claude Code terminal session:

```
/plugin install crab-crew --marketplace DiegoCarrillo32/claude-plugins
/plugin install crab-crew-design-system --marketplace DiegoCarrillo32/claude-plugins
```

Answer `y` to add the marketplace, then pick a scope (user scope makes it available in every session).

Or from your shell:

```bash
claude plugin marketplace add DiegoCarrillo32/claude-plugins
claude plugin install crab-crew@diego-plugins --scope user
claude plugin install crab-crew-design-system@diego-plugins --scope user
```

A plugin installed at user scope also loads in the Claude desktop app's Code tab.

## Adding a plugin

Put it in `plugins/<name>/` with its own `.claude-plugin/plugin.json`, then list it in `.claude-plugin/marketplace.json`. A plugin that lives in another repository can be listed with a GitHub source instead of a path.
