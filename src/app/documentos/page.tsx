'use client'

import React, { useState, useEffect } from 'react'
import {
  Search,
  Upload,
  Folder,
  Loader2,
  Info,
  X,
  EyeOff,
  Download,
  Trash2,
  Check
} from 'lucide-react'
import DocumentUploadForm from '@/components/DocumentUploadForm'
import DocumentTable from '@/components/DocumentTable'
import { documentService, DocumentItem } from '@/services/documentService'
import { profileService, UserProfile } from '@/services/profileService'

const formatDisplayFileName = (filename: string) => {
  const lastDotIndex = filename.lastIndexOf('.')
  const withoutExt = lastDotIndex !== -1 ? filename.substring(0, lastDotIndex) : filename
  return withoutExt.replace(/_/g, ' ')
}

export default function DocumentosPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all') // 'all', 'Geral', 'Conteúdos', etc.
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)

  // Custom Delete Confirmation State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    name: string
    department: string
  } | null>(null)

  // Custom Floating Toast State
  const [toast, setToast] = useState<{
    type: 'success' | 'delete' | 'error'
    message: string
  } | null>(null)

  // Preview modal states
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const tabs = [
    { label: 'Todos', value: 'all' },
    { label: 'Mesa', value: 'Mesa' },
    { label: 'Logística', value: 'Logística' },
    { label: 'Marketing', value: 'Marketing' },
    { label: 'Atividades', value: 'Atividades' },
    { label: 'Tecnologia', value: 'Tecnologia' },
    { label: 'Comercial', value: 'Comercial' },
    { label: 'Privados', value: 'Privado' }
  ]

  const loadDocumentsAndProfile = async () => {
    setLoading(true)
    try {
      const [docs, profile] = await Promise.all([
        documentService.getDocuments(),
        profileService.getProfile().catch(() => null)
      ])
      setDocuments(docs)
      setCurrentUser(profile)
    } catch (e) {
      console.error('Failed to load documents:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Defer loading to satisfy strict react-hooks rules on mount
    const timeoutId = setTimeout(() => {
      loadDocumentsAndProfile()
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [])

  const handleUpload = async (file: File, department: string) => {
    try {
      const newDoc = await documentService.uploadDocument(file, department)
      setDocuments((prev) => [newDoc, ...prev])
      setToast({
        type: 'success',
        message: 'Documento carregado com sucesso!'
      })
      setTimeout(() => setToast(null), 3000)
    } catch (e) {
      console.error('Upload failed:', e)
      setToast({
        type: 'error',
        message: 'Erro ao carregar o documento.'
      })
      setTimeout(() => setToast(null), 3000)
      throw e
    }
  }

  const handlePreview = async (name: string, department: string) => {
    const doc = documents.find((d) => d.name === name && d.department === department)
    if (!doc) return

    setPreviewDoc(doc)
    setLoadingPreview(true)
    setPreviewUrl(null)

    try {
      const url = await documentService.downloadDocument(name, department, false)
      setPreviewUrl(url)
    } catch (e) {
      console.error('Failed to load preview url:', e)
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleDelete = (name: string, department: string) => {
    setDeleteConfirmation({ name, department })
  }

  const executeDelete = async (name: string, department: string) => {
    try {
      await documentService.deleteDocument(name, department)
      setDocuments((prev) =>
        prev.filter((d) => !(d.name === name && d.department === department))
      )
      setToast({
        type: 'delete',
        message: 'Documento removido com sucesso.'
      })
      setTimeout(() => setToast(null), 3000)
    } catch (e) {
      console.error('Delete failed:', e)
      setToast({
        type: 'error',
        message: 'Erro ao remover o documento.'
      })
      setTimeout(() => setToast(null), 3000)
    }
  }

  const handleDownload = async (name: string, department: string) => {
    const doc = documents.find((d) => d.name === name && d.department === department)
    if (!doc) return

    setDownloadingId(doc.id)
    try {
      const downloadUrl = await documentService.downloadDocument(name, department)

      // Programmatically trigger download in browser
      const link = window.document.createElement('a')
      link.href = downloadUrl
      link.setAttribute('download', name)
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)
    } catch (e) {
      console.error('Download failed:', e)
    } finally {
      setDownloadingId(null)
    }
  }

  // Filter and search logic
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchesSearch) return false

    if (activeTab !== 'all') {
      return doc.department === activeTab
    }
    return true
  })

  return (
    <div className="space-y-8 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Gestão de Documentos</h1>
          <p className="text-text-secondary text-sm mt-1">
            Partilha de regulamentos, plantas, folhas de cálculo e recursos da organização.
          </p>
        </div>

        {/* Actions & Connection Mode */}
        <div className="flex items-center gap-3 self-start sm:self-center">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-brand-primary text-background font-medium rounded-md px-3.5 py-2 text-sm hover:opacity-90 transition-all cursor-pointer"
          >
            <Upload size={14} />
            <span>Carregar</span>
          </button>
        </div>
      </div>
      {/* Filters and List */}
      <div className="space-y-4">
        {/* Filters control block */}
        <div className="border border-border-custom bg-secondary-bg p-4 rounded-lg space-y-4">
          {/* Top controls row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Search bar */}
            <div className="relative max-w-md w-full">
              <Search size={16} className="absolute left-3 top-2.5 text-text-secondary" strokeWidth={1.5} />
              <input
                type="text"
                placeholder="Pesquisar ficheiros por nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border border-border-custom bg-background text-text-primary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none rounded-md pl-9 pr-3.5 py-1.5 text-sm w-full transition-colors"
              />
            </div>

            {/* Info Tooltip */}
            <div className="relative group flex items-center gap-1.5 self-end sm:self-center">
              <span className="text-xs text-text-secondary select-none font-medium">Segurança e Permissões</span>
              <div className="relative cursor-help text-text-secondary hover:text-text-primary transition-colors p-1.5 rounded-md border border-border-custom/50 bg-background/50 hover:bg-background flex items-center justify-center">
                <Info size={14} strokeWidth={1.5} />

                {/* Tooltip Content */}
                <div className="absolute right-0 top-full mt-2 w-72 p-4 bg-secondary-bg border border-border-custom rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-left pointer-events-none">
                  <div className="space-y-1.5">
                    <span className="font-bold text-text-primary text-xs block">Segurança e Permissões</span>
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      Os documentos associados aos departamentos são públicos para toda a equipa organizadora. Ficheiros carregados como &quot;Privado&quot; só são visíveis pelo respetivo utilizador. Os administradores têm acesso a toda a informação da plataforma.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Filter Tabs */}
          <div className="flex border-b border-border-custom overflow-x-auto whitespace-nowrap scrollbar-thin">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer shrink-0 ${activeTab === tab.value
                    ? 'border-brand-primary text-text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                  }`}
              >
                <Folder size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Documents Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 border border-border-custom rounded-lg bg-secondary-bg/20">
            <Loader2 className="animate-spin text-text-secondary mb-3" size={24} strokeWidth={1.5} />
            <span className="text-xs text-text-secondary">A carregar repositório...</span>
          </div>
        ) : (
          <DocumentTable
            documents={filteredDocs}
            currentUser={currentUser}
            onDownload={handleDownload}
            onDelete={handleDelete}
            onPreview={handlePreview}
            downloadingId={downloadingId}
          />
        )}
      </div>

      {/* Modal Form Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="border border-border-custom bg-secondary-bg rounded-lg max-w-md w-full shadow-lg overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-custom px-5 py-4 bg-background/50">
              <span className="font-semibold text-text-primary text-sm">Carregar Novo Ficheiro</span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="border border-border-custom p-1.5 rounded-md hover:bg-background text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
            {/* Form */}
            <div className="p-5">
              <DocumentUploadForm
                onUpload={handleUpload}
                onClose={() => setIsModalOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Preview Overlay */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="border border-border-custom bg-secondary-bg rounded-lg max-w-4xl w-full h-[85vh] shadow-2xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-custom px-5 py-4 bg-background/50 animate-fade-in">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-text-primary text-sm truncate max-w-xs sm:max-w-md">
                  {formatDisplayFileName(previewDoc.name)}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 border border-border-custom text-text-secondary bg-background rounded-full">
                  {previewDoc.department}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {previewUrl && (
                  <button
                    onClick={() => handleDownload(previewDoc.name, previewDoc.department)}
                    className="flex items-center gap-1.5 border border-border-custom px-3 py-1.5 rounded-md hover:bg-background text-text-primary text-xs transition-colors cursor-pointer"
                  >
                    <Download size={12} />
                    <span className="hidden sm:inline">Descarregar</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setPreviewDoc(null)
                    setPreviewUrl(null)
                  }}
                  className="border border-border-custom p-1.5 rounded-md hover:bg-background text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-hidden bg-background/20 flex flex-col">
              {loadingPreview ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="animate-spin text-text-secondary h-8 w-8" strokeWidth={1.5} />
                  <span className="text-xs text-text-secondary">A carregar pré-visualização...</span>
                </div>
              ) : previewUrl ? (
                (() => {
                  const ext = previewDoc.name.split('.').pop()?.toLowerCase()
                  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')
                  const isPdf = ext === 'pdf'
                  const isTxt = ['txt', 'md', 'json', 'csv'].includes(ext || '')

                  if (isImage) {
                    return (
                      <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl}
                          alt={previewDoc.name}
                          className="max-w-full max-h-full object-contain rounded-md shadow-lg border border-border-custom"
                        />
                      </div>
                    )
                  }

                  if (isPdf) {
                    return (
                      <iframe
                        src={previewUrl}
                        title={previewDoc.name}
                        className="w-full h-full border-0 bg-white"
                      />
                    )
                  }

                  if (isTxt) {
                    return (
                      <iframe
                        src={previewUrl}
                        title={previewDoc.name}
                        className="w-full h-full border-0 bg-background/50 text-text-primary p-4"
                      />
                    )
                  }

                  // Fallback: unsupported preview
                  return (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto space-y-4">
                      <div className="h-16 w-16 rounded-full border border-border-custom bg-background/50 flex items-center justify-center text-text-secondary">
                        <EyeOff size={32} strokeWidth={1.5} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-semibold text-text-primary">
                          Pré-visualização indisponível
                        </h3>
                        <p className="text-xs text-text-secondary">
                          Não é possível pré-visualizar ficheiros com a extensão <code className="bg-background px-1.5 py-0.5 rounded border border-border-custom font-mono text-[10px]">.{ext}</code> diretamente no navegador.
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownload(previewDoc.name, previewDoc.department)}
                        className="flex items-center gap-2 bg-brand-primary text-background font-semibold rounded-md px-5 py-2.5 text-xs hover:opacity-90 transition-all cursor-pointer shadow"
                      >
                        <Download size={14} />
                        <span>Descarregar Ficheiro</span>
                      </button>
                    </div>
                  )
                })()
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <span className="text-xs text-text-secondary">Não foi possível carregar a pré-visualização.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            className="border border-border-custom bg-secondary-bg rounded-lg max-w-sm w-full shadow-2xl overflow-hidden flex flex-col p-6 space-y-4 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-3 text-center">
              <div className="mx-auto h-12 w-12 rounded-full border border-red-500/20 bg-red-500/5 flex items-center justify-center text-red-500">
                <Trash2 size={24} strokeWidth={1.5} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-text-primary">
                  Apagar Documento
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Tens a certeza que pretendes apagar o ficheiro <strong className="text-text-primary">&quot;{formatDisplayFileName(deleteConfirmation.name)}&quot;</strong>? Esta ação é permanente e irá remover o ficheiro da plataforma.
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
                  const { name, department } = deleteConfirmation
                  setDeleteConfirmation(null)
                  await executeDelete(name, department)
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
