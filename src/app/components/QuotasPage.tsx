import { useState, useEffect } from 'react'
import { Plus, Trash2, Check, ChevronUp, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { api, type Quota } from '../../lib/store'
import ConfirmModal from './ConfirmModal'

const MEIO_ENVIO_OPTIONS = ['WhatsApp', 'Email', 'SMS', 'Presencial', 'Outro']

export default function QuotasPage() {
  const [quotas, setQuotas] = useState<Quota[]>([])
  const [loading, setLoading] = useState(true)
  const [colaboradores, setColaboradores] = useState<string[]>([])
  const [formData, setFormData] = useState({
    colaborador: '',
    cliente: '',
    quantidadeCotas: '',
    meioEnvio: 'WhatsApp',
    categoria: 'IRPF' as 'IRPF' | 'ITR',
  })

  // Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingQuotaId, setDeletingQuotaId] = useState<number | null>(null)
  const [deletingQuotaCliente, setDeletingQuotaCliente] = useState('')

  useEffect(() => {
    Promise.all([api.quotas.list(), api.collaborators.list()])
      .then(([q, c]) => { setQuotas(q); setColaboradores(c.map(x => x.name)) })
      .catch(() => toast.error('Erro ao carregar quotas'))
      .finally(() => setLoading(false))
  }, [])

  const handleAdd = async () => {
    if (!formData.colaborador || !formData.cliente || !formData.quantidadeCotas) {
      toast.error('Preencha todos os campos'); return
    }
    try {
      const created = await api.quotas.create({
        collaborator: formData.colaborador,
        cliente: formData.cliente,
        quantidadeCotas: parseInt(formData.quantidadeCotas),
        cotasEnviadas: 0,
        meioEnvio: formData.meioEnvio,
        categoria: formData.categoria,
      })
      setQuotas(p => [...p, created])
      setFormData({ colaborador: '', cliente: '', quantidadeCotas: '', meioEnvio: 'WhatsApp', categoria: formData.categoria })
      toast.success('Quota adicionada')
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro') }
  }

  const askDelete = (id: number, cliente: string) => {
    setDeletingQuotaId(id)
    setDeletingQuotaCliente(cliente)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (deletingQuotaId === null) return
    setDeleteModalOpen(false)
    try {
      await api.quotas.delete(deletingQuotaId)
      setQuotas(p => p.filter(q => q.id !== deletingQuotaId))
      toast.success('Quota excluída')
    } catch { toast.error('Erro ao excluir') }
    finally { setDeletingQuotaId(null); setDeletingQuotaCliente('') }
  }

  const handleIncrement = async (quota: Quota) => {
    if (quota.cotasEnviadas >= quota.quantidadeCotas) return
    try {
      const updated = await api.quotas.update(quota.id, { cotasEnviadas: quota.cotasEnviadas + 1 })
      setQuotas(p => p.map(q => q.id === quota.id ? updated : q))
    } catch { toast.error('Erro') }
  }

  const handleDecrement = async (quota: Quota) => {
    if (quota.cotasEnviadas <= 0) return
    try {
      const updated = await api.quotas.update(quota.id, { cotasEnviadas: quota.cotasEnviadas - 1 })
      setQuotas(p => p.map(q => q.id === quota.id ? updated : q))
    } catch { toast.error('Erro') }
  }

  const progressColor = (enviadas: number, total: number) => {
    const pct = (enviadas / total) * 100
    if (pct === 100) return 'bg-success'
    if (pct >= 70) return 'bg-chart-2'
    if (pct >= 40) return 'bg-warning'
    return 'bg-chart-1'
  }

  const totalQuotas = quotas.reduce((s, q) => s + q.quantidadeCotas, 0)
  const totalEnviadas = quotas.reduce((s, q) => s + q.cotasEnviadas, 0)
  const totalConcluidas = quotas.filter(q => q.cotasEnviadas >= q.quantidadeCotas).length

  return (
    <div className="p-8 bg-gradient-to-br from-background via-muted/20 to-background min-h-screen">

      <ConfirmModal
        open={deleteModalOpen}
        variant="danger"
        title="Excluir quota"
        message={`Tem certeza que deseja excluir a quota de "${deletingQuotaCliente}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteModalOpen(false); setDeletingQuotaId(null) }}
      />

      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Quotas de Impostos</h2>
          <p className="text-muted-foreground mt-1">Gerenciamento de quotas dos clientes</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 text-primary-foreground shadow-xl shadow-primary/20">
            <p className="text-sm font-bold uppercase tracking-wide opacity-80">Total de Cotas</p>
            <p className="text-4xl font-bold mt-1">{totalQuotas}</p>
            <p className="text-xs opacity-70 mt-2">{totalEnviadas} enviadas</p>
          </div>
          <div className="bg-gradient-to-br from-accent to-accent/80 rounded-2xl p-6 text-accent-foreground shadow-xl shadow-accent/20">
            <p className="text-sm font-bold uppercase tracking-wide opacity-80">Em Andamento</p>
            <p className="text-4xl font-bold mt-1">{quotas.length - totalConcluidas}</p>
            <p className="text-xs opacity-70 mt-2">clientes com pendências</p>
          </div>
          <div className="bg-gradient-to-br from-success to-success/80 rounded-2xl p-6 text-success-foreground shadow-xl shadow-success/20">
            <p className="text-sm font-bold uppercase tracking-wide opacity-80">Concluídos</p>
            <p className="text-4xl font-bold mt-1">{totalConcluidas}</p>
            <p className="text-xs opacity-70 mt-2">100% enviadas</p>
          </div>
        </div>

        {/* Add Form */}
        <div className="bg-card border-2 border-border rounded-2xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-card-foreground">Nova Quota</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Categoria</label>
              <div className="flex rounded-md border border-input overflow-hidden">
                <button type="button" onClick={() => setFormData({ ...formData, categoria: 'IRPF' })}
                  className={`flex-1 px-3 py-2 text-sm font-semibold transition-colors ${formData.categoria === 'IRPF' ? 'bg-primary text-primary-foreground' : 'bg-input-background text-muted-foreground hover:bg-muted'}`}>
                  IRPF
                </button>
                <button type="button" onClick={() => setFormData({ ...formData, categoria: 'ITR' })}
                  className={`flex-1 px-3 py-2 text-sm font-semibold transition-colors ${formData.categoria === 'ITR' ? 'bg-accent text-accent-foreground' : 'bg-input-background text-muted-foreground hover:bg-muted'}`}>
                  ITR
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Colaborador</label>
              <select value={formData.colaborador}
                onChange={(e) => setFormData({ ...formData, colaborador: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-input-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground">
                <option value="">Selecione...</option>
                {colaboradores.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Cliente</label>
              <input type="text" value={formData.cliente}
                onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-input-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                placeholder="Nome do cliente" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Qtd. Cotas</label>
              <input type="number" value={formData.quantidadeCotas}
                onChange={(e) => setFormData({ ...formData, quantidadeCotas: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-input-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                placeholder="12" min="1" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Meio de Envio</label>
              <select value={formData.meioEnvio}
                onChange={(e) => setFormData({ ...formData, meioEnvio: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-input-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground">
                {MEIO_ENVIO_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <button onClick={handleAdd}
            className="mt-6 px-8 py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20 font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <svg className="animate-spin w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Carregando...
          </div>
        ) : quotas.length === 0 ? (
          <div className="bg-card border-2 border-border rounded-2xl p-12 text-center shadow-xl">
            <p className="text-muted-foreground">Nenhuma quota cadastrada</p>
          </div>
        ) : (
          <div className="space-y-10">
            <QuotaSection
              titulo="Quotas IRPF"
              corTema="primary"
              quotas={quotas.filter(q => (q.categoria || 'IRPF') === 'IRPF')}
              onDelete={askDelete}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              progressColor={progressColor}
            />
            <QuotaSection
              titulo="Quotas ITR"
              corTema="accent"
              quotas={quotas.filter(q => q.categoria === 'ITR')}
              onDelete={askDelete}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              progressColor={progressColor}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function QuotaSection({
  titulo, corTema, quotas, onDelete, onIncrement, onDecrement, progressColor,
}: {
  titulo: string
  corTema: 'primary' | 'accent'
  quotas: Quota[]
  onDelete: (id: number, cliente: string) => void
  onIncrement: (q: Quota) => void
  onDecrement: (q: Quota) => void
  progressColor: (enviadas: number, total: number) => string
}) {
  const dotClass = corTema === 'primary' ? 'bg-primary' : 'bg-accent'
  const textClass = corTema === 'primary' ? 'text-primary' : 'text-accent'
  const btnClass = corTema === 'primary'
    ? 'bg-primary text-primary-foreground shadow-primary/20'
    : 'bg-accent text-accent-foreground shadow-accent/20'

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className={`w-2.5 h-2.5 rounded-full ${dotClass}`} />
        <h3 className="text-xl font-bold text-foreground">{titulo}</h3>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted ${textClass}`}>
          {quotas.length} {quotas.length === 1 ? 'cliente' : 'clientes'}
        </span>
      </div>

      {quotas.length === 0 ? (
        <div className="bg-card border-2 border-border rounded-2xl p-8 text-center shadow-xl">
          <p className="text-muted-foreground text-sm">Nenhuma quota {titulo.split(' ')[1]} cadastrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quotas.map(q => {
            const pct = Math.round((q.cotasEnviadas / q.quantidadeCotas) * 100)
            const done = q.cotasEnviadas >= q.quantidadeCotas
            return (
              <div key={q.id} className={`bg-card border-2 rounded-2xl p-6 shadow-xl transition-all ${done ? 'border-success/50' : 'border-border'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-foreground text-lg">{q.cliente}</p>
                      {done && <Check className="w-5 h-5 text-success" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{q.collaborator} • {q.meioEnvio}</p>
                  </div>
                  <button onClick={() => onDelete(q.id, q.cliente)}
                    className="p-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className={`font-bold ${done ? 'text-success' : 'text-foreground'}`}>{pct}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full transition-all ${progressColor(q.cotasEnviadas, q.quantidadeCotas)}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs mt-1.5 text-muted-foreground">
                    <span>{q.cotasEnviadas} enviadas</span>
                    <span>{q.quantidadeCotas} total</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={() => onDecrement(q)} disabled={q.cotasEnviadas === 0}
                    className="w-10 h-10 rounded-xl border-2 border-border flex items-center justify-center hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-bold text-foreground">{q.cotasEnviadas}</span>
                    <span className="text-muted-foreground text-sm"> / {q.quantidadeCotas}</span>
                  </div>
                  <button onClick={() => onIncrement(q)} disabled={done}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg ${btnClass}`}>
                    <ChevronUp className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}