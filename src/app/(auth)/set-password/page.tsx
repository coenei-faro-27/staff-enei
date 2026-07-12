import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import SetPasswordForm from './SetPasswordForm'

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('your-project') && !key.includes('your-anon-key')
}

export default async function SetPasswordPage() {
  const localMode = !isSupabaseConfigured()

  if (!localMode) {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      redirect('/login?error=session_missing')
    }
  }

  return <SetPasswordForm localMode={localMode} />
}
