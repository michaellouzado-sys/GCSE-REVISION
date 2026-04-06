export function XPBar({ current, max, color, height = 6 }) {
  const pct = Math.min(100, max > 0 ? (current / max) * 100 : 0)
  return (
    <div style={{ width: '100%', height, background: '#1E293B', borderRadius: height, overflow: 'hidden' }}>
      <div style={{
        height: '100%', width: `${pct}%`, borderRadius: height,
        background: color || 'linear-gradient(90deg,#F59E0B,#EF4444)',
        transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: `0 0 8px ${color || '#F59E0B'}60`,
      }} />
    </div>
  )
}

export function XPToast({ toasts }) {
  return (
    <div style={{ position: 'fixed', top: 80, right: 24, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.lu ? 'linear-gradient(135deg,#F59E0B,#EF4444)' : '#1E293B',
          border: t.lu ? 'none' : '1px solid #334155',
          borderRadius: 10, padding: '10px 16px', color: '#fff',
          fontFamily: "'Courier New',monospace", fontWeight: 700,
          fontSize: t.lu ? 15 : 13, letterSpacing: 1,
          boxShadow: t.lu ? '0 0 30px #F59E0B60' : '0 4px 12px #00000060',
          animation: 'tIn 0.3s ease, tOut 0.5s ease 2.5s forwards',
          whiteSpace: 'nowrap',
        }}>
          {t.lu ? `🎉 LEVEL UP! ${t.text}` : `⚡ ${t.text}`}
        </div>
      ))}
      <style>{`
        @keyframes tIn  { from{transform:translateX(60px);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes tOut { from{opacity:1} to{opacity:0;transform:translateY(-10px)} }
      `}</style>
    </div>
  )
}
