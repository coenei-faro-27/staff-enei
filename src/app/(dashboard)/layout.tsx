import React from 'react'
import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row w-full">
      <Sidebar />
      <main className="flex-1 p-6 md:p-10 overflow-y-auto w-full">
        {children}
      </main>
    </div>
  )
}
