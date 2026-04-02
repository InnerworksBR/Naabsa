'use client'
import { CheckCircle, Lock } from 'lucide-react'
import type { StepId } from '@/lib/types'
import { STEP_LABELS } from '@/lib/types'
import { useReport } from '@/contexts/ReportContext'
import { useToast } from '@/components/ui/ToastProvider'

const STEPS: StepId[] = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6', 'step7', 'step8']

// Steps considered completed when all required fields have content (basic heuristic)
function isStepComplete(step: StepId, formData: Record<string, unknown>): boolean {
  const checks: Record<StepId, boolean> = {
    step1: !!(formData.ref_number && formData.vessel_name),
    step2: !!(formData.customer_company && formData.surveyor_name),
    step3: !!(formData.imo_number || formData.vessel_type),
    step4: Array.isArray(formData.vessel_tanks_open) && (formData.vessel_tanks_open as unknown[]).length > 0,
    step5: Array.isArray(formData.barge_tanks_open) && (formData.barge_tanks_open as unknown[]).length > 0,
    step6: Array.isArray(formData.vessel_tanks_close) && (formData.vessel_tanks_close as unknown[]).length > 0,
    step7: !!(formData.bdn_figure),
    step8: Array.isArray(formData.photos),
  }
  return checks[step] ?? false
}

export function StepNav() {
  const { currentStep, setCurrentStep, assignedSections, isGestor, formData } = useReport()
  const toast = useToast()

  function handleClick(step: StepId) {
    const isAssigned = isGestor || assignedSections.includes(step)
    if (!isAssigned) {
      toast('info', `This section is managed by another collaborator`)
      return
    }
    setCurrentStep(step)
  }

  return (
    <nav className="step-nav" aria-label="Form steps">
      {STEPS.map((step, i) => {
        const isActive = currentStep === step
        const isAssigned = isGestor || assignedSections.includes(step)
        const complete = isStepComplete(step, formData as Record<string, unknown>)

        let stateClass = isAssigned ? '' : 'locked'
        if (isActive) stateClass = 'active'
        else if (complete && isAssigned) stateClass = 'completed'

        return (
          <button
            key={step}
            className={`step-nav-item ${stateClass}`}
            onClick={() => handleClick(step)}
            style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
            aria-current={isActive ? 'step' : undefined}
            aria-label={`Step ${i + 1}: ${STEP_LABELS[step]}${!isAssigned ? ' (locked)' : ''}`}
          >
            <span className={`step-num ${stateClass}`}>
              {!isAssigned ? <Lock size={10} /> : complete && !isActive ? <CheckCircle size={10} /> : i + 1}
            </span>
            <span style={{ fontSize: 'var(--text-xs)', lineHeight: 1.2 }}>
              {STEP_LABELS[step]}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
