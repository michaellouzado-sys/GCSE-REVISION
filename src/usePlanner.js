import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase'
import {
  SUBJECTS, DEFAULT_EXAM_DATES, DEFAULT_BLOCKED, DEFAULT_CROATIA, DEFAULT_STUDY_LEAVE,
  getCroatiaDates, XP_PER_SESSION, XP_CONFIDENCE_BONUS,
  getDaysBetween, daysUntil,
  getSubjectLevel, getOverallLevel, SUBJECT_LEVEL_TITLES, OVERALL_LEVEL_TITLES
} from './data'

export function usePlanner(session, addToast) {
  const userId = session.user.id

  const [examDates,      setExamDates]      = useState(DEFAULT_EXAM_DATES)
  const [studyLeave,     setStudyLeave]     = useState(DEFAULT_STUDY_LEAVE)
  const [blocked,        setBlocked]        = useState(DEFAULT_BLOCKED)
  const [confidence,     setConfidence]     = useState({})
  const [manualSessions, setManualSessions] = useState({})
  const [xp,             setXP]             = useState({})
  const [croatiaStart,   setCroatiaStart]   = useState(DEFAULT_CROATIA.start)
  const [croatiaEnd,     setCroatiaEnd]     = useState(DEFAULT_CROATIA.end)
  // hoursBudget: { [subjectId]: number } — hours Dylan has allocated to each subject
  const [hoursBudget,    setHoursBudget]    = useState({})
  const [loaded,         setLoaded]         = useState(false)
  const saveTimer = useRef(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('planner_data').select('*').eq('user_id', userId).single()
      if (data) {
        if (data.exam_dates)         setExamDates(data.exam_dates)
        if (data.study_leave_start)  setStudyLeave(data.study_leave_start)
        if (data.blocked_dates)      setBlocked(data.blocked_dates)
        if (data.confidence_levels)  setConfidence(data.confidence_levels)
        if (data.manual_sessions)    setManualSessions(data.manual_sessions)
        if (data.subject_xp)         setXP(data.subject_xp)
        if (data.croatia_start)      setCroatiaStart(data.croatia_start)
        if (data.croatia_end)        setCroatiaEnd(data.croatia_end)
        if (data.hours_budget)       setHoursBudget(data.hours_budget)
      }
      setLoaded(true)
    }
    load()
  }, [userId])

  const getState = () => ({ examDates, studyLeave, blocked, confidence, manualSessions, xp, croatiaStart, croatiaEnd, hoursBudget })

  const save = useCallback((patch) => {
    if (!loaded) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await supabase.from('planner_data').upsert({
        user_id: userId,
        exam_dates: patch.examDates,
        study_leave_start: patch.studyLeave,
        blocked_dates: patch.blocked,
        confidence_levels: patch.confidence,
        manual_sessions: patch.manualSessions,
        subject_xp: patch.xp,
        croatia_start: patch.croatiaStart,
        croatia_end: patch.croatiaEnd,
        hours_budget: patch.hoursBudget,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    }, 800)
  }, [loaded, userId])

  const update = (field, value, setter) => {
    setter(value)
    save({ ...getState(), [field]: value })
  }

  const croatiaCache = getCroatiaDates(croatiaStart, croatiaEnd)
  const totalXP = Object.values(xp).reduce((a,b) => a+b, 0)

  const awardXP = (sid, conf) => {
    const gained = XP_PER_SESSION + (XP_CONFIDENCE_BONUS[conf]||0)
    setXP(prev => {
      const old = prev[sid]||0, nw = old+gained
      const subj = SUBJECTS.find(s => s.id===sid)
      if (getSubjectLevel(nw) > getSubjectLevel(old)) {
        const nl = getSubjectLevel(nw)
        addToast(`${subj?.name} → Lv${nl} ${SUBJECT_LEVEL_TITLES[nl]}!`, true)
      } else {
        addToast(`+${gained} XP  ${subj?.icon} ${subj?.name}`)
      }
      const ot = Object.values(prev).reduce((a,b)=>a+b,0)
      if (getOverallLevel(ot+gained) > getOverallLevel(ot)) {
        const nl = getOverallLevel(ot+gained)
        setTimeout(() => addToast(`Overall Lv${nl} — ${OVERALL_LEVEL_TITLES[nl]}!`, true), 700)
      }
      const next = { ...prev, [sid]:nw }
      save({ ...getState(), xp:next })
      return next
    })
  }

  const revokeXP = (sid, conf) => {
    const lost = XP_PER_SESSION + (XP_CONFIDENCE_BONUS[conf]||0)
    setXP(prev => {
      const next = { ...prev, [sid]:Math.max(0,(prev[sid]||0)-lost) }
      save({ ...getState(), xp:next })
      return next
    })
  }

  const allExams = () => SUBJECTS.flatMap(s => (examDates[s.id]||[]).filter(e=>e.date).map(e => ({ sid:s.id, label:e.label, date:e.date })))
  const getLastExam = id => { const e = examDates[id]; return e?.length ? e.map(x=>x.date).filter(d=>d).sort().pop() : null }

  // Total available revision hours from today to last exam (4h/day, no travel days, no blocked)
  const getTotalAvailableHours = () => {
    const allDates = allExams().map(e=>e.date).filter(d=>d).sort()
    if (!allDates.length) return 0
    const today = new Date(); today.setHours(0,0,0,0)
    const end = new Date(allDates[allDates.length-1])
    let total = 0
    getDaysBetween(today, end).forEach(day => {
      const ds = day.toISOString().split('T')[0]
      if (croatiaCache[ds]?.type === 'travel') return
      if (blocked[ds]) return
      total += 4
    })
    return total
  }

  // Total hours allocated in budget
  const getTotalBudgeted = () => Object.values(hoursBudget).reduce((a,b)=>a+b, 0)

  // Hours completed per subject by scanning manual + auto sessions
  const getCompletedHours = () => {
    const result = {}
    SUBJECTS.forEach(s => { result[s.id] = 0 })
    Object.entries(manualSessions).forEach(([ds, sessions]) => {
      sessions.forEach(sess => {
        if (sess.done && result[sess.sid] !== undefined) result[sess.sid]++
      })
    })
    return result
  }

  // Is this a valid revision day?
  const isRevisionDay = (dateStr) => {
    if (croatiaCache[dateStr]?.type === 'travel') return false
    if (blocked[dateStr]) return false
    return true
  }

  // Auto-suggest 4 subjects for a day based on budget deficit
  // Subjects furthest behind their target get priority
  const suggestSubjects = (dateStr) => {
    const date = new Date(dateStr)
    const completed = getCompletedHours()

    // Only subjects with remaining exams
    const eligible = SUBJECTS.filter(s => {
      const last = getLastExam(s.id)
      return last && date <= new Date(last)
    })
    if (!eligible.length) return []

    // Score each subject: higher score = more behind target = higher priority
    const scored = eligible.map(s => {
      const budgeted = hoursBudget[s.id] || 0
      const done = completed[s.id] || 0
      const remaining = budgeted - done
      // If no budget set, fall back to confidence weighting
      const score = budgeted > 0 ? remaining : (6 - (confidence[s.id]||3))
      return { s, score }
    }).sort((a,b) => b.score - a.score)

    // Use date as tiebreak seed for variety
    const seed = date.getDate() * 7 + date.getMonth() * 31
    const slots = []
    const used = new Set()

    // Pick top 4 unique subjects
    for (const { s } of scored) {
      if (used.has(s.id)) continue
      used.add(s.id)
      slots.push({ sid: s.id, topic: '', done: false })
      if (slots.length === 4) break
    }

    // Pad to 4 if fewer eligible subjects
    let i = 0
    while (slots.length < 4 && eligible.length > 0) {
      slots.push({ sid: eligible[i % eligible.length].id, topic: '', done: false })
      i++
    }

    return slots
  }

  const getSessionsForDate = (dateStr) => {
    if (manualSessions[dateStr]) return manualSessions[dateStr]
    if (!isRevisionDay(dateStr)) return []
    return suggestSubjects(dateStr)
  }

  const saveSessionsForDate = (dateStr, sessions) => {
    const next = { ...manualSessions, [dateStr]: sessions }
    setManualSessions(next)
    save({ ...getState(), manualSessions: next })
  }

  const toggleSession = (dateStr, idx) => {
    const current = getSessionsForDate(dateStr)
    const sess = current[idx]; if (!sess) return
    const wasDone = sess.done
    const updated = current.map((s,i) => i===idx ? {...s,done:!wasDone} : s)
    saveSessionsForDate(dateStr, updated)
    const conf = confidence[sess.sid]||3
    if (!wasDone) awardXP(sess.sid, conf)
    else revokeXP(sess.sid, conf)
  }

  return {
    examDates,      setExamDates:      v => update('examDates', v, setExamDates),
    studyLeave,     setStudyLeave:     v => update('studyLeave', v, setStudyLeave),
    blocked,        setBlocked:        v => update('blocked', v, setBlocked),
    confidence,     setConfidence:     v => update('confidence', v, setConfidence),
    manualSessions, saveSessionsForDate, getSessionsForDate,
    xp,             setXP:             v => update('xp', v, setXP),
    croatiaStart,   setCroatiaStart:   v => update('croatiaStart', v, setCroatiaStart),
    croatiaEnd,     setCroatiaEnd:     v => update('croatiaEnd', v, setCroatiaEnd),
    hoursBudget,    setHoursBudget:    v => update('hoursBudget', v, setHoursBudget),
    croatiaCache, totalXP, loaded, allExams, toggleSession,
    getTotalAvailableHours, getTotalBudgeted, getCompletedHours,
    isDone: (ds, idx) => { const s = getSessionsForDate(ds); return s[idx]?.done||false },
    xpGain: sid => XP_PER_SESSION + (XP_CONFIDENCE_BONUS[confidence[sid]||3]||0),
    isRevisionDay,
  }
}
