'use client'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { useReport } from '@/contexts/ReportContext'

export function SaveIndicator() {
  const { saveStatus, saveNow } = useReport()

  if (saveStatus === 'idle') return (
    <span className="save-indicator idle">
      <CheckCircle size={12} /> —
    </span>
  )

  if (saveStatus === 'saving') return (
    <span className="save-indicator saving">
      <span className="pulse-dot" /> Saving...
    </span>
  )

  if (saveStatus === 'saved') return (
    <span className="save-indicator saved">
      <CheckCircle size={12} /> Saved
    </span>
  )

  return (
    <button className="save-indicator error" onClick={saveNow} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
      <AlertCircle size={12} /> Save Failed · Retry
    </button>
  )
}
