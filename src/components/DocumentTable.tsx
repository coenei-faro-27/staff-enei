'use client'

import React from 'react'
import { 
  FileText, 
  FileImage, 
  FileSpreadsheet, 
  FileArchive, 
  FileCode, 
  File, 
  Download, 
  Trash2,
  Lock,
  Landmark,
  Eye
} from 'lucide-react'
import { DocumentItem } from '@/services/documentService'
import { UserProfile } from '@/services/profileService'

interface DocumentTableProps {
  documents: DocumentItem[]
  currentUser?: UserProfile | null
  onDownload: (name: string, department: string) => void
  onDelete: (name: string, department: string) => void
  onPreview: (name: string, department: string) => void
  downloadingId: string | null
}

export default function DocumentTable({ 
  documents, 
  currentUser,
  onDownload, 
  onDelete, 
  onPreview,
  downloadingId 
}: DocumentTableProps) {
  
  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'pdf':
        return { icon: FileText, style: 'text-red-500 border-red-500/20 bg-red-500/5' }
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
      case 'svg':
        return { icon: FileImage, style: 'text-blue-500 border-blue-500/20 bg-blue-500/5' }
      case 'xlsx':
      case 'xls':
      case 'csv':
        return { icon: FileSpreadsheet, style: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' }
      case 'zip':
      case 'rar':
      case 'tar':
      case 'gz':
        return { icon: FileArchive, style: 'text-amber-500 border-amber-500/20 bg-amber-500/5' }
      case 'js':
      case 'ts':
      case 'tsx':
      case 'html':
      case 'css':
      case 'json':
        return { icon: FileCode, style: 'text-purple-500 border-purple-500/20 bg-purple-500/5' }
      default:
        return { icon: File, style: 'text-text-secondary border-border-custom bg-secondary-bg' }
    }
  }

  const getFileType = (filename: string) => {
    const ext = filename.split('.').pop()?.toUpperCase()
    return ext || 'Ficheiro'
  }

  const formatDisplayFileName = (filename: string) => {
    const lastDotIndex = filename.lastIndexOf('.')
    const withoutExt = lastDotIndex !== -1 ? filename.substring(0, lastDotIndex) : filename
    return withoutExt.replace(/_/g, ' ')
  }

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
      return 'Data Inválida'
    }
  }

  const getDeptBadgeStyle = (dept: string) => {
    if (dept === 'Privado') {
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
        return 'border-border-custom text-text-secondary bg-transparent'
    }
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border border-border-custom rounded-lg bg-secondary-bg/20 text-center">
        <span className="text-sm font-medium text-text-primary mb-1">Nenhum documento encontrado</span>
        <p className="text-xs text-text-secondary max-w-sm">
          Não foram carregados ficheiros que correspondam aos filtros atuais.
        </p>
      </div>
    )
  }

  return (
    <div className="border border-border-custom bg-secondary-bg rounded-lg overflow-x-auto">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="border-b border-border-custom bg-background/50 text-xs font-semibold text-text-secondary uppercase tracking-wider">
            <th className="px-5 py-3">Ficheiro</th>
            <th className="px-5 py-3 hidden sm:table-cell">Associação</th>
            <th className="px-5 py-3 hidden md:table-cell">Tipo</th>
            <th className="px-5 py-3 hidden sm:table-cell">Upload</th>
            <th className="px-5 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-custom/50 bg-background/20">
          {documents.map((doc) => {
            const { icon: FileIcon, style: iconStyle } = getFileIcon(doc.name)
            const isDownloading = downloadingId === doc.id
            const roleLower = currentUser?.role?.toLowerCase()
            const isAdmin = roleLower === 'admin'
            const isMesa = currentUser?.department?.toLowerCase() === 'mesa'
            const isDiretorOrCo = roleLower === 'diretor' || roleLower === 'co-diretor'

            const canDelete = !currentUser ||
              isAdmin ||
              (isMesa && doc.department !== 'Privado') ||
              (isDiretorOrCo && doc.department === currentUser.department) ||
              (doc.department === 'Privado')

            return (
              <tr key={doc.id} className="hover:bg-secondary-bg/40 transition-colors">
                {/* File details */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-md border flex items-center justify-center shrink-0 ${iconStyle}`}>
                      <FileIcon size={18} strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-text-primary block truncate max-w-xs md:max-w-md">
                        {formatDisplayFileName(doc.name)}
                      </span>
                      {/* Sub-info for mobile devices */}
                      <span className="text-[10px] text-text-secondary sm:hidden flex items-center gap-1.5 mt-0.5">
                        <span>{doc.department}</span>
                        <span>•</span>
                        <span>{getFileType(doc.name)}</span>
                      </span>
                    </div>
                  </div>
                </td>

                {/* Department badge */}
                <td className="px-5 py-4 hidden sm:table-cell">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getDeptBadgeStyle(doc.department)}`}>
                    {doc.department === 'Privado' ? (
                      <Lock size={10} strokeWidth={1.5} />
                    ) : (
                      <Landmark size={10} strokeWidth={1.5} />
                    )}
                    <span>{doc.department}</span>
                  </span>
                </td>

                {/* File type */}
                <td className="px-5 py-4 text-text-secondary hidden md:table-cell font-medium">
                  {getFileType(doc.name)}
                </td>

                {/* Upload date */}
                <td className="px-5 py-4 text-text-secondary hidden sm:table-cell">
                  {formatDate(doc.created_at)}
                </td>

                {/* Actions */}
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* Preview Button */}
                    <button
                      onClick={() => onPreview(doc.name, doc.department)}
                      aria-label="Pré-visualizar ficheiro"
                      className="border border-border-custom text-text-primary hover:bg-background/80 p-1.5 rounded-md transition-colors cursor-pointer"
                    >
                      <Eye size={14} strokeWidth={1.5} />
                    </button>

                    {/* Download Button (outline secondary) */}
                    <button
                      onClick={() => onDownload(doc.name, doc.department)}
                      disabled={isDownloading}
                      aria-label="Descarregar ficheiro"
                      className="border border-border-custom text-text-primary hover:bg-background/80 p-1.5 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isDownloading ? (
                        <span className="h-3.5 w-3.5 border-2 border-text-primary border-t-transparent animate-spin rounded-full block" />
                      ) : (
                        <Download size={14} strokeWidth={1.5} />
                      )}
                    </button>

                    {/* Delete Button (outline actions destrutivas) */}
                    {canDelete && (
                      <button
                        onClick={() => onDelete(doc.name, doc.department)}
                        aria-label="Apagar ficheiro"
                        className="border border-red-500/40 text-red-500 hover:text-white bg-transparent hover:bg-red-500 dark:hover:bg-red-950/40 p-1.5 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
