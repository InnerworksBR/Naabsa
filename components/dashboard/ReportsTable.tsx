'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Eye, Edit, CheckCircle, MessageSquare, Archive, Trash2, ChevronUp, ChevronDown, FileDown, RotateCcw } from 'lucide-react'
import type { BunkerReport, ReportStatus, Profile } from '@/lib/types'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Tooltip } from '@/components/ui/Tooltip'

interface ReportsTableProps {
  reports: BunkerReport[]
  collaborators?: Profile[]
  onApprove?: (id: string) => void
  onArchive?: (id: string) => void
  onReopen?: (id: string) => void
  onDelete?: (id: string) => void
  isGestor?: boolean
}

const STATUS_OPTIONS: ReportStatus[] = ['draft', 'in_progress', 'pending_review', 'revision_requested', 'approved', 'archived']

function formatRelative(date: string) {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ReportsTable({ reports, collaborators = [], onApprove, onArchive, onReopen, onDelete, isGestor }: ReportsTableProps) {
  const [filterStatus, setFilterStatus] = useState<ReportStatus[]>([])
  const [filterCollaborator, setFilterCollaborator] = useState<string>('')
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  let filtered = reports
  if (search) filtered = filtered.filter(r =>
    r.ref_number.toLowerCase().includes(search.toLowerCase()) ||
    r.vessel_name.toLowerCase().includes(search.toLowerCase())
  )
  if (filterStatus.length > 0) filtered = filtered.filter(r => filterStatus.includes(r.status))
  if (filterCollaborator) {
    filtered = filtered.filter(r =>
      r.assignments?.some(a => a.collaborator_id === filterCollaborator)
    )
  }
  filtered = [...filtered].sort((a, b) => {
    const da = new Date(a.last_activity_at).getTime()
    const db = new Date(b.last_activity_at).getTime()
    return sortDir === 'desc' ? db - da : da - db
  })

  function toggleStatus(s: ReportStatus) {
    setFilterStatus(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  function toggleSort() { setSortDir(d => d === 'desc' ? 'asc' : 'desc') }

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <input
          className="field-input"
          placeholder="Search REF or vessel..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 220 }}
          aria-label="Search reports"
        />
        {isGestor && collaborators.length > 0 && (
          <select
            className="field-input"
            value={filterCollaborator}
            onChange={e => setFilterCollaborator(e.target.value)}
            style={{ width: 180 }}
            aria-label="Filter by collaborator"
          >
            <option value="">All collaborators</option>
            {collaborators.map(c => (
              <option key={c.id} value={c.id}>{c.full_name}</option>
            ))}
          </select>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={`badge ${filterStatus.includes(s) ? `badge-${s}` : 'badge-draft'}`}
              style={{
                cursor: 'pointer', border: filterStatus.includes(s) ? undefined : '1px dashed var(--border-default)',
                background: filterStatus.includes(s) ? undefined : 'transparent',
                color: filterStatus.includes(s) ? undefined : 'var(--text-muted)',
              }}
              aria-pressed={filterStatus.includes(s)}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card-white" style={{ overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div className="empty-state">
            No reports found. {isGestor && <Link href="/reports/new" style={{ color: 'var(--navy-500)', fontWeight: 600 }}>Create a new one →</Link>}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>REF</th>
                  <th>VESSEL</th>
                  <th>PORT</th>
                  <th>STATUS</th>
                  {isGestor && <th>ASSIGNED TO</th>}
                  <th>
                    <button
                      onClick={toggleSort}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', font: 'inherit' }}
                      aria-label="Sort by activity"
                    >
                      LAST ACTIVITY
                      {sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                    </button>
                  </th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700, color: 'var(--navy-700)' }}>{r.ref_number}</td>
                    <td style={{ fontWeight: 600 }}>{r.vessel_name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{r.port || '—'}</td>
                    <td>
                      <StatusBadge status={r.status} pulsing={r.status === 'revision_requested'} />
                    </td>
                    {isGestor && (
                      <td style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                        {r.assignments && r.assignments.length > 0
                          ? [...new Set(r.assignments.map(a => a.profiles?.full_name).filter(Boolean))].join(', ')
                          : '—'}
                      </td>
                    )}
                    <td style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                      {formatRelative(r.last_activity_at)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Tooltip content="View">
                          <Link href={`/reports/${r.id}/edit`} className="btn btn-ghost btn-icon btn-sm" aria-label={`View report ${r.ref_number}`}>
                            <Eye size={14} />
                          </Link>
                        </Tooltip>
                        <Tooltip content="Edit">
                          <Link href={`/reports/${r.id}/edit`} className="btn btn-secondary btn-icon btn-sm" aria-label={`Edit report ${r.ref_number}`}>
                            <Edit size={14} />
                          </Link>
                        </Tooltip>
                        {isGestor && r.status === 'pending_review' && (
                          <>
                            <Tooltip content="Approve">
                              <button
                                className="btn btn-ghost btn-icon btn-sm"
                                onClick={() => onApprove?.(r.id)}
                                style={{ color: 'var(--status-success-text)' }}
                                aria-label={`Approve report ${r.ref_number}`}
                              >
                                <CheckCircle size={14} />
                              </button>
                            </Tooltip>
                            <Tooltip content="Request revision">
                              <Link href={`/reports/${r.id}/review`} className="btn btn-ghost btn-icon btn-sm" aria-label={`Review report ${r.ref_number}`}>
                                <MessageSquare size={14} />
                              </Link>
                            </Tooltip>
                          </>
                        )}
                        {isGestor && r.status === 'approved' && (
                          <Tooltip content="M.V. Benefactor Official PDF">
                            <Link href={`/reports/${r.id}/pdf`} className="btn btn-ghost btn-icon btn-sm" aria-label={`Download PDF ${r.ref_number}`} style={{ color: 'var(--navy-600)' }}>
                              <FileDown size={14} />
                            </Link>
                          </Tooltip>
                        )}
                        {isGestor && r.status !== 'archived' && (
                          <Tooltip content="Archive">
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => onArchive?.(r.id)}
                              aria-label={`Archive report ${r.ref_number}`}
                            >
                              <Archive size={14} />
                            </button>
                          </Tooltip>
                        )}
                        {isGestor && r.status === 'archived' && (
                          <Tooltip content="Reopen">
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              onClick={() => onReopen?.(r.id)}
                              aria-label={`Reopen report ${r.ref_number}`}
                              style={{ color: 'var(--navy-500)' }}
                            >
                              <RotateCcw size={14} />
                            </button>
                          </Tooltip>
                        )}
                        {isGestor && (
                          <Tooltip content="Delete">
                            <button
                              className="btn btn-destructive btn-icon btn-sm"
                              onClick={() => onDelete?.(r.id)}
                              aria-label={`Delete report ${r.ref_number}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
