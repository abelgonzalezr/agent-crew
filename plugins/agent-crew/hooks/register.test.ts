import { expect, test } from 'claude-code/testing'

import { MAIN, THINKING, WAITING, arrange, langFrom, detail, doing, batchMessage, figureSize, readConfig, clawd, colorFor, cut, elapsed, fit, glyph, prune, seat, settleMain, shortModel, summary } from './register'
import type { Crewmate } from '../types'

function mate(id: string, parentId: string, isDone = false): Crewmate {
  return {
    id, parentId, label: id, kind: 'Explore', color: '#fff', tool: 'Read', task: '', model: 'haiku',
    startedAt: 0, tools: 0, isDone, isFailed: false, doneAt: 0,
  }
}

test('the figure is an SVG in the agent colour', async () => {
  const svg = clawd('#5B9BD5', false, 0)
  expect(svg.startsWith('<svg')).toBe(true)
  expect(svg.includes('fill="#5B9BD5"')).toBe(true)
  expect(svg.includes('animateTransform')).toBe(true)
  expect(clawd('#5B9BD5', true, 0).includes('animate')).toBe(false)
})

test('the terminal glyph alternates while working', async () => {
  expect(glyph(0, false)).not.toBe(glyph(1, false))
  expect(glyph(0, true)).toBe(glyph(1, true))
})

test('long labels are cut to the column', async () => {
  expect(fit('general-purpose agent long').length).toBe(18)
  expect(fit('Explore')).toBe('Explore')
})

test('finished agents leave after a while', async () => {
  const done = mate('a', MAIN, true)
  const busy = { ...done, id: 'b', isDone: false }
  expect(prune([done, busy], 1000, 4000).length).toBe(2)
  expect(prune([done, busy], 10000, 4000).map(one => one.id)).toEqual(['b'])
  expect(prune([done, busy], 1000, 0).map(one => one.id)).toEqual(['b'])
})

test('Claude waits while its agents work, then is done', async () => {
  const list = [{ ...mate(MAIN, ''), tool: THINKING }, mate('x', MAIN)]
  const waiting = settleMain(list, 5, true)
  expect(waiting[0]?.tool).toBe(WAITING)
  expect(waiting[0]?.isDone).toBe(false)
  const finished = settleMain(waiting.map(one => (one.id === 'x' ? { ...one, isDone: true } : one)), 9, false)
  expect(finished[0]?.isDone).toBe(true)
})

test('a running Claude is left alone when an agent finishes', async () => {
  const list = [{ ...mate(MAIN, ''), tool: 'Bash' }, mate('x', MAIN, true)]
  expect(settleMain(list, 5, false)[0]?.isDone).toBe(false)
})

test('agents follow the agent that started them', async () => {
  const list = [mate('b', MAIN), mate('child', 'a'), mate(MAIN, ''), mate('a', MAIN)]
  expect(arrange(list).map(one => one.id)).toEqual([MAIN, 'b', 'a', 'child'])
})

test('past six chips the rest are counted, working ones first', async () => {
  const list = [mate('d0', MAIN, true), ...Array.from({ length: 7 }, (_, i) => mate(`w${i}`, MAIN))]
  const { shown, more } = seat(list, 6)
  expect(shown.length).toBe(6)
  expect(more).toBe(2)
  expect(shown.some(one => one.id === 'd0')).toBe(false)
})

test('each agent type keeps its colour', async () => {
  expect(colorFor('Explore')).toBe('#5B9BD5')
  expect(colorFor('general-purpose')).toBe('#6BBF59')
  expect(colorFor('my-plugin:reviewer')).toBe(colorFor('my-plugin:reviewer'))
})

test('models read short', async () => {
  expect(shortModel('claude-haiku-5-5')).toBe('haiku')
  expect(shortModel('claude-opus-5-5')).toBe('opus')
  expect(shortModel('custom')).toBe('')
})

test('the card says type, model, time and tool count', async () => {
  expect(elapsed(12_400)).toBe('12s')
  expect(elapsed(75_000)).toBe('1m 15s')
  const busy = { ...mate('x', MAIN), startedAt: 1000, tools: 3 }
  expect(summary(busy, 13_000, 'es')).toBe('Explore · haiku · 12s · 3 herramientas')
  const done = { ...busy, isDone: true, doneAt: 4000, tools: 1 }
  expect(summary(done, 99_000, 'es')).toBe('Explore · haiku · 3s · 1 herramienta')
})

test('long tasks are cut on one line', async () => {
  expect(cut('uno\n  dos   tres', 50)).toBe('uno dos tres')
  expect(cut('x'.repeat(300), 220).length).toBe(220)
})

test('options fall back to the defaults', async () => {
  expect(readConfig({})).toEqual({ placement: 'pane', size: 'medium', lingerMs: 4000, showInTerminal: true, batchToast: true })
  const set = readConfig({ placement: 'band', size: 'large', lingerSeconds: 10, showInTerminal: false, batchToast: false })
  expect(set).toEqual({ placement: 'band', size: 'large', lingerMs: 10000, showInTerminal: false, batchToast: false })
  expect(readConfig({ size: 'huge', lingerSeconds: -3 }).size).toBe('medium')
  expect(readConfig({ lingerSeconds: -3 }).lingerMs).toBe(4000)
})

test('figure sizes, nested ones smaller', async () => {
  expect(figureSize('medium', false)).toEqual({ width: 20, height: 14 })
  expect(figureSize('large', true)).toEqual({ width: 20, height: 14 })
  expect(figureSize('small', false).width).toBeLessThan(20)
})

test('a finished batch is announced, a lone agent is not', async () => {
  expect(batchMessage(1, 0, 5000, 'es')).toBeUndefined()
  expect(batchMessage(4, 0, 12_000, 'es')).toBe('4 agentes terminaron (12s)')
  expect(batchMessage(3, 1, 75_000, 'es')).toBe('2 agentes terminaron, 1 interrumpido (1m 15s)')
  expect(batchMessage(2, 1, 3000, 'es')).toBe('1 agente terminó, 1 interrumpido (3s)')
  expect(batchMessage(2, 2, 3000, 'es')).toBe('2 interrumpidos (3s)')
})

test('tools read as plain verbs', async () => {
  expect(doing('Grep', 'es')).toBe('buscando')
  expect(doing('Bash', 'es')).toBe('ejecutando')
  expect(doing('mcp__slack__send', 'es')).toBe('consultando')
  expect(doing('SomethingNew', 'es')).toBe('trabajando')
})

test('the hover detail is short and skips the type for Claude', async () => {
  expect(detail({ ...mate('x', MAIN), tools: 2 }, 'es')).toBe('Explore · haiku · 2 herramientas')
  expect(detail({ ...mate(MAIN, ''), kind: 'Claude', model: '', tools: 1 }, 'es')).toBe('1 herramienta')
})

test('the language is the option, English by default', async () => {
  expect(langFrom('spanish')).toBe('es')
  expect(langFrom('english')).toBe('en')
  expect(langFrom(undefined)).toBe('en')
})

test('english texts', async () => {
  expect(doing('Grep', 'en')).toBe('searching')
  expect(doing(THINKING, 'en')).toBe('thinking')
  expect(batchMessage(3, 1, 12_000, 'en')).toBe('2 agents finished, 1 interrupted (12s)')
  expect(detail({ ...mate('x', MAIN), tools: 1 }, 'en')).toBe('Explore · haiku · 1 tool')
})
