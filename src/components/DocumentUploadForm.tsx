'use client'

import React, { useState, useRef } from 'react'
import { Upload, X, File, AlertCircle, CheckCircle } from 'lucide-react'

interface DocumentUploadFormProps {
  onUpload: (file: File, department: string) => Promise<void>
  onClose?: () => void
}

export default function DocumentUploadForm({ onUpload, onClose }: DocumentUploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [department, setDepartment] = useState('Mesa')
  const [uploading, setUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const departments = [
    { label: 'Mesa', value: 'Mesa' },
    { label: 'Logística', value: 'Logística' },
    { label: 'Marketing', value: 'Marketing' },
    { label: 'Atividades', value: 'Atividades' },
    { label: 'Tecnologia', value: 'Tecnologia' },
    { label: 'Comercial', value: 'Comercial' },
    { label: 'Privado (Apenas Eu)', value: 'Privado' }
  ]

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('')
    setSuccess(false)
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      
      // Basic size limit: 15MB
      if (selectedFile.size > 15 * 1024 * 1024) {
        setErrorMsg('O ficheiro é demasiado grande. O limite máximo é de 15MB.')
        return
      }

      setFile(selectedFile)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccess(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.size > 15 * 1024 * 1024) {
        setErrorMsg('O ficheiro é demasiado grande. O limite máximo é de 15MB.')
        return
      }
      setFile(droppedFile)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setErrorMsg('Por favor, selecione um ficheiro primeiro.')
      return
    }

    setUploading(true)
    setErrorMsg('')
    try {
      await onUpload(file, department)
      setSuccess(true)
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      
      // Delay closing if onClose is provided to let the user see success message
      if (onClose) {
        setTimeout(() => {
          onClose()
        }, 1000)
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar o ficheiro.'
      setErrorMsg(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMsg && (
        <div className="flex items-center gap-2 text-xs font-medium text-red-500 border border-red-500/20 bg-red-500/5 p-3 rounded-md">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-500 border border-emerald-500/20 bg-emerald-500/5 p-3 rounded-md">
          <CheckCircle size={16} className="shrink-0" />
          <span>Ficheiro carregado com sucesso!</span>
        </div>
      )}

      {/* Drag & Drop Zone */}
      <div 
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`border border-dashed rounded-lg p-8 text-center bg-background/50 hover:border-brand-primary transition-all cursor-pointer flex flex-col items-center justify-center gap-3 group ${
          file ? 'border-brand-primary' : 'border-border-custom'
        }`}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
        />
        
        {file ? (
          <>
            <div className="h-10 w-10 rounded-full border border-border-custom bg-background flex items-center justify-center text-brand-primary">
              <File size={20} strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-text-primary max-w-xs truncate mx-auto">
                {file.name}
              </p>
              <p className="text-xs text-text-secondary">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setFile(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              className="text-xs text-red-500 hover:underline flex items-center justify-center gap-1 mt-1 cursor-pointer"
            >
              <X size={12} />
              Remover Ficheiro
            </button>
          </>
        ) : (
          <>
            <div className="h-10 w-10 rounded-full border border-border-custom bg-background flex items-center justify-center text-text-secondary group-hover:text-brand-primary transition-colors">
              <Upload size={20} strokeWidth={1.5} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-text-primary">
                Arrasta um ficheiro ou clica para selecionar
              </p>
              <p className="text-xs text-text-secondary">
                PDF, Imagens, Folhas de Cálculo, Documentos de Texto até 15MB
              </p>
            </div>
          </>
        )}
      </div>

      {/* Select Department */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="upload-dept" className="text-xs font-semibold text-text-primary">
          Associar ao Departamento
        </label>
        <select
          id="upload-dept"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="border border-border-custom bg-background text-text-primary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-none rounded-md px-3.5 py-2 text-sm w-full transition-colors cursor-pointer"
        >
          {departments.map((dept) => (
            <option key={dept.value} value={dept.value}>
              {dept.label}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="border border-border-custom text-text-primary bg-transparent hover:bg-background font-medium rounded-md px-4 py-2 text-sm transition-colors cursor-pointer"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={!file || uploading}
          className={`flex items-center justify-center gap-2 bg-brand-primary text-background font-medium rounded-md px-4 py-2 text-sm transition-all duration-200 ${
            file && !uploading 
              ? 'hover:opacity-90 cursor-pointer active:scale-[0.98]' 
              : 'opacity-50 cursor-not-allowed'
          }`}
        >
          {uploading ? (
            <>
              <span className="h-4 w-4 border-2 border-background border-t-transparent animate-spin rounded-full" />
              <span>A carregar...</span>
            </>
          ) : (
            <>
              <Upload size={14} />
              <span>Carregar Documento</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}
