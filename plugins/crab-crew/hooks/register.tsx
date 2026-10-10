import { atom, read, update } from 'claude-code'
import type { EngineInterface, ModelUsage, Register } from 'claude-code'

import type { CrewAgent, CrewLook, CrewPlanned, CrewTasks, Effort, Flow, Tier } from '../types'
import {
  ART_H,
  cropCols,
  cropRows,
  hash,
  laneGrid,
  lookColor,
  pickLook,
  progressSvg,
  rasterCells,
  svgSprite,
  tint,
} from './art'
import type { Grid, Sheet } from './art'
import { SPRITES } from './sprites'

const PANE = 'crab-crew'
const PANE_TITLE = 'Crab crew'
const REPORT_TOOL: string = 'mcp__crab-crew__report_progress'
const TICK_MS = 120

const flow = atom({ plugin: 'crab-crew', key: 'flow' } as const, null)
const agents = atom({ plugin: 'crab-crew', key: 'agents' } as const, [])
const planned = atom({ plugin: 'crab-crew', key: 'planned' } as const, [])

const EFFORTS: readonly Effort[] = ['low', 'medium', 'high', 'xhigh', 'max']
const isEffort = (value: unknown): value is Effort => EFFORTS.includes(value as Effort)

// One costume per effort level, top effort first, when costumes follow effort.
const TIER_OF: Record<Effort, Tier> = {
  max: 'astronaut',
  xhigh: 'detective',
  high: 'engineer',
  medium: 'chef',
  low: 'racer',
}
const TIER_TITLE: Record<Tier, string> = {
  astronaut: 'the astronaut',
  detective: 'the detective',
  engineer: 'the engineer',
  chef: 'the chef',
  racer: 'the racer',
}

// Claude's own crab, as the welcome banner draws it: the band and the header wear this look.
const CLAWD: CrewLook = { palette: 0, eye: 0, texture: 0, tier: 'engineer', name: 'Clawd' }

// ---------------------------------------------------------------- pricing

// USD per million tokens: input, output, cache read. Cache writes bill at 1.25x input.
const PRICES: readonly [RegExp, number, number, number][] = [
  [/fable|mythos/, 10, 50, 0.25],
  [/opus-5-5/, 4, 20, 0.2],
  [/opus/, 5, 25, 0.5],
  [/sonnet-5/, 2, 10, 0.2],
  [/sonnet/, 3, 15, 0.3],
  [/haiku-5/, 0.1, 0.5, 0.01],
  [/haiku/, 1, 5, 0.1],
]

function costOf(model: string, usage: ModelUsage): number {
  const [, input, output, cacheRead] = PRICES.find(([match]) => match.test(model)) ?? PRICES[1]!
  return (
    (usage.input_tokens * input +
      usage.output_tokens * output +
      usage.cache_read_input_tokens * cacheRead +
      usage.cache_creation_input_tokens * input * 1.25) /
    1e6
  )
}

const contextWindow = (model: string) => (/haiku-4|claude-3/.test(model) ? 200_000 : 1_000_000)

function modelName(model: string): string {
  const m = model.replace(/^claude-/, '').match(/^([a-z]+)(?:-(\d+))?(?:-(\d+))?/)
  if (!m) return model
  const family = m[1]!.charAt(0).toUpperCase() + m[1]!.slice(1)
  return [family, [m[2], m[3]].filter(Boolean).join('.')].filter(Boolean).join(' ')
}

// ------------------------------------------------------------- formatting

const fmtTokens = (n: number) =>
  n >= 1e6 ? `${+(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : `${n}`
const fmtUsd = (n: number) => (n >= 1 ? `$${n.toFixed(2)}` : `$${n.toFixed(3)}`)

function fmtDur(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return m < 60 ? `${m}m ${String(s % 60).padStart(2, '0')}s` : `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`
}

/** A text bar for the terminal: filled cells, then the track. */
function textBar(done: number, total: number, width: number): [string, string] {
  const filled = total > 0 ? Math.round((Math.min(done, total) / total) * width) : 0
  return ['━'.repeat(filled), '─'.repeat(width - filled)]
}

const oneLine = (text: string, max = 90) => {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? flat.slice(0, max - 1) + '…' : flat
}

/** What a tool call says the agent is doing, in a few words. */
function activityOf(tool: string, input: Record<string, unknown>): string {
  const s = (v: unknown) => (typeof v === 'string' ? v : '')
  const file = (v: unknown) => s(v).split('/').pop() || 'a file'
  switch (tool) {
    case 'Read':
      return `Reading ${file(input.file_path)}`
    case 'Edit':
    case 'MultiEdit':
    case 'NotebookEdit':
      return `Editing ${file(input.file_path ?? input.notebook_path)}`
    case 'Write':
      return `Writing ${file(input.file_path)}`
    case 'Bash':
      return `Running ${oneLine(s(input.description) || s(input.command), 60)}`
    case 'Grep':
      return `Searching for ${oneLine(s(input.pattern), 50)}`
    case 'Glob':
      return `Looking for ${oneLine(s(input.pattern), 50)}`
    case 'WebSearch':
      return `Searching the web: ${oneLine(s(input.query), 60)}`
    case 'WebFetch': {
      const url = s(input.url)
      const host = url.match(/^https?:\/\/([^/]+)/)?.[1] ?? url
      return `Reading ${host}`
    }
    case 'Agent':
      return `Briefing a helper: ${oneLine(s(input.description), 50)}`
    case 'TodoWrite':
    case 'TaskCreate':
    case 'TaskUpdate':
      return 'Updating its task list'
    case 'ToolSearch':
      return 'Looking up a tool'
    default:
      return tool.startsWith('mcp__') ? `Using ${tool.split('__').slice(1).join(' ')}` : `Using ${tool}`
  }
}

// ------------------------------------------------------------ bookkeeping

type $ = EngineInterface

const emptyTasks = (): CrewTasks => ({ done: 0, total: 0, ids: [], doneIds: [] })

async function patchAgent($: $, id: string, fn: (agent: CrewAgent) => CrewAgent) {
  await update($, agents, list => list.map(one => (one.id === id ? fn(one) : one)))
}

/** Folds one task-list tool call into a task tally. */
function tallyTasks(tasks: CrewTasks, tool: string, input: Record<string, unknown>, result: unknown): CrewTasks {
  if (tool === 'TodoWrite') {
    const todos = (input.todos as { status: string }[] | undefined) ?? []
    return { ...tasks, total: todos.length, done: todos.filter(t => t.status === 'completed').length }
  }
  if (tool === 'TaskCreate') {
    const id = (result as { task?: { id?: string } } | undefined)?.task?.id
    if (!id || tasks.ids.includes(id)) return tasks
    const ids = [...tasks.ids, id]
    return { ...tasks, ids, total: ids.length }
  }
  if (tool === 'TaskUpdate') {
    const id = String(input.taskId ?? '')
    const status = input.status
    let { ids, doneIds } = tasks
    if (status === 'deleted') {
      ids = ids.filter(x => x !== id)
      doneIds = doneIds.filter(x => x !== id)
    } else if (status === 'completed' && !doneIds.includes(id)) {
      doneIds = [...doneIds, id]
      if (!ids.includes(id)) ids = [...ids, id]
    } else if (status && status !== 'completed') {
      doneIds = doneIds.filter(x => x !== id)
    }
    return { ...tasks, ids, doneIds, total: ids.length, done: doneIds.length }
  }
  return tasks
}

const TASK_TOOLS = new Set(['TodoWrite', 'TaskCreate', 'TaskUpdate'])

function phaseFromTasks(tool: string, input: Record<string, unknown>): string | undefined {
  if (tool === 'TodoWrite') {
    const todos = (input.todos as { status: string; activeForm?: string; content?: string }[] | undefined) ?? []
    const active = todos.find(t => t.status === 'in_progress')
    return active?.activeForm ?? active?.content
  }
  if (input.status === 'in_progress' || tool === 'TaskCreate') {
    return (input.activeForm as string | undefined) ?? (input.subject as string | undefined)
  }
  return undefined
}

function parseWorkflowMeta(script: string): { name?: string; phases: string[] } {
  const meta = script.match(/export\s+const\s+meta\s*=\s*\{([\s\S]*?)\n\}/)?.[1] ?? script.slice(0, 2000)
  const name = meta.match(/\bname\s*:\s*['"`]([^'"`]+)['"`]/)?.[1]
  const phases = [...meta.matchAll(/\btitle\s*:\s*['"`]([^'"`]+)['"`]/g)].map(m => m[1] ?? '')
  return { name, phases }
}

const sameName = (a: string, b: string) => {
  const x = a.trim().toLowerCase()
  const y = b.trim().toLowerCase()
  return x.length > 0 && y.length > 0 && (x === y || x.includes(y) || y.includes(x))
}

async function openPane($: $) {
  await $.ui.open({ id: PANE, title: PANE_TITLE })
}

/** Every look on screen, so a new crab can be told apart from all of them. */
async function lookups($: $): Promise<CrewLook[]> {
  const [list, waiting] = await Promise.all([read($, agents), read($, planned)])
  return [...list.map(a => a.look), ...waiting.map(p => p.look)]
}

/** The report tool: the flow's numbers and the crew still to come. */
type ReportInput = {
  title?: string
  phase?: string
  accepted?: number
  planned?: number
  crew?: { name: string; model?: string; effort?: string }[]
}

async function report($: $, input: ReportInput) {
  const now = await $.clock.now()
  await update($, flow, prev => {
    const title = input.title ?? prev?.title ?? 'Flow'
    return {
      title,
      phase: input.phase ?? prev?.phase ?? '',
      accepted: input.accepted ?? prev?.accepted ?? 0,
      planned: Math.max(input.planned ?? prev?.planned ?? 0, input.accepted ?? 0),
      source: 'report' as const,
      startedAt: prev && prev.title === title ? prev.startedAt : now,
    }
  })
  if (input.crew) {
    const started = await read($, agents)
    const before = await read($, planned)
    const taken = await lookups($)
    const crew: CrewPlanned[] = []
    for (const c of input.crew) {
      if (started.some(a => sameName(a.description, c.name))) continue
      const look = before.find(p => p.name === c.name)?.look ?? pickLook(SPRITES, `planned:${c.name}`, [...taken, ...crew.map(p => p.look)])
      crew.push({ name: c.name, model: c.model, effort: isEffort(c.effort) ? c.effort : undefined, look })
    }
    await update($, planned, () => crew)
  }
}

/**
 * State an earlier version saved has no looks or start times: give every crab its own look
 * now, so a reload never draws a crab without one.
 */
async function migrate($: $) {
  const now = await $.clock.now()
  const taken: CrewLook[] = []
  const list = await read($, agents)
  if (list.some(a => !a.look)) {
    await update($, agents, l =>
      l.map(a => {
        if (a.look) return a
        const look = pickLook(SPRITES, a.id, taken)
        taken.push(look)
        return { ...a, look }
      }),
    )
  }
  const waiting = await read($, planned)
  if (waiting.some(p => !p.look)) {
    await update($, planned, l =>
      l.map(p => {
        if (p.look) return p
        const look = pickLook(SPRITES, `planned:${p.name}`, taken)
        taken.push(look)
        return { ...p, look }
      }),
    )
  }
  const current = await read($, flow)
  if (current && typeof current.startedAt !== 'number') {
    await update($, flow, f => (f ? { ...f, startedAt: now } : f))
  }
}

// --------------------------------------------------------- terminal frames

/** A crab the terminal repaints on the timer: where it is drawn and how. */
type Anim = {
  requestId: string
  key: string
  sheet: Sheet
  look: CrewLook
  lane: number
  offset: number
  moving: boolean
  restyleEyes: boolean
  crop?: { top: number; rows: number; left: number; cols: number }
}

function animGrid(a: Anim, t: number): Grid {
  let grid = laneGrid(SPRITES, a.sheet, a.look, { lane: a.lane, t, offset: a.offset, moving: a.moving, restyleEyes: a.restyleEyes })
  if (a.crop) grid = cropCols(cropRows(grid, a.crop.top, a.crop.rows), a.crop.left, a.crop.cols)
  return grid
}

// ---------------------------------------------------------------- register

export const register: Register = (on, options) => {
  const costumes = options.costume === 'effort' ? 'effort' : 'crew'
  // Effort the Agent tool call asked for, by the call's id, until its spawn lands.
  const effortByCall = new Map<string, Effort>()
  const mainTasks: { tasks: CrewTasks } = { tasks: emptyTasks() }
  // Terminal crabs to repaint, by `${requestId}|${key}`.
  const anims = new Map<string, Anim>()

  const tierOf = (crab: { look: CrewLook; effort?: Effort }): Tier =>
    costumes === 'effort' && crab.effort ? TIER_OF[crab.effort] : crab.look.tier

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'agents-info',
      description: 'Toggle the crab crew panel: running, finished and planned subagents',
      argumentHint: '[reset]',
    })
    await $.tool.register({
      name: 'report_progress',
      description:
        "Report the current multi-step flow's progress to the person's progress bar. Call it when a flow starts, when its phase changes, and as tasks are accepted. `crew` lists the subagents you plan to launch next (shown as planned until they start).",
      isDeferred: false,
      inputSchema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string', description: "The flow's title" },
          phase: { type: 'string', description: 'The phase the flow is in now' },
          accepted: { type: 'integer', minimum: 0, description: 'Tasks accepted (done and verified) so far' },
          planned: { type: 'integer', minimum: 0, description: 'Tasks planned in total' },
          crew: {
            type: 'array',
            description: 'Subagents planned but not yet launched',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name'],
              properties: {
                name: { type: 'string', description: 'Same text you will pass as the Agent description or name' },
                model: { type: 'string', enum: ['fable', 'opus', 'sonnet', 'haiku'] },
                effort: { type: 'string', enum: [...EFFORTS] },
              },
            },
          },
        },
      },
    })

    await migrate($)

    // The terminal has no animation of its own: repaint its crabs in place.
    $.clock.every(TICK_MS, () => {
      if (anims.size === 0) return
      void (async () => {
        const t = await $.clock.now()
        for (const [id, a] of anims) {
          const { cells } = rasterCells(animGrid(a, t))
          $.ui.blit({ requestId: a.requestId, key: a.key, cells }).catch(() => anims.delete(id))
        }
      })()
    })

    return next(e)
  })

  on('command.run', { command: 'agents-info' }, async ($, e) => {
    if (e.args.trim() === 'reset') {
      await update($, flow, () => null)
      await update($, planned, () => [])
      await update($, agents, list => list.filter(a => a.status === 'running'))
      return { text: 'Crab crew reset: the flow, planned and finished crabs are cleared.' }
    }
    const panes = await $.ui.panes()
    if (panes.some(p => p.id === PANE)) {
      await $.ui.close({ id: PANE })
      return { text: 'Crab crew panel closed.' }
    }
    await openPane($)
    return { text: 'Crab crew panel opened.' }
  })

  // ----- progress sources

  on('tool.call', async ($, e, next) => {
    const input = e as unknown as Record<string, unknown>
    if (e.tool === REPORT_TOOL) {
      await report($, input as ReportInput)
      return { result: 'Progress bar updated.' }
    }

    if (e.tool === 'Agent' && isEffort(e.effort)) {
      effortByCall.set(e.tool_use_id, e.effort)
    }

    if (e.tool === 'Workflow' && typeof e.script === 'string') {
      const meta = parseWorkflowMeta(e.script)
      const now = await $.clock.now()
      await update($, flow, () => ({
        title: meta.name ?? 'Workflow',
        phase: meta.phases.length > 0 ? meta.phases.join(' → ') : 'running',
        accepted: 0,
        planned: 0,
        source: 'workflow' as const,
        startedAt: now,
      }))
    }

    if (e.agentId) {
      const id = e.agentId
      await patchAgent($, id, a => ({ ...a, activity: oneLine(activityOf(e.tool, input)) }))
    }

    const ran = await next(e)

    if (e.agentId) {
      const id = e.agentId
      await patchAgent($, id, a => ({
        ...a,
        toolCalls: a.toolCalls + 1,
        tasks: TASK_TOOLS.has(e.tool) ? tallyTasks(a.tasks, e.tool, input, ran.result) : a.tasks,
      }))
    } else if (TASK_TOOLS.has(e.tool) && !ran.isError) {
      mainTasks.tasks = tallyTasks(mainTasks.tasks, e.tool, input, ran.result)
      const tasks = mainTasks.tasks
      const phase = phaseFromTasks(e.tool, input)
      const now = await $.clock.now()
      await update($, flow, prev =>
        prev && prev.source !== 'tasks'
          ? prev
          : {
              title: prev?.title ?? 'Task list',
              phase: phase ?? prev?.phase ?? '',
              accepted: tasks.done,
              planned: tasks.total,
              source: 'tasks' as const,
              startedAt: prev?.startedAt ?? now,
            },
      )
    }
    return ran
  })

  // ----- subagents

  on('agent.spawn', async ($, e, next) => {
    const started = await next(e)
    if (started.deny !== undefined || !started.agentId) return started

    const now = await $.clock.now()
    const description = e.name ?? e.description
    const effort = effortByCall.get(e.tool_use_id)
    effortByCall.delete(e.tool_use_id)

    // A planned crab wakes up as itself; anyone else gets a look of its own.
    const waiting = await read($, planned)
    const at = waiting.findIndex(p => sameName(p.name, description) || sameName(p.name, e.description))
    const look = at >= 0 ? waiting[at]!.look : pickLook(SPRITES, started.agentId, await lookups($))
    if (at >= 0) await update($, planned, list => list.filter((_, i) => i !== at))

    const agent: CrewAgent = {
      id: started.agentId,
      look,
      description,
      type: e.subagentType,
      model: started.model,
      effort: effort ?? waiting[at]?.effort,
      status: 'running',
      startedAt: now,
      context: 0,
      costUsd: 0,
      toolCalls: 0,
      tasks: emptyTasks(),
      activity: 'Getting started',
      workflowRunId: e.workflow?.runId,
    }
    await update($, agents, list => [...list.filter(a => a.id !== agent.id), agent])
    if (e.workflow) {
      const index = e.workflow.agentIndex
      await update($, flow, prev =>
        prev?.source === 'workflow' ? { ...prev, planned: Math.max(prev.planned, index) } : prev,
      )
    }
    return started
  })

  on('turn.step', async function* ($, e, next) {
    const response = yield* next(e)
    if (e.agentId && response.usage) {
      const usage = response.usage
      const effort = isEffort(e.effort) ? e.effort : undefined
      await patchAgent($, e.agentId, a => ({
        ...a,
        model: usage.model || e.model || a.model,
        effort: a.effort ?? effort,
        context:
          usage.input_tokens + usage.cache_read_input_tokens + usage.cache_creation_input_tokens + usage.output_tokens,
        costUsd: a.costUsd + costOf(usage.model || e.model, usage),
      }))
    }
    return response
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId) {
      const now = await $.clock.now()
      const list = await read($, agents)
      const agent = list.find(a => a.id === e.agentId)
      if (agent && agent.status === 'running') {
        const failed = e.reason === 'error' || e.reason === 'aborted'
        await patchAgent($, agent.id, a => ({ ...a, status: failed ? 'failed' : 'finished', endedAt: now, activity: undefined }))
        if (!failed && agent.workflowRunId) {
          await update($, flow, prev =>
            prev?.source === 'workflow' ? { ...prev, accepted: Math.min(prev.accepted + 1, prev.planned) } : prev,
          )
        }
      }
    }
    return next(e)
  })

  // ----- drawing

  /** The flow's numbers as the bar draws them: a workflow counts its agents. */
  const flowCounts = (current: Flow, list: CrewAgent[]) => {
    if (current.source !== 'workflow') {
      return { done: current.accepted, total: current.planned, active: 0, label: `${current.accepted}/${current.planned}` }
    }
    const crew = list.filter(a => a.workflowRunId)
    const done = crew.filter(a => a.status === 'finished').length
    const active = crew.filter(a => a.status === 'running').length
    const total = Math.max(current.planned, crew.length)
    return { done, total, active, label: `${done}/${total} agents` }
  }

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const [reported, list, waiting, now] = await Promise.all([read($, flow), read($, agents), read($, planned), $.clock.now()])
    for (const [id, a] of anims) if (a.requestId === e.requestId) anims.delete(id)
    const runningNow = list.filter(a => a.status === 'running').length
    // The bar shows whenever there is something to follow: a reported flow, or crabs at work
    // or waiting, so progress is visible without opening the panel.
    if (e.props.hasSurvey || (reported === null && runningNow === 0 && waiting.length === 0)) return next(e)

    const crewSize = runningNow + waiting.length
    const finished = list.filter(a => a.status === 'finished').length
    const current: Flow = reported ?? {
      title: 'Crab crew',
      phase: `${runningNow} working${waiting.length > 0 ? ` · ${waiting.length} planned` : ''}`,
      accepted: finished,
      planned: list.length + waiting.length,
      source: 'report',
      startedAt: Math.min(now, ...list.map(a => a.startedAt)),
    }
    const counts = reported
      ? flowCounts(reported, list)
      : { done: finished, total: list.length + waiting.length, active: runningNow, label: `${finished}/${list.length + waiting.length} agents` }
    const working = e.props.isWorking || list.some(a => a.status === 'running')
    const table = $.ui.resolve(e)
    const { Box, Button, Text } = table
    const label = `Crew ${crewSize}`
    const press = () => openPane($)
    const twoRows = e.props.maxRows >= 2

    if (e.surface === 'terminal' && 'Raster' in table) {
      const { Raster } = table
      const room = e.props.bodyColumns
      const barWidth = Math.max(8, room - 12 - counts.label.length - label.length)
      const [filled, track] = textBar(counts.done, counts.total, barWidth)
      // Claude's crab, glyph for glyph as the banner draws it, walking while work runs.
      const anim: Anim = { requestId: e.requestId, key: 'clawd', sheet: SPRITES.poses.walk, look: CLAWD, lane: 32, offset: 0, moving: false, restyleEyes: false, crop: { top: 8, rows: 12, left: 6, cols: 20 } }
      if (working && twoRows) anims.set(`${e.requestId}|clawd`, anim)
      const still = rasterCells(animGrid(anim, 0))
      const titleRow = (
        <Box flexDirection="row" gap={2}>
          <Text bold color="claude" wrap="truncate-end">
            {current.title}
          </Text>
          {current.phase ? (
            <Text dimColor wrap="truncate-end">
              {current.phase}
            </Text>
          ) : null}
        </Box>
      )
      const barRow = (
        <Box flexDirection="row" gap={1}>
          <Text>
            <Text color="claude">{filled}</Text>
            <Text dimColor>{track}</Text>
          </Text>
          <Text bold>{counts.label}</Text>
          <Button key="crew" label={label} onPress={press} />
        </Box>
      )
      if (!twoRows) return barRow
      return (
        <Box flexDirection="row" gap={1}>
          {e.props.maxRows >= 3 ? <Raster key="clawd" columns={still.columns} rows={still.rows} cells={still.cells} /> : null}
          <Box flexDirection="column" flexGrow={1}>
            {titleRow}
            {barRow}
          </Box>
        </Box>
      )
    }

    if (!('Svg' in table)) return next(e)
    const { Svg } = table
    const clawd = svgSprite(SPRITES, SPRITES.poses.walk, CLAWD, { lane: 32, scale: 2, restyleEyes: false, moving: false, offset: 0, clock: now, still: !working, top: 7, rows: 11, left: 7, cols: 18 })
    const head = (
      <Box flexDirection="row" alignItems="center" gap={1}>
        <Svg key="clawd" source={clawd} alt="Claude's crab" width={36} height={22} />
        <Text bold color="claude" wrap="truncate-end">
          {current.title}
        </Text>
        {current.phase ? (
          <Text dimColor wrap="truncate-end">
            {current.phase}
          </Text>
        ) : null}
        <Box flexGrow={1} />
        <Text dimColor>{counts.label}</Text>
        <Button key="crew" label={label} onPress={press} />
      </Box>
    )
    if (!twoRows) return head
    return (
      <Box flexDirection="column">
        {head}
        <Svg
          key="bar"
          source={progressSvg({ done: counts.done, total: counts.total, active: counts.active, working, height: 6, clock: now })}
          alt={`${counts.label} done`}
          height={6}
        />
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const table = $.ui.resolve(e)
    const { Box, Text, Button } = table
    const [list, waiting, current, now] = await Promise.all([read($, agents), read($, planned), read($, flow), $.clock.now()])
    for (const [id, a] of anims) if (a.requestId === PANE) anims.delete(id)

    const term = e.surface === 'terminal'
    const running = list.filter(a => a.status === 'running')
    const done = list.filter(a => a.status !== 'running').slice(-30).reverse()
    const finishedOk = list.filter(a => a.status === 'finished' && a.endedAt)
    const totalCost = list.reduce((s, a) => s + a.costUsd, 0)

    const avg = (rows: CrewAgent[], pick: (a: CrewAgent) => number) =>
      rows.length > 0 ? rows.reduce((s, a) => s + pick(a), 0) / rows.length : undefined
    const sameModel = (model?: string) => {
      const same = model ? finishedOk.filter(a => a.model.includes(model)) : []
      return same.length > 0 ? same : finishedOk
    }
    const avgDur = (model?: string) => avg(sameModel(model), a => a.endedAt! - a.startedAt)
    const avgCost = (model?: string) => avg(sameModel(model), a => a.costUsd)
    const eta = (a: CrewAgent) => {
      const elapsed = now - a.startedAt
      if (a.tasks.total > 0 && a.tasks.done > 0) return (elapsed * (a.tasks.total - a.tasks.done)) / a.tasks.done
      const typical = avgDur(a.model)
      return typical === undefined ? undefined : Math.max(0, typical - elapsed)
    }
    const counts = current ? flowCounts(current, list) : null
    const flowEta =
      current && counts && counts.done > 0 && counts.total > counts.done
        ? ((now - current.startedAt) * (counts.total - counts.done)) / counts.done
        : undefined

    /**
     * A crab: a transparent pixel-art SVG image on desktop (it animates itself, so redraws and
     * scrolling never restart it); quadrant glyphs repainted on the timer in the terminal.
     */
    const crabArt = (
      key: string,
      sheet: Sheet,
      look: CrewLook,
      o: { lane: number; moving: boolean; restyleEyes: boolean; animate: boolean; offset: number; top?: number; rows?: number; left?: number; cols?: number; ground?: boolean },
      alt: string,
    ) => {
      const top = o.top ?? 0
      const rows = o.rows ?? ART_H
      const left = o.left ?? 0
      const cols = o.cols ?? o.lane
      if (e.surface === 'terminal' && 'Raster' in table) {
        const { Raster } = table
        const anim: Anim = { requestId: PANE, key, sheet, look, lane: o.lane, offset: o.offset, moving: o.moving, restyleEyes: o.restyleEyes, crop: { top, rows, left, cols } }
        if (o.animate) anims.set(`${PANE}|${key}`, anim)
        const r = rasterCells(animGrid(anim, 0))
        return <Raster key={key} columns={r.columns} rows={r.rows} cells={r.cells} />
      }
      if (!term && 'Svg' in table) {
        const { Svg } = table
        const source = svgSprite(SPRITES, sheet, look, { lane: o.lane, scale: 2, restyleEyes: o.restyleEyes, moving: o.moving, offset: o.offset, clock: now, still: !o.animate, top, rows, left, cols, ground: o.ground })
        // A plain image, never a sandboxed frame: frames are composited apart from the pane
        // and flash while it scrolls. The SVG animates itself (SMIL) as an image too.
        return <Svg key={key} source={source} alt={alt} width={cols * 2} height={rows * 2} />
      }
      return null
    }

    const bar = (key: string, done: number, total: number, active: number, working: boolean, width: number, color?: { body: string; light: string; shade: string }) => {
      if (!term && 'Svg' in table) {
        const { Svg } = table
        return <Svg key={key} source={progressSvg({ done, total, active, working, height: 6, clock: now, ...(width > 0 ? { width } : {}), ...(color ? { color } : {}) })} alt={`${done} of ${total}`} height={6} />
      }
      const [filled, track] = textBar(done, total, width > 0 ? Math.round(width / 8) : Math.max(10, e.props.bodyColumns - 4))
      return (
        <Text key={key}>
          <Text color={color?.body ?? 'claude'}>{filled}</Text>
          <Text dimColor>{track}</Text>
        </Text>
      )
    }

    const reset = async () => {
      await update($, flow, () => null)
      await update($, planned, () => [])
      await update($, agents, l => l.filter(a => a.status === 'running'))
    }

    // ---- header: the flow
    const summary = [
      `${running.length} running`,
      `${waiting.length} planned`,
      `${done.length} done`,
      `~${fmtUsd(totalCost)}`,
      ...(flowEta !== undefined ? [`~${fmtDur(flowEta)} left`] : []),
    ].join('  ·  ')
    const header = (
      <Box key="head" flexDirection="column" borderStyle="round" borderColor="claude" paddingX={1}>
        <Box flexDirection="row" alignItems="center" gap={1}>
          {crabArt('head', SPRITES.poses.walk, CLAWD, { lane: 32, moving: false, restyleEyes: false, animate: running.length > 0, offset: 0, top: 7, rows: 11, left: 7, cols: 18 }, "Claude's crab")}
          <Box flexDirection="column" flexGrow={1} flexShrink={1}>
            <Text bold color="claude" wrap="truncate-end">
              {current?.title ?? 'Crab crew'}
            </Text>
            <Text dimColor wrap="truncate-end">
              {current ? `${current.phase || 'Under way'}  ·  ${fmtDur(now - current.startedAt)}` : 'Nothing has reported progress yet'}
            </Text>
          </Box>
          {counts ? <Text bold>{counts.label}</Text> : null}
        </Box>
        {current && counts ? bar('flow-bar', counts.done, counts.total, counts.active, running.length > 0, 0) : null}
        <Box flexDirection="row" alignItems="center" gap={1}>
          <Text dimColor wrap="truncate-end">
            {summary}
          </Text>
          <Box flexGrow={1} />
          {done.length > 0 ? <Button key="clear" label="Clear done" onPress={() => update($, agents, l => l.filter(a => a.status === 'running'))} /> : null}
          {current || waiting.length > 0 ? <Button key="reset" label="Reset" onPress={reset} /> : null}
        </Box>
      </Box>
    )

    const section = (title: string, count: number) => (
      <Box key={`sec-${title}`} flexDirection="row" gap={1} marginTop={1}>
        <Text bold dimColor>
          {title.toUpperCase()}
        </Text>
        <Text dimColor>{`${count}`}</Text>
      </Box>
    )

    // ---- running crabs: a compact card each, bordered in the crab's own color
    const runningCards = running.map(a => {
      const color = lookColor(SPRITES, a.look)
      const tier = tierOf(a)
      const left = eta(a)
      const offset = (hash(a.id) % 997) / 37
      const facts = [
        `${modelName(a.model)} · ${a.effort ?? 'default'}`,
        a.tasks.total > 0 ? `${a.tasks.done}/${a.tasks.total} tasks` : `${a.toolCalls} calls`,
        `ctx ${fmtTokens(a.context)}/${fmtTokens(contextWindow(a.model))}`,
        `~${fmtUsd(a.costUsd)}`,
        ...(left === undefined ? [] : [`~${fmtDur(left)} left`]),
      ].join('  ·  ')
      return (
        <Box key={`run-${a.id}`} flexDirection="row" alignItems="center" gap={1} borderStyle="round" borderColor={color.body} paddingX={1}>
          {crabArt(`lane-${a.id}`, SPRITES.tiers[tier], a.look, { lane: term ? 40 : 56, moving: true, restyleEyes: true, animate: true, offset, ground: true, top: term ? 0 : 1, rows: term ? ART_H : 19 }, `${a.look.name} ${TIER_TITLE[tier]}, working`)}
          <Box flexDirection="column" flexGrow={1} flexShrink={1}>
            <Box flexDirection="row" gap={1}>
              <Text bold color={color.body}>
                {a.look.name}
              </Text>
              <Text dimColor wrap="truncate-end">
                {`${TIER_TITLE[tier]} · ${a.type}`}
              </Text>
              <Box flexGrow={1} />
              <Text dimColor>{fmtDur(now - a.startedAt)}</Text>
            </Box>
            <Text wrap="truncate-end">
              {a.description}
              {a.activity ? <Text dimColor>{`  ${a.activity}`}</Text> : null}
            </Text>
            <Text dimColor wrap="truncate-end">
              {facts}
            </Text>
          </Box>
        </Box>
      )
    })

    // ---- planned crabs: dozing until their turn, one short row each
    const plannedRows = waiting.map((p, i) => {
      const time = avgDur(p.model)
      const cost = avgCost(p.model)
      const facts = [p.model ? modelName(p.model) : 'inherits model', `${p.effort ?? 'default'} effort`, ...(cost === undefined ? [] : [`est ~${fmtUsd(cost)}`]), ...(time === undefined ? [] : [`~${fmtDur(time)}`])].join(' · ')
      return (
        <Box key={`plan-${i}`} flexDirection="row" alignItems="center" gap={1} paddingX={1}>
          {crabArt(`plan-${i}`, SPRITES.poses.sleep, p.look, { lane: 32, moving: false, restyleEyes: false, animate: false, offset: 0, top: 4, rows: 15, left: 4, cols: 24 }, `${p.look.name}, waiting to start`)}
          <Box flexDirection="column" flexGrow={1} flexShrink={1}>
            <Box flexDirection="row" gap={1}>
              <Text bold>{p.look.name}</Text>
              <Text dimColor wrap="truncate-end">
                {p.name}
              </Text>
            </Box>
            <Text dimColor wrap="truncate-end">
              {facts}
            </Text>
          </Box>
        </Box>
      )
    })

    // ---- finished crabs: a compact roll call
    const doneRows = done.map(a => {
      const color = lookColor(SPRITES, a.look)
      const failed = a.status === 'failed'
      const totals = [modelName(a.model), ...(a.tasks.total > 0 ? [`${a.tasks.done}/${a.tasks.total} tasks`] : []), `ctx ${fmtTokens(a.context)}`, `~${fmtUsd(a.costUsd)}`, fmtDur((a.endedAt ?? now) - a.startedAt)].join(' · ')
      return (
        <Box key={`done-${a.id}`} flexDirection="row" alignItems="center" gap={1} paddingX={1}>
          {term ? (
            <Text color={color.body}>■</Text>
          ) : (
            crabArt(`done-${a.id}`, failed ? SPRITES.poses.failed : SPRITES.poses.done, a.look, { lane: 32, moving: false, restyleEyes: false, animate: false, offset: 0, top: 4, rows: 15, left: 4, cols: 24 }, `${a.look.name}, ${failed ? 'stopped' : 'done'}`)
          )}
          <Box flexDirection="column" flexGrow={1} flexShrink={1}>
            <Box flexDirection="row" gap={1}>
              <Text bold>{a.look.name}</Text>
              <Text color={failed ? 'error' : 'success'}>{failed ? 'stopped' : 'done'}</Text>
              <Text dimColor wrap="truncate-end">
                {a.description}
              </Text>
            </Box>
            {term ? null : (
              <Text dimColor wrap="truncate-end">
                {totals}
              </Text>
            )}
          </Box>
        </Box>
      )
    })

    return (
      <Box flexDirection="column">
        {header}
        {list.length === 0 && waiting.length === 0 ? (
          <Box key="empty" marginTop={1} paddingX={1}>
            <Text dimColor>The beach is quiet. Each subagent shows up here as a crab of its own.</Text>
          </Box>
        ) : null}
        {running.length > 0 ? section('Running', running.length) : null}
        {running.length > 0 ? (
          <Box key="running" flexDirection="column" gap={1}>
            {runningCards}
          </Box>
        ) : null}
        {waiting.length > 0 ? section('Planned', waiting.length) : null}
        {waiting.length > 0 ? (
          <Box key="planned" flexDirection="column" gap={term ? 0 : 1}>
            {plannedRows}
          </Box>
        ) : null}
        {done.length > 0 ? section('Done', done.length) : null}
        {done.length > 0 ? (
          <Box key="done" flexDirection="column" gap={term ? 0 : 1}>
            {doneRows}
          </Box>
        ) : null}
      </Box>
    )
  })
}
