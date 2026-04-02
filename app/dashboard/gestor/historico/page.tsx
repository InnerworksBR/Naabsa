'use client'
import { useEffect, useState } from 'react'

import { ReportsTable } from '@/components/dashboard/ReportsTable'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/ToastProvider'
import type { BunkerReport } from '@/lib/types'
import { Download } from 'lucide-react'

function exportCsv(reports: BunkerReport[]) {
  const headers = ['Ref', 'Vessel', 'Port', 'Status', 'Last Activity']
  const rows = reports.map(r => [
    r.ref_number,
    r.vessel_name,
    r.port,
    r.status,
    r.last_activity_at ? new Date(r.last_activity_at).toLocaleString() : '',
  ])
  const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `naabsa_reports_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function HistoricoPage() {
  const [reports, setReports] = useState<BunkerReport[]>([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    let active = true
    fetch('/api/reports')
      .then(async res => {
        if (!res.ok) throw new Error('load_failed')
        return res.json() as Promise<BunkerReport[]>
      })
      .then(data => {
        if (!active) return
        setReports(data || [])
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        toast('error', 'Failed to load report history')
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [toast])

  async function handleReopen(id: string) {
    const res = await fetch(`/api/reports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'in_progress' }),
    })
    if (!res.ok) { toast('error', 'Failed to reopen report'); return }
    const updated: BunkerReport = await res.json()
    setReports(prev => prev.map(r => r.id === id ? updated : r))
    toast('success', 'Report reopened')
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/reports/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      toast('error', 'Failed to delete report')
      return
    }
    setReports(prev => prev.filter(r => r.id !== id))
    toast('success', 'Report deleted')
  }

  return (
    <>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: "'Barlow Semi Condensed', sans-serif", fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--navy-900)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Report History
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 2 }}>
            All reports — all statuses
          </p>
        </div>
        <Button variant="secondary" onClick={() => exportCsv(reports)} style={{ gap: 6 }}>
          <Download size={14} /> Export CSV
        </Button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '32px 0', color: 'var(--text-muted)' }}>
          <span className="spinner spinner-blue" />
          Loading...
        </div>
      ) : (
        <ReportsTable
          reports={reports}
          isGestor={true}
          onReopen={handleReopen}
          onDelete={handleDelete}
        />
      )}
    </>
  )
}
