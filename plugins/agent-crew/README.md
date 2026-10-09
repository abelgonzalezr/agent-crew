# claude-mods

Personal mods for [Claude Code](https://claude.com/claude-code).

## agent-crew

Watch Claude and its subagents work. When subagents start, a side pane opens with one line per agent:
an animated pixel figure in the agent's colour, its name, what it is doing in plain words and how long
it has been at it. Hover a row to see its type, model, tool count and task. When a batch of two or more
agents finishes you get a notice like `4 agents finished (12s)`, and the pane closes by itself.

- One colour per agent type: Explore blue, general-purpose green, Plan purple, Claude orange.
- Agents started by other agents are indented under their parent.
- An interrupted agent turns red.
- `/crew` opens or closes the pane.
- English and Spanish; picks Claude Code's `language` setting, then the system locale.

### Install

At the prompt of a Claude Code terminal session:

```
/plugin install agent-crew --marketplace abelgonzalezr/claude-mods
```

Answer `y` to add the marketplace, then pick a scope (user is the usual one).

### Options

| Option | Values | Default |
|---|---|---|
| Where agents show | `pane`, `band` (a row above the prompt) | `pane` |
| Figure size | `small`, `medium`, `large` | `medium` |
| Seconds shown after finishing | any number | `4` |
| Show in the terminal | on / off | on |
| Notify when a batch finishes | on / off | on |
| Language | `auto`, `spanish`, `english` | `auto` |

Mods use the early-access function hooks API, which may change between Claude Code releases.
Built and tested on Claude Code 2.1.293.
