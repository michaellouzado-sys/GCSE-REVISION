import { useState, useRef } from 'react'
import { SUBJECTS, SUBJECT_LEVEL_TITLES, OVERALL_LEVEL_TITLES,
         formatDate, formatDateShort, daysUntil, getSubjectLevelProgress,
         getOverallLevelProgress, XP_CONFIDENCE_BONUS, getDaysBetween,
         isStudyDay, isCampDay } from './data'
import { XPBar, XPToast } from './components'
import { usePlanner } from './usePlanner'

const card = { background:'#0F172A', border:'1px solid #1E293B', borderRadius:12, padding:20 }
const f = { fontFamily:"'Courier New',monospace" }
const inp = (extra) => ({ background:'#1E293B', border:'1px solid #334155', borderRadius:6,
  padding:'5px 9px', color:'#F1F5F9', fontSize:12, ...f, ...extra })

export default function Planner({ session, onSignOut }) {
  const [tab, setTab]           = useState('dashboard')
  const [selDate, setSelDate]   = useState(null)
  const [calMonth, setCalMonth] = useState(new Date(2026,3,1))
  const [newBD, setNewBD]       = useState('')
  const [newBL, setNewBL]       = useState('')
  const [toasts, setToasts]     = useState([])
  const [editingDate, setEditingDate] = useState(null)
  const tid = useRef(0)

  const addToast = (text, lu=false) => {
    const id = tid.current++
    setToasts(p => [...p, {id,text,lu}])
    setTimeout(() => setToasts(p => p.filter(t => t.id!==id)), 3200)
  }

  const P = usePlanner(session, addToast)
  if (!P.loaded) return <div style={{minHeight:'100vh',background:'#020617',display:'flex',alignItems:'center',justifyContent:'center',color:'#F59E0B',...f}}>Loading...</div>

  const todayStr = new Date().toISOString().split('T')[0]
  const todayPlan = P.getSessionsForDate(todayStr)
  const getS = id => SUBJECTS.find(s => s.id===id)
  const ovr = getOverallLevelProgress(P.totalXP)
  const confLabel = v => ['','😰 Struggling','😟 Weak','😐 Okay','😊 Good','💪 Strong'][v]||'Not set'
  const confColor = v => ['','#EF4444','#F97316','#F59E0B','#84CC16','#10B981'][v]||'#475569'

  const today = new Date(), ws = new Date(today)
  ws.setDate(today.getDate()-today.getDay()+1)
  let wTotal=0, wDone=0
  for (let i=0;i<7;i++) {
    const d=new Date(ws); d.setDate(ws.getDate()+i)
    const ds=d.toISOString().split('T')[0]
    const sess=P.getSessionsForDate(ds)
    wTotal+=sess.length; wDone+=sess.filter(s=>s.done).length
  }

  const upcoming = P.allExams().map(e => { const s=getS(e.sid); return {...s,examDate:e.date,label:e.label,daysLeft:daysUntil(e.date)} }).filter(e=>e.daysLeft>=0).sort((a,b)=>a.daysLeft-b.daysLeft)
  const nb = {background:'#1E293B',border:'1px solid #334155',color:'#94A3B8',borderRadius:6,padding:'6px 12px',cursor:'pointer',fontSize:16,...f}
  const tabBtn = a => ({padding:'8px 18px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:700,letterSpacing:1,border:'none',...f,background:a?'#F59E0B':'transparent',color:a?'#000':'#64748B',transition:'all 0.2s'})

  // ── Day Editor ── modal for editing a day's 4 sessions
  const DayEditor = ({ dateStr, onClose }) => {
    const current = P.getSessionsForDate(dateStr)
    const [sessions, setSessions] = useState(current.length ? current : [{sid:'',topic:'',done:false},{sid:'',topic:'',done:false},{sid:'',topic:'',done:false},{sid:'',topic:'',done:false}])

    const setSlot = (idx, field, val) => {
      setSessions(prev => prev.map((s,i) => i===idx ? {...s,[field]:val} : s))
    }

    const save = () => {
      const valid = sessions.filter(s=>s.sid)
      P.saveSessionsForDate(dateStr, valid)
      onClose()
    }

    const dateD = new Date(dateStr)
    const isCamp = isCampDay(dateD, P.croatiaCache)

    return (
      <div style={{position:'fixed',inset:0,background:'#000000aa',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
        <div style={{...card,width:'100%',maxWidth:480,maxHeight:'90vh',overflowY:'auto'}}>
          <div style={{fontSize:10,letterSpacing:3,color:'#F59E0B',marginBottom:4}}>PLAN THIS DAY</div>
          <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>{new Date(dateStr).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
          {isCamp && <div style={{fontSize:11,color:'#14B8A6',marginBottom:12}}>🚣 Rowing camp day — 4h available</div>}
          <div style={{fontSize:11,color:'#64748B',marginBottom:16}}>Set up to 4 subjects. Add a topic or leave blank.</div>

          {sessions.map((sess,idx) => (
            <div key={idx} style={{marginBottom:12,padding:12,background:'#1E293B',borderRadius:8}}>
              <div style={{fontSize:10,color:'#475569',marginBottom:6,letterSpacing:2}}>SESSION {idx+1}</div>
              <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
                <select value={sess.sid} onChange={e=>setSlot(idx,'sid',e.target.value)}
                  style={{flex:1,minWidth:140,...inp(),padding:'6px 9px'}}>
                  <option value=''>— pick subject —</option>
                  {SUBJECTS.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                </select>
                <input placeholder='Topic (optional)' value={sess.topic} onChange={e=>setSlot(idx,'topic',e.target.value)}
                  style={{flex:2,minWidth:140,...inp()}} />
                {sess.sid && (
                  <button onClick={()=>setSlot(idx,'sid','')}
                    style={{background:'none',border:'none',color:'#EF4444',cursor:'pointer',fontSize:18,padding:'0 2px'}}>×</button>
                )}
              </div>
            </div>
          ))}

          <div style={{display:'flex',gap:10,marginTop:8}}>
            <button onClick={save} style={{flex:1,padding:'10px',background:'#F59E0B',color:'#000',border:'none',borderRadius:8,fontWeight:700,cursor:'pointer',...f,letterSpacing:1}}>SAVE</button>
            <button onClick={onClose} style={{padding:'10px 16px',background:'#1E293B',color:'#64748B',border:'1px solid #334155',borderRadius:8,cursor:'pointer',...f}}>CANCEL</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Calendar ──
  const renderCal = () => {
    const yr=calMonth.getFullYear(), mo=calMonth.getMonth()
    const firstDay=new Date(yr,mo,1).getDay(), dim=new Date(yr,mo+1,0).getDate()
    const cells=[]
    for (let i=0;i<(firstDay===0?6:firstDay-1);i++) cells.push(null)
    for (let d=1;d<=dim;d++) {
      const date=new Date(yr,mo,d), ds=date.toISOString().split('T')[0]
      const ci=P.croatiaCache[ds]
      const isCamp=ci?.type==='camp', isTravel=ci?.type==='travel'
      const isBlocked=!!P.blocked[ds]||isTravel
      const exams=P.allExams().filter(e=>e.date===ds)
      const hasExam=exams.length>0
      const sessions=P.getSessionsForDate(ds)
      const hasPlan=sessions.length>0
      const doneSessions=sessions.filter(s=>s.done).length
      const examSubs=exams.map(e=>getS(e.sid)).filter(Boolean)
      cells.push({d,ds,isToday:ds===todayStr,isBlocked,isCamp,isTravel,hasExam,hasPlan,sessions,doneSessions,examSubs,exams})
    }
    return (
      <div style={f}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <button onClick={()=>setCalMonth(new Date(yr,mo-1,1))} style={nb}>←</button>
          <span style={{fontSize:18,fontWeight:700,letterSpacing:2,color:'#F1F5F9'}}>{calMonth.toLocaleDateString('en-GB',{month:'long',year:'numeric'}).toUpperCase()}</span>
          <button onClick={()=>setCalMonth(new Date(yr,mo+1,1))} style={nb}>→</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3,marginBottom:3}}>
          {['MON','TUE','WED','THU','FRI','SAT','SUN'].map(d=><div key={d} style={{textAlign:'center',fontSize:9,color:'#64748B',fontWeight:700,padding:'3px 0'}}>{d}</div>)}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
          {cells.map((c,i)=>{
            if (!c) return <div key={`e${i}`}/>
            return (
              <div key={c.ds} onClick={()=>{setSelDate(c.ds); if(c.hasPlan||(!c.isBlocked&&!c.isTravel)) setEditingDate(c.ds)}}
                style={{minHeight:56,borderRadius:6,padding:'4px 4px',cursor:'pointer',
                  border:c.isToday?'2px solid #F59E0B':'1px solid #1E293B',
                  background:c.isTravel?'#1a0a0a':c.isCamp?'#001a1a':c.isBlocked?'#1a0a0a':c.hasExam?'#1a0f00':'#0F172A',
                  overflow:'hidden',transition:'all 0.15s'}}>
                <div style={{fontSize:11,fontWeight:700,color:c.isToday?'#F59E0B':c.isBlocked?'#EF4444':'#94A3B8'}}>{c.d}</div>
                {/* Exam badges */}
                {c.hasExam&&<div style={{marginTop:1}}>{c.examSubs.slice(0,2).map((es,ei)=><div key={ei} style={{fontSize:7,background:es?.color||'#F59E0B',borderRadius:3,padding:'1px 3px',marginBottom:1,color:'#000',fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>📝{es?.icon} {P.allExams().find(e=>e.date===c.ds&&e.sid===es?.id)?.label?.split(' ')[0]}</div>)}{c.exams.length>2&&<div style={{fontSize:7,color:'#F59E0B'}}>+{c.exams.length-2} more</div>}</div>}
                {/* Session dots */}
                {c.hasPlan&&!c.hasExam&&(
                  <div style={{display:'flex',gap:2,marginTop:3,flexWrap:'wrap'}}>
                    {c.sessions.map((s,si)=>{const subj=getS(s.sid);return subj?<div key={si} style={{width:6,height:6,borderRadius:'50%',background:s.done?subj.color:'#334155',border:`1px solid ${subj.color}`,flexShrink:0}}/>:null})}
                  </div>
                )}
                {/* Done counter */}
                {c.hasPlan&&c.doneSessions>0&&<div style={{fontSize:8,color:'#10B981',marginTop:1}}>{c.doneSessions}/{c.sessions.length}✓</div>}
                {c.isTravel&&<div style={{fontSize:7,color:'#EF4444',marginTop:1}}>✈️ TRAVEL</div>}
                {c.isCamp&&<div style={{fontSize:7,color:'#14B8A6',marginTop:1}}>🚣 CAMP</div>}
                {c.isBlocked&&!c.isTravel&&!c.isCamp&&<div style={{fontSize:7,color:'#EF4444',marginTop:1}}>AWAY</div>}
              </div>
            )
          })}
        </div>
        <div style={{display:'flex',gap:12,marginTop:12,flexWrap:'wrap'}}>
          {[{color:'#F59E0B',label:'Today'},{color:'#1a0f00',label:'Exam',border:'1px solid #F59E0B'},{color:'#001a1a',label:'Camp (4h)'},{color:'#1a0a0a',label:'Blocked'}].map(l=>(
            <div key={l.label} style={{display:'flex',alignItems:'center',gap:4}}>
              <div style={{width:10,height:10,borderRadius:2,background:l.color,border:l.border||'1px solid #334155'}}/>
              <span style={{fontSize:9,color:'#64748B'}}>{l.label}</span>
            </div>
          ))}
          <div style={{fontSize:9,color:'#64748B'}}>Click any day to plan sessions</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{minHeight:'100vh',background:'#020617',color:'#F1F5F9',...f,paddingBottom:60}}>
      <XPToast toasts={toasts}/>
      {editingDate && <DayEditor dateStr={editingDate} onClose={()=>setEditingDate(null)}/>}

      {/* HEADER */}
      <div style={{background:'linear-gradient(135deg,#0F172A,#1E293B)',borderBottom:'1px solid #1E293B',padding:'20px 24px 0'}}>
        <div style={{maxWidth:1100,margin:'0 auto'}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',flexWrap:'wrap',gap:16}}>
            <div>
              <div style={{fontSize:10,letterSpacing:4,color:'#F59E0B',marginBottom:4}}>GCSE REVISION COMMAND CENTRE</div>
              <h1 style={{margin:0,fontSize:28,fontWeight:900,letterSpacing:-1,lineHeight:1}}>REVISION<br/><span style={{color:'#F59E0B'}}>PLANNER</span></h1>
            </div>
            <div style={{flex:1,minWidth:260,background:'#0F172A',border:'1px solid #F59E0B30',borderRadius:12,padding:'14px 18px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                <div>
                  <div style={{fontSize:10,letterSpacing:3,color:'#F59E0B',marginBottom:2}}>OVERALL LEVEL</div>
                  <div style={{display:'flex',alignItems:'baseline',gap:8}}>
                    <span style={{fontSize:32,fontWeight:900,color:'#F59E0B',lineHeight:1}}>{ovr.level}</span>
                    <span style={{fontSize:13,color:'#94A3B8'}}>{OVERALL_LEVEL_TITLES[ovr.level]}</span>
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:10,color:'#64748B',letterSpacing:1}}>TOTAL XP</div>
                  <div style={{fontSize:22,fontWeight:900,color:'#F59E0B'}}>{P.totalXP.toLocaleString()}</div>
                </div>
              </div>
              <XPBar current={ovr.current} max={ovr.next} height={8}/>
              <div style={{fontSize:10,color:'#475569',marginTop:4}}>{ovr.current}/{ovr.next} XP to Level {ovr.level+1}</div>
            </div>
            <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'flex-start'}}>
              {[{v:upcoming.length,l:'PAPERS',c:'#F59E0B'},{v:wDone,l:'DONE TODAY',c:'#10B981'},{v:wTotal,l:'THIS WEEK',c:'#6366F1'}].map(s=>(
                <div key={s.l} style={{textAlign:'center',padding:'8px 14px',background:'#1E293B',borderRadius:8,border:'1px solid #334155'}}>
                  <div style={{fontSize:20,fontWeight:900,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:9,color:'#64748B',letterSpacing:1}}>{s.l}</div>
                </div>
              ))}
              <button onClick={onSignOut} style={{padding:'8px 14px',background:'#1E293B',border:'1px solid #334155',color:'#64748B',borderRadius:8,cursor:'pointer',...f,fontSize:12,alignSelf:'center'}}>SIGN OUT</button>
            </div>
          </div>
          <div style={{display:'flex',gap:4,marginTop:20,borderBottom:'1px solid #1E293B'}}>
            {['dashboard','calendar','subjects','settings'].map(t=><button key={t} onClick={()=>setTab(t)} style={tabBtn(tab===t)}>{t.toUpperCase()}</button>)}
          </div>
        </div>
      </div>

      <div style={{maxWidth:1100,margin:'0 auto',padding:24}}>

        {/* ═══ DASHBOARD ═══ */}
        {tab==='dashboard'&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>
              {/* Today */}
              <div style={card}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                  <div style={{fontSize:10,letterSpacing:3,color:'#F59E0B'}}>TODAY'S REVISION</div>
                  <button onClick={()=>setEditingDate(todayStr)} style={{fontSize:11,background:'#1E293B',border:'1px solid #334155',color:'#94A3B8',borderRadius:6,padding:'4px 10px',cursor:'pointer',...f}}>✏️ EDIT</button>
                </div>
                {todayPlan.length===0 ? <div style={{color:'#475569',fontStyle:'italic'}}>No sessions planned — tap EDIT to add some 📚</div>
                  : todayPlan.map((sess,idx)=>{
                    const s=getS(sess.sid), gain=P.xpGain(sess.sid)
                    return (
                      <div key={idx} onClick={()=>P.toggleSession(todayStr,idx)}
                        style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:8,marginBottom:8,cursor:'pointer',
                          border:`1px solid ${sess.done?s?.color||'#10B981':'#1E293B'}`,
                          background:sess.done?`${s?.color}15`:'#1E293B',opacity:sess.done?0.7:1,transition:'all 0.2s'}}>
                        <div style={{fontSize:20}}>{sess.done?'✅':s?.icon}</div>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:700,fontSize:14,textDecoration:sess.done?'line-through':'none',color:sess.done?'#475569':'#F1F5F9'}}>{s?.name}</div>
                          {sess.topic && <div style={{fontSize:11,color:s?.color,opacity:0.8}}>{sess.topic}</div>}
                          <div style={{fontSize:11,color:'#64748B'}}>1h session</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontSize:11,fontWeight:700,color:sess.done?'#475569':'#F59E0B'}}>{sess.done?'✓':'+'+gain} XP</div>
                          <div style={{fontSize:10,color:'#475569'}}>Lv{getSubjectLevelProgress(P.xp[sess.sid]||0).level}</div>
                        </div>
                      </div>
                    )
                  })}
                {todayPlan.length>0&&<div style={{fontSize:11,color:'#475569',marginTop:4}}>Tap a session to mark done ⚡</div>}
              </div>

              {/* Exam countdown */}
              <div style={card}>
                <div style={{fontSize:10,letterSpacing:3,color:'#F59E0B',marginBottom:12}}>EXAM COUNTDOWN</div>
                <div style={{maxHeight:320,overflowY:'auto'}}>
                  {upcoming.slice(0,20).map((s,i)=>(
                    <div key={`${s.id}-${i}`} style={{display:'flex',alignItems:'center',gap:10,marginBottom:7}}>
                      <div style={{width:4,height:38,borderRadius:2,background:s.color,flexShrink:0}}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,fontWeight:700}}>{s.name}</div>
                        <div style={{fontSize:10,color:s.color,opacity:0.85}}>{s.label}</div>
                        <div style={{fontSize:10,color:'#64748B'}}>{formatDate(s.examDate)}</div>
                      </div>
                      <div style={{padding:'4px 10px',borderRadius:20,fontSize:12,fontWeight:900,
                        background:s.daysLeft<=7?'#EF444420':s.daysLeft<=14?'#F59E0B20':'#10B98120',
                        color:s.daysLeft<=7?'#EF4444':s.daysLeft<=14?'#F59E0B':'#10B981'}}>
                        {s.daysLeft===0?'TODAY!':`${s.daysLeft}d`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Subject XP grid */}
            <div style={{...card,marginBottom:20}}>
              <div style={{fontSize:10,letterSpacing:3,color:'#F59E0B',marginBottom:16}}>SUBJECT LEVELS</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12}}>
                {SUBJECTS.map(s=>{
                  const lp=getSubjectLevelProgress(P.xp[s.id]||0)
                  return (
                    <div key={s.id} style={{background:'#1E293B',borderRadius:8,padding:'10px 12px',border:`1px solid ${s.color}25`}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                        <div style={{display:'flex',alignItems:'center',gap:7}}>
                          <span style={{fontSize:18}}>{s.icon}</span>
                          <div>
                            <div style={{fontSize:11,fontWeight:700}}>{s.name}</div>
                            <div style={{fontSize:10,color:s.color}}>{SUBJECT_LEVEL_TITLES[lp.level]}</div>
                          </div>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div style={{fontSize:18,fontWeight:900,color:s.color,lineHeight:1}}>Lv{lp.level}</div>
                          <div style={{fontSize:9,color:'#475569'}}>{P.xp[s.id]||0} XP</div>
                        </div>
                      </div>
                      <XPBar current={lp.current} max={lp.next} color={s.color} height={5}/>
                      {lp.level<5?<div style={{fontSize:9,color:'#475569',marginTop:3}}>{lp.current}/{lp.next} to Lv{lp.level+1}</div>:<div style={{fontSize:9,color:s.color,marginTop:3}}>★ MAX LEVEL</div>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Weekly progress + alerts */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
              <div style={card}>
                <div style={{fontSize:10,letterSpacing:3,color:'#F59E0B',marginBottom:12}}>THIS WEEK</div>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
                  <div style={{flex:1,height:12,background:'#1E293B',borderRadius:6,overflow:'hidden'}}>
                    <div style={{height:'100%',borderRadius:6,background:'linear-gradient(90deg,#10B981,#F59E0B)',width:`${Math.min(100,wTotal>0?(wDone/wTotal*100):0)}%`,transition:'width 0.5s'}}/>
                  </div>
                  <div style={{fontSize:14,fontWeight:700,color:'#10B981',minWidth:60}}>{wDone}/{wTotal}</div>
                </div>
                <div style={{fontSize:11,color:'#64748B'}}>{wTotal>0?Math.round(wDone/wTotal*100):0}% of planned sessions done</div>
              </div>
              <div style={card}>
                <div style={{fontSize:10,letterSpacing:3,color:'#EF4444',marginBottom:12}}>⚠ COMING UP</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  <div style={{padding:10,background:'#001a1a',borderRadius:8,border:'1px solid #14B8A630'}}>
                    <div style={{fontSize:12,color:'#14B8A6',fontWeight:700}}>🚣 Croatia Rowing Camp</div>
                    <div style={{fontSize:11,color:'#64748B',marginTop:3}}>✈️ Travel: {formatDateShort(P.croatiaStart)} & {formatDateShort(P.croatiaEnd)} · 📚 Camp days: 4h revision</div>
                  </div>
                  {P.allExams().filter(e=>daysUntil(e.date)>0&&daysUntil(e.date)<=14).sort((a,b)=>daysUntil(a.date)-daysUntil(b.date)).map((e,i)=>{
                    const s=getS(e.sid)
                    return <div key={i} style={{padding:10,background:'#1a0f00',borderRadius:8,border:`1px solid ${s?.color}30`}}>
                      <div style={{fontSize:12,color:s?.color,fontWeight:700}}>📝 {s?.name} — {e.label}</div>
                      <div style={{fontSize:11,color:'#64748B',marginTop:2}}>{formatDate(e.date)} · {daysUntil(e.date)} days</div>
                    </div>
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ CALENDAR ═══ */}
        {tab==='calendar'&&(
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:20}}>
            <div style={card}>{renderCal()}</div>
            <div>
              {selDate?(
                <div style={card}>
                  <div style={{fontSize:10,letterSpacing:3,color:'#F59E0B',marginBottom:8}}>{new Date(selDate).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'}).toUpperCase()}</div>
                  {P.croatiaCache[selDate]&&<div style={{padding:10,background:P.croatiaCache[selDate].type==='camp'?'#001a1a':'#1a0a0a',borderRadius:8,marginBottom:12,fontSize:13,color:P.croatiaCache[selDate].type==='camp'?'#14B8A6':'#EF4444'}}>{P.croatiaCache[selDate].label}</div>}
                  {P.blocked[selDate]&&!P.croatiaCache[selDate]&&<div style={{padding:10,background:'#1a0a0a',borderRadius:8,marginBottom:12,fontSize:13,color:'#EF4444'}}>{P.blocked[selDate].label}</div>}
                  {P.allExams().filter(e=>e.date===selDate).map((e,i)=>{const s=getS(e.sid);return <div key={i} style={{padding:10,background:'#1a0f00',borderRadius:8,marginBottom:8,fontSize:13,border:`1px solid ${s?.color}40`}}>📝 <span style={{color:s?.color,fontWeight:700}}>{s?.name}</span> — {e.label}</div>})}
                  {(() => {
                    const sessions=P.getSessionsForDate(selDate)
                    return sessions.length>0?(
                      <>
                        <div style={{fontSize:11,color:'#475569',marginBottom:8}}>REVISION SESSIONS:</div>
                        {sessions.map((sess,i)=>{const subj=getS(sess.sid);return(
                          <div key={i} onClick={()=>P.toggleSession(selDate,i)}
                            style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderRadius:8,marginBottom:6,cursor:'pointer',
                              background:sess.done?`${subj?.color}20`:'#1E293B',border:`1px solid ${sess.done?subj?.color:'#334155'}`}}>
                            <span style={{fontSize:16}}>{sess.done?'✅':subj?.icon}</span>
                            <div style={{flex:1}}>
                              <div style={{fontSize:13,fontWeight:700}}>{subj?.name}</div>
                              {sess.topic&&<div style={{fontSize:11,color:subj?.color,opacity:0.8}}>{sess.topic}</div>}
                            </div>
                            <div style={{fontSize:11,fontWeight:700,color:sess.done?'#475569':'#F59E0B'}}>{sess.done?'✓':'+'+P.xpGain(sess.sid)} XP</div>
                          </div>
                        )})}
                      </>
                    ):<div style={{color:'#475569',fontSize:13,fontStyle:'italic'}}>No sessions planned</div>
                  })()}
                  <button onClick={()=>setEditingDate(selDate)} style={{width:'100%',marginTop:12,padding:'8px',background:'#1E293B',border:'1px solid #334155',color:'#94A3B8',borderRadius:6,cursor:'pointer',...f,fontSize:12}}>✏️ EDIT THIS DAY</button>
                </div>
              ):<div style={{...card,color:'#475569',textAlign:'center',padding:40}}><div style={{fontSize:32,marginBottom:8}}>📅</div><div style={{fontSize:13}}>Click a day to view or plan sessions</div></div>}
              <div style={{...card,marginTop:16}}>
                <div style={{fontSize:10,letterSpacing:3,color:'#F59E0B',marginBottom:12}}>BLOCK A DATE</div>
                <input type='date' value={newBD} onChange={e=>setNewBD(e.target.value)} style={{width:'100%',...inp({marginBottom:8,boxSizing:'border-box',width:'100%'})}}/>
                <input placeholder='Label (e.g. Football match)' value={newBL} onChange={e=>setNewBL(e.target.value)} style={{width:'100%',...inp({marginBottom:8,boxSizing:'border-box',width:'100%'})}}/>
                <button onClick={()=>{if(newBD){P.setBlocked({...P.blocked,[newBD]:{type:'custom',label:newBL||'Blocked'}});setNewBD('');setNewBL('')}}}
                  style={{width:'100%',padding:'8px',background:'#F59E0B',color:'#000',border:'none',borderRadius:6,fontWeight:700,cursor:'pointer',...f,letterSpacing:1,fontSize:12}}>BLOCK DATE</button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ SUBJECTS ═══ */}
        {tab==='subjects'&&(
          <div>
            {/* Subject hours allocation */}
            {(() => {
              const stats = P.getSubjectHoursStats()
              const totalAllocated = Object.values(stats).reduce((a,s)=>a+s.allocated,0)
              const totalCompleted = Object.values(stats).reduce((a,s)=>a+s.completed,0)
              return (
                <div style={{...card, marginBottom:20}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
                    <div style={{fontSize:10,letterSpacing:3,color:'#F59E0B'}}>REVISION HOURS — FULL PLAN</div>
                    <div style={{display:'flex',gap:16}}>
                      <div style={{textAlign:'center'}}>
                        <div style={{fontSize:20,fontWeight:900,color:'#6366F1'}}>{totalAllocated}</div>
                        <div style={{fontSize:9,color:'#64748B',letterSpacing:1}}>TOTAL HOURS</div>
                      </div>
                      <div style={{textAlign:'center'}}>
                        <div style={{fontSize:20,fontWeight:900,color:'#10B981'}}>{totalCompleted}</div>
                        <div style={{fontSize:9,color:'#64748B',letterSpacing:1}}>COMPLETED</div>
                      </div>
                      <div style={{textAlign:'center'}}>
                        <div style={{fontSize:20,fontWeight:900,color:'#F59E0B'}}>{totalAllocated-totalCompleted}</div>
                        <div style={{fontSize:9,color:'#64748B',letterSpacing:1}}>REMAINING</div>
                      </div>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:10}}>
                    {SUBJECTS.map(s => {
                      const st = stats[s.id]||{allocated:0,completed:0}
                      const pct = st.allocated>0 ? Math.round(st.completed/st.allocated*100) : 0
                      return (
                        <div key={s.id} style={{background:'#1E293B',borderRadius:8,padding:'10px 14px'}}>
                          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <span style={{fontSize:16}}>{s.icon}</span>
                              <span style={{fontSize:12,fontWeight:700}}>{s.name}</span>
                            </div>
                            <div style={{display:'flex',gap:10,fontSize:11}}>
                              <span style={{color:'#10B981',fontWeight:700}}>{st.completed}h done</span>
                              <span style={{color:'#475569'}}>/ {st.allocated}h total</span>
                            </div>
                          </div>
                          <div style={{height:6,background:'#0F172A',borderRadius:3,overflow:'hidden',marginBottom:4}}>
                            <div style={{height:'100%',width:`${pct}%`,background:s.color,borderRadius:3,transition:'width 0.5s',boxShadow:`0 0 6px ${s.color}60`}}/>
                          </div>
                          <div style={{fontSize:10,color:'#475569'}}>{pct}% complete · {st.allocated-st.completed}h remaining</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            <div style={{fontSize:10,letterSpacing:3,color:'#64748B',marginBottom:16}}>CONFIDENCE LEVELS — lower confidence = more sessions suggested</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:16}}>
              {SUBJECTS.map(s=>{
                const conf=P.confidence[s.id]||3, lp=getSubjectLevelProgress(P.xp[s.id]||0)
                const exams=P.examDates[s.id]||[], firstExam=exams.length?exams.map(e=>e.date).filter(d=>d).sort()[0]:null
                const days=firstExam?daysUntil(firstExam):null
                return (
                  <div key={s.id} style={{...card,border:`1px solid ${s.color}30`}}>
                    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                      <div style={{fontSize:28,width:40,textAlign:'center'}}>{s.icon}</div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:15}}>{s.name}</div>
                        {firstExam&&<div style={{fontSize:11,color:days<=7?'#EF4444':days<=14?'#F59E0B':'#64748B'}}>{exams.length} paper{exams.length!==1?'s':''} · first {formatDate(firstExam)}</div>}
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:22,fontWeight:900,color:s.color,lineHeight:1}}>Lv{lp.level}</div>
                        <div style={{fontSize:10,color:'#475569'}}>{P.xp[s.id]||0} XP</div>
                      </div>
                    </div>
                    <div style={{marginBottom:12}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                        <span style={{fontSize:10,color:s.color}}>{SUBJECT_LEVEL_TITLES[lp.level]}</span>
                        {lp.level<5?<span style={{fontSize:10,color:'#475569'}}>{lp.current}/{lp.next} XP</span>:<span style={{fontSize:10,color:s.color}}>★ MAX</span>}
                      </div>
                      <XPBar current={lp.current} max={lp.next} color={s.color} height={6}/>
                    </div>
                    <div>
                      <div style={{fontSize:11,color:'#64748B',marginBottom:6}}>CONFIDENCE: <span style={{color:confColor(conf),fontWeight:700}}>{confLabel(conf)}</span><span style={{color:'#475569',fontSize:10,marginLeft:8}}>(+{XP_CONFIDENCE_BONUS[conf]||0} XP/session)</span></div>
                      <div style={{display:'flex',gap:6}}>
                        {[1,2,3,4,5].map(v=><button key={v} onClick={()=>P.setConfidence({...P.confidence,[s.id]:v})} style={{flex:1,padding:'6px 0',borderRadius:6,border:'none',cursor:'pointer',background:conf>=v?confColor(v):'#1E293B',transition:'all 0.15s',fontSize:14}}>●</button>)}
                      </div>
                    </div>
                    {/* Exam list */}
                    {exams.length>0&&<div style={{marginTop:12,borderTop:'1px solid #1E293B',paddingTop:10}}>
                      {exams.map((ex,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:4}}>
                        <span style={{color:'#94A3B8'}}>{ex.label}</span>
                        <span style={{color:ex.date&&daysUntil(ex.date)<=14?'#F59E0B':'#64748B'}}>{formatDateShort(ex.date)}</span>
                      </div>)}
                    </div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ═══ SETTINGS ═══ */}
        {tab==='settings'&&(
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
            <div style={card}>
              <div style={{fontSize:10,letterSpacing:3,color:'#F59E0B',marginBottom:16}}>EXAM PAPERS & DATES</div>
              <div style={{maxHeight:520,overflowY:'auto',paddingRight:4}}>
                {SUBJECTS.map(s=>{
                  const exams=P.examDates[s.id]||[]
                  return (
                    <div key={s.id} style={{marginBottom:16,paddingBottom:16,borderBottom:'1px solid #1E293B'}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}><span style={{fontSize:18}}>{s.icon}</span><span style={{fontSize:13,fontWeight:700,color:s.color}}>{s.name}</span></div>
                      {exams.map((ex,idx)=>(
                        <div key={idx} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                          <input value={ex.label} onChange={e=>{const u=[...exams];u[idx]={...u[idx],label:e.target.value};P.setExamDates({...P.examDates,[s.id]:u})}} style={{flex:1,...inp()}}/>
                          <input type='date' value={ex.date} onChange={e=>{const u=[...exams];u[idx]={...u[idx],date:e.target.value};P.setExamDates({...P.examDates,[s.id]:u})}} style={inp()}/>
                          <button onClick={()=>P.setExamDates({...P.examDates,[s.id]:exams.filter((_,i)=>i!==idx)})} style={{background:'none',border:'none',color:'#EF4444',cursor:'pointer',fontSize:16,padding:'0 2px'}}>×</button>
                        </div>
                      ))}
                      <button onClick={()=>P.setExamDates({...P.examDates,[s.id]:[...exams,{label:'Paper '+(exams.length+1),date:''}]})} style={{fontSize:11,background:'#1E293B',border:`1px dashed ${s.color}40`,borderRadius:6,padding:'4px 10px',color:s.color,cursor:'pointer',...f}}>+ Add paper</button>
                    </div>
                  )
                })}
              </div>
            </div>
            <div>
              <div style={card}>
                <div style={{fontSize:10,letterSpacing:3,color:'#F59E0B',marginBottom:16}}>ROWING CAMP (CROATIA)</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:8}}>
                  <div>
                    <div style={{fontSize:10,color:'#64748B',marginBottom:4}}>TRAVEL OUT</div>
                    <input type='date' value={P.croatiaStart} onChange={e=>P.setCroatiaStart(e.target.value)} style={{width:'100%',...inp({boxSizing:'border-box'})}}/>
                  </div>
                  <div>
                    <div style={{fontSize:10,color:'#64748B',marginBottom:4}}>TRAVEL BACK</div>
                    <input type='date' value={P.croatiaEnd} onChange={e=>P.setCroatiaEnd(e.target.value)} style={{width:'100%',...inp({boxSizing:'border-box'})}}/>
                  </div>
                </div>
                <div style={{fontSize:11,color:'#475569'}}>Travel days are blocked. In-between days get 4h revision.</div>
              </div>
              <div style={{...card,marginTop:16}}>
                <div style={{fontSize:10,letterSpacing:3,color:'#F59E0B',marginBottom:16}}>STUDY LEAVE START</div>
                <input type='date' value={P.studyLeave} onChange={e=>P.setStudyLeave(e.target.value)} style={{width:'100%',...inp({boxSizing:'border-box',fontSize:14})}}/>
                <div style={{fontSize:11,color:'#475569',marginTop:8}}>From this date full days are available for revision.</div>
              </div>
              <div style={{...card,marginTop:16}}>
                <div style={{fontSize:10,letterSpacing:3,color:'#F59E0B',marginBottom:16}}>BLOCKED DATES</div>
                <div style={{maxHeight:180,overflowY:'auto'}}>
                  {Object.entries(P.blocked).sort().map(([d,info])=>(
                    <div key={d} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6,padding:'6px 10px',background:'#1E293B',borderRadius:6}}>
                      <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600}}>{formatDate(d)}</div><div style={{fontSize:11,color:'#EF4444'}}>{info.label}</div></div>
                      <button onClick={()=>{const n={...P.blocked};delete n[d];P.setBlocked(n)}} style={{background:'none',border:'none',color:'#EF4444',cursor:'pointer',fontSize:16}}>×</button>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{...card,marginTop:16,border:'1px solid #EF444430'}}>
                <div style={{fontSize:10,letterSpacing:3,color:'#EF4444',marginBottom:8}}>RESET XP</div>
                <div style={{fontSize:11,color:'#475569',marginBottom:10}}>Wipe all XP and start fresh.</div>
                <button onClick={()=>{if(window.confirm('Reset all XP?')){P.setXP({});addToast('XP reset')}}} style={{padding:'8px 16px',background:'#EF444420',border:'1px solid #EF444440',color:'#EF4444',borderRadius:6,cursor:'pointer',...f,fontWeight:700,fontSize:12}}>RESET ALL XP</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
