'use client'
import { usePathname } from 'next/navigation'
import { NotificationBell } from './NotificationBell'

function getBreadcrumb(pathname: string): { label: string; href?: string }[] {
  const segments = pathname.split('/').filter(Boolean)
  const crumbs: { label: string; href?: string }[] = [{ label: 'Dashboard', href: '/dashboard' }]
  
  if (segments.includes('gestor')) crumbs[0] = { label: 'Dashboard', href: '/dashboard/gestor' }
  if (segments.includes('colaborador')) crumbs[0] = { label: 'Dashboard', href: '/dashboard/colaborador' }
  
  if (segments.includes('equipe')) crumbs.push({ label: 'Team' })
  if (segments.includes('historico')) crumbs.push({ label: 'History' })
  if (segments.includes('new')) crumbs.push({ label: 'New Report' })
  if (segments.includes('edit')) crumbs.push({ label: 'Edit Report' })
  if (segments.includes('review')) crumbs.push({ label: 'Review' })

  return crumbs
}

export function Header({ vesselName, refNumber }: { vesselName?: string; refNumber?: string }) {
  const pathname = usePathname()
  const crumbs = getBreadcrumb(pathname)

  if (vesselName) crumbs.push({ label: `${vesselName}${refNumber ? ` [${refNumber}]` : ''}` })

  return (
    <header className="app-header">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {i > 0 && <span className="breadcrumb-sep" aria-hidden="true">›</span>}
            {c.href ? (
              <a href={c.href} className={i === crumbs.length - 1 ? 'breadcrumb-current' : ''} style={{ textDecoration: 'none', color: 'inherit' }}>
                {c.label}
              </a>
            ) : (
              <span className={i === crumbs.length - 1 ? 'breadcrumb-current' : ''}>{c.label}</span>
            )}
          </span>
        ))}
      </nav>
      <NotificationBell />
    </header>
  )
}
