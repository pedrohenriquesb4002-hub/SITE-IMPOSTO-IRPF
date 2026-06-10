import { useState, useEffect } from 'react'
import { Plus, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { api, type Collaborator } from '../../lib/store'
import ConfirmModal from './ConfirmModal'

export default function ColaboradoresPage() {
  const [colaboradores, setColaboradores] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [nome, setNome] = useState('')

  // Modal de confirmação
  const [modalOpen, setModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deletingName, setDeletingName] = useState('')

  useEffect(() => {
    api.collaborators.list()
      .then(setColaboradores)
      .catch(() => toast.error('Erro ao carregar colaboradores'))
      .finally(() => setLoading(false))
  }, [])

  const handleAdd = async () => {
    if (!nome.trim()) { toast.error('Digite o nome'); return }
    try {
      const created = await api.collaborators.add(nome.trim())
      setColaboradores((p) => [...p, created])
      setNome('')
      toast.success('Colaborador adicionado')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro')
    }
  }

  const askDelete = (id: number, name: string) => {
    setDeletingId(id)
    setDeletingName(name)
    setModalOpen(true)
  }

  const confirmDelete = async () => {
    if (deletingId === null) return
    setModalOpen(false)
    try {
      await api.collaborators.remove(deletingId)
      setColaboradores((p) => p.filter((c) => c.id !== deletingId))
      toast.success('Colaborador removido')
    } catch {
      toast.error('Erro ao remover')
    } finally {
      setDeletingId(null)
      setDeletingName('')
    }
  }

  const total = colaboradores.length

  return (
    <div className="p-8 bg-gradient-to-br from-background via-muted/20 to-background min-h-screen">

      <ConfirmModal
        open={modalOpen}
        variant="danger"
        title="Excluir colaborador"
        message={`Tem certeza que deseja excluir "${deletingName}"? Esta ação não pode ser desfeita. As declarações associadas a este colaborador não serão removidas.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => { setModalOpen(false); setDeletingId(null) }}
      />

      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Colaboradores</h2>
          <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
            Gerenciamento de colaboradores do sistema
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-primary to-primary/90 rounded-2xl p-6 shadow-xl shadow-primary/20">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-white/90 uppercase tracking-wide">Total</p>
              <Users className="w-8 h-8 text-white/60" />
            </div>
            <p className="text-4xl font-bold text-white">{total}</p>
            <p className="text-xs text-white/70 mt-2">Ativos no sistema</p>
          </div>
          <div className="bg-gradient-to-br from-accent to-accent/90 rounded-2xl p-6 shadow-xl shadow-accent/20 col-span-2">
            <p className="text-sm font-bold text-white/90 uppercase tracking-wide mb-3">Colaboradores</p>
            <div className="flex flex-wrap gap-2">
              {colaboradores.map((c) => (
                <span key={c.id} className="px-3 py-1 bg-white/20 text-white rounded-full text-xs font-medium">{c.name}</span>
              ))}
              {colaboradores.length === 0 && <span className="text-white/60 text-sm">Nenhum colaborador cadastrado</span>}
            </div>
          </div>
        </div>

        {/* Add Form */}
        <div className="bg-card border-2 border-border rounded-2xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-card-foreground">Novo Colaborador</h3>
          </div>
          <div className="flex gap-4">
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Nome do colaborador"
              className="flex-1 px-3 py-2 text-sm bg-input-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground" />
            <button onClick={handleAdd}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20 font-semibold flex items-center gap-2 whitespace-nowrap">
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          </div>
        </div>

        {/* List */}
        <div className="bg-card border-2 border-border rounded-2xl overflow-hidden shadow-xl">
          <div className="bg-muted px-6 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Lista de Colaboradores</h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <svg className="animate-spin w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Carregando...
            </div>
          ) : colaboradores.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Users className="w-12 h-12 mb-3 opacity-30" />
              <p>Nenhum colaborador cadastrado</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {colaboradores.map((c, i) => (
                <li key={c.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0 overflow-hidden">
                      {c.photo
                        ? <img src={c.photo} alt={c.name} className="w-full h-full object-cover" />
                        : <span>{i + 1}</span>}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.createdAt ? `Cadastrado em ${new Date(c.createdAt).toLocaleDateString('pt-BR')}` : 'Colaborador ativo'}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => askDelete(c.id, c.name)}
                    className="p-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}