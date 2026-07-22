'use client'

import React, { useState, useRef } from 'react'
import { 
  X, 
  Check, 
  Trash2, 
  UserCheck, 
  UserX, 
  Paperclip, 
  FileText, 
  FileImage, 
  Download, 
  Send, 
  Lock, 
  Landmark, 
  Loader2, 
  Calendar,
  Eye,
  Info
} from 'lucide-react'
import { Task, TaskAttachment, taskService } from '@/services/taskService'
import { UserProfile } from '@/services/profileService'

interface TaskDetailModalProps {
  task: Task
  currentUser: UserProfile | null
  onClose: () => void
  onTaskUpdated: (updatedTask: Task) => void
  onDeleteTask: (id: string) => void
}

export default function TaskDetailModal({
  task,
  currentUser,
  onClose,
  onTaskUpdated,
  onDeleteTask
}: TaskDetailModalProps) {
  const [description, setDescription] = useState(task.description || '')
  const [isSavingDesc, setIsSavingDesc] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [previewMedia, setPreviewMedia] = useState<{ url: string; name: string } | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Roles & Permissions Calculation
  const roleLower = currentUser?.role?.toLowerCase()
  const isAdmin = roleLower === 'admin'
  const isMesa = currentUser?.department === 'Mesa'
  const isDiretorOrCo = roleLower === 'diretor' || roleLower === 'co-diretor'
  
  const isAssigned = !!task.assigned_to
  const isAssignedToMe = task.assigned_to === currentUser?.id
  const assignedName = task.assigned_user?.full_name || (isAssignedToMe ? currentUser?.full_name : 'Outro elemento')

  // Can interact/edit general task details
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

  // Handlers
  const handleSaveDescription = async () => {
    setIsSavingDesc(true)
    try {
      await taskService.updateTaskDescription(task.id, description)
      const updated = { ...task, description }
      onTaskUpdated(updated)
    } catch (e) {
      console.error('Failed to save description:', e)
    } finally {
      setIsSavingDesc(false)
    }
  }

  const handleToggleClaim = async () => {
    try {
      const isClaiming = !isAssignedToMe
      const userToAssign = isClaiming ? currentUser : null
      const updated = await taskService.claimTask(task.id, userToAssign)
      onTaskUpdated(updated)
    } catch (e) {
      console.error('Failed to toggle claim:', e)
    }
  }

  const handleToggleConclude = async () => {
    if (!canConclude) return
    try {
      const nextState = !task.completed
      await taskService.toggleTask(task.id, nextState)
      const updated = { ...task, completed: nextState }
      onTaskUpdated(updated)
    } catch (e) {
      console.error('Failed to toggle conclude:', e)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploadingFile(true)
    try {
      const file = files[0]
      const newAttachment = await taskService.addAttachment(task.id, file)
      const updatedAttachments = [...(task.attachments || []), newAttachment]
      const updated = { ...task, attachments: updatedAttachments }
      onTaskUpdated(updated)
    } catch (err) {
      console.error('Error uploading file:', err)
    } finally {
      setIsUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveAttachment = async (attachment: TaskAttachment) => {
    try {
      await taskService.removeAttachment(task.id, attachment.id, attachment.storage_path)
      const updatedAttachments = (task.attachments || []).filter(a => a.id !== attachment.id)
      const updated = { ...task, attachments: updatedAttachments }
      onTaskUpdated(updated)
    } catch (err) {
      console.error('Error removing attachment:', err)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim() || !currentUser) return

    setIsAddingComment(true)
    try {
      const newComment = await taskService.addComment(task.id, currentUser, commentText.trim())
      const updatedComments = [...(task.comments || []), newComment]
      const updated = { ...task, comments: updatedComments }
      onTaskUpdated(updated)
      setCommentText('')
    } catch (err) {
      console.error('Error adding comment:', err)
    } finally {
      setIsAddingComment(false)
    }
  }

  const getBadgeStyle = (dept: string | null) => {
    if (!dept) return 'border-border-custom/50 text-text-secondary bg-transparent'
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

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fade-in overflow-y-auto">
      <div 
        className="bg-secondary-bg border border-border-custom w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-5 border-b border-border-custom bg-background/50 gap-4">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
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

              {task.completed && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border border-emerald-500/30 text-emerald-500 bg-emerald-500/10">
                  <Check size={11} strokeWidth={2.5} />
                  <span>Concluída</span>
                </span>
              )}
            </div>

            <h2 className={`text-xl font-bold text-text-primary ${task.completed ? 'line-through opacity-70' : ''}`}>
              {task.title}
            </h2>

            <div className="flex items-center gap-4 text-xs text-text-secondary">
              <span className="flex items-center gap-1">
                <Calendar size={12} strokeWidth={1.5} />
                <span>Criada a {formatDate(task.created_at)}</span>
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Fechar modal"
            className="text-text-secondary hover:text-text-primary p-1.5 rounded-md hover:bg-background transition-colors cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action Toolbar (Assumir, Concluir, Eliminar) */}
        <div className="flex items-center justify-between p-3 px-5 border-b border-border-custom bg-background/30 gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Assumir Button */}
            {isAssignedToMe ? (
              <button
                onClick={handleToggleClaim}
                className="border border-indigo-500/40 text-indigo-500 hover:text-white bg-transparent hover:bg-indigo-500 dark:hover:bg-indigo-950/40 p-1.5 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <UserX size={14} strokeWidth={1.5} />
                <span>Largar Tarefa</span>
              </button>
            ) : isAssigned ? (
              <div className="border border-blue-500/40 text-blue-400 bg-blue-500/5 p-1.5 px-3 rounded-md text-xs font-medium flex items-center gap-1.5">
                <UserCheck size={14} strokeWidth={1.5} className="text-blue-500" />
                <span>Assumida por <strong>{assignedName}</strong></span>
                {canInteract && (
                  <button
                    onClick={handleToggleClaim}
                    className="ml-1 text-[10px] underline text-blue-400 hover:text-white cursor-pointer"
                  >
                    (Reassumir)
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={handleToggleClaim}
                className="border border-blue-500/40 text-blue-500 hover:text-white bg-transparent hover:bg-blue-500 dark:hover:bg-blue-950/40 p-1.5 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <UserCheck size={14} strokeWidth={1.5} />
                <span>Assumir Tarefa</span>
              </button>
            )}

            {/* Concluir Button */}
            {canConclude ? (
              <button
                onClick={handleToggleConclude}
                className={`p-1.5 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  task.completed
                    ? 'border border-emerald-500/60 text-emerald-500 hover:text-white bg-transparent hover:bg-emerald-500 dark:hover:bg-emerald-950/40'
                    : 'border border-emerald-500/40 text-emerald-500 hover:text-white bg-transparent hover:bg-emerald-500 dark:hover:bg-emerald-950/40'
                }`}
              >
                <Check size={14} strokeWidth={2.0} />
                <span>{task.completed ? 'Reabrir Tarefa' : 'Concluir Tarefa'}</span>
              </button>
            ) : (
              <div 
                title="Apenas quem assumiu a tarefa, a Mesa ou o Diretor do Departamento podem concluir"
                className="border border-border-custom/40 bg-secondary-bg/20 text-text-secondary/40 opacity-60 cursor-not-allowed p-1.5 px-3 rounded-md text-xs font-medium flex items-center gap-1.5 select-none"
              >
                <Lock size={12} strokeWidth={1.5} />
                <span>Concluir (Bloqueado)</span>
              </div>
            )}
          </div>

          {/* Delete Button */}
          {canInteract && (
            <button
              onClick={() => {
                onDeleteTask(task.id)
                onClose()
              }}
              className="border border-red-500/40 text-red-500 hover:text-white bg-transparent hover:bg-red-500 dark:hover:bg-red-950/40 p-1.5 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 size={14} strokeWidth={1.5} />
              <span>Eliminar</span>
            </button>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 space-y-6 overflow-y-auto flex-1">
          {/* Permission warning banner if completed by restricted user */}
          {isAssigned && !canConclude && (
            <div className="border border-amber-500/30 bg-amber-500/5 text-amber-500 p-3 rounded-lg text-xs flex items-center gap-2">
              <Info size={16} strokeWidth={1.5} className="shrink-0" />
              <span>
                Esta tarefa foi assumida por <strong>{assignedName}</strong>. Apenas esta pessoa, a Mesa ou o Diretor de Departamento podem marcar como concluída.
              </span>
            </div>
          )}

          {/* Descrição / Notas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                Descrição & Detalhes
              </h3>
              {description !== (task.description || '') && (
                <button
                  onClick={handleSaveDescription}
                  disabled={isSavingDesc}
                  className="bg-brand-primary text-background px-3 py-1 rounded-md text-xs font-medium hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1"
                >
                  {isSavingDesc && <Loader2 size={12} className="animate-spin" />}
                  <span>Guardar Alterações</span>
                </button>
              )}
            </div>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Escreve aqui notas detalhadas, links, instruções ou especificações desta tarefa..."
              className="border border-border-custom bg-background text-text-primary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none rounded-lg p-3 text-sm w-full transition-colors resize-y leading-relaxed"
            />
          </div>

          {/* Anexos (Ficheiros e Imagens) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip size={14} />
                <span>Anexos & Imagens ({task.attachments?.length || 0})</span>
              </h3>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingFile}
                className="border border-blue-500/40 text-blue-500 hover:text-white bg-transparent hover:bg-blue-500 dark:hover:bg-blue-950/40 p-1.5 px-3 rounded-md text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isUploadingFile ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Paperclip size={14} />
                )}
                <span>Anexar Ficheiro</span>
              </button>
            </div>

            {/* List of attachments */}
            {task.attachments && task.attachments.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {task.attachments.map((att) => {
                  const isImg = att.type === 'image' || att.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)
                  return (
                    <div 
                      key={att.id} 
                      className="border border-border-custom bg-background/40 hover:bg-background/80 p-3 rounded-lg flex items-center justify-between gap-3 group transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`h-9 w-9 rounded-md border flex items-center justify-center shrink-0 ${
                          isImg ? 'border-blue-500/30 bg-blue-500/5 text-blue-500' : 'border-border-custom bg-secondary-bg text-text-secondary'
                        }`}>
                          {isImg ? <FileImage size={18} strokeWidth={1.5} /> : <FileText size={18} strokeWidth={1.5} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-text-primary text-xs block truncate" title={att.name}>
                            {att.name}
                          </span>
                          <span className="text-[10px] text-text-secondary block">
                            {formatFileSize(att.size)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isImg && att.url && (
                          <button
                            onClick={() => setPreviewMedia({ url: att.url!, name: att.name })}
                            title="Pré-visualizar imagem"
                            className="border border-blue-500/40 text-blue-500 hover:text-white bg-transparent hover:bg-blue-500 dark:hover:bg-blue-950/40 p-1.5 rounded-md transition-colors cursor-pointer"
                          >
                            <Eye size={13} strokeWidth={1.5} />
                          </button>
                        )}
                        {att.url && (
                          <a
                            href={att.url}
                            download={att.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Descarregar ficheiro"
                            className="border border-blue-500/40 text-blue-500 hover:text-white bg-transparent hover:bg-blue-500 dark:hover:bg-blue-950/40 p-1.5 rounded-md transition-colors cursor-pointer flex items-center justify-center"
                          >
                            <Download size={13} strokeWidth={1.5} />
                          </a>
                        )}
                        <button
                          onClick={() => handleRemoveAttachment(att)}
                          title="Eliminar anexo"
                          className="border border-red-500/40 text-red-500 hover:text-white bg-transparent hover:bg-red-500 dark:hover:bg-red-950/40 p-1.5 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="border border-dashed border-border-custom rounded-lg p-6 text-center text-xs text-text-secondary bg-background/10">
                Ainda não foram anexados ficheiros ou imagens a esta tarefa.
              </div>
            )}
          </div>

          {/* Comentários & Atividade */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
              Comentários ({task.comments?.length || 0})
            </h3>

            {/* Comment Form */}
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                placeholder="Escreve um comentário..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="border border-border-custom bg-background text-text-primary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none rounded-md px-3 py-1.5 text-xs flex-1 transition-colors"
              />
              <button
                type="submit"
                disabled={isAddingComment || !commentText.trim()}
                className="bg-brand-primary text-background font-medium rounded-md px-3.5 py-1.5 text-xs hover:opacity-90 transition-all cursor-pointer flex items-center gap-1 disabled:opacity-50"
              >
                {isAddingComment ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Send size={12} />
                )}
                <span>Enviar</span>
              </button>
            </form>

            {/* Comments List */}
            {task.comments && task.comments.length > 0 ? (
              <div className="space-y-2.5 pt-1">
                {task.comments.map((comm) => (
                  <div key={comm.id} className="border border-border-custom/60 bg-background/30 p-3 rounded-lg space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-text-primary">
                        {comm.user_name}
                      </span>
                      <span className="text-[10px] text-text-secondary">
                        {formatDate(comm.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                      {comm.text}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-text-secondary text-center p-4 border border-border-custom/40 rounded-lg bg-background/10">
                Sem comentários adicionados.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Preview Overlay */}
      {previewMedia && (
        <div 
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setPreviewMedia(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] flex flex-col items-center">
            <button
              onClick={() => setPreviewMedia(null)}
              className="absolute -top-10 right-0 text-white hover:opacity-80 p-2 cursor-pointer"
            >
              <X size={24} />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={previewMedia.url} 
              alt={previewMedia.name} 
              className="max-h-[80vh] max-w-full rounded-lg shadow-2xl object-contain" 
            />
            <span className="text-white text-xs mt-2 font-medium">{previewMedia.name}</span>
          </div>
        </div>
      )}
    </div>
  )
}
