import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireActiveUser } from '@/lib/server/auth'
import type { ReportStatus, Role } from '@/lib/types'

const MANAGER_MUTABLE_STATUSES = new Set<ReportStatus>([
  'draft',
  'in_progress',
  'pending_review',
  'archived',
])

const COLLABORATOR_MUTABLE_STATUSES = new Set<ReportStatus>(['pending_review'])

async function loadReportAccess(reportId: string, userId: string, role: Role) {
  const admin = createAdminClient()
  const { data: report, error } = await admin
    .from('bunker_reports')
    .select('id, status, created_by, assignments:report_assignments(collaborator_id)')
    .eq('id', reportId)
    .single()

  if (error || !report) {
    return {
      admin,
      response: NextResponse.json({ error: 'Report not found' }, { status: 404 }),
    }
  }

  const isAssigned =
    role === 'gestor' ||
    report.assignments?.some((assignment: { collaborator_id: string }) => assignment.collaborator_id === userId)

  return { admin, report, isAssigned }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireActiveUser()
  if ('response' in auth) return auth.response
  const { user, profile } = auth

  const access = await loadReportAccess(id, user.id, profile.role)
  if ('response' in access) return access.response
  if (!access.isAssigned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await access.admin
    .from('bunker_reports')
    .select(`*, assignments:report_assignments(id, collaborator_id, sections, profiles:profiles!collaborator_id(id, full_name))`)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireActiveUser()
  if ('response' in auth) return auth.response
  const { user, profile } = auth

  const access = await loadReportAccess(id, user.id, profile.role)
  if ('response' in access) return access.response
  if (!access.isAssigned) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const allowed: Record<string, unknown> = {}

  if (profile.role !== 'gestor' && !['draft', 'in_progress', 'revision_requested'].includes(access.report.status)) {
    return NextResponse.json({ error: 'Report is locked for collaborator edits' }, { status: 409 })
  }

  if ('form_data' in body) {
    if (body.form_data !== null && typeof body.form_data !== 'object') {
      return NextResponse.json({ error: 'form_data must be an object' }, { status: 400 })
    }
    allowed.form_data = body.form_data
  }

  if ('status' in body) {
    if (typeof body.status !== 'string') {
      return NextResponse.json({ error: 'status must be a string' }, { status: 400 })
    }

    const nextStatus = body.status as ReportStatus
    if (profile.role === 'gestor') {
      if (!MANAGER_MUTABLE_STATUSES.has(nextStatus)) {
        return NextResponse.json({ error: 'Use dedicated endpoints for this status change' }, { status: 400 })
      }
    } else if (!COLLABORATOR_MUTABLE_STATUSES.has(nextStatus)) {
      return NextResponse.json({ error: 'Collaborators cannot set this status' }, { status: 403 })
    }

    allowed.status = nextStatus
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await access.admin
    .from('bunker_reports')
    .update(allowed)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await access.admin.from('report_activity_log').insert({
    report_id: id,
    user_id: user.id,
    action: 'report_updated',
    details: Object.keys(allowed),
  })

  if (allowed.status === 'pending_review' && access.report.created_by && access.report.created_by !== user.id) {
    await access.admin.from('notifications').insert({
      user_id: access.report.created_by,
      report_id: id,
      type: 'submitted_for_review',
      message: `Report ${id} was submitted for review`,
    })
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const auth = await requireActiveUser(['gestor'])
  if ('response' in auth) return auth.response

  const admin = createAdminClient()
  const { error } = await admin.from('bunker_reports').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
