'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/ToastProvider'
import { createClient } from '@/lib/supabase/client'
import type { Profile, StepId } from '@/lib/types'
import { STEP_LABELS } from '@/lib/types'
import { ChevronRight, ChevronLeft } from 'lucide-react'

const STEPS: StepId[] = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6', 'step7', 'step8']
const GESTOR_ONLY: StepId[] = ['step1', 'step2', 'step7']

export default function NewReportPage() {
  const { loading: authLoading } = useAuth()
  const router = useRouter()
  const toast = useToast()
  const [supabase] = useState(() => createClient())

  const [step, setStep] = useState(0) // 0 = basic info, 1 = assignments
  const [collaborators, setCollaborators] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)

  // Basic info
  const [refNumber, setRefNumber] = useState('')
  const [vesselName, setVesselName] = useState('')
  const [port, setPort] = useState('')

  // Assignments: step → collaborator_id ('gestor' for manager)
  const [assignments, setAssignments] = useState<Record<StepId, string>>({
    step1: 'gestor', step2: 'gestor', step3: 'gestor',
    step4: 'gestor', step5: 'gestor', step6: 'gestor',
    step7: 'gestor', step8: 'gestor',
  })

  const [collaboratorsLoading, setCollaboratorsLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    let cancelled = false

    async function loadCollaborators() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'colaborador')
        .eq('is_active', true)

      if (cancelled) return

      if (!error) {
        setCollaborators((data ?? []) as Profile[])
      }

      setCollaboratorsLoading(false)
    }

    void loadCollaborators()

    return () => {
      cancelled = true
    }
  }, [authLoading, supabase])

  function validateBasic() {
    if (!refNumber.trim()) { toast('error', 'REF Number is required'); return false }
    if (!vesselName.trim()) { toast('error', 'Vessel Name is required'); return false }
    return true
  }

  async function handleCreate() {
    setLoading(true)
    try {
      const assignList = STEPS.map(s => ({ step: s, collaborator_id: assignments[s] }))

      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref_number: refNumber,
          vessel_name: vesselName,
          port,
          assignments: assignList,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast('error', err.error || 'Failed to create report')
        return
      }

      toast('success', `Report ${refNumber} created and collaborators notified`)
      router.push('/dashboard/gestor')
    } finally {
      setLoading(false)
    }
  }


  return (
    <AppShell>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Barlow Semi Condensed', sans-serif", fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--navy-900)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            New Survey Report
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 4 }}>
            {step === 0 ? 'Step 1 of 2 — Basic Information' : 'Step 2 of 2 — Section Assignments'}
          </p>
          {/* Progress bar */}
          <div style={{ height: 3, background: 'var(--bg-elevated)', borderRadius: 2, marginTop: 12, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: step === 0 ? '50%' : '100%', background: 'var(--navy-500)', transition: 'width 300ms ease' }} />
          </div>
        </div>

        {step === 0 ? (
          <div className="card-white" style={{ padding: 28 }}>
            <div className="section-title">Basic Information</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <Input
                label="REF Number"
                value={refNumber}
                onChange={e => setRefNumber(e.target.value)}
                placeholder="302/2025"
                required
              />
              <Input
                label="Vessel Name"
                value={vesselName}
                onChange={e => setVesselName(e.target.value)}
                placeholder="MV BENEFACTOR"
                required
              />
              <Input
                label="Port"
                value={port}
                onChange={e => setPort(e.target.value)}
                placeholder="Santos Port"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 28 }}>
              <Button variant="primary" onClick={() => { if (validateBasic()) setStep(1) }}>
                Next — Assign Sections <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        ) : (
          <div className="card-white" style={{ padding: 28 }}>
            <div className="section-title">Section Assignments</div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 16, fontFamily: "'Source Serif 4', serif" }}>
              Assign each section to a collaborator. Manager-only sections are locked.
            </p>

            {/* No collaborators warning */}
            {!collaboratorsLoading && collaborators.length === 0 && (
              <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 3, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: '#92400e' }}>No collaborators found</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: '#b45309', marginTop: 2 }}>
                    All sections will be managed by you.{' '}
                    <a href="/dashboard/gestor/equipe" style={{ color: 'var(--navy-600)', fontWeight: 700, textDecoration: 'underline' }}>
                      Create a collaborator first →
                    </a>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STEPS.map(s => {
                const isGestorOnly = GESTOR_ONLY.includes(s)
                return (
                  <div key={s} style={{
                    display: 'flex', alignItems: 'center',
                    padding: '12px 16px',
                    background: isGestorOnly ? 'var(--bg-elevated)' : 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 3,
                    gap: 16,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--navy-700)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        {s.toUpperCase()} · {STEP_LABELS[s]}
                      </div>
                      {isGestorOnly && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>Manager only</div>
                      )}
                    </div>
                    {isGestorOnly ? (
                      <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-muted)', minWidth: 120, textAlign: 'right' }}>MANAGER</span>
                    ) : (
                      <select
                        className="field-input"
                        style={{ width: 200 }}
                        value={assignments[s]}
                        onChange={e => setAssignments(prev => ({ ...prev, [s]: e.target.value }))}
                        aria-label={`Assign ${STEP_LABELS[s]}`}
                      >
                        <option value="gestor">Manager</option>
                        {collaborators.map(c => (
                          <option key={c.id} value={c.id}>{c.full_name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
              <Button variant="ghost" onClick={() => setStep(0)}>
                <ChevronLeft size={14} /> Back
              </Button>
              <Button variant="primary" loading={loading} onClick={handleCreate}>
                Create Report & Notify ›
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
