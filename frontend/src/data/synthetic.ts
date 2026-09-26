// SYNTHETIC DATA ONLY. Every person and session below is invented for the demo.
// Never add real patient information to this file.

import type { Concept, HistoryConnection, SessionStatus } from '../types'

export interface SyntheticAccount {
  patientId: string // opaque UUID-style id, never a name or MRN
  email: string
  firstName: string
}

export interface StoredSession {
  id: string
  patientId: string
  session_date: string
  status: SessionStatus
  summary?: string
  concepts?: Concept[]
  connections_to_history?: HistoryConnection[]
  released_at?: string
}

export const ACCOUNTS: SyntheticAccount[] = [
  { patientId: '6f1c2a9e-4b7d-4e2a-9c51-0d8e3b7a1f42', email: 'dana@example.com', firstName: 'Dana' },
  { patientId: 'b83e0d17-92c4-4f6a-8a3e-5c1f7d2e9b60', email: 'sam@example.com', firstName: 'Sam' },
]

const DANA = ACCOUNTS[0].patientId
const SAM = ACCOUNTS[1].patientId

const CATASTROPHIZING: Concept = {
  term: 'catastrophizing',
  plain_language: 'Jumping to the worst-case outcome',
  first_seen: '2026-02-14',
  recurring: true,
}

export const SESSIONS: StoredSession[] = [
  {
    id: 'ses_d01',
    patientId: DANA,
    session_date: '2026-02-14',
    status: 'released',
    released_at: '2026-02-16',
    summary:
      'In this first session, you talked about feeling very nervous before speaking in meetings at work. You described how your mind often races ahead to the worst possible result, like imagining that one small mistake will make everyone think less of you. Your clinician explained that this pattern has a name: catastrophizing, which means jumping to the worst-case outcome. You talked about how common this pattern is and how noticing it is the first step. Together you agreed on a simple goal for the coming weeks: when you notice a worst-case thought, write it down along with what actually happened afterward. You also talked about what you hope to get out of your sessions, including feeling calmer before presentations and being kinder to yourself after them.',
    concepts: [CATASTROPHIZING],
    connections_to_history: [],
  },
  {
    id: 'ses_d02',
    patientId: DANA,
    session_date: '2026-03-06',
    status: 'released',
    released_at: '2026-03-09',
    summary:
      'You brought in the notes you had been keeping about worst-case thoughts. You noticed that most of them came up the night before a meeting, and that the outcomes you feared mostly did not happen. Your clinician introduced a thought record, which is a short worksheet for slowing a thought down. It asks what happened, what you thought, how strongly you believed it, and what a more balanced thought might be. You practiced one together using a recent team meeting. You found it helpful to rate how strongly you believed the thought before and after. For the next few weeks, the plan was to try one thought record whenever a worry felt especially strong.',
    concepts: [
      {
        term: 'thought record',
        plain_language: 'A short worksheet for slowing down and checking a worried thought',
        first_seen: '2026-03-06',
        recurring: false,
      },
    ],
    connections_to_history: [
      {
        prior_session_id: 'ses_d01',
        prior_session: '2026-02-14',
        relationship: 'Built on the goal of writing down worst-case thoughts',
      },
    ],
  },
  {
    id: 'ses_d03',
    patientId: DANA,
    session_date: '2026-04-03',
    status: 'released',
    released_at: '2026-04-06',
    summary:
      'This session focused on a presentation you gave last week. Beforehand, you had the thought that you would forget everything and be embarrassed. You recognized this as catastrophizing, the pattern of jumping to the worst-case outcome that you first talked about in February. You said that noticing it did not make the nervous feeling go away, but it made it feel smaller. You and your clinician looked at your thought records and found that your worries were strongest when you were tired. You talked about ways to prepare that feel realistic, like practicing the first two minutes out loud rather than the whole talk. The plan was to keep using thought records and to try the shorter practice before your next presentation.',
    concepts: [CATASTROPHIZING],
    connections_to_history: [
      {
        prior_session_id: 'ses_d01',
        prior_session: '2026-02-14',
        relationship: 'Same pattern discussed',
      },
      {
        prior_session_id: 'ses_d02',
        prior_session: '2026-03-06',
        relationship: 'Continued using thought records',
      },
    ],
  },
  {
    id: 'ses_d04',
    patientId: DANA,
    session_date: '2026-05-01',
    status: 'released',
    released_at: '2026-05-04',
    summary:
      'You talked about having trouble falling asleep on nights when your mind keeps going over work. Your clinician suggested setting aside a short worry time earlier in the evening. This means choosing about fifteen minutes to write down your worries on purpose, so there is less to carry to bed. If a worry shows up later, you can remind yourself that it has a time slot tomorrow. You also talked about a wind-down routine that feels realistic for you, like putting your phone in another room and reading for a few minutes. You were unsure whether worry time would work, and your clinician suggested treating it as an experiment. The plan was to try it on at least three evenings and notice what changes.',
    concepts: [
      {
        term: 'worry time',
        plain_language: 'A set time each day to write down worries on purpose',
        first_seen: '2026-05-01',
        recurring: false,
      },
    ],
    connections_to_history: [],
  },
  {
    id: 'ses_d05',
    patientId: DANA,
    session_date: '2026-06-12',
    status: 'failed',
  },

  // Second synthetic patient, used to demonstrate isolation.
  {
    id: 'ses_s01',
    patientId: SAM,
    session_date: '2026-05-20',
    status: 'released',
    released_at: '2026-05-22',
    summary:
      'You talked about building a routine for regular walks. This synthetic record exists only to test that one patient can never see another patient’s sessions.',
    concepts: [],
    connections_to_history: [],
  },
]

/** Result the mock "model + clinician review" produces for Dana's demo upload (plan section 1 example). */
export const DEMO_UPLOAD_RESULT: Pick<StoredSession, 'summary' | 'concepts' | 'connections_to_history'> = {
  summary:
    'This session focused on the physical symptoms you notice before presentations at work, including chest tightness and racing thoughts. You and your clinician practiced a grounding technique to use in the moment. It involves naming a few things you can see, hear, and feel, which can help bring your attention back to the present. You also revisited catastrophizing, a pattern discussed in earlier sessions where you jump to the worst-case outcome. You noticed that the physical symptoms and the worst-case thoughts often show up together. The plan was to try the grounding technique twice before your next presentation and note how it went.',
  concepts: [
    CATASTROPHIZING,
    {
      term: 'grounding technique',
      plain_language: 'Noticing what you can see, hear, and feel to come back to the present moment',
      first_seen: '2026-09-26',
      recurring: false,
    },
  ],
  connections_to_history: [
    { prior_session_id: 'ses_d01', prior_session: '2026-02-14', relationship: 'Same pattern discussed' },
    { prior_session_id: 'ses_d03', prior_session: '2026-04-03', relationship: 'Same pattern discussed' },
  ],
}
