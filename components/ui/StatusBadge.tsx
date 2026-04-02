'use client'
import { type ReportStatus } from '@/lib/types'

const STATUS_CONFIG: Record<ReportStatus, { label: string; className: string }> = {
  draft:              { label: 'Draft',              className: 'badge-draft' },
  in_progress:        { label: 'In Progress',        className: 'badge-in_progress' },
  pending_review:     { label: 'Pending Review',     className: 'badge-pending_review' },
  revision_requested: { label: 'Revision Requested', className: 'badge-revision_requested' },
  approved:           { label: 'Approved',           className: 'badge-approved' },
  archived:           { label: 'Archived',           className: 'badge-archived' },
}

export function StatusBadge({ status, pulsing }: { status: ReportStatus; pulsing?: boolean }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`badge ${cfg.className} ${pulsing ? 'badge-pulsing' : ''}`}>
      {cfg.label}
    </span>
  )
}

export function Badge({
  children,
  variant = 'neutral',
}: {
  children: React.ReactNode
  variant?: 'neutral' | 'success' | 'danger' | 'warning' | 'info'
}) {
  const classMap = {
    neutral: 'badge-draft',
    success: 'badge-approved',
    danger: 'badge-revision_requested',
    warning: 'badge-in_progress',
    info: 'badge-pending_review',
  }
  return <span className={`badge ${classMap[variant]}`}>{children}</span>
}
