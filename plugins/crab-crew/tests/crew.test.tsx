import { expect, mock, test } from 'claude-code/testing'

import { ART_H, ART_W, compose, pickLook, rasterCells, svgSprite, TIERS } from '../hooks/art'
import { SPRITES } from '../hooks/sprites'
import type { CrewLook } from '../types'

const SURFACES = ['terminal', 'desktop'] as const
const REPORT = 'mcp__crab-crew__report_progress'

const site = { scroll: undefined as never, view: undefined as never }
const BAND = { hasSurvey: false, isWorking: true, maxRows: 4, bodyColumns: 100, ...site }
const PANE = { title: 'Crab crew', isFocused: false, bodyColumns: 100, placement: 'dock', ...site } as never

type Loose = { tool: { call: (input: unknown) => Promise<unknown> } }
/** The report tool is the mod's own, outside the engine's typed tool table. */
const report = ($: unknown, input: Record<string, unknown>) => ($ as Loose).tool.call({ tool: REPORT, ...input })

const spawn = (description: string, id: string) =>
  ({
    tool_use_id: `t-${id}`,
    prompt: 'go',
    description,
    subagentType: 'general-purpose',
    provider: { plugin: 'engine', tier: 'core' },
    parentModel: 'claude-opus-5-5',
    background: true,
    fork: false,
  }) as never

test('the band stays hidden until something reports progress', async ($, on) => {
  mock.clock(on)
  // Stands for the engine's own band beneath the plugin.
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine band</Text>
  })
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'crab-crew', surface, component: 'AbovePrompt', props: BAND })
    expect(await ui.find({ key: 'crew' })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: 'engine band' })).toBeDefined()
    await ui.unmount()
  }
})

test('a progress report draws Clawd, title, phase, the bar and the crew button', async ($, on) => {
  mock.clock(on)
  await report($, { title: 'Ship checkout', phase: 'Review', accepted: 2, planned: 5, crew: [{ name: 'security scan', model: 'opus', effort: 'max' }] })

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'crab-crew', surface, component: 'AbovePrompt', props: BAND })
    for (const [what, q] of [['title', { type: 'Text', text: 'Ship checkout' }], ['phase', { type: 'Text', text: /Review/ }], ['count', { type: 'Text', text: '2/5' }], ['art', { type: surface === 'terminal' ? 'Raster' : 'Svg' }]] as const) {
      if (!(await ui.find(q))) throw new Error(`${surface}: no ${what}`)
    }
    expect((await ui.find({ key: 'crew' }))?.props.label).toBe('Crew 1')
    await ui.unmount()
  }
})

test('a planned crab wakes up as itself when its agent starts, then finishes', async ($, on) => {
  mock.clock(on)
  on('agent.spawn', () => ({ model: 'claude-sonnet-5-5', agentId: 'a1' }))
  on('turn.complete', () => ({ text: 'done' }))

  await report($, { title: 'Flow', crew: [{ name: 'security scan' }, { name: 'docs pass' }] })
  const scan = pickLook(SPRITES, 'planned:security scan', [])
  const docs = pickLook(SPRITES, 'planned:docs pass', [scan])

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'crab-crew', surface, component: 'Pane', props: PANE, requestId: 'crab-crew' })
    expect(await ui.find({ type: 'Text', text: scan.name })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: docs.name })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'RUNNING' })).toBeUndefined()
    await ui.unmount()
  }

  await $.agent.spawn(spawn('security scan', 'a1'))
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'crab-crew', surface, component: 'Pane', props: PANE, requestId: 'crab-crew' })
    expect(await ui.find({ type: 'Text', text: scan.name })).toBeDefined() // the same crab, now at work
    expect(await ui.find({ type: 'Text', text: 'RUNNING' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'docs pass' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /Sonnet 5\.5/ })).toBeDefined()
    await ui.unmount()
  }

  await $.turn.complete({ turnId: 'x', agentId: 'a1', answer: 'ok', durationMs: 10, isAborted: false, reason: 'answer' } as never)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'crab-crew', surface, component: 'Pane', props: PANE, requestId: 'crab-crew' })
    expect(await ui.find({ type: 'Text', text: 'done' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: 'RUNNING' })).toBeUndefined()
    await ui.unmount()
  }
})

test('the bar above the prompt shows working crabs even when no flow was reported', async ($, on) => {
  mock.clock(on)
  on('agent.spawn', () => ({ model: 'claude-sonnet-5-5', agentId: 'solo' }))
  await $.agent.spawn(spawn('look around', 'solo'))
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'crab-crew', surface, component: 'AbovePrompt', props: BAND })
    expect(await ui.find({ type: 'Text', text: 'Crab crew' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '0/1 agents' })).toBeDefined()
    expect((await ui.find({ key: 'crew' }))?.props.label).toBe('Crew 1')
    await ui.unmount()
  }
})

test('/agents-info reset clears the flow, so the band goes away', async ($, on) => {
  mock.clock(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine band</Text>
  })
  await report($, { title: 'Flow', accepted: 1, planned: 3, crew: [{ name: 'later' }] })
  await $.command.run({ command: 'agents-info', args: 'reset' } as never)
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'crab-crew', surface, component: 'AbovePrompt', props: BAND })
    expect(await ui.find({ key: 'crew' })).toBeUndefined()
    await ui.unmount()
  }
})

test('a crew of new crabs never repeats a name, a color or, while they last, a costume', () => {
  const looks: CrewLook[] = []
  for (let i = 0; i < 8; i++) looks.push(pickLook(SPRITES, `agent-${i * 7919}`, looks))
  expect(new Set(looks.map(l => l.name)).size).toBe(8)
  expect(new Set(looks.map(l => l.palette)).size).toBe(Math.min(8, SPRITES.kit.palettes.length))
  expect(new Set(looks.slice(0, 5).map(l => l.tier)).size).toBe(TIERS.length)
  // and the combination of color, eyes and markings differs for every crab
  expect(new Set(looks.map(l => `${l.palette}/${l.eye}/${l.texture}`)).size).toBe(8)
})

test('every sprite sheet composes, fits the SVG limit, and encodes for the terminal', () => {
  const looks: CrewLook[] = []
  for (let i = 0; i < 12; i++) looks.push(pickLook(SPRITES, `id-${i}`, looks))
  const sheets = { ...SPRITES.tiers, ...SPRITES.poses }
  for (const [name, sheet] of Object.entries(sheets)) {
    for (const look of looks) {
      for (let f = 0; f < sheet.frames.length; f++) {
        const grid = compose(SPRITES, sheet, f, look, true)
        expect(grid.length).toBe(ART_H)
        expect(grid[0]!.length).toBe(ART_W)
      }
      const svg = svgSprite(SPRITES, sheet, look, { lane: 72, scale: 3, restyleEyes: true, moving: true, offset: 1, ground: true })
      if (svg.length > 131072) throw new Error(`${name}: ${svg.length} characters`)
      const r = rasterCells(compose(SPRITES, sheet, 0, look, true))
      expect(r.columns).toBe(16)
      expect(r.rows).toBe(5)
    }
  }
})
