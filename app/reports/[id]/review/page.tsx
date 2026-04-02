'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/ToastProvider'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import type { BunkerReport, ReportComment, StepId } from '@/lib/types'
import { STEP_LABELS } from '@/lib/types'
import { CheckCircle, Clock, MessageSquare, ChevronDown, ChevronUp, FileDown } from 'lucide-react'

interface PageProps { params: Promise<{ id: string }> }

export default function ReviewPage({ params }: PageProps) {
  const [report, setReport] = useState<BunkerReport | null>(null)
  const [comments, setComments] = useState<ReportComment[]>([])
  const [id, setId] = useState('')
  const [pageLoading, setPageLoading] = useState(true)
  const [approveOpen, setApproveOpen] = useState(false)
  const [revisionStep, setRevisionStep] = useState<StepId | null>(null)
  const [revisionMsg, setRevisionMsg] = useState('')
  const [expandedStep, setExpandedStep] = useState<StepId | null>(null)
  const [loading, setLoading] = useState(false)
  const { loading: authLoading } = useAuth()
  const [supabase] = useState(() => createClient())
  const toast = useToast()
  const router = useRouter()

  const STEPS: StepId[] = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6', 'step7', 'step8']

  useEffect(() => {
    if (authLoading) return
    params.then(async ({ id: reportId }) => {
      setId(reportId)
      // Use API for report (avoids auth lock conflict during initialization)
      const res = await fetch(`/api/reports/${reportId}`)
      const rep = res.ok ? await res.json() : null
      // Comments can use supabase client directly since report is already loaded
      const { data: coms } = await supabase.from('report_comments').select('*').eq('report_id', reportId).order('created_at', { ascending: false })
      setReport(rep)
      setComments(coms || [])
      setPageLoading(false)
    })
  }, [authLoading, params, supabase])

  async function handleApprove() {
    setLoading(true)
    const res = await fetch(`/api/reports/${id}/approve`, { method: 'POST' })
    setLoading(false)
    if (res.ok) {
      toast('success', 'Report approved successfully')
      setApproveOpen(false)
      router.push('/dashboard/gestor')
    } else {
      toast('error', 'Failed to approve report')
    }
  }

  async function handleRevision() {
    if (!revisionMsg.trim() || !revisionStep) return
    setLoading(true)
    const res = await fetch(`/api/reports/${id}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: revisionStep, message: revisionMsg }),
    })
    setLoading(false)
    if (res.ok) {
      toast('success', 'Revision request sent')
      setRevisionStep(null)
      setRevisionMsg('')
    } else {
      toast('error', 'Failed to send revision request')
    }
  }

  function stepHasComment(step: StepId) {
    return comments.some(c => c.section === step && !c.resolved)
  }

  function handleDownloadPdf() {
    if (!report) return
    window.open(`/reports/${report.id}/pdf`, '_blank')
  }

  if (authLoading || pageLoading) {
    return (
      <AppShell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 12 }}>
          <span className="spinner spinner-blue" style={{ width: 20, height: 20 }} />
          <span style={{ color: 'var(--text-muted)' }}>Loading report...</span>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell vesselName={report?.vessel_name} refNumber={report?.ref_number}>
      <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 140px)' }}>
        {/* Left: Report summary */}
        <div className="card-white" style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          <h2 style={{ fontFamily: "'Barlow Semi Condensed', sans-serif", fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--navy-900)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 16 }}>
            {report?.vessel_name || '—'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              ['REF', report?.ref_number],
              ['Port', report?.port],
              ['Status', report?.status?.replace(/_/g, ' ')],
            ].map(([k, v]) => (
              <div key={k} style={{ padding: '12px 14px', background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: 3 }}>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 4 }}>{k}</div>
                <div style={{ fontWeight: 600, color: 'var(--navy-700)' }}>{v || '—'}</div>
              </div>
            ))}
          </div>
          <div className="section-title">Form Data Overview</div>
          <pre style={{ fontFamily: "'Barlow Semi Condensed', sans-serif", fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: 12, borderRadius: 3, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
            {JSON.stringify(report?.form_data, null, 2)}
          </pre>
        </div>

        {/* Right: Review Panel */}
        <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card-white" style={{ padding: 20, flex: 1, overflowY: 'auto' }}>
            <div className="section-title">Review Panel</div>
            {STEPS.map(step => {
              const hasComment = stepHasComment(step)
              const isExpanded = expandedStep === step
              const stepComment = comments.find(c => c.section === step && !c.resolved)

              return (
                <div key={step} style={{ marginBottom: 6 }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: hasComment ? 'var(--red-100)' : 'var(--bg-surface)', border: `1px solid ${hasComment ? 'var(--red-border)' : 'var(--border-default)'}`, borderRadius: 3, cursor: 'pointer' }}
                    onClick={() => setExpandedStep(isExpanded ? null : step)}
                    role="button"
                    aria-expanded={isExpanded}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {hasComment
                        ? <Clock size={14} style={{ color: 'var(--red-600)' }} />
                        : <CheckCircle size={14} style={{ color: 'var(--status-success-text)' }} />
                      }
                      <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: hasComment ? 'var(--red-600)' : 'var(--navy-700)', textTransform: 'uppercase' }}>
                        {step.toUpperCase()} · {STEP_LABELS[step]}
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </div>
                  {isExpanded && stepComment && (
                    <div style={{ padding: '10px 12px', background: 'var(--red-100)', borderLeft: '3px solid var(--red-600)', marginTop: 2, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontFamily: "'Source Serif 4', serif" }}>
                      <div style={{ fontWeight: 700, color: 'var(--red-600)', marginBottom: 4, fontFamily: "'Barlow Semi Condensed', sans-serif", fontSize: 'var(--text-xs)', textTransform: 'uppercase' }}>Pending comment:</div>
                      {stepComment.message}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {report && report.status !== 'approved' && (
              <>
                <Button variant="secondary" onClick={() => setRevisionStep('step1')}>
                  <MessageSquare size={14} /> Request Revision
                </Button>
                <Button variant="primary" onClick={() => setApproveOpen(true)}>
                  <CheckCircle size={14} /> Approve All ✓
                </Button>
              </>
            )}
            {report?.status === 'approved' && (
              <Button variant="primary" onClick={handleDownloadPdf}>
                <FileDown size={14} /> Download Official PDF
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Approve modal */}
      <Modal open={approveOpen} onClose={() => setApproveOpen(false)} title="Approve Report"
        footer={<>
          <Button variant="ghost" onClick={() => setApproveOpen(false)}>Cancel</Button>
          <Button variant="primary" loading={loading} onClick={handleApprove}>Approve Report ✓</Button>
        </>}>
        <p style={{ fontFamily: "'Source Serif 4', serif", color: 'var(--text-secondary)' }}>
          Are you sure you want to approve this report? This will finalize it and make the PDF available for download. This action cannot be undone.
        </p>
      </Modal>

      {/* Revision modal */}
      <Modal open={!!revisionStep} onClose={() => setRevisionStep(null)} title="Request Revision"
        footer={<>
          <Button variant="ghost" onClick={() => setRevisionStep(null)}>Cancel</Button>
          <Button variant="primary" loading={loading} disabled={!revisionMsg.trim()} onClick={handleRevision}>Send Revision Request ›</Button>
        </>}>
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="field-label">Section</label>
          <select className="field-input" value={revisionStep || ''} onChange={e => setRevisionStep(e.target.value as StepId)} aria-label="Select section">
            {STEPS.map(s => <option key={s} value={s}>{STEP_LABELS[s]}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="field-label">Message to Collaborator</label>
          <textarea className="field-input serif" rows={4} value={revisionMsg} onChange={e => setRevisionMsg(e.target.value)} placeholder="Describe what needs to be corrected..." />
        </div>
      </Modal>
    </AppShell>
  )
}
