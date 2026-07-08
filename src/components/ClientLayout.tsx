'use client'

import React from 'react'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  if (isLoginPage) {
    return <div className="min-h-screen w-full bg-background">{children}</div>
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row w-full">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto w-full">
        {children}
      </main>
    </div>
  )
}
