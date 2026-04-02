'use client'
import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/StatusBadge'
import { useToast } from '@/components/ui/ToastProvider'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, ToggleRight, ToggleLeft } from 'lucide-react'
import type { Profile } from '@/lib/types'

export default function EquipePage() {
  const [collaborators, setCollaborators] = useState<Profile[]>([])
  const [newUserOpen, setNewUserOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: 'colaborador' })
  const supabase = createClient()
  const toast = useToast()

  const load = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('*').in('role', ['colaborador', 'gestor']).order('full_name')
    setCollaborators(data || [])
  }, [supabase])

  useEffect(() => {
    let active = true
    supabase
      .from('profiles')
      .select('*')
      .in('role', ['colaborador', 'gestor'])
      .order('full_name')
      .then(({ data }) => {
        if (active) setCollaborators(data || [])
      })

    return () => {
      active = false
    }
  }, [supabase])

  async function handleCreate() {
    setLoading(true)
    const res = await fetch('/api/auth/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (res.ok) {
      toast('success', `User ${form.full_name} created`)
      setNewUserOpen(false)
      setForm({ full_name: '', email: '', password: '', role: 'colaborador' })
      load()
    } else {
      const err = await res.json()
      toast('error', err.error || 'Failed to create user')
    }
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch(`/api/profiles/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update user status' }))
      toast('error', err.error || 'Failed to update user status')
      return
    }
    toast('info', `User ${current ? 'deactivated' : 'activated'}`)
    void load()
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontFamily: "'Barlow Semi Condensed', sans-serif", fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--navy-900)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Team Management</h1>
        <Button variant="primary" onClick={() => setNewUserOpen(true)}>
          <UserPlus size={14} /> New User
        </Button>
      </div>

      <div className="card-white" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>NAME</th>
              <th>EMAIL</th>
              <th>ROLE</th>
              <th>STATUS</th>
              <th>LAST SEEN</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {collaborators.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: 700 }}>{c.full_name}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{c.email}</td>
                <td><Badge variant={c.role === 'gestor' ? 'info' : 'neutral'}>{c.role}</Badge></td>
                <td><Badge variant={c.is_active ? 'success' : 'danger'}>{c.is_active ? 'Active' : 'Inactive'}</Badge></td>
                <td style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
                  {c.last_seen_at ? new Date(c.last_seen_at).toLocaleDateString() : '—'}
                </td>
                <td>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => toggleActive(c.id, c.is_active)}
                    aria-label={c.is_active ? 'Deactivate user' : 'Activate user'}
                    title={c.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {c.is_active ? <ToggleRight size={16} style={{ color: 'var(--status-success-text)' }} /> : <ToggleLeft size={16} style={{ color: 'var(--text-muted)' }} />}
                  </button>
                </td>
              </tr>
            ))}
            {collaborators.length === 0 && (
              <tr><td colSpan={6} className="empty-state">No users found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={newUserOpen} onClose={() => setNewUserOpen(false)} title="New User"
        footer={<>
          <Button variant="ghost" onClick={() => setNewUserOpen(false)}>Cancel</Button>
          <Button variant="primary" loading={loading} onClick={handleCreate}>Create User ›</Button>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Full Name" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} required />
          <Input label="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
          <Input label="Temporary Password" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
          <div className="form-group">
            <label className="field-label">Role</label>
            <select className="field-input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} aria-label="User role">
              <option value="colaborador">Collaborator</option>
              <option value="gestor">Manager</option>
            </select>
          </div>
        </div>
      </Modal>
    </>
  )
}
