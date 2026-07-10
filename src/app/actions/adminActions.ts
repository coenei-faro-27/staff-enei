'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseJSClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'

// Helper to check if Supabase Admin key is configured
const isAdminClientConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  return !!url && !!serviceKey && !url.includes('your-project')
}

// Admin client using service_role key to bypass RLS and use auth.admin API
function createAdminClient() {
  return createSupabaseJSClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Verify if the active server-side user is an admin
async function verifyAdminAuth(): Promise<void> {
  if (!isAdminClientConfigured()) {
    // If not configured, bypass authentication in local mode
    return
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error('Unauthorized: Precisas de iniciar sessão.')
  }

  const { data: profile, error: dbError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single()

  if (dbError || !profile) {
    throw new Error('Unauthorized: Perfil não encontrado.')
  }

  if (profile.role !== 'admin' || !profile.is_active) {
    throw new Error('Forbidden: Acesso restrito a administradores ativos.')
  }
}

/**
 * Invites a new user using their real email (sending invitation email) and registers their platform login email
 */
export async function inviteUserAction(
  loginEmailPrefix: string,
  realEmail: string,
  role: string,
  department: string
) {
  await verifyAdminAuth()

  // Enforce required fields
  if (!loginEmailPrefix.trim() || !realEmail.trim() || !role || !department) {
    return { success: false, error: 'Todos os campos são obrigatórios (Login, Email, Cargo e Departamento).' }
  }

  const validDepts = ['Mesa', 'Logística', 'Marketing', 'Atividades', 'Tecnologia', 'Comercial']
  if (!validDepts.includes(department)) {
    return { success: false, error: 'Departamento inválido.' }
  }

  // Validate role based on department mapping
  if (department === 'Mesa') {
    const mesaRoles = ['Presidente', 'Vice-Presidente', 'Administrador', 'Tesoureiro', 'Representante de LEI', 'Representante de Lesti', 'Representante de EEC', 'Secretário', 'Secretária']
    if (!mesaRoles.includes(role)) {
      return { success: false, error: `Cargo "${role}" não é válido para o departamento Mesa.` }
    }
  } else {
    const standardRoles = ['Diretor', 'Co-diretor', 'Membro']
    if (!standardRoles.includes(role)) {
      return { success: false, error: `Cargo "${role}" não é válido para o departamento ${department}.` }
    }
  }

  const loginEmail = `${loginEmailPrefix.trim()}@coenei.pt`

  if (!isAdminClientConfigured()) {
    // Local simulation
    console.log(`[Local Simulation] Invited user to ${realEmail} with login email ${loginEmail}, role ${role} in department ${department}`)
    return { success: true, message: 'Simulação: Convite enviado com sucesso localmente.' }
  }

  try {
    const adminClient = createAdminClient()
    
    // Determine dynamic site URL for redirection using headers or fallback env
    let siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    if (!siteUrl) {
      try {
        const headersList = await headers()
        const host = headersList.get('host')
        const proto = headersList.get('x-forwarded-proto') || 'https'
        if (host) {
          siteUrl = `${proto}://${host}`
        }
      } catch (e) {
        console.warn('Could not read request headers for siteUrl fallback:', e)
      }
    }
    
    const finalSiteUrl = siteUrl || 'http://localhost:3000'
    const redirectTo = `${finalSiteUrl}/set-password`
    
    // Send auth invitation to real email
    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(realEmail, {
      redirectTo
    })

    if (error) throw error
    if (!data?.user) throw new Error('Erro ao gerar conta do utilizador.')

    // Create user profile
    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert({
        id: data.user.id,
        full_name: realEmail.split('@')[0],
        email: realEmail,
        login_email: loginEmail,
        role,
        department,
        avatar_color: 'bg-indigo-500',
        is_active: true
      })

    if (profileError) throw profileError

    return { success: true, userId: data.user.id }
  } catch (e) {
    console.error('inviteUserAction failed:', e)
    const errMsg = e instanceof Error ? e.message : 'Falha ao convidar utilizador.'
    return { success: false, error: errMsg }
  }
}

/**
 * Resolves a platform email prefix/address to the real email address
 */
export async function resolveLoginEmailAction(loginEmail: string): Promise<string | null> {
  let normalized = loginEmail.trim()
  if (!normalized.includes('@')) {
    normalized = `${normalized}@coenei.pt`
  }

  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('profiles')
      .select('email')
      .eq('login_email', normalized)
      .single()

    if (error || !data) {
      return null
    }
    return data.email
  } catch (e) {
    console.error('resolveLoginEmailAction failed:', e)
    return null
  }
}

/**
 * Changes a user's role and department
 */
export async function updateUserRoleAndDeptAction(targetUserId: string, role: string, department: string) {
  await verifyAdminAuth()

  if (!isAdminClientConfigured()) {
    return { success: true }
  }

  try {
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('profiles')
      .update({ role, department })
      .eq('id', targetUserId)

    if (error) throw error
    return { success: true }
  } catch (e) {
    console.error('updateUserRoleAndDeptAction failed:', e)
    const errMsg = e instanceof Error ? e.message : 'Falha ao atualizar utilizador.'
    return { success: false, error: errMsg }
  }
}

/**
 * Soft deletes/restores a user profile by toggle is_active flag
 */
export async function setUserActiveAction(targetUserId: string, is_active: boolean) {
  await verifyAdminAuth()

  if (!isAdminClientConfigured()) {
    return { success: true }
  }

  try {
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('profiles')
      .update({ is_active })
      .eq('id', targetUserId)

    if (error) throw error
    return { success: true }
  } catch (e) {
    console.error('setUserActiveAction failed:', e)
    const errMsg = e instanceof Error ? e.message : 'Falha ao alterar estado do utilizador.'
    return { success: false, error: errMsg }
  }
}

/**
 * Sends a password reset email to a user's real email address
 */
export async function sendPasswordResetAction(realEmail: string) {
  await verifyAdminAuth()

  if (!isAdminClientConfigured()) {
    console.log(`[Local Simulation] Password reset email triggered for ${realEmail}`)
    return { success: true, message: 'Simulação: E-mail de reset enviado com sucesso.' }
  }

  try {
    const adminClient = createAdminClient()
    const { error } = await adminClient.auth.resetPasswordForEmail(realEmail, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/set-password`
    })

    if (error) throw error
    return { success: true }
  } catch (e) {
    console.error('sendPasswordResetAction failed:', e)
    const errMsg = e instanceof Error ? e.message : 'Falha ao enviar e-mail de reset.'
    return { success: false, error: errMsg }
  }
}
