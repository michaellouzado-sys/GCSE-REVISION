import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import { SUBJECTS, SUBJECT_LEVEL_TITLES, OVERALL_LEVEL_TITLES, formatDate, daysUntil, getSubjectLevelProgress, getOverallLevel, getOverallLevelProgress } from './data'
import { XPBar } from './components'

const card = { background: '#0F172A', border: '1px solid #1E293B', borderRadius: 12, padding: 20 }
const f = { fontFamily: "'Courier New', monospace" }

export default function ParentDashboard({ session, onSignOut }) {
  const [studentData, setStudentData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    fetchStudentData()
    // Refresh every 60 seconds
    const interval = setInterval(fetchStudentData, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchStudentData = async () => {
    try {
      const { data, error } = await supabase
        .from('planner_data')
        .select('*')
        .neq('user_id', session.user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      if (data && !error) {
        setStudentData(data)
        setLastUpdated(new Date())
      }
    } catch (e) {
      // No student data yet
    }
    setLoading(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B', ...f }}>
      Loading...
    </div>
  )

  const xp = studentData?.subject_xp || {}
  const completed = studentData?.completed_sessions || {}
  const examDates = studentData?.exam_dates || {}
  const confidence = studentData?.confidence_levels || {}
  const totalXP = Object.values(xp).reduce((a, b) => a + b, 0)
  const ovr = getOverallLevelProgress(totalXP)

  // Weekly stats
  const today = new Date()
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - today.getDay() + 1)
  let weeklyDone = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i)
    const ds = d.toISOString().split('T')[0]
    if (completed[ds]) weeklyDone += completed[ds].reduce((s, x) => s + x, 0)
  }

  // Total sessions completed
  const totalSessions = Object.values(completed).reduce((a, day) => a + day.filter(x => x > 0).length, 0)

  // Upcoming exams
  const allExams = SUBJECTS.flatMap(s => (examDates[s.id] || []).map(e => ({ ...s, label: e.label, date: e.date, daysLeft: daysUntil(e.date) })))
    .filter(e => e.daysLeft >= 0 && e.daysLeft <= 14).sort((a, b) => a.daysLeft - b.daysLeft)

  const confLabel = v => ['', '😰 Struggling', '😟 Weak', '😐 Okay', '😊 Good', '💪 Strong'][v] || 'Not set'
  const confColor = v => ['', '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#10B981'][v] || '#475569'

  return (
    <div style={{ minHeight: '100vh', background: '#020617', color: '#F1F5F9', ...f, paddingBottom: 60 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#0F172A,#1E293B)', borderBottom: '1px solid #1E293B', padding: '20px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 4, color: '#F59E0B', marginBottom: 4 }}>PARENT VIEW — READ ONLY</div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 900, letterSpacing: -1, lineHeight: 1 }}>
              REVISION<br /><span style={{ color: '#F59E0B' }}>MONITOR</span>
            </h1>
            {lastUpdated && <div style={{ fontSize: 10, color: '#475569', marginTop: 6 }}>Last updated {lastUpdated.toLocaleTimeString('en-GB')}</div>}
          </div>

          {/* Overall level */}
          <div style={{ flex: 1, minWidth: 260, background: '#0F172A', border: '1px solid #F59E0B30', borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 10, letterSpacing: 3, color: '#F59E0B', marginBottom: 2 }}>OVERALL LEVEL</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontSize: 32, fontWeight: 900, color: '#F59E0B', lineHeight: 1 }}>{ovr.level}</span>
                  <span style={{ fontSize: 13, color: '#94A3B8' }}>{OVERALL_LEVEL_TITLES[ovr.level]}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: '#64748B', letterSpacing: 1 }}>TOTAL XP</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#F59E0B' }}>{totalXP.toLocaleString()}</div>
              </div>
            </div>
            <XPBar current={ovr.current} max={ovr.next} height={8} />
            <div style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>{ovr.current}/{ovr.next} XP to Level {ovr.level + 1}</div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {[
              { v: totalSessions, l: 'SESSIONS DONE', c: '#10B981' },
              { v: `${Math.round(weeklyDone * 10) / 10}h`, l: 'THIS WEEK', c: '#6366F1' },
              { v: allExams.length, l: 'EXAMS ≤14 DAYS', c: '#EF4444' },
            ].map(s => (
              <div key={s.l} style={{ textAlign: 'center', padding: '8px 14px', background: '#1E293B', borderRadius: 8, border: '1px solid #334155' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: s.c }}>{s.v}</div>
                <div style={{ fontSize: 9, color: '#64748B', letterSpacing: 1 }}>{s.l}</div>
              </div>
            ))}
            <button onClick={onSignOut} style={{ padding: '8px 14px', background: '#1E293B', border: '1px solid #334155', color: '#64748B', borderRadius: 8, cursor: 'pointer', ...f, fontSize: 12 }}>
              SIGN OUT
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
        {!studentData ? (
          <div style={{ ...card, textAlign: 'center', padding: 60, color: '#475569' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
            <div style={{ fontSize: 16 }}>Waiting for your son to log in and start revising...</div>
            <div style={{ fontSize: 12, marginTop: 8 }}>This page auto-refreshes every minute.</div>
          </div>
        ) : (
          <>
            {/* Upcoming exams alert */}
            {allExams.length > 0 && (
              <div style={{ ...card, marginBottom: 20, border: '1px solid #EF444330' }}>
                <div style={{ fontSize: 10, letterSpacing: 3, color: '#EF4444', marginBottom: 12 }}>⚠ EXAMS IN THE NEXT 2 WEEKS</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 10 }}>
                  {allExams.map((e, i) => (
                    <div key={i} style={{ padding: '10px 14px', background: '#1a0f00', borderRadius: 8, border: `1px solid ${e.color}30` }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: e.color }}>{e.icon} {e.name}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{e.label}</div>
                      <div style={{ fontSize: 11, color: e.daysLeft <= 7 ? '#EF4444' : '#F59E0B', marginTop: 2 }}>
                        {formatDate(e.date)} · {e.daysLeft === 0 ? 'TODAY!' : `${e.daysLeft} days`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subject levels */}
            <div style={{ ...card, marginBottom: 20 }}>
              <div style={{ fontSize: 10, letterSpacing: 3, color: '#F59E0B', marginBottom: 16 }}>SUBJECT PROGRESS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px,1fr))', gap: 14 }}>
                {SUBJECTS.map(s => {
                  const lp = getSubjectLevelProgress(xp[s.id] || 0)
                  const conf = confidence[s.id] || 0
                  return (
                    <div key={s.id} style={{ background: '#1E293B', borderRadius: 8, padding: '12px 14px', border: `1px solid ${s.color}25` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 20 }}>{s.icon}</span>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>{s.name}</div>
                            <div style={{ fontSize: 10, color: conf ? confColor(conf) : '#475569' }}>
                              {conf ? confLabel(conf) : 'Confidence not set'}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 20, fontWeight: 900, color: s.color, lineHeight: 1 }}>Lv{lp.level}</div>
                          <div style={{ fontSize: 10, color: '#475569' }}>{SUBJECT_LEVEL_TITLES[lp.level]}</div>
                          <div style={{ fontSize: 9, color: '#475569' }}>{xp[s.id] || 0} XP</div>
                        </div>
                      </div>
                      <XPBar current={lp.current} max={lp.next} color={s.color} height={5} />
                      {lp.level < 5
                        ? <div style={{ fontSize: 9, color: '#475569', marginTop: 3 }}>{lp.current}/{lp.next} XP to Lv{lp.level + 1}</div>
                        : <div style={{ fontSize: 9, color: s.color, marginTop: 3 }}>★ MAX LEVEL</div>
                      }
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recent activity */}
            <div style={card}>
              <div style={{ fontSize: 10, letterSpacing: 3, color: '#F59E0B', marginBottom: 16 }}>RECENT ACTIVITY (LAST 7 DAYS)</div>
              <div>
                {Array.from({ length: 7 }, (_, i) => {
                  const d = new Date(); d.setDate(d.getDate() - (6 - i))
                  const ds = d.toISOString().split('T')[0]
                  const sessions = completed[ds] ? completed[ds].filter(x => x > 0).length : 0
                  const hours = completed[ds] ? completed[ds].reduce((a, x) => a + x, 0) : 0
                  const isToday = i === 6
                  return (
                    <div key={ds} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #1E293B' }}>
                      <div style={{ width: 80, fontSize: 12, color: isToday ? '#F59E0B' : '#64748B', fontWeight: isToday ? 700 : 400 }}>
                        {d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </div>
                      <div style={{ flex: 1, height: 8, background: '#1E293B', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, hours * 16)}%`, background: hours > 0 ? '#10B981' : 'transparent', borderRadius: 4, transition: 'width 0.5s' }} />
                      </div>
                      <div style={{ width: 100, textAlign: 'right', fontSize: 12 }}>
                        {hours > 0
                          ? <span style={{ color: '#10B981', fontWeight: 700 }}>{Math.round(hours * 10) / 10}h · {sessions} session{sessions !== 1 ? 's' : ''}</span>
                          : <span style={{ color: '#334155' }}>No revision</span>
                        }
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
