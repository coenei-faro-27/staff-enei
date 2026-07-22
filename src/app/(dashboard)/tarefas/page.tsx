'use client'

import React, { useState, useEffect } from 'react'
import { 
  Search, 
  Layers, 
  Lock, 
  Globe, 
  Loader2, 
  Plus,
  X,
  Trash2,
  Check
} from 'lucide-react'
import TaskForm from '@/components/TaskForm'
import TaskItem from '@/components/TaskItem'
import TaskDetailModal from '@/components/TaskDetailModal'
import { taskService, Task } from '@/services/taskService'
import { profileService, UserProfile } from '@/services/profileService'

export default function TarefasPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'private' | 'departmental'>('all')
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Focused floating card modal state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  // Custom Delete Confirmation State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    id: string
    title: string
  } | null>(null)

  // Custom Floating Toast State
  const [toast, setToast] = useState<{
    type: 'success' | 'delete' | 'error'
    message: string
  } | null>(null)

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)

  const loadTasksAndProfile = async () => {
    setLoading(true)
    try {
      const [tasksData, profileData] = await Promise.all([
        taskService.getTasks(),
        profileService.getProfile().catch(() => null)
      ])
      setTasks(tasksData)
      setCurrentUser(profileData)
    } catch (e) {
      console.error('Failed to load tasks:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadTasksAndProfile()
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [])

  const handleAddTask = async (title: string, department: string | null, assignedTo?: string | null) => {
    try {
      const newTask = await taskService.createTask(title, department, assignedTo)
      setTasks((prev) => [newTask, ...prev])
      setToast({
        type: 'success',
        message: 'Tarefa criada com sucesso!'
      })
      setTimeout(() => setToast(null), 3000)
    } catch (e) {
      console.error('Error creating task:', e)
      setToast({
        type: 'error',
        message: 'Erro ao criar a tarefa.'
      })
      setTimeout(() => setToast(null), 3000)
    }
  }

  const handleToggleTask = async (id: string, completed: boolean) => {
    try {
      await taskService.toggleTask(id, completed)
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed } : t))
      )
      if (selectedTask && selectedTask.id === id) {
        setSelectedTask((prev) => prev ? { ...prev, completed } : null)
      }
      setToast({
        type: 'success',
        message: completed ? 'Tarefa marcada como concluída!' : 'Tarefa reaberta.'
      })
      setTimeout(() => setToast(null), 2500)
    } catch (e) {
      console.error('Error toggling task:', e)
    }
  }

  const handleClaimTask = async (id: string, claim: boolean) => {
    try {
      const userToAssign = claim ? currentUser : null
      const updated = await taskService.claimTask(id, userToAssign)
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? updated : t))
      )
      if (selectedTask && selectedTask.id === id) {
        setSelectedTask(updated)
      }
      setToast({
        type: 'success',
        message: claim ? 'Assumiste esta tarefa!' : 'Largaste a tarefa.'
      })
      setTimeout(() => setToast(null), 2500)
    } catch (e) {
      console.error('Error claiming task:', e)
    }
  }

  const handleTaskUpdated = (updatedTask: Task) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    )
    setSelectedTask(updatedTask)
  }

  const handleDeleteTask = (id: string) => {
    const task = tasks.find((t) => t.id === id)
    if (task) {
      setDeleteConfirmation({ id, title: task.title })
    }
  }

  const executeDeleteTask = async (id: string) => {
    try {
      await taskService.deleteTask(id)
      setTasks((prev) => prev.filter((t) => t.id !== id))
      if (selectedTask?.id === id) {
        setSelectedTask(null)
      }
      setToast({
        type: 'delete',
        message: 'Tarefa eliminada com sucesso.'
      })
      setTimeout(() => setToast(null), 3000)
    } catch (e) {
      console.error('Error deleting task:', e)
      setToast({
        type: 'error',
        message: 'Erro ao eliminar a tarefa.'
      })
      setTimeout(() => setToast(null), 3000)
    }
  }

  // Filter and search tasks
  const filteredTasks = tasks.filter((task) => {
    // Search filter
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchesSearch) return false

    // Type filter
    if (filterType === 'private') {
      return task.department === null
    }
    if (filterType === 'departmental') {
      if (task.department === null) return false
      if (selectedDeptFilter !== 'all') {
        return task.department === selectedDeptFilter
      }
      return true
    }

    return true
  })

  // Sort tasks: pending first, then by date (newest first)
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const completedCount = filteredTasks.filter((t) => t.completed).length

  return (
    <div className="space-y-8 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Tarefas do Staff</h1>
          <p className="text-text-secondary text-sm mt-1">
            Coordenador de tarefas individuais ou distribuídas por departamento.
          </p>
        </div>
        
        <div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 bg-brand-primary text-background font-medium rounded-md px-3.5 py-2 text-sm hover:opacity-90 transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Nova Tarefa</span>
          </button>
        </div>
      </div>

      {/* Main List Layout */}
      <div className="w-full space-y-4">
        {/* Control Panel (Search and Filter Tabs) */}
        <div className="border border-border-custom bg-secondary-bg p-4 rounded-lg space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-2.5 text-text-secondary" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Pesquisar tarefas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border border-border-custom bg-background text-text-primary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none rounded-md pl-9 pr-3.5 py-1.5 text-sm w-full transition-colors"
              />
            </div>

            {/* Department selector if department filtering is active */}
            {filterType === 'departmental' && (
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="border border-border-custom bg-background text-text-primary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none rounded-md px-3 py-1.5 text-sm transition-colors cursor-pointer"
              >
                <option value="all">Todos os Departamentos</option>
                <option value="Mesa">Mesa</option>
                <option value="Logística">Logística</option>
                <option value="Marketing">Marketing</option>
                <option value="Atividades">Atividades</option>
                <option value="Tecnologia">Tecnologia</option>
                <option value="Comercial">Comercial</option>
              </select>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-border-custom">
            <button
              onClick={() => setFilterType('all')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'border-brand-primary text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <Layers size={14} />
              Todas
            </button>
            <button
              onClick={() => setFilterType('private')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                filterType === 'private'
                  ? 'border-brand-primary text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <Lock size={14} />
              Privadas
            </button>
            <button
              onClick={() => setFilterType('departmental')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                filterType === 'departmental'
                  ? 'border-brand-primary text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <Globe size={14} />
              Departamento
            </button>
          </div>
        </div>

        {/* Task Count Info */}
        {!loading && filteredTasks.length > 0 && (
          <div className="flex items-center justify-between text-xs text-text-secondary px-1">
            <span>A mostrar {filteredTasks.length} {filteredTasks.length === 1 ? 'tarefa' : 'tarefas'}</span>
            <span>{completedCount} de {filteredTasks.length} concluídas ({Math.round((completedCount / filteredTasks.length) * 100)}%)</span>
          </div>
        )}

        {/* Tasks Container */}
        <div className="space-y-2">
          {loading ? (
            // Loading state
            <div className="flex flex-col items-center justify-center p-12 border border-border-custom rounded-lg bg-secondary-bg/20">
              <Loader2 className="animate-spin text-text-secondary mb-3" size={24} strokeWidth={1.5} />
              <span className="text-xs text-text-secondary">A carregar tarefas...</span>
            </div>
          ) : sortedTasks.length > 0 ? (
            // Task items list
            sortedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                currentUser={currentUser}
                onToggle={handleToggleTask}
                onClaim={handleClaimTask}
                onDelete={handleDeleteTask}
                onSelectTask={(t) => setSelectedTask(t)}
              />
            ))
          ) : (
            // Empty state
            <div className="flex flex-col items-center justify-center p-12 border border-border-custom rounded-lg bg-secondary-bg/20 text-center">
              <span className="text-sm font-medium text-text-primary mb-1">Nenhuma tarefa encontrada</span>
              <p className="text-xs text-text-secondary max-w-sm">
                {searchQuery 
                  ? 'Nenhuma tarefa corresponde à tua pesquisa actual.' 
                  : 'Ainda não tens nenhuma tarefa registada nesta categoria.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-secondary-bg border border-border-custom w-full max-w-md rounded-lg shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-custom/50">
              <h3 className="text-sm font-semibold text-text-primary">Criar Nova Tarefa</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-text-secondary hover:text-text-primary cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-5">
              <TaskForm onAddTask={(title, dept, assignedTo) => {
                handleAddTask(title, dept, assignedTo)
                setIsModalOpen(false)
              }} />
            </div>
          </div>
        </div>
      )}

      {/* Focused Floating Task Card Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          currentUser={currentUser}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={handleTaskUpdated}
          onDeleteTask={handleDeleteTask}
        />
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div 
            className="border border-border-custom bg-secondary-bg rounded-lg max-w-sm w-full shadow-2xl overflow-hidden flex flex-col p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-3 text-center">
              <div className="mx-auto h-12 w-12 rounded-full border border-red-500/20 bg-red-500/5 flex items-center justify-center text-red-500">
                <Trash2 size={24} strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-text-primary">
                  Eliminar Tarefa
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Tens a certeza que pretendes eliminar a tarefa <strong className="text-text-primary">&quot;{deleteConfirmation.title}&quot;</strong>? Esta ação é permanente.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 border border-border-custom px-4 py-2 rounded-md hover:bg-background/80 text-xs font-medium text-text-primary transition-colors cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const { id } = deleteConfirmation
                  setDeleteConfirmation(null)
                  await executeDeleteTask(id)
                }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-md px-4 py-2 text-xs transition-all shadow cursor-pointer active:scale-[0.98] text-center"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 border border-border-custom bg-secondary-bg/95 backdrop-blur-md p-4 rounded-lg shadow-2xl flex gap-3 text-xs w-80 sm:w-96 text-left animate-slide-down select-none">
          <div className={`h-6 w-6 rounded-full border flex items-center justify-center shrink-0 ${
            toast.type === 'success' 
              ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500' 
              : toast.type === 'delete'
              ? 'border-red-500/20 bg-red-500/5 text-red-500'
              : 'border-blue-500/20 bg-blue-500/5 text-blue-500'
          }`}>
            {toast.type === 'success' ? (
              <Check size={14} strokeWidth={2.5} />
            ) : toast.type === 'delete' ? (
              <Trash2 size={14} strokeWidth={1.5} />
            ) : (
              <Check size={14} strokeWidth={2.5} />
            )}
          </div>
          <div className="space-y-0.5">
            <span className="font-bold text-text-primary text-xs block">
              {toast.type === 'success' ? 'Sucesso' : toast.type === 'delete' ? 'Eliminado' : 'Erro'}
            </span>
            <p className="text-text-secondary text-[11px] leading-relaxed">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  )
}
