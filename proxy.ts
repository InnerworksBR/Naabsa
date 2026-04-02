// proxy.ts — substitui middleware.ts no Next.js 16
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // No session → login
  if (!user) {
    if (pathname.startsWith('/login')) return supabaseResponse
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated user on login → home
  if (pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Get role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (!profile?.is_active) {
    return NextResponse.redirect(new URL('/login?error=inactive', request.url))
  }

  // Role-based protection
  if (pathname.startsWith('/dashboard/gestor') && profile.role !== 'gestor') {
    return NextResponse.redirect(new URL('/dashboard/colaborador', request.url))
  }

  if (pathname.startsWith('/dashboard/colaborador') && profile.role !== 'colaborador') {
    return NextResponse.redirect(new URL('/dashboard/gestor', request.url))
  }

  if (pathname.startsWith('/reports/new') && profile.role !== 'gestor') {
    return NextResponse.redirect(new URL('/dashboard/colaborador', request.url))
  }

  if (/^\/reports\/[^/]+\/(review|pdf)$/.test(pathname) && profile.role !== 'gestor') {
    return NextResponse.redirect(new URL('/dashboard/colaborador', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/.*).*)'],
}
