'use client'
import { useEffect, useState } from 'react'


import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import type { BunkerReport } from '@/lib/types'
import { STEP_LABELS } from '@/lib/types'

export default function ColaboradorDashboard() {
  const { user, profile, loading: authLoading } = useAuth()
  const [reports, setReports] = useState<BunkerReport[]>([])
  const [loading, setLoading] = useState(true)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    if (authLoading || !user) return
    async function load() {
      const { data: assignments } = await supabase
        .from('report_assignments')
        .select('report_id')
        .eq('collaborator_id', user!.id)

      if (!assignments?.length) { setLoading(false); return }

      const reportIds = assignments.map((a: { report_id: string }) => a.report_id)
      const { data: reps } = await supabase
        .from('bunker_reports')
        .select(`*, assignments:report_assignments(id, collaborator_id, sections, profiles(id, full_name))`)
        .in('id', reportIds)
        .neq('status', 'approved')
        .order('last_activity_at', { ascending: false })

      setReports(reps || [])
      setLoading(false)
    }
    load()
  }, [user, authLoading, supabase])

  const revisionReports = reports.filter(r => r.status === 'revision_requested')
  const myAssignments = (r: BunkerReport) =>
    r.assignments?.find(a => a.collaborator_id === user?.id)?.sections || []

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Barlow Semi Condensed', sans-serif", fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--navy-900)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {greeting}, {profile?.full_name?.split(' ')[0]}
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 2 }}>
          {reports.length} report{reports.length !== 1 ? 's' : ''} assigned to you
        </p>
      </div>

      {/* Revision alerts */}
      {revisionReports.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>
            ⚠ Revision Requested
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {revisionReports.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--red-100)', border: '1px solid var(--red-border)', borderRadius: 3 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: 'var(--navy-700)' }}>{r.ref_number} · {r.vessel_name}</div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 2 }}>
                    Sections: {myAssignments(r).map(s => STEP_LABELS[s]).join(', ')}
                  </div>
                </div>
                <Link href={`/reports/${r.id}/edit`}>
                  <Button variant="primary" size="sm">Fill Report</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My reports table */}
      <div>
        <h2 style={{ fontFamily: "'Barlow Semi Condensed', sans-serif", fontWeight: 700, fontSize: 'var(--text-md)', color: 'var(--navy-700)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
          My Reports
        </h2>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '32px 0', color: 'var(--text-muted)' }}>
            <span className="spinner spinner-blue" />
            Loading reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="card-white" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            No reports assigned to you yet.
          </div>
        ) : (
          <div className="card-white" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>REF</th>
                    <th>VESSEL</th>
                    <th>MY SECTIONS</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(r => {
                    const sections = myAssignments(r)
                    const isPendingReview = r.status === 'pending_review'
                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 700, color: 'var(--navy-700)' }}>{r.ref_number}</td>
                        <td style={{ fontWeight: 600 }}>{r.vessel_name}</td>
                        <td style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                          {sections.map(s => STEP_LABELS[s]).join(', ') || '—'}
                        </td>
                        <td>
                          <StatusBadge status={r.status} pulsing={r.status === 'revision_requested'} />
                        </td>
                        <td>
                          {isPendingReview ? (
                            <div className="pending-approval-block" style={{ padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 'var(--text-xs)' }}>
                              <span style={{ fontWeight: 700, color: 'var(--navy-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pending Approval</span>
                            </div>
                          ) : (
                            <Link href={`/reports/${r.id}/edit`}>
                              <Button variant="primary" size="sm">Fill Report</Button>
                            </Link>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
