'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { useAuth } from '@/contexts/AuthContext'
import { ReportProvider } from '@/contexts/ReportContext'
import { AppShell } from '@/components/layout/AppShell'
import { StepNav } from '@/components/form/StepNav'
import { SaveIndicator } from '@/components/form/SaveIndicator'
import { Step1_General } from '@/components/form/steps/Step1_General'
import { Step2_Contacts } from '@/components/form/steps/Step2_Contacts'
import { Step3_Vessel } from '@/components/form/steps/Step3_Vessel'
import { Step4_OpeningVessel } from '@/components/form/steps/Step4_OpeningVessel'
import { Step5_OpeningBarge } from '@/components/form/steps/Step5_OpeningBarge'
import { Step6_Closing } from '@/components/form/steps/Step6_Closing'
import { Step7_FinalFigures } from '@/components/form/steps/Step7_FinalFigures'
import { Step8_Photos } from '@/components/form/steps/Step8_Photos'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/ToastProvider'
import type { BunkerReport, StepId } from '@/lib/types'
import { useReport } from '@/contexts/ReportContext'
import { ChevronLeft, ChevronRight, Send } from 'lucide-react'

const STEPS: StepId[] = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6', 'step7', 'step8']

const STEP_COMPONENTS: Record<StepId, React.ComponentType> = {
  step1: Step1_General,
  step2: Step2_Contacts,
  step3: Step3_Vessel,
  step4: Step4_OpeningVessel,
  step5: Step5_OpeningBarge,
  step6: Step6_Closing,
  step7: Step7_FinalFigures,
  step8: Step8_Photos,
}

function FormContent() {
  const { currentStep, setCurrentStep, assignedSections, isGestor, saveNow, reportId } = useReport()
  const toast = useToast()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const currentIdx = STEPS.indexOf(currentStep)
  const StepComponent = STEP_COMPONENTS[currentStep]

  function getPrevNext(dir: 1 | -1): StepId | null {
    for (let i = currentIdx + dir; i >= 0 && i < STEPS.length; i += dir) {
      if (isGestor || assignedSections.includes(STEPS[i])) return STEPS[i]
    }
    return null
  }

  async function handleSubmitForReview() {
    setSubmitting(true)
    await saveNow()
    const res = await fetch(`/api/reports/${reportId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'pending_review' }) })
    if (!res.ok) {
      toast('error', 'Failed to submit report for review')
      setSubmitting(false)
      return
    }
    toast('success', 'Report submitted for review')
    router.push(isGestor ? '/dashboard/gestor' : '/dashboard/colaborador')
    setSubmitting(false)
  }

  const prev = getPrevNext(-1)
  const next = getPrevNext(1)

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      <StepNav />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Step content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <StepComponent />
        </div>
        {/* Nav footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-default)', background: '#FFFFFF', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {prev && (
              <Button variant="ghost" onClick={async () => { await saveNow(); setCurrentStep(prev) }}>
                <ChevronLeft size={14} /> Prev
              </Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {next ? (
              <Button variant="secondary" onClick={async () => { await saveNow(); setCurrentStep(next) }}>
                Next <ChevronRight size={14} />
              </Button>
            ) : (
              <Button variant="primary" loading={submitting} onClick={handleSubmitForReview}>
                <Send size={14} /> Submit for Review
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditReportPage({ params }: PageProps) {
  const [report, setReport] = useState<BunkerReport | null>(null)
  const [assignedSections, setAssignedSections] = useState<StepId[]>([])
  const { user, profile, loading: authLoading } = useAuth()

  useEffect(() => {
    if (authLoading || !user) return
    params.then(async ({ id }) => {
      const res = await fetch(`/api/reports/${id}`)
      if (!res.ok) return
      const data = await res.json()
      setReport(data)
      const myAssignment = data.assignments?.find((a: { collaborator_id: string }) => a.collaborator_id === user.id)
      setAssignedSections(myAssignment?.sections || [])
    })
  }, [user, authLoading, params])

  if (authLoading || !report || !profile) {
    return (
      <AppShell>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 12 }}>
          <span className="spinner spinner-blue" style={{ width: 20, height: 20 }} />
          <span style={{ color: 'var(--text-muted)' }}>Loading report...</span>
        </div>
      </AppShell>
    )
  }

  const isGestor = profile.role === 'gestor'

  return (
    <AppShell vesselName={report.vessel_name} refNumber={report.ref_number}>
      <ReportProvider
        reportId={report.id}
        initialData={report.form_data || {}}
        vesselName={report.vessel_name}
        refNumber={report.ref_number}
        status={report.status}
        assignedSections={assignedSections}
        isGestor={isGestor}
      >
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: "'Barlow Semi Condensed', sans-serif", fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--navy-900)', textTransform: 'uppercase' }}>
              {report.vessel_name}
            </h1>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{report.ref_number} · {report.port}</div>
          </div>
          <SaveIndicator />
        </div>

        <div className="card-white" style={{ overflow: 'hidden', height: 'calc(100vh - 200px)' }}>
          <FormContent />
        </div>
      </ReportProvider>
    </AppShell>
  )
}
