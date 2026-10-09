export type Crewmate = {
  id: string
  /** The agent that started this one: '' for Claude, 'main' for Claude's own agents. */
  parentId: string
  label: string
  /** The agent type (`Explore`, `general-purpose`, ...), or `Claude`. */
  kind: string
  color: string
  tool: string
  /** The task it was given, cut short; '' for Claude. */
  task: string
  /** Short model name (`haiku`, `opus`), '' when unknown. */
  model: string
  startedAt: number
  tools: number
  isDone: boolean
  isFailed: boolean
  doneAt: number
}

declare module 'claude-code' {
  interface PluginState {
    'agent-crew': { crew: Crewmate[]; frame: number; now: number; isHidden: boolean }
  }
}
