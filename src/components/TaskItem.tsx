'use client'

import React from 'react'
import { Check, Trash2, Lock, Landmark, UserCheck, Paperclip, MessageSquare } from 'lucide-react'
import { Task } from '@/services/taskService'
import { UserProfile } from '@/services/profileService'

interface TaskItemProps {
  task: Task
  currentUser?: UserProfile | null
  onToggle: (id: string, completed: boolean) => void
  onClaim: (id: string, claim: boolean) => void
  onDelete: (id: string) => void
  onSelectTask: (task: Task) => void
}

export default function TaskItem({ 
  task, 
  currentUser, 
  onToggle, 
  onClaim,
  onDelete, 
  onSelectTask 
}: TaskItemProps) {
  const roleLower = currentUser?.role?.toLowerCase()
  const isAdmin = roleLower === 'admin'
  const isMesa = currentUser?.department === 'Mesa'
  const isDiretorOrCo = roleLower === 'diretor' || roleLower === 'co-diretor'
  
  const isAssigned = !!task.assigned_to
  const isAssignedToMe = task.assigned_to === currentUser?.id
  const assignedName = task.assigned_user?.full_name || (isAssignedToMe ? currentUser?.full_name : 'Outro elemento')

  // Can interact/delete if:
  // 1. Admin
  // 2. Owner of the task
  // 3. Assigned to the task
  // 4. Mesa (for all public departmental tasks)
  // 5. Director/Co-director of the task's department
  const canInteract = !currentUser || 
    isAdmin ||
    (task.user_id === currentUser.id) ||
    (task.assigned_to === currentUser.id) ||
    (isMesa && task.department !== null) ||
    (isDiretorOrCo && task.department === currentUser.department)

  // Can conclude permission rule:
  // If not assumed -> canInteract can conclude.
  // If assumed -> ONLY assigned user, Mesa, Director/Co-director of department, or Admin can conclude!
  const canConclude = !currentUser ||
    isAdmin ||
    isMesa ||
    (isDiretorOrCo && task.department === currentUser.department) ||
    (!isAssigned && canInteract) ||
    (isAssignedToMe)

  // Define styles for each department badge
  const getBadgeStyle = (dept: string | null) => {
    if (!dept) {
      return 'border-border-custom/50 text-text-secondary bg-transparent'
    }
    
    switch (dept) {
      case 'Mesa':
        return 'border-indigo-500/30 text-indigo-500 bg-indigo-500/5 dark:text-indigo-400'
      case 'Logística':
        return 'border-orange-500/30 text-orange-500 bg-orange-500/5 dark:text-orange-400'
      case 'Marketing':
        return 'border-pink-500/30 text-pink-500 bg-pink-500/5 dark:text-pink-400'
      case 'Atividades':
        return 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5 dark:text-emerald-400'
      case 'Tecnologia':
        return 'border-blue-500/30 text-blue-500 bg-blue-500/5 dark:text-blue-400'
      case 'Comercial':
        return 'border-amber-500/30 text-amber-500 bg-amber-500/5 dark:text-amber-400'
      default:
        return 'border-border-custom text-text-secondary'
    }
  }

  const attachmentsCount = task.attachments?.length || 0
  const commentsCount = task.comments?.length || 0

  return (
    <div 
      onClick={() => onSelectTask(task)}
      className={`group flex flex-col sm:flex-row sm:items-center justify-between border border-border-custom bg-background p-4 rounded-lg transition-all duration-200 hover:border-text-secondary/40 cursor-pointer gap-3 ${
        task.completed ? 'bg-secondary-bg/30' : ''
      }`}
    >
      {/* Left side: Title & Metadata */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span 
          className={`text-sm select-none wrap-break-word font-medium flex-1 min-w-0 transition-all duration-200 ${
            task.completed 
              ? 'line-through text-text-secondary opacity-60' 
              : 'text-text-primary'
          }`}
        >
          {task.title}
        </span>

        {/* Indicators for attachments & comments if any */}
        {(attachmentsCount > 0 || commentsCount > 0) && (
          <div className="flex items-center gap-2 text-text-secondary text-xs shrink-0">
            {attachmentsCount > 0 && (
              <span className="flex items-center gap-1" title={`${attachmentsCount} anexos`}>
                <Paperclip size={12} />
                <span className="text-[11px] font-medium">{attachmentsCount}</span>
              </span>
            )}
            {commentsCount > 0 && (
              <span className="flex items-center gap-1" title={`${commentsCount} comentários`}>
                <MessageSquare size={12} />
                <span className="text-[11px] font-medium">{commentsCount}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right side: Department Badge & Action Buttons */}
      <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto" onClick={(e) => e.stopPropagation()}>
        {/* Department / Private Badge */}
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeStyle(task.department)}`}>
          {task.department ? (
            <>
              <Landmark size={10} strokeWidth={1.5} />
              <span>{task.department}</span>
            </>
          ) : (
            <>
              <Lock size={10} strokeWidth={1.5} />
              <span>Privada</span>
            </>
          )}
        </span>

        {/* 1. Botão Assumir / Badge Assumida */}
        {isAssignedToMe ? (
          <button
            onClick={() => onClaim(task.id, false)}
            aria-label="Largar tarefa"
            title="Assumida por ti. Clica para largar"
            className="border border-indigo-500/40 text-indigo-500 hover:text-white bg-transparent hover:bg-indigo-500 dark:hover:bg-indigo-950/40 p-1.5 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <UserCheck size={14} strokeWidth={1.5} />
            <span className="hidden md:inline">Assumida por mim</span>
          </button>
        ) : isAssigned ? (
          <div 
            title={`Assumida por ${assignedName}`}
            className="border border-blue-500/40 text-blue-400 bg-blue-500/5 p-1.5 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5"
          >
            <UserCheck size={14} strokeWidth={1.5} className="text-blue-500 shrink-0" />
            <span className="truncate max-w-28 text-[11px]">{assignedName}</span>
          </div>
        ) : (
          <button
            onClick={() => onClaim(task.id, true)}
            aria-label="Assumir tarefa"
            title="Assumir esta tarefa"
            className="border border-blue-500/40 text-blue-500 hover:text-white bg-transparent hover:bg-blue-500 dark:hover:bg-blue-950/40 p-1.5 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <UserCheck size={14} strokeWidth={1.5} />
            <span className="hidden md:inline">Assumir</span>
          </button>
        )}

        {/* 2. Botão Concluir (com verificação de permissões) */}
        {canConclude ? (
          <button
            onClick={() => onToggle(task.id, !task.completed)}
            aria-label={task.completed ? "Marcar como pendente" : "Marcar como concluída"}
            title={task.completed ? "Reabrir tarefa" : "Concluir tarefa"}
            className={`p-1.5 px-2.5 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
              task.completed 
                ? 'border border-emerald-500/60 text-emerald-500 hover:text-white bg-transparent hover:bg-emerald-500 dark:hover:bg-emerald-950/40' 
                : 'border border-emerald-500/40 text-emerald-500 hover:text-white bg-transparent hover:bg-emerald-500 dark:hover:bg-emerald-950/40'
            }`}
          >
            <Check size={14} strokeWidth={2.0} />
            <span className="hidden md:inline">{task.completed ? 'Concluída' : 'Concluir'}</span>
          </button>
        ) : (
          <div 
            title={`Assumida por ${assignedName} - Apenas o próprio, Mesa ou Diretor podem concluir`}
            className="border border-border-custom/40 bg-secondary-bg/20 text-text-secondary/40 opacity-50 cursor-not-allowed p-1.5 px-2.5 rounded-md text-xs font-medium flex items-center gap-1.5 select-none"
          >
            <Lock size={12} strokeWidth={1.5} />
            <span className="hidden md:inline">Concluir</span>
          </div>
        )}

        {/* 3. Botão Eliminar */}
        {canInteract && (
          <button
            onClick={() => onDelete(task.id)}
            aria-label="Eliminar tarefa"
            title="Eliminar tarefa"
            className="border border-red-500/40 text-red-500 hover:text-white bg-transparent hover:bg-red-500 dark:hover:bg-red-950/40 p-1.5 rounded-md transition-colors cursor-pointer"
          >
            <Trash2 size={14} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  )
}
