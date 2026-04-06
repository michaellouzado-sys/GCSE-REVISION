import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabase'
import {
  SUBJECTS, DEFAULT_EXAM_DATES, DEFAULT_BLOCKED, DEFAULT_CROATIA, DEFAULT_STUDY_LEAVE,
  getCroatiaDates, XP_PER_SESSION, XP_CONFIDENCE_BONUS, subjectWeight,
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
      }
      setLoaded(true)
    }
    load()
  }, [userId])

  const getState = () => ({ examDates, studyLeave, blocked, confidence, manualSessions, xp, croatiaStart, croatiaEnd })

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
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    }, 800)
  }, [loaded, userId])

  const getState2 = () => ({ examDates, studyLeave, blocked, confidence, manualSessions, xp, croatiaStart, croatiaEnd })
  const update = (field, value, setter) => { setter(value); save({ ...getState2(), [field]: value }) }

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
      save({ ...getState2(), xp:next })
      return next
    })
  }

  const revokeXP = (sid, conf) => {
    const lost = XP_PER_SESSION + (XP_CONFIDENCE_BONUS[conf]||0)
    setXP(prev => {
      const next = { ...prev, [sid]:Math.max(0,(prev[sid]||0)-lost) }
      save({ ...getState2(), xp:next })
      return next
    })
  }

  const allExams = () => SUBJECTS.flatMap(s => (examDates[s.id]||[]).filter(e=>e.date).map(e => ({ sid:s.id, label:e.label, date:e.date })))
  const getLastExam = id => { const e = examDates[id]; return e?.length ? e.map(x=>x.date).filter(d=>d).sort().pop() : null }

  // Is this a valid revision day? 4h every day EXCEPT travel days and manually blocked dates
  const isRevisionDay = (dateStr) => {
    if (croatiaCache[dateStr]?.type === 'travel') return false
    if (blocked[dateStr]) return false
    return true
  }

  // Camp days count too — just 4h like any other day
  const isCampDay = (dateStr) => croatiaCache[dateStr]?.type === 'camp'

  // Suggest 4 subjects for a day using confidence-weighted round robin
  // Always returns exactly 4 slots (with repeats allowed if fewer than 4 eligible subjects)
  const suggestSubjects = (dateStr) => {
    const date = new Date(dateStr)

    // All subjects that still have exams remaining
    const eligible = SUBJECTS.filter(s => {
      const last = getLastExam(s.id)
      return last && date <= new Date(last)
    })

    if (!eligible.length) return []

    // Build weighted pool — lower confidence = more entries in pool
    const pool = []
    eligible.forEach(s => {
      const w = subjectWeight(confidence[s.id]||3)
      for (let i = 0; i < w; i++) pool.push(s)
    })

    // Seed based on date for consistent suggestions
    const seed = date.getDate() * 7 + date.getMonth() * 31 + date.getFullYear() * 366

    // Pick 4 unique subjects from pool (no repeats within same day)
    const used = new Set()
    const slots = []
    let attempts = 0

    while (slots.length < 4 && attempts < pool.length * 3) {
      const idx = (seed + attempts * 17) % pool.length
      const subj = pool[idx]
      if (!used.has(subj.id)) {
        used.add(subj.id)
        slots.push({ sid: subj.id, topic: '', done: false })
      }
      attempts++
    }

    // If we still don't have 4 (fewer than 4 eligible subjects), fill with repeats
    if (slots.length < 4 && eligible.length > 0) {
      let i = 0
      while (slots.length < 4) {
        slots.push({ sid: eligible[i % eligible.length].id, topic: '', done: false })
        i++
      }
    }

    return slots
  }

  // Get sessions for a date — manual override takes priority, else auto-suggest
  const getSessionsForDate = (dateStr) => {
    if (manualSessions[dateStr]) return manualSessions[dateStr]
    if (!isRevisionDay(dateStr)) return []
    return suggestSubjects(dateStr)
  }

  const saveSessionsForDate = (dateStr, sessions) => {
    const next = { ...manualSessions, [dateStr]: sessions }
    setManualSessions(next)
    save({ ...getState2(), manualSessions: next })
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

  // ── Subject hours stats ──
  // Calculate total allocated hours and completed hours per subject
  // from today back to the start of revision (1 Apr 2026) through to last exam
  const getSubjectHoursStats = () => {
    const start = new Date('2026-04-01')
    const allDates = allExams().map(e=>e.date).filter(d=>d).sort()
    if (!allDates.length) return {}

    const end = new Date(allDates[allDates.length-1])
    const days = getDaysBetween(start, end)
    const stats = {}
    SUBJECTS.forEach(s => { stats[s.id] = { allocated:0, completed:0 } })

    days.forEach(day => {
      const ds = day.toISOString().split('T')[0]
      const sessions = getSessionsForDate(ds)
      sessions.forEach(sess => {
        if (!stats[sess.sid]) return
        stats[sess.sid].allocated++
        if (sess.done) stats[sess.sid].completed++
      })
    })

    return stats
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
    croatiaCache, totalXP, loaded, allExams, toggleSession, getSubjectHoursStats,
    isDone: (ds, idx) => { const s = getSessionsForDate(ds); return s[idx]?.done||false },
    xpGain: sid => XP_PER_SESSION + (XP_CONFIDENCE_BONUS[confidence[sid]||3]||0),
    isRevisionDay,
  }
}
