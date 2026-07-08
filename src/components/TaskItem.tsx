'use client'

import React from 'react'
import { Check, Trash2, Lock, Landmark } from 'lucide-react'
import { Task } from '@/services/taskService'
import { UserProfile } from '@/services/profileService'

interface TaskItemProps {
  task: Task
  currentUser?: UserProfile | null
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
}

export default function TaskItem({ task, currentUser, onToggle, onDelete }: TaskItemProps) {
  const roleLower = currentUser?.role?.toLowerCase()
  const isAdmin = roleLower === 'admin'
  const isMesa = currentUser?.department === 'Mesa'
  const isDiretorOrCo = roleLower === 'diretor' || roleLower === 'co-diretor'
  
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

  return (
    <div 
      className={`group flex items-center justify-between border border-border-custom bg-background p-4 rounded-lg transition-all duration-200 hover:border-text-secondary/30 ${
        task.completed ? 'bg-secondary-bg/30' : ''
      }`}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0 mr-3">
        {/* Custom Checkbox Button */}
        <button
          onClick={() => canInteract && onToggle(task.id, !task.completed)}
          disabled={!canInteract}
          aria-label={task.completed ? "Marcar como incompleta" : "Marcar como concluída"}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-all duration-200 ${
            !canInteract ? 'opacity-50 cursor-not-allowed border-border-custom bg-secondary-bg' : 'cursor-pointer'
          } ${
            task.completed 
              ? 'bg-brand-primary border-brand-primary text-background' 
              : 'border-border-custom hover:border-brand-primary bg-background'
          }`}
        >
          {task.completed && <Check size={12} strokeWidth={3.0} />}
        </button>

        {/* Task Title */}
        <span 
          onClick={() => canInteract && onToggle(task.id, !task.completed)}
          className={`text-sm select-none wrap-break-word flex-1 min-w-0 transition-all duration-200 ${
            !canInteract ? 'cursor-default text-text-secondary' : 'cursor-pointer'
          } ${
            task.completed 
              ? 'line-through text-text-secondary opacity-50' 
              : 'text-text-primary'
          }`}
        >
          {task.title}
        </span>
      </div>

      {/* Badge and Delete Button */}
      <div className="flex items-center gap-3 shrink-0">
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

        {/* Delete Action Button (outline, action destrutiva) */}
        {canInteract && (
          <button
            onClick={() => onDelete(task.id)}
            aria-label="Eliminar tarefa"
            className="border border-red-500/40 text-red-500 hover:text-white bg-transparent hover:bg-red-500 dark:hover:bg-red-950/40 p-1.5 rounded-md transition-colors cursor-pointer"
          >
            <Trash2 size={14} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  )
}
