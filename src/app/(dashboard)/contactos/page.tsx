'use client'

import React, { useState, useEffect } from 'react'
import { 
  UsersRound, 
  Plus, 
  Search, 
  Trash2, 
  Mail, 
  Phone, 
  Building,
  Loader2,
  X,
  PlusCircle,
  Copy,
  Check
} from 'lucide-react'
import { contactService, ContactEntity, Contact } from '@/services/contactService'

export default function ContactosPage() {
  const [entities, setEntities] = useState<ContactEntity[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedText, setCopiedText] = useState<string | null>(null)

  // Modals visibility
  const [isEntityModalOpen, setIsEntityModalOpen] = useState(false)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)

  // Hydration state
  const [mounted, setMounted] = useState(false)

  // Entity Modal Form States
  const [newEntityName, setNewEntityName] = useState('')
  const [newEntityDesc, setNewEntityDesc] = useState('')

  // Contact Modal Form States
  const [newContactName, setNewContactName] = useState('')
  const [newContactRole, setNewContactRole] = useState('')
  const [newContactEmail, setNewContactEmail] = useState('')
  const [newContactPhone, setNewContactPhone] = useState('')
  const [newContactNotes, setNewContactNotes] = useState('')

  // Custom Delete Confirmation State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    type: 'entity' | 'contact'
    id: string
    name: string
  } | null>(null)

  // Load initial data
  const loadData = async () => {
    setLoading(true)
    try {
      const entityData = await contactService.getEntities()
      setEntities(entityData)
      
      const contactData = await contactService.getContacts()
      setContacts(contactData)
      
      // Auto-select first entity if available
      if (entityData.length > 0) {
        setSelectedEntityId(entityData[0].id)
      }
    } catch (e) {
      console.error('Failed to load contacts data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setMounted(true)
      loadData()
    }, 0)
    return () => clearTimeout(timeoutId)
  }, [])

  // Create Entity
  const handleCreateEntity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEntityName.trim()) return

    try {
      const created = await contactService.createEntity(newEntityName, newEntityDesc)
      setEntities(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setSelectedEntityId(created.id)
      
      // Reset form
      setNewEntityName('')
      setNewEntityDesc('')
      setIsEntityModalOpen(false)
    } catch (e) {
      console.error('Failed to create entity:', e)
    }
  }

  // Delete Entity Action
  const executeDeleteEntity = async (id: string) => {
    try {
      await contactService.deleteEntity(id)
      setEntities(prev => prev.filter(e => e.id !== id))
      setContacts(prev => prev.filter(c => c.entity_id !== id))
      
      // If we deleted the active entity, clear selection or select another
      if (selectedEntityId === id) {
        const remaining = entities.filter(e => e.id !== id)
        setSelectedEntityId(remaining.length > 0 ? remaining[0].id : null)
      }
    } catch (e) {
      console.error('Failed to delete entity:', e)
    }
  }

  // Create Contact
  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEntityId || !newContactName.trim()) return

    try {
      const created = await contactService.createContact(
        selectedEntityId,
        newContactName,
        newContactRole,
        newContactEmail,
        newContactPhone,
        newContactNotes
      )
      setContacts(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      
      // Reset form
      setNewContactName('')
      setNewContactRole('')
      setNewContactEmail('')
      setNewContactPhone('')
      setNewContactNotes('')
      setIsContactModalOpen(false)
    } catch (e) {
      console.error('Failed to create contact:', e)
    }
  }

  // Delete Contact Action
  const executeDeleteContact = async (id: string) => {
    try {
      await contactService.deleteContact(id)
      setContacts(prev => prev.filter(c => c.id !== id))
    } catch (e) {
      console.error('Failed to delete contact:', e)
    }
  }

  // Copy to clipboard helper
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    setTimeout(() => {
      setCopiedText(null)
    }, 2000)
  }

  // Filters
  const filteredEntities = entities.filter(entity => 
    entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (entity.description && entity.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const selectedEntity = entities.find(e => e.id === selectedEntityId)
  const selectedEntityContacts = contacts.filter(c => c.entity_id === selectedEntityId)

  return (
    <div className="space-y-8 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Gestão de Contactos</h1>
          <p className="text-text-secondary text-sm mt-1">
            Base de dados de patrocinadores, parceiros, entidades institucionais e oradores.
          </p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsEntityModalOpen(true)}
            className="flex items-center gap-1.5 bg-brand-primary text-background font-semibold rounded-md px-4 py-2 text-xs transition-all hover:opacity-90 cursor-pointer active:scale-[0.98] shadow"
          >
            <Plus size={14} />
            <span>Nova Entidade</span>
          </button>
          
          {mounted ? (
            <button
              onClick={() => selectedEntityId && setIsContactModalOpen(true)}
              disabled={!selectedEntityId}
              className={`flex items-center gap-1.5 bg-brand-primary text-background font-semibold rounded-md px-4 py-2 text-xs transition-all shadow ${
                selectedEntityId 
                  ? 'hover:opacity-90 cursor-pointer active:scale-[0.98]' 
                  : 'opacity-50 cursor-not-allowed'
              }`}
              title={!selectedEntityId ? "Seleciona uma entidade primeiro" : ""}
            >
              <PlusCircle size={14} />
              <span>Novo Contacto</span>
            </button>
          ) : (
            <button
              disabled
              className="flex items-center gap-1.5 bg-brand-primary text-background font-semibold rounded-md px-4 py-2 text-xs opacity-50 cursor-not-allowed shadow"
              title="Seleciona uma entidade primeiro"
            >
              <PlusCircle size={14} />
              <span>Novo Contacto</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-24 border border-border-custom rounded-lg bg-secondary-bg/20">
          <Loader2 className="animate-spin text-text-secondary mb-3" size={28} strokeWidth={1.5} />
          <span className="text-xs text-text-secondary font-medium">A carregar contactos...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Pane: Entities list */}
          <div className="lg:col-span-1 border border-border-custom bg-secondary-bg rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-border-custom/50 pb-3">
              <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Entidades</h2>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-text-secondary" size={14} />
              <input
                type="text"
                placeholder="Pesquisar entidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background border border-border-custom rounded-md py-1.5 pl-9 pr-4 text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-brand-primary"
              />
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[450px] overflow-y-auto scrollbar-thin pr-1">
              {filteredEntities.length > 0 ? (
                filteredEntities.map(entity => {
                  const entityContactsCount = contacts.filter(c => c.entity_id === entity.id).length
                  const isActive = selectedEntityId === entity.id

                  return (
                    <div
                      key={entity.id}
                      onClick={() => setSelectedEntityId(entity.id)}
                      className={`group border p-3 rounded-lg text-left transition-all cursor-pointer relative ${
                        isActive 
                          ? 'border-brand-primary bg-brand-primary/5' 
                          : 'border-border-custom bg-background/50 hover:bg-background/80'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2 pr-6">
                        <div className="space-y-0.5">
                          <h3 className="text-xs font-semibold text-text-primary">{entity.name}</h3>
                          {entity.description && (
                            <p className="text-[10px] text-text-secondary line-clamp-1">{entity.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Contact counter badge */}
                      <div className="mt-2.5 flex items-center justify-between">
                        <span className="text-[9px] bg-secondary-bg text-text-secondary px-1.5 py-0.5 rounded font-medium border border-border-custom/50">
                          {entityContactsCount} {entityContactsCount === 1 ? 'contacto' : 'contactos'}
                        </span>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteConfirmation({
                              type: 'entity',
                              id: entity.id,
                              name: entity.name
                            })
                          }}
                          className="text-text-secondary hover:text-red-500 p-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                          title="Eliminar entidade"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8">
                  <span className="text-xs text-text-secondary italic">Nenhuma entidade encontrada</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Pane: Selected Entity Details & Contacts */}
          <div className="lg:col-span-2 space-y-4">
            {selectedEntity ? (
              <div className="border border-border-custom bg-secondary-bg rounded-lg p-5 space-y-6">
                
                {/* Header Pane */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-custom/50 pb-4">
                  <div className="space-y-1 text-left">
                    <div className="flex items-center gap-2">
                      <Building size={16} className="text-brand-primary" />
                      <h2 className="text-lg font-bold text-text-primary">{selectedEntity.name}</h2>
                    </div>
                    {selectedEntity.description && (
                      <p className="text-xs text-text-secondary leading-relaxed">{selectedEntity.description}</p>
                    )}
                  </div>
                </div>

                {/* Contacts List Grid */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider text-left">Contactos Internos</h3>

                  {selectedEntityContacts.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {selectedEntityContacts.map(contact => (
                        <div 
                          key={contact.id} 
                          className="border border-border-custom bg-background/40 p-4 rounded-lg space-y-3 relative group hover:border-brand-primary/60 transition-colors"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="text-left">
                              <h4 className="text-xs font-bold text-text-primary">{contact.name}</h4>
                              {contact.role && (
                                <span className="text-[9px] font-semibold text-brand-primary uppercase tracking-wider block mt-0.5">
                                  {contact.role}
                                </span>
                              )}
                            </div>

                            <button 
                              onClick={() => setDeleteConfirmation({
                                type: 'contact',
                                id: contact.id,
                                name: contact.name
                              })}
                              className="text-text-secondary hover:text-red-500 p-1 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                              title="Remover contacto"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          
                          {/* Info Rows */}
                          <div className="space-y-1.5 text-[11px] text-text-secondary text-left font-mono">
                            {contact.email && (
                              <div className="flex items-center gap-2 group/copy">
                                <Mail size={11} className="text-text-secondary/70 shrink-0" />
                                <a 
                                  href={`mailto:${contact.email}`} 
                                  className="hover:text-text-primary hover:underline truncate max-w-[170px]"
                                >
                                  {contact.email}
                                </a>
                                <button
                                  onClick={() => handleCopy(contact.email!)}
                                  className="opacity-0 group-hover/copy:opacity-100 text-text-secondary hover:text-text-primary cursor-pointer transition-opacity"
                                  title="Copiar email"
                                >
                                  {copiedText === contact.email ? <Check size={10} className="text-brand-success" /> : <Copy size={10} />}
                                </button>
                              </div>
                            )}

                            {contact.phone && (
                              <div className="flex items-center gap-2 group/copy">
                                <Phone size={11} className="text-text-secondary/70 shrink-0" />
                                <a 
                                  href={`tel:${contact.phone}`} 
                                  className="hover:text-text-primary"
                                >
                                  {contact.phone}
                                </a>
                                <button
                                  onClick={() => handleCopy(contact.phone!)}
                                  className="opacity-0 group-hover/copy:opacity-100 text-text-secondary hover:text-text-primary cursor-pointer transition-opacity"
                                  title="Copiar telefone"
                                >
                                  {copiedText === contact.phone ? <Check size={10} className="text-brand-success" /> : <Copy size={10} />}
                                </button>
                              </div>
                            )}
                          </div>
                          
                          {/* Notes */}
                          {contact.notes && (
                            <div className="pt-2 border-t border-border-custom/40 text-[10px] text-text-secondary leading-relaxed bg-secondary-bg/20 p-2 rounded text-left">
                              {contact.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-12 bg-background/20 rounded-lg text-center border border-dashed border-border-custom">
                      <UsersRound size={24} className="text-text-secondary/50 mb-2" />
                      <span className="text-xs text-text-secondary italic">Esta entidade ainda não tem contactos.</span>
                      <p className="text-[10px] text-text-secondary/70 max-w-xs mt-1">
                        Clica no botão &quot;Adicionar Contacto&quot; acima para registar colaboradores.
                      </p>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="border border-border-custom bg-secondary-bg rounded-lg p-16 text-center flex flex-col items-center justify-center space-y-3">
                <UsersRound size={48} className="text-text-secondary opacity-30" />
                <h2 className="text-sm font-semibold text-text-primary">Nenhuma entidade selecionada</h2>
                <p className="text-xs text-text-secondary max-w-sm leading-relaxed">
                  Cria uma nova entidade corporativa ou seleciona uma organização existente na barra lateral para gerir os seus contactos internos.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ADD ENTITY */}
      {isEntityModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-secondary-bg border border-border-custom w-full max-w-md rounded-lg shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-custom/50">
              <h3 className="text-sm font-semibold text-text-primary">Adicionar Nova Entidade</h3>
              <button
                onClick={() => setIsEntityModalOpen(false)}
                className="text-text-secondary hover:text-text-primary cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleCreateEntity} className="p-5 space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Nome da Entidade *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Google Portugal, NEEI, Red Bull..."
                  value={newEntityName}
                  onChange={(e) => setNewEntityName(e.target.value)}
                  className="w-full bg-background border border-border-custom rounded-md px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Descrição / Setor</label>
                <textarea
                  placeholder="Ex: Patrocinador principal, agência de publicidade, orador convidado..."
                  value={newEntityDesc}
                  onChange={(e) => setNewEntityDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-background border border-border-custom rounded-md px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEntityModalOpen(false)}
                  className="px-4 py-2 border border-border-custom rounded-md text-xs font-medium text-text-primary hover:bg-background/80 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-primary text-background font-semibold rounded-md text-xs hover:opacity-90 transition-all cursor-pointer"
                >
                  Guardar Entidade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD CONTACT */}
      {isContactModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-secondary-bg border border-border-custom w-full max-w-md rounded-lg shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-custom/50">
              <h3 className="text-sm font-semibold text-text-primary">
                Novo Contacto - {selectedEntity?.name}
              </h3>
              <button
                onClick={() => setIsContactModalOpen(false)}
                className="text-text-secondary hover:text-text-primary cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleCreateContact} className="p-5 space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Maria Silva"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="w-full bg-background border border-border-custom rounded-md px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Cargo / Função</label>
                <input
                  type="text"
                  placeholder="Ex: Gestora de Contas, Diretor Técnico"
                  value={newContactRole}
                  onChange={(e) => setNewContactRole(e.target.value)}
                  className="w-full bg-background border border-border-custom rounded-md px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary">Email</label>
                  <input
                    type="email"
                    placeholder="exemplo@empresa.com"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    className="w-full bg-background border border-border-custom rounded-md px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-secondary">Telefone</label>
                  <input
                    type="text"
                    placeholder="912345678"
                    value={newContactPhone}
                    onChange={(e) => setNewContactPhone(e.target.value)}
                    className="w-full bg-background border border-border-custom rounded-md px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-secondary">Notas / Observações</label>
                <textarea
                  placeholder="Ex: Ponto de contacto principal para patrocínio ou logística..."
                  value={newContactNotes}
                  onChange={(e) => setNewContactNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-background border border-border-custom rounded-md px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="px-4 py-2 border border-border-custom rounded-md text-xs font-medium text-text-primary hover:bg-background/80 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-primary text-background font-semibold rounded-md text-xs hover:opacity-90 transition-all cursor-pointer"
                >
                  Guardar Contacto
                </button>
              </div>
            </form>
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
                  {deleteConfirmation.type === 'entity' ? 'Eliminar Entidade' : 'Remover Contacto'}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {deleteConfirmation.type === 'entity' ? (
                    <>
                      Tens a certeza que queres eliminar a entidade <strong className="text-text-primary">&quot;{deleteConfirmation.name}&quot;</strong> e todos os seus contactos associados? Esta ação é permanente.
                    </>
                  ) : (
                    <>
                      Tens a certeza que desejas remover o contacto <strong className="text-text-primary">&quot;{deleteConfirmation.name}&quot;</strong>? Esta ação não pode ser desfeita.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirmation(null)}
                className="flex-1 border border-border-custom px-4 py-2 rounded-md hover:bg-background text-xs font-semibold text-text-secondary transition-colors cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const { type, id } = deleteConfirmation
                  setDeleteConfirmation(null)
                  if (type === 'entity') {
                    await executeDeleteEntity(id)
                  } else {
                    await executeDeleteContact(id)
                  }
                }}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-md px-4 py-2 text-xs transition-all shadow cursor-pointer active:scale-[0.98] text-center"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
