import SetPasswordForm from './SetPasswordForm'

const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!url && !!key && !url.includes('your-project') && !key.includes('your-anon-key')
}

export default function SetPasswordPage() {
  const localMode = !isSupabaseConfigured()

  return <SetPasswordForm localMode={localMode} />
}
