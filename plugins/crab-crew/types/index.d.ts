export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

/** A crab's costume and the prop it animates. */
export type Tier =
  | 'astronaut'
  | 'detective'
  | 'engineer'
  | 'chef'
  | 'racer'
  | 'swimmer'
  | 'barista'
  | 'roaster'
  | 'gamer'
  | 'guitarist'
  | 'miner'

/** What makes one crab itself: indices into the sprite kit, its costume and its name. */
export type CrewLook = { palette: number; eye: number; texture: number; tier: Tier; name: string }

export type Flow = {
  title: string
  phase: string
  accepted: number
  planned: number
  /** Who reported it last: the report tool outranks a workflow, a workflow outranks the task list. */
  source: 'report' | 'workflow' | 'tasks'
  startedAt: number
}

export type CrewTasks = { done: number; total: number; ids: string[]; doneIds: string[] }

export type CrewAgent = {
  id: string
  look: CrewLook
  description: string
  type: string
  model: string
  effort?: Effort
  status: 'running' | 'finished' | 'failed'
  startedAt: number
  endedAt?: number
  /** Input side of the last request: what the agent's context holds now. */
  context: number
  costUsd: number
  toolCalls: number
  tasks: CrewTasks
  /** What it is doing right now, from its latest tool call. */
  activity?: string
  workflowRunId?: string
}

export type CrewPlanned = { name: string; model?: string; effort?: Effort; look: CrewLook }

declare module 'claude-code' {
  interface PluginState {
    'crab-crew': {
      flow: Flow | null
      agents: CrewAgent[]
      planned: CrewPlanned[]
    }
  }
}
