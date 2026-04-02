'use client'
import { useEffect, useState, useCallback } from 'react'
import { FileText, Clock, CheckCircle, AlertTriangle, Plus } from 'lucide-react'
import Link from 'next/link'

import { KpiCard } from '@/components/dashboard/KpiCard'
import { ReportsTable } from '@/components/dashboard/ReportsTable'
import { AlertsPanel } from '@/components/dashboard/AlertsPanel'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/ToastProvider'
import type { BunkerReport, Profile } from '@/lib/types'

export default function GestorDashboard() {
  const [reports, setReports] = useState<BunkerReport[]>([])
  const [collaborators, setCollaborators] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [archiveId, setArchiveId] = useState<string | null>(null)
  const supabase = createClient()
  const toast = useToast()

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // Use the API route for reports (avoids RLS issues on client)
      const res = await fetch('/api/reports')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const reps: BunkerReport[] = await res.json()
      setReports(reps)

      // Collaborators: direct query is fine (profiles RLS is fixed)
      const { data: colabs, error: colabError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'colaborador')
        .eq('is_active', true)
      if (!colabError) setCollaborators(colabs || [])
    } catch {
      setError('Failed to load reports. Check Supabase connection and RLS policies.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { load() }, [load])

  // KPI computations
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const kpiInProgress = reports.filter(r => r.status === 'in_progress').length
  const kpiPendingReview = reports.filter(r => r.status === 'pending_review').length
  const kpiApprovedMonth = reports.filter(r => {
    if (r.status !== 'approved' || !r.approved_at) return false
    const d = new Date(r.approved_at)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  }).length
  const kpiStale = reports.filter(r =>
    ['in_progress', 'revision_requested'].includes(r.status) &&
    Date.now() - new Date(r.last_activity_at).getTime() > 48 * 3600000
  ).length

  async function handleApprove(id: string) {
    const res = await fetch(`/api/reports/${id}/approve`, { method: 'POST' })
    if (!res.ok) { toast('error', 'Failed to approve report'); return }
    toast('success', 'Report approved')
    await load()
  }

  async function confirmArchive() {
    if (!archiveId) return
    const res = await fetch(`/api/reports/${archiveId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'archived' }),
    })
    if (!res.ok) {
      toast('error', 'Failed to archive report')
      return
    }
    toast('info', 'Report archived')
    setArchiveId(null)
    await load()
  }

  async function confirmDelete() {
    if (!deleteId) return
    const res = await fetch(`/api/reports/${deleteId}`, { method: 'DELETE' })
    if (!res.ok) {
      toast('error', 'Failed to delete report')
      return
    }
    toast('success', 'Report deleted')
    setDeleteId(null)
    await load()
  }

  async function handleRemind(reportId: string, collaboratorId: string) {
    const res = await fetch(`/api/reports/${reportId}/remind`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collaborator_id: collaboratorId }),
    })
    if (!res.ok) {
      toast('error', 'Failed to send reminder')
      return
    }
    toast('success', 'Reminder sent to collaborator')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 12 }}>
        <span className="spinner spinner-blue" style={{ width: 20, height: 20 }} />
        <span style={{ color: 'var(--text-muted)' }}>Loading reports...</span>
      </div>
    )
  }

  return (
    <>
      {/* Error banner */}
      {error && (
        <div style={{ background: 'var(--red-100)', border: '1px solid var(--red-border)', borderRadius: 3, padding: '12px 16px', marginBottom: 16, color: 'var(--red-600)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
          ⚠ {error}
        </div>
      )}

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "'Barlow Semi Condensed', sans-serif", fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--navy-900)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Operations Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 2 }}>
            {reports.filter(r => !['archived', 'approved'].includes(r.status)).length} active reports
          </p>
        </div>
        <Link href="/reports/new">
          <Button variant="primary">
            <Plus size={14} /> New Report
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard icon={FileText} value={kpiInProgress} label="In Progress" />
        <KpiCard icon={Clock} value={kpiPendingReview} label="Awaiting Review" />
        <KpiCard icon={CheckCircle} value={kpiApprovedMonth} label="Approved (Month)" />
        <KpiCard icon={AlertTriangle} value={kpiStale} label="No Movement +48h" alert={kpiStale > 0} />
      </div>

      {/* Main: table + alerts panel */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontFamily: "'Barlow Semi Condensed', sans-serif", fontWeight: 700, fontSize: 'var(--text-md)', color: 'var(--navy-700)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
            Survey Reports
          </h2>
          <ReportsTable
            reports={reports}
            collaborators={collaborators}
            isGestor={true}
            onApprove={handleApprove}
            onArchive={id => setArchiveId(id)}
            onDelete={id => setDeleteId(id)}
          />
        </div>
        <div style={{ flexShrink: 0, width: 280 }}>
          <AlertsPanel reports={reports} onRemind={handleRemind} />
        </div>
      </div>

      {/* Archive modal */}
      <Modal open={!!archiveId} onClose={() => setArchiveId(null)} title="Archive Report"
        footer={<><Button variant="ghost" onClick={() => setArchiveId(null)}>Cancel</Button><Button variant="secondary" onClick={confirmArchive}>Archive</Button></>}>
        <p style={{ color: 'var(--text-secondary)', fontFamily: "'Source Serif 4', serif" }}>
          Are you sure you want to archive this report? It will be hidden from the main dashboard.
        </p>
      </Modal>

      {/* Delete modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Report"
        footer={<><Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button><Button variant="destructive" onClick={confirmDelete}>Delete Permanently</Button></>}>
        <div style={{ background: 'var(--red-100)', border: '1px solid var(--red-border)', borderRadius: 3, padding: '12px 14px', marginBottom: 16, fontSize: 'var(--text-sm)', color: 'var(--red-600)', fontWeight: 600 }}>
          ⚠ This action cannot be undone.
        </div>
        <p style={{ color: 'var(--text-secondary)', fontFamily: "'Source Serif 4', serif" }}>
          All data associated with this report will be permanently deleted.
        </p>
      </Modal>
    </>
  )
}
