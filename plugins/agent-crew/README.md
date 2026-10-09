# agent-crew

A mod for [Claude Code](https://claude.com/claude-code).

Watch Claude and its subagents work. When subagents start, a side pane opens with one line per agent:
an animated pixel figure in the agent's colour, its name, what it is doing in plain words and how long
it has been at it. Hover a row to see its type, model, tool count and task. When a batch of two or more
agents finishes you get a notice like `4 agents finished (12s)`, and the pane closes by itself.

- One colour per agent type: Explore blue, general-purpose green, Plan purple, Claude orange.
- Agents started by other agents are indented under their parent.
- An interrupted agent turns red.
- `/crew` opens or closes the pane.
- English or Spanish, set in the plugin options.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install agent-crew --marketplace abelgonzalezr/agent-crew
```

Answer `y` to add the marketplace, then pick a scope (user is the usual one).

## Options

| Option | Values | Default |
|---|---|---|
| Where agents show | `pane`, `band` (a row above the prompt) | `pane` |
| Figure size | `small`, `medium`, `large` | `medium` |
| Seconds shown after finishing | any number | `4` |
| Show in the terminal | on / off | on |
| Notify when a batch finishes | on / off | on |
| Language | `english`, `spanish` | `english` |

## What it hooks

The mod only watches; it never changes, blocks or rewrites anything it sees.

- `prompt.submit`, `agent.spawn`, `tool.call`, `turn.complete`: read to know which agents run, the tool each one is using and when it ends. Each hook passes the event on unchanged.
- `session.start`: registers the `/crew` command.
- `ui.render`: draws its own pane (and, in `band` placement, a row above the prompt).

It reads no files, settings, environment variables or credentials, and sends nothing over the network.

Mods use the early-access function hooks API, which may change between Claude Code releases.
Built and tested on Claude Code 2.1.293.

## Privacy

agent-crew collects, stores and sends no data. See [PRIVACY.md](https://github.com/abelgonzalezr/agent-crew/blob/main/plugins/agent-crew/PRIVACY.md).
