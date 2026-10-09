import type { EngineInterface as Engine, Register, Timer } from 'claude-code'

import type { Crewmate } from '../types'

const CREW = { plugin: 'agent-crew', key: 'crew' } as const
const FRAME = { plugin: 'agent-crew', key: 'frame' } as const
const PANE = 'agent-crew'
const NOW = { plugin: 'agent-crew', key: 'now' } as const
const HIDDEN = { plugin: 'agent-crew', key: 'isHidden' } as const

export const MAIN = 'main'
const CLAUDE = '#D97757'
const FAILED = '#E5534B'
// One colour per agent type, so a type reads the same in every session.
const KIND_COLORS: Record<string, string> = {
  Explore: '#5B9BD5',
  'general-purpose': '#6BBF59',
  Plan: '#B87FD9',
  'claude-code-guide': '#56B6C2',
  fork: '#F0864A',
}
const COLORS = ['#E5C07B', '#E06C9F', '#C8C8C8', '#8FBC8F', '#D4A5FF', '#7FD1C7']
const TICK_MS = 280
const MAX_CHIPS = 6
const LABEL = 18

// Clawd in pixels: 13 x 8 cells, eyes left as holes so the theme shows through.
const BODY_PX = [
  '..XXXXXXXXX..',
  '..X.XXXXX.X..',
  '..XXXXXXXXX..',
  'XXXXXXXXXXXXX',
  '..XXXXXXXXX..',
  '..XXXXXXXXX..',
]
const LEGS_A = '..X.X...X.X..'
const LEGS_B = '...X.X.X.X...'

function cells(rows: string[], top: number): string {
  return rows
    .flatMap((row, y) =>
      [...row].map((c, x) => (c === 'X' ? `<rect x="${x}" y="${y + top}" width="1" height="1"/>` : '')),
    )
    .join('')
}

export function clawd(color: string, isDone: boolean, delay: number): string {
  const begin = `${(delay * 0.15).toFixed(2)}s`
  const body = cells(BODY_PX, 0)
  if (isDone) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -1 13 9" shape-rendering="crispEdges"><g fill="${color}" opacity="0.4">${body}${cells([LEGS_A], 6)}</g></svg>`
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -1 13 9" shape-rendering="crispEdges"><g fill="${color}">` +
    `<g>${body}<animateTransform attributeName="transform" type="translate" values="0 0;0 -1;0 0" dur="0.6s" begin="${begin}" repeatCount="indefinite"/></g>` +
    `<g>${cells([LEGS_A], 6)}<animate attributeName="opacity" values="1;0;1" dur="0.6s" begin="${begin}" repeatCount="indefinite" calcMode="discrete"/></g>` +
    `<g opacity="0">${cells([LEGS_B], 6)}<animate attributeName="opacity" values="0;1;0" dur="0.6s" begin="${begin}" repeatCount="indefinite" calcMode="discrete"/></g>` +
    `</g></svg>`
  )
}

// Terminal: one glyph per agent, two frames.
const GLYPH = ['▟█▙', '▜█▛']

export function glyph(step: number, isDone: boolean): string {
  return isDone ? '▟█▙' : GLYPH[step % GLYPH.length]
}

export function colorFor(kind: string): string {
  const known = KIND_COLORS[kind]
  if (known) return known
  const sum = [...kind].reduce((total, c) => total + c.charCodeAt(0), 0)

  return COLORS[sum % COLORS.length] ?? COLORS[0]!
}

export function shortModel(model: string): string {
  return /(haiku|sonnet|opus|fable)/i.exec(model)?.[1]?.toLowerCase() ?? ''
}

export function elapsed(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000))
  if (seconds < 60) return `${seconds}s`

  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`
}

export function summary(mate: Crewmate, now: number, lang: Lang): string {
  const end = mate.isDone ? mate.doneAt : now
  const tools = TEXT[lang].tools(mate.tools)
  const kind = mate.id === MAIN ? TEXT[lang].mainAgent : mate.kind

  return [kind, mate.model, elapsed(end - mate.startedAt), tools].filter(Boolean).join(' · ')
}

export type Lang = 'es' | 'en'

// Claude's own states, kept apart from tool names.
export const THINKING = '@thinking'
export const WAITING = '@waiting'

const TEXT = {
  es: {
    doing: {
      Read: 'leyendo', Grep: 'buscando', Glob: 'buscando', LSP: 'buscando',
      Bash: 'ejecutando', Edit: 'editando', Write: 'escribiendo', NotebookEdit: 'editando',
      Agent: 'delegando', WebSearch: 'investigando', WebFetch: 'leyendo web', Skill: 'preparando',
      ToolSearch: 'preparando', [THINKING]: 'pensando', [WAITING]: 'esperando',
    } as Record<string, string>,
    mcp: 'consultando',
    other: 'trabajando',
    tools: (n: number) => (n === 1 ? '1 herramienta' : `${n} herramientas`),
    mainAgent: 'agente principal',
    working: (n: number) => `${n} trabajando`,
    finished: (n: number) => `${n} listos`,
    idle: 'Sin agentes trabajando.',
    more: (n: number) => `+${n} más`,
    interrupted: 'interrumpido',
    batchOk: (n: number) => (n === 1 ? '1 agente terminó' : `${n} agentes terminaron`),
    batchFailed: (n: number) => (n === 1 ? '1 interrumpido' : `${n} interrumpidos`),
    title: 'Agentes',
    command: 'Muestra u oculta los agentes',
    paneOpened: 'Panel de agentes abierto.',
    paneClosed: 'Panel de agentes cerrado.',
    bandHidden: 'Figuras de agentes ocultas.',
    bandShown: 'Figuras de agentes visibles.',
  },
  en: {
    doing: {
      Read: 'reading', Grep: 'searching', Glob: 'searching', LSP: 'searching',
      Bash: 'running', Edit: 'editing', Write: 'writing', NotebookEdit: 'editing',
      Agent: 'delegating', WebSearch: 'researching', WebFetch: 'reading web', Skill: 'preparing',
      ToolSearch: 'preparing', [THINKING]: 'thinking', [WAITING]: 'waiting',
    } as Record<string, string>,
    mcp: 'querying',
    other: 'working',
    tools: (n: number) => (n === 1 ? '1 tool' : `${n} tools`),
    mainAgent: 'main agent',
    working: (n: number) => `${n} working`,
    finished: (n: number) => `${n} done`,
    idle: 'No agents working.',
    more: (n: number) => `+${n} more`,
    interrupted: 'interrupted',
    batchOk: (n: number) => (n === 1 ? '1 agent finished' : `${n} agents finished`),
    batchFailed: (n: number) => `${n} interrupted`,
    title: 'Agents',
    command: 'Show or hide the agents',
    paneOpened: 'Agents pane opened.',
    paneClosed: 'Agents pane closed.',
    bandHidden: 'Agent figures hidden.',
    bandShown: 'Agent figures shown.',
  },
}

// The option wins; then Claude Code's `language` setting; then the system locale; English otherwise.
export function detectLang(option: unknown, setting: unknown, locale: string | undefined): Lang {
  if (option === 'spanish') return 'es'
  if (option === 'english') return 'en'
  const read = (value: unknown): Lang | undefined => {
    if (typeof value !== 'string') return undefined
    const v = value.trim().toLowerCase()
    if (/^(es|spa|spanish|español|espanol|castellano)\b/.test(v)) return 'es'
    if (/^(en|eng|english|inglés|ingles)\b/.test(v)) return 'en'
    return undefined
  }

  return read(setting) ?? read(locale?.split(/[_.@-]/)[0]) ?? 'en'
}

export function doing(tool: string, lang: Lang): string {
  const text = TEXT[lang]
  if (tool.startsWith('mcp__')) return text.mcp

  return text.doing[tool] ?? text.other
}

// One compact line under the hover: model and tool count, no agent type for Claude.
export function detail(mate: Crewmate, lang: Lang): string {
  const tools = TEXT[lang].tools(mate.tools)
  const kind = mate.id === MAIN ? '' : mate.kind

  return [kind, mate.model, tools].filter(Boolean).join(' · ')
}

export function cut(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim()

  return flat.length > max ? flat.slice(0, max - 1) + '…' : flat
}

// A stable stagger per agent, so a redraw never restarts its step.
export function phase(id: string): number {
  return [...id].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 4
}

export function fit(text: string): string {
  return text.length > LABEL ? text.slice(0, LABEL - 1) + '…' : text
}

export type Config = { placement: 'pane' | 'band'; size: 'small' | 'medium' | 'large'; lingerMs: number; showInTerminal: boolean; batchToast: boolean }

const SIZES = { small: [16, 11], medium: [20, 14], large: [28, 20] } as const

export function readConfig(options: Readonly<Record<string, unknown>>): Config {
  const size = options.size === 'small' || options.size === 'large' ? options.size : 'medium'
  const seconds = typeof options.lingerSeconds === 'number' && options.lingerSeconds >= 0 ? options.lingerSeconds : 4

  return {
    placement: options.placement === 'band' ? 'band' : 'pane',
    size,
    lingerMs: Math.min(seconds, 600) * 1000,
    showInTerminal: options.showInTerminal !== false,
    batchToast: options.batchToast !== false,
  }
}

export function figureSize(size: Config['size'], isNested: boolean): { width: number; height: number } {
  const [width, height] = SIZES[size]

  return isNested ? { width: Math.round(width * 0.7), height: Math.round(height * 0.7) } : { width, height }
}

// What a finished batch of subagents says; nothing for a lone agent.
export function batchMessage(count: number, failed: number, ms: number, lang: Lang): string | undefined {
  if (count < 2) return undefined
  const ok = count - failed
  const parts: string[] = []
  if (ok > 0) parts.push(TEXT[lang].batchOk(ok))
  if (failed > 0) parts.push(TEXT[lang].batchFailed(failed))

  return `${parts.join(', ')} (${elapsed(ms)})`
}

export function prune(list: Crewmate[], now: number, lingerMs: number): Crewmate[] {
  return list.filter(one => !one.isDone || now - one.doneAt < lingerMs)
}

export function upsert(list: Crewmate[], mate: Crewmate): Crewmate[] {
  return [...list.filter(one => one.id !== mate.id), mate]
}

export function isActive(one: Crewmate): boolean {
  return !one.isDone
}

// Claude first, every agent followed by the agents it started.
export function arrange(list: Crewmate[]): Crewmate[] {
  const out: Crewmate[] = []
  const place = (parentId: string) => {
    for (const one of list) {
      if (one.parentId === parentId && !out.includes(one)) {
        out.push(one)
        place(one.id)
      }
    }
  }
  place('')
  for (const one of list) if (!out.includes(one)) out.push(one)

  return out
}

// At most `max` chips; the rest are counted. Working agents win the seats.
export function seat(list: Crewmate[], max: number): { shown: Crewmate[]; more: number } {
  if (list.length <= max) return { shown: list, more: 0 }
  const keep = new Set([...list.filter(isActive), ...list.filter(one => !isActive(one))].slice(0, max))

  return { shown: list.filter(one => keep.has(one)), more: list.length - keep.size }
}

// Claude's turn ended: it waits while its agents work, and is done once none are left.
export function settleMain(list: Crewmate[], now: number, turnEnded: boolean): Crewmate[] {
  const others = list.some(one => one.id !== MAIN && isActive(one))

  return list.map(one => {
    if (one.id !== MAIN || one.isDone) return one
    if (others && (turnEnded || one.tool === WAITING)) return { ...one, tool: WAITING }
    if (turnEnded || one.tool === WAITING) return { ...one, isDone: true, doneAt: now }

    return one
  })
}

// The module owns the list; $.state carries a snapshot for the band to draw.
let mates: Crewmate[] = []
let frame = 0
let tick: Timer | undefined
let config: Config = readConfig({})
// The current batch of subagents: since the first started while none ran.
let batch = { startedAt: 0, count: 0, failed: 0 }
// True while the pane is open because agents started, not because the person asked.
let autoOpened = false
let lang: Lang = 'en'
// Agents whose turn ended before their spawn hook recorded them.
const endedEarly = new Map<string, { at: number; isFailed: boolean }>()

async function isPaneOpen($: Engine): Promise<boolean> {
  return (await $.ui.panes()).some(pane => pane.id === PANE)
}

async function openPane($: Engine) {
  if (config.placement !== 'pane' || (await isPaneOpen($))) return
  autoOpened = true
  await $.ui.open({ id: PANE, title: TEXT[lang].title })
}

// Marks a subagent done and, when it was the batch's last, announces the batch.
function finishAgent($: Engine, id: string, now: number, isFailed: boolean) {
  const wasActive = mates.some(one => one.id === id && isActive(one))
  mates = mates.map(one => (one.id === id ? { ...one, isDone: true, isFailed, doneAt: now } : one))
  if (wasActive && isFailed) batch = { ...batch, failed: batch.failed + 1 }
  if (wasActive && !mates.some(one => one.id !== MAIN && isActive(one))) {
    const text = batchMessage(batch.count, batch.failed, now - batch.startedAt, lang)
    if (text && config.batchToast) $.ui.toast(text)
    batch = { startedAt: 0, count: 0, failed: 0 }
  }
}

function ensureTicking($: Engine) {
  if (tick !== undefined) return
  tick = $.clock.every(TICK_MS, async () => {
    const kept = prune(mates, await $.clock.now(), config.lingerMs)
    if (kept.length !== mates.length) {
      mates = kept
      await $.state.set(CREW, mates)
    }
    if (mates.length === 0) {
      tick?.cancel()
      tick = undefined
      if (autoOpened) {
        autoOpened = false
        await $.ui.close({ id: PANE })
      }
      return
    }
    frame = (frame + 1) % 1000
    await $.state.set(FRAME, frame)
  })
}

export const register: Register = (on, options) => {
  config = readConfig(options)

  let isHidden = false

  on('session.start', async ($, e, next) => {
    // A reload starts the module over; take the list back from the session's state.
    const { value: kept = [] } = await $.state.get(CREW)
    if (mates.length === 0 && kept.length > 0) {
      mates = kept
      const active = mates.filter(one => one.id !== MAIN && isActive(one))
      batch = { startedAt: Math.min(...active.map(one => one.startedAt), await $.clock.now()), count: active.length, failed: 0 }
      ensureTicking($)
    }
    const settings = (await $.settings.read()) as { language?: unknown }
    lang = detectLang(options.language, settings.language, (await $.env.get('LC_ALL')) || (await $.env.get('LANG')))
    await $.command.register({ name: 'crew', description: TEXT[lang].command })

    return next(e)
  })

  on('command.run', { command: 'crew' }, async ($, e) => {
    if (config.placement === 'pane') {
      autoOpened = false
      if (await isPaneOpen($)) {
        await $.ui.close({ id: PANE })
        return { text: TEXT[lang].paneClosed }
      }
      await $.ui.open({ id: PANE, title: TEXT[lang].title })
      return { text: TEXT[lang].paneOpened }
    }
    isHidden = isHidden === false
    await $.state.set(HIDDEN, isHidden)

    return { text: isHidden ? TEXT[lang].bandHidden : TEXT[lang].bandShown }
  })

  function claude(tool: string, now: number): Crewmate {
    return {
      id: MAIN, parentId: '', label: 'Claude', kind: 'Claude', color: CLAUDE, tool, task: '',
      model: '', startedAt: now, tools: 0, isDone: false, isFailed: false, doneAt: 0,
    }
  }

  on('prompt.submit', async ($, e, next) => {
    mates = upsert(mates, claude(THINKING, await $.clock.now()))
    await $.state.set(CREW, mates)
    ensureTicking($)

    return next(e)
  })

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    if (started.agentId) {
      const kind = e.subagentType
      const startedAt = await $.clock.now()
      const isNew = !mates.some(one => one.id === started.agentId)
      if (isNew) {
        if (!mates.some(one => one.id !== MAIN && isActive(one))) batch = { startedAt, count: 0, failed: 0 }
        batch = { ...batch, count: batch.count + 1 }
      }
      const mate: Crewmate = {
        id: started.agentId,
        parentId: e.parentAgentId ?? MAIN,
        label: e.name || e.description || kind,
        kind,
        color: colorFor(kind),
        tool: kind,
        task: cut(e.prompt, 220),
        model: shortModel(started.model),
        startedAt,
        tools: 0,
        isDone: false,
        isFailed: false,
        doneAt: 0,
      }
      mates = upsert(mates, mate)
      const ended = endedEarly.get(started.agentId)
      if (ended) {
        endedEarly.delete(started.agentId)
        finishAgent($, started.agentId, ended.at, ended.isFailed)
        mates = settleMain(mates, ended.at, false)
      }
      await $.state.set(CREW, mates)
      ensureTicking($)
      await openPane($)
    }

    return started
  })

  on('tool.call', async ($, e, next) => {
    const id = e.agentId ?? MAIN
    // A turn that no prompt started (a background agent's report) still shows Claude.
    if (id === MAIN && !mates.some(one => one.id === MAIN && isActive(one))) {
      mates = upsert(mates, claude(e.tool, await $.clock.now()))
      ensureTicking($)
    }
    mates = mates.map(one => (one.id === id && isActive(one) ? { ...one, tool: e.tool, tools: one.tools + 1 } : one))
    await $.state.set(CREW, mates)
    const ran = await next(e)
    if (id === MAIN) {
      mates = mates.map(one => (one.id === MAIN && one.tool === e.tool ? { ...one, tool: THINKING } : one))
      await $.state.set(CREW, mates)
    }

    return ran
  })

  on('turn.complete', async ($, e, next) => {
    const id = (e as { agentId?: string }).agentId ?? MAIN
    const now = await $.clock.now()
    const isFailed = e.isAborted
    if (id !== MAIN && !mates.some(one => one.id === id)) {
      endedEarly.set(id, { at: now, isFailed })
    } else if (id !== MAIN) {
      finishAgent($, id, now, isFailed)
    } else if (isFailed) {
      mates = mates.map(one => (one.id === MAIN ? { ...one, isDone: true, isFailed, doneAt: now } : one))
    }
    mates = settleMain(mates, now, id === MAIN)
    await $.state.set(CREW, mates)

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { value: list = [] } = await $.state.get(CREW)
    // Read so the pane redraws every second; the time itself is read fresh.
    await $.state.get(NOW)
    const now = await $.clock.now()
    const elements = $.ui.resolve(e)
    const { Box, Text } = elements
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 3)
    const { shown, more } = seat(arrange(list), room)
    const isNested = (mate: Crewmate) => mate.parentId !== '' && mate.parentId !== MAIN
    const tint = (mate: Crewmate) => (mate.isFailed ? FAILED : mate.color)
    const scope = (mate: Crewmate) => `pane-${mate.id}`.slice(0, 64)
    const working = list.filter(one => one.id !== MAIN && isActive(one)).length
    const finished = list.filter(one => one.id !== MAIN && !isActive(one)).length
    // The terminal steps its glyphs on the frame; the desktop's SVGs animate themselves.
    const step = 'Svg' in elements ? 0 : ((await $.state.get(FRAME)).value ?? 0)
    const figure = (mate: Crewmate) => {
      if ('Svg' in elements) {
        const { Svg } = elements
        return (
          <Svg
            source={clawd(tint(mate), mate.isDone, phase(mate.id))}
            alt={mate.label}
            {...figureSize(config.size, isNested(mate))}
            isInteractive
          />
        )
      }
      return <Text color={tint(mate)}>{glyph(step + phase(mate.id), mate.isDone)}</Text>
    }
    const state = (mate: Crewmate) => {
      if (mate.isFailed) return <Text color={FAILED}>✗</Text>
      if (mate.isDone) return <Text color="success">✓</Text>
      return <Text dimColor>{doing(mate.tool, lang)}</Text>
    }

    return (
      <Box flexDirection="column" paddingX={1}>
        {working + finished > 1 && (
          <Box marginBottom={1}>
            <Text dimColor>
              {working > 0 ? TEXT[lang].working(working) : ''}
              {working > 0 && finished > 0 ? ' · ' : ''}
              {finished > 0 ? TEXT[lang].finished(finished) : ''}
            </Text>
          </Box>
        )}
        {shown.length === 0 && <Text dimColor>{TEXT[lang].idle}</Text>}
        {shown.map(mate => (
          <Box key={mate.id} hover={{ scope: scope(mate) }} flexDirection="column" paddingLeft={isNested(mate) ? 2 : 0}>
            <Box flexDirection="row" alignItems="center" gap={1}>
              {figure(mate)}
              <Text color={tint(mate)} bold dimColor={mate.isDone && !mate.isFailed}>{cut(mate.label, 28)}</Text>
              {state(mate)}
              <Box flexGrow={1} />
              <Text dimColor>{elapsed((mate.isDone ? mate.doneAt : now) - mate.startedAt)}</Text>
            </Box>
            <Box display="none" hover={{ scope: scope(mate), display: 'flex' }} flexDirection="column" paddingLeft={3}>
              <Text dimColor>{detail(mate, lang)}</Text>
              {mate.task !== '' && <Text dimColor>{cut(mate.task, 160)}</Text>}
            </Box>
          </Box>
        ))}
        {more > 0 && <Text dimColor>{TEXT[lang].more(more)}</Text>}
      </Box>
    )
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (config.placement === 'pane') return next(e)
    const { value: list = [] } = await $.state.get(CREW)
    const { value: hidden = false } = await $.state.get(HIDDEN)
    if (e.props.hasSurvey || list.length === 0 || hidden) {
      return next(e)
    }

    const elements = $.ui.resolve(e)
    const { Box, Text } = elements
    const { shown, more } = seat(arrange(list), MAX_CHIPS)
    const isNested = (mate: Crewmate) => mate.parentId !== '' && mate.parentId !== MAIN
    const status = (mate: Crewmate) => (mate.isFailed ? '✗' : mate.isDone ? '✓' : fit(doing(mate.tool, lang)))
    const name = (mate: Crewmate) => (isNested(mate) ? '↳ ' : '') + fit(mate.label)
    const scope = (mate: Crewmate) => `crew-${mate.id}`.slice(0, 64)
    const tint = (mate: Crewmate) => (mate.isFailed ? FAILED : mate.color)

    if ('Svg' in elements) {
      const { Svg } = elements
      const { value: now = 0 } = await $.state.get(NOW)

      // Hovering a chip lights its scope and reveals that agent's card under the row.
      return (
        <Box flexDirection="column">
          <Box flexDirection="row" flexWrap="wrap" gap={2} alignItems="center">
            {shown.map(mate => (
              <Box key={mate.id} hover={{ scope: scope(mate) }} flexDirection="row" alignItems="center" gap={1}>
                <Svg
                  source={clawd(tint(mate), mate.isDone, phase(mate.id))}
                  alt={mate.label}
                  {...figureSize(config.size, isNested(mate))}
                  isInteractive
                />
                <Text color={tint(mate)} bold dimColor={mate.isDone && !mate.isFailed}>{name(mate)}</Text>
                <Text color={mate.isFailed ? FAILED : undefined} dimColor={!mate.isFailed}>{status(mate)}</Text>
              </Box>
            ))}
            {more > 0 && <Text dimColor>+{more}</Text>}
          </Box>
          {shown.map(mate => (
            <Box
              key={`card-${mate.id}`}
              display="none"
              hover={{ scope: scope(mate), display: 'flex' }}
              flexDirection="column"
              borderStyle="round"
              borderColor={tint(mate)}
              paddingX={1}
              marginTop={1}
            >
              <Text>
                <Text color={tint(mate)} bold>{cut(mate.label, 60)}</Text>
                <Text dimColor>  {summary(mate, Math.max(now, mate.startedAt), lang)}</Text>
              </Text>
              {mate.isFailed && <Text color={FAILED}>{TEXT[lang].interrupted}</Text>}
              {mate.task !== '' && <Text>{mate.task}</Text>}
            </Box>
          ))}
        </Box>
      )
    }

    if (!config.showInTerminal) return next(e)

    const { value: step = 0 } = await $.state.get(FRAME)

    return (
      <Box flexDirection="row" flexWrap="wrap" columnGap={2}>
        {shown.map(mate => (
          <Text key={mate.id}>
            <Text color={tint(mate)} dimColor={mate.isDone && !mate.isFailed}>{glyph(step + phase(mate.id), mate.isDone)}</Text>
            <Text color={tint(mate)} bold> {name(mate)}</Text>
            <Text dimColor> {status(mate)}</Text>
          </Text>
        ))}
        {more > 0 && <Text dimColor>+{more}</Text>}
      </Box>
    )
  })
}
