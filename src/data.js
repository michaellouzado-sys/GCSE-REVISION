export const XP_PER_SESSION = 75
export const XP_CONFIDENCE_BONUS = [0, 40, 25, 10, 0, 0]
export const SUBJECT_LEVEL_TITLES = ['Novice','Apprentice','Scholar','Expert','Master','Legend']
export const OVERALL_LEVEL_TITLES = ['Recruit','Student','Grinder','Scholar','Academic','Expert','Distinction','Elite','Champion','Legend','GCSE God']

export function getSubjectLevel(xp) {
  const thresh = l => 50 * l * l
  let l = 0; while (thresh(l+1) <= xp) l++; return Math.min(l,5)
}
export function getSubjectLevelProgress(xp) {
  const thresh = l => 50 * l * l
  const l = getSubjectLevel(xp)
  if (l >= 5) return { level:5, progress:1, current:xp, next:xp }
  return { level:l, progress:(xp-thresh(l))/(thresh(l+1)-thresh(l)), current:xp-thresh(l), next:thresh(l+1)-thresh(l) }
}
export function getOverallLevel(t) {
  let l = 0; while (500*(l+1) <= t) l++; return Math.min(l,10)
}
export function getOverallLevelProgress(t) {
  const l = getOverallLevel(t)
  if (l >= 10) return { level:10, progress:1, current:t, next:t }
  return { level:l, progress:(t-500*l)/500, current:t-500*l, next:500 }
}

export const SUBJECTS = [
  { id:'maths',        name:'Mathematics',        color:'#3B82F6', icon:'∑'  },
  { id:'english_lang', name:'English Language',   color:'#8B5CF6', icon:'✍'  },
  { id:'english_lit',  name:'English Literature', color:'#A855F7', icon:'📖' },
  { id:'biology',      name:'Biology',            color:'#10B981', icon:'🧬' },
  { id:'chemistry',    name:'Chemistry',          color:'#F59E0B', icon:'⚗'  },
  { id:'physics',      name:'Physics',            color:'#6366F1', icon:'⚛'  },
  { id:'history',      name:'History',            color:'#EF4444', icon:'🏛'  },
  { id:'spanish',      name:'Spanish',            color:'#F97316', icon:'🇪🇸' },
  { id:'dt',           name:'Design Technology',  color:'#14B8A6', icon:'📐' },
  { id:'cs',           name:'Computer Science',   color:'#06B6D4', icon:'💻' },
  { id:'add_maths',    name:'Additional Maths',   color:'#EC4899', icon:'∫'  },
]

// Exact dates from Dylan's Dulwich College timetable
export const DEFAULT_EXAM_DATES = {
  maths:        [
    { label:'Written Paper 1H',      date:'2026-05-14' },
    { label:'Written Paper 2H',      date:'2026-06-03' },
  ],
  english_lang: [
    { label:'Written Paper 1',       date:'2026-05-21' },
  ],
  english_lit:  [
    { label:'Poetry & Modern Prose', date:'2026-05-11' },
    { label:'Modern Drama/Heritage', date:'2026-05-19' },
  ],
  biology:      [
    { label:'Written Paper 1B',      date:'2026-05-12' },
    { label:'Written Paper 2B',      date:'2026-06-08' },
  ],
  chemistry:    [
    { label:'Written Paper 1C',      date:'2026-05-18' },
    { label:'Written Paper 2C',      date:'2026-06-12' },
  ],
  physics:      [
    { label:'Written Paper 1P',      date:'2026-06-02' },
    { label:'Written Paper 2P',      date:'2026-06-15' },
  ],
  history:      [
    { label:'Structured Questions',  date:'2026-05-07' },
    { label:'Document Questions',    date:'2026-05-15' },
  ],
  spanish:      [
    { label:'Speaking Test',         date:'2026-05-01' },
    { label:'Listening Test',        date:'2026-06-09' },
    { label:'Reading Test',          date:'2026-06-09' },
    { label:'Writing Test',          date:'2026-06-16' },
  ],
  dt:           [
    { label:'Written Paper',         date:'2026-06-10' },
  ],
  cs:           [
    { label:'Computer Systems',      date:'2026-05-13' },
    { label:'Comp Thinking & Prog',  date:'2026-05-19' },
  ],
  add_maths:    [
    { label:'Additional Maths P1',   date:'2026-06-15' },
  ],
}

export const DEFAULT_CROATIA = { start:'2026-04-08', end:'2026-04-11' }

export function getCroatiaDates(start, end) {
  const dates = {}
  if (!start || !end) return dates
  const s = new Date(start), e = new Date(end)
  dates[start] = { type:'travel', label:'✈️ Travel to Croatia (no revision)' }
  dates[end]   = { type:'travel', label:'✈️ Travel home from Croatia (no revision)' }
  const cur = new Date(s); cur.setDate(cur.getDate()+1)
  while (cur < e) {
    const d = cur.toISOString().split('T')[0]
    dates[d] = { type:'camp', label:'🚣 Rowing Camp – Croatia (4h revision)' }
    cur.setDate(cur.getDate()+1)
  }
  return dates
}

export const DEFAULT_BLOCKED = {}
export const DEFAULT_STUDY_LEAVE = '2026-05-04'

// How many sessions each subject deserves based on confidence (lower conf = more sessions)
// Returns a weight 1-5 (higher = more sessions needed)
export function subjectWeight(confidence) {
  return [0,5,4,3,2,1][confidence] || 3
}

export function getDaysBetween(s, e) {
  const days = [], cur = new Date(s), end = new Date(e)
  while (cur <= end) { days.push(new Date(cur)); cur.setDate(cur.getDate()+1) }
  return days
}
export function formatDate(ds) {
  if (!ds) return ''
  return new Date(ds).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
}
export function formatDateShort(ds) {
  if (!ds) return ''
  return new Date(ds).toLocaleDateString('en-GB', { day:'numeric', month:'short' })
}
export function daysUntil(ds) {
  const t = new Date(); t.setHours(0,0,0,0)
  const e = new Date(ds); e.setHours(0,0,0,0)
  return Math.ceil((e-t)/86400000)
}
export function isStudyDay(date, studyLeaveStart, blocked, croatiaCache) {
  const ds = date.toISOString().split('T')[0]
  if (croatiaCache[ds]?.type === 'travel') return false
  if (blocked[ds]) return false
  // All days Mon-Sun — Dylan revises every day
  return true
}
export function isCampDay(date, croatiaCache) {
  const ds = date.toISOString().split('T')[0]
  return croatiaCache[ds]?.type === 'camp'
}
