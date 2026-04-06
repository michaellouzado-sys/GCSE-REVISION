import { useState, useEffect } from 'react'
import { supabase, PARENT_EMAIL } from './supabase'
import Auth from './Auth'
import Planner from './Planner'
import ParentDashboard from './ParentDashboard'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signOut = () => supabase.auth.signOut()

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B', fontFamily: "'Courier New', monospace", fontSize: 14, letterSpacing: 2 }}>
      LOADING...
    </div>
  )

  if (!session) return <Auth />

  const isParent = session.user.email?.toLowerCase() === PARENT_EMAIL.toLowerCase()

  if (isParent) return <ParentDashboard session={session} onSignOut={signOut} />

  return <Planner session={session} onSignOut={signOut} />
}
