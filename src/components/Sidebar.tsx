'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  ListTodo, 
  Files, 
  Menu, 
  X, 
  Sun, 
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  CalendarDays,
  History,
  UsersRound
} from 'lucide-react'
import { profileService, UserProfile } from '@/services/profileService'

export default function Sidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)

  // Fetch profile on mount
  useEffect(() => {
    let active = true
    const fetchProfileData = async () => {
      try {
        const data = await profileService.getProfile()
        console.log('Sidebar: fetched profile data:', data)
        if (!active) return
        setProfile(data)
      } catch (e) {
        console.error('Failed to load profile in Sidebar:', e)
      }
    }
    
    fetchProfileData()

    const handleProfileUpdate = () => {
      console.log('Sidebar: profile-updated event triggered!')
      fetchProfileData()
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('profile-updated', handleProfileUpdate)
    }
    
    return () => {
      active = false
      if (typeof window !== 'undefined') {
        window.removeEventListener('profile-updated', handleProfileUpdate)
      }
    }
  }, [])

  const getInitials = (n: string) => {
    const parts = n.trim().split(/\s+/)
    if (parts.length === 0 || !parts[0]) return '?'
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  // Initialize and synchronize collapse state with localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar_collapsed')
      const timeoutId = setTimeout(() => {
        setIsCollapsed(saved === 'true')
      }, 0)
      return () => clearTimeout(timeoutId)
    }
  }, [])

  const handleCollapseToggle = () => {
    const nextState = !isCollapsed
    setIsCollapsed(nextState)
    localStorage.setItem('sidebar_collapsed', String(nextState))
  }

  // Theme synchronization with system or localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const isDark = savedTheme === 'dark' || 
                   (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
    
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    const timeoutId = setTimeout(() => {
      setTheme(isDark ? 'dark' : 'light')
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [])

  const toggleTheme = () => {
    if (theme === 'light') {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setTheme('dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setTheme('light')
    }
  }


  const navItems = [
    {
      name: 'Visão Geral',
      href: '/',
      icon: LayoutDashboard
    },
    {
      name: 'Tarefas',
      href: '/tarefas',
      icon: ListTodo
    },
    {
      name: 'Documentos',
      href: '/documentos',
      icon: Files
    },
    {
      name: 'Calendário',
      href: '/calendario',
      icon: CalendarDays
    },
    {
      name: 'Timeline',
      href: '/timeline',
      icon: History
    },
    {
      name: 'Contactos',
      href: '/contactos',
      icon: UsersRound
    }
  ]

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile Header */}
      <header className="flex h-16 items-center justify-between border-b border-border-custom bg-secondary-bg px-4 md:hidden w-full sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {/* ENEI Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/ENEI-logo.svg" 
            alt="ENEI Logo" 
            width={32} 
            height={32} 
            className="h-8 w-auto invert dark:invert-0"
          />
          <span className="font-bold text-lg tracking-wider text-text-primary">ENEI 2027</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="border border-border-custom p-2 rounded-md hover:bg-background text-text-primary transition-colors focus:outline-none"
          aria-label={isOpen ? "Close Menu" : "Open Menu"}
        >
          {isOpen ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
        </button>
      </header>

      {/* Overlay for mobile sidebar */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r border-border-custom bg-secondary-bg pt-4 pb-2 transition-all duration-300 md:translate-x-0 md:sticky md:h-screen ${
          isCollapsed ? 'md:w-16 px-3' : 'md:w-64 px-5'
        } ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header (Logo) */}
        <div className={`mb-8 flex items-center min-h-8 pt-2.5 ${isCollapsed ? 'justify-center px-0' : 'justify-between px-3'}`}>
          <div className={`flex items-center min-w-0 ${isCollapsed ? 'justify-center w-full' : 'gap-3'}`}>
            {/* ENEI Logo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src="/ENEI-logo.svg" 
              alt="ENEI Logo" 
              width={32} 
              height={32} 
              className="h-8 w-auto invert dark:invert-0 shrink-0"
            />
            {!isCollapsed && (
              <span className="font-bold text-lg tracking-wider text-text-primary hidden md:inline truncate">ENEI 2027</span>
            )}
            <span className="font-bold text-lg tracking-wider text-text-primary md:hidden truncate">ENEI 2027</span>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`group flex items-center border rounded-md text-sm transition-all duration-200 ${
                  isCollapsed 
                    ? 'justify-center p-0 h-10 w-full' 
                    : 'justify-between px-3 py-2.5'
                } ${
                  active 
                    ? 'border-brand-primary bg-background text-text-primary font-medium' 
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-background/50'
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                {isCollapsed ? (
                  <Icon 
                    size={18} 
                    strokeWidth={active ? 2.0 : 1.5} 
                    className={`transition-colors shrink-0 ${
                      active ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'
                    }`}
                  />
                ) : (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon 
                        size={18} 
                        strokeWidth={active ? 2.0 : 1.5} 
                        className={`transition-colors shrink-0 ${
                          active ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'
                        }`}
                      />
                      <span className="hidden md:inline truncate">{item.name}</span>
                      <span className="md:hidden truncate">{item.name}</span>
                    </div>
                  </>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Admin Link (visible to Admin only) */}
        {profile?.role === 'admin' && (
          <div className="mt-4 mb-2 pt-2 border-t border-border-custom/30">
            <Link
              href="/admin"
              onClick={() => setIsOpen(false)}
              className={`group flex items-center border rounded-md text-sm transition-all duration-200 ${
                isCollapsed 
                  ? 'justify-center p-0 h-10 w-full' 
                  : 'justify-between px-3 py-2.5'
              } ${
                pathname === '/admin'
                  ? 'border-brand-primary bg-background text-text-primary font-medium' 
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-background/50'
              }`}
              title={isCollapsed ? "Administração" : undefined}
            >
              {isCollapsed ? (
                <UsersRound 
                  size={18} 
                  strokeWidth={pathname === '/admin' ? 2.0 : 1.5} 
                  className={`transition-colors shrink-0 ${
                    pathname === '/admin' ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'
                  }`}
                />
              ) : (
                <div className="flex items-center gap-3 min-w-0">
                  <UsersRound 
                    size={18} 
                    strokeWidth={pathname === '/admin' ? 2.0 : 1.5} 
                    className={`transition-colors shrink-0 ${
                      pathname === '/admin' ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary'
                    }`}
                  />
                  <span className="hidden md:inline truncate">Administração</span>
                  <span className="md:hidden truncate">Administração</span>
                </div>
              )}
            </Link>
          </div>
        )}

        {/* Sidebar Footer */}
        <div className="border-t border-border-custom pt-2 mt-auto">
          <div className={`flex gap-2.5 items-center ${isCollapsed ? 'flex-col gap-1.5' : 'flex-row justify-between'}`}>
            {/* Profile Link */}
            <Link 
              href="/perfil"
              className={`flex items-center gap-2 rounded-md bg-transparent hover:bg-background border border-transparent hover:border-border-custom transition-all duration-200 cursor-pointer min-w-0 ${
                isCollapsed ? 'p-0.5' : 'px-1.5 py-1 flex-1'
              }`}
              title={isCollapsed ? `${profile?.full_name || 'David Gonçalves'} (Configurações de Perfil)` : "Ver Definições de Perfil"}
            >
              <div className={`h-8 w-8 shrink-0 rounded-md border border-border-custom flex items-center justify-center text-[10px] font-bold transition-all duration-200 ${
                profile ? `${profile.avatar_color} text-white` : 'bg-secondary-bg text-text-primary'
              }`}>
                {getInitials(profile?.full_name || 'David Gonçalves')}
              </div>
              {!isCollapsed && (
                <div className="text-left min-w-0 hidden md:block">
                  <p className="text-xs font-semibold text-text-primary truncate">{profile?.full_name || 'David Gonçalves'}</p>
                  <p className="text-[10px] text-text-secondary truncate">{profile?.role || 'Organizador'}</p>
                </div>
              )}
              <div className="text-left min-w-0 md:hidden">
                <p className="text-xs font-semibold text-text-primary truncate">{profile?.full_name || 'David Gonçalves'}</p>
                <p className="text-[10px] text-text-secondary truncate">{profile?.role || 'Organizador'}</p>
              </div>
            </Link>

            {/* Theme Toggle Button (Icon only) */}
            <button
              onClick={toggleTheme}
              aria-label={theme === 'light' ? "Mudar para modo escuro" : "Mudar para modo claro"}
              title={theme === 'light' ? "Modo Escuro" : "Modo Claro"}
              className="border border-border-custom p-2 rounded-md text-text-secondary hover:text-text-primary bg-transparent hover:bg-background transition-colors duration-200 cursor-pointer shrink-0"
            >
              {theme === 'light' ? (
                <Moon size={14} strokeWidth={1.5} />
              ) : (
                <Sun size={14} strokeWidth={1.5} />
              )}
            </button>

            {/* Collapse Button (Visible only on desktop, positioned inline, smaller size) */}
            <button
              onClick={handleCollapseToggle}
              className="hidden md:flex border border-border-custom p-2 rounded-md text-text-secondary hover:text-text-primary bg-transparent hover:bg-background transition-colors duration-200 cursor-pointer shrink-0"
              title={isCollapsed ? "Expandir menu" : "Colapsar menu"}
            >
              {isCollapsed ? (
                <PanelLeftOpen size={14} strokeWidth={1.5} />
              ) : (
                <PanelLeftClose size={14} strokeWidth={1.5} />
              )}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
