import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Search, Edit, ChevronLeft, ChevronRight, Save, X } from 'lucide-react'
import { toast } from 'sonner'
import { api, type Declaration, type Collaborator } from '../../lib/store'
import { formatCPF } from '../../lib/utils'
import ConfirmModal from './ConfirmModal'
import DatePicker from './DatePicker'

const ITR_MONTHS = ['Agosto', 'Setembro']

export default function ITRPage({ month }: { month: string }) {
  const [declaracoes, setDeclaracoes] = useState<Declaration[]>([])
  const [loading, setLoading] = useState(true)
  const [colaboradores, setColaboradores] = useState<Collaborator[]>([])
  const [formData, setFormData] = useState({
    colaborador: '', cliente: '', cpf: '', valor: '',
    tipo: 'Sócio' as 'Sócio' | 'Diversos',
    status: 'AGUARDANDO' as 'PAGO' | 'AGUARDANDO' | 'DOAÇÃO',
    paymentDate: '',  // DD/MM/AAAA
  })
  const [filterColaborador, setFilterColaborador] = useState('')
  const [filterCliente, setFilterCliente] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editFormData, setEditFormData] = useState<Declaration | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 25

  // Modais
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deletingCliente, setDeletingCliente] = useState('')
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [decls, collabs] = await Promise.all([
        api.itr.list(month),
        api.collaborators.list(),
      ])
      setDeclaracoes(decls)
      setColaboradores(collabs)
    } catch {
      toast.error('Erro ao carregar dados ITR')
    } finally { setLoading(false) }
  }, [month])

  useEffect(() => { load() }, [load])
  useEffect(() => { setCurrentPage(1); setFormData(f => ({ ...f, paymentDate: '' })) }, [month])


  const dateToPaymentMonth = (dateStr: string): string => {
    const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                    'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
    const parts = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (!parts) return month
    const m = parseInt(parts[2]) - 1
    return months[m] ?? month
  }

  const getColabPhoto = (name: string) =>
    colaboradores.find(c => c.name === name)?.photo || null

  const handleAdd = async () => {
    if (!formData.colaborador || !formData.cliente || !formData.cpf || !formData.valor) {
      toast.error('Preencha todos os campos'); return
    }
    try {
      const created = await api.itr.create({
        month,
        collaborator: formData.colaborador,
        cpfCliente: formData.cpf,
        cliente: formData.cliente,
        valorRecebido: Math.round(parseFloat(formData.valor) * 100),
        clienteType: formData.tipo,
        statusPagamento: formData.status,
        paymentMonth: formData.status === 'PAGO' && formData.paymentDate ? dateToPaymentMonth(formData.paymentDate) : null,
      })
      setDeclaracoes(prev => [...prev, created])
      setFormData({ colaborador: '', cliente: '', cpf: '', valor: '', tipo: 'Sócio', status: 'AGUARDANDO', paymentDate: '' })
      toast.success('Declaração ITR adicionada')
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Erro') }
  }

  const askDelete = (id: number, cliente: string) => {
    setDeletingId(id); setDeletingCliente(cliente); setDeleteModalOpen(true)
  }
  const confirmDelete = async () => {
    if (deletingId === null) return
    setDeleteModalOpen(false)
    try {
      await api.itr.delete(deletingId)
      setDeclaracoes(prev => prev.filter(d => d.id !== deletingId))
      toast.success('Declaração removida')
    } catch { toast.error('Erro ao deletar') }
    finally { setDeletingId(null); setDeletingCliente('') }
  }
  const confirmDeleteAll = async () => {
    setDeleteAllModalOpen(false)
    try {
      await api.itr.deleteAll(month)
      setDeclaracoes([])
      toast.success('Todas as declarações removidas')
    } catch { toast.error('Erro ao deletar todas') }
  }

  const handleEdit = (d: Declaration) => { setEditingId(d.id); setEditFormData({ ...d }) }
  const handleCancelEdit = () => { setEditingId(null); setEditFormData(null) }
  const handleSaveEdit = async () => {
    if (!editFormData || editingId === null) return
    try {
      const updated = await api.itr.update(editingId, {
        collaborator: editFormData.collaborator,
        cpfCliente: editFormData.cpfCliente,
        cliente: editFormData.cliente,
        valorRecebido: editFormData.valorRecebido,
        clienteType: editFormData.clienteType,
        statusPagamento: editFormData.statusPagamento,
        paymentMonth: editFormData.statusPagamento === 'PAGO' ? (editFormData.paymentMonth || month) : null,
        paymentDate: editFormData.paymentDate,
      })
      setDeclaracoes(prev => prev.map(d => d.id === editingId ? updated : d))
      setEditingId(null); setEditFormData(null)
      toast.success('Atualizado')
    } catch { toast.error('Erro ao salvar') }
  }

  const filtered = declaracoes.filter(d =>
    (!filterColaborador || d.collaborator.toLowerCase().includes(filterColaborador.toLowerCase())) &&
    (!filterCliente || d.cliente.toLowerCase().includes(filterCliente.toLowerCase()))
  )
  const totalPages = Math.ceil(filtered.length / itemsPerPage)
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const totalRecebido = filtered.reduce((s, d) => s + (d.valorRecebido || 0), 0) / 100
  const totalComissao = filtered.filter(d => d.statusPagamento === 'PAGO').reduce((s, d) => s + (d.comissao || 0), 0) / 100

  const statusColor = (s: string) => {
    if (s === 'PAGO') return 'bg-success/10 text-success border-success/20'
    if (s === 'AGUARDANDO') return 'bg-warning/10 text-warning border-warning/20'
    return 'bg-primary/10 text-primary border-primary/20'
  }
  const statusLabel = (s: string) => ({ PAGO: 'Pago', AGUARDANDO: 'Aguardando', 'DOAÇÃO': 'Doação' }[s] || s)

  const Avatar = ({ name, photo }: { name: string; photo: string | null }) => (
    <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden ring-2 ring-border flex items-center justify-center bg-gradient-to-br from-accent/30 to-accent/10">
      {photo
        ? <img src={photo} alt={name} className="w-full h-full object-cover" />
        : <span className="text-xs font-bold text-accent">{name.charAt(0).toUpperCase()}</span>}
    </div>
  )

  return (
    <div className="p-8 bg-gradient-to-br from-background via-muted/20 to-background min-h-screen">

      <ConfirmModal
        open={deleteModalOpen}
        variant="danger"
        title="Excluir declaração ITR"
        message={`Tem certeza que deseja excluir a declaração de "${deletingCliente}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        onConfirm={confirmDelete}
        onCancel={() => { setDeleteModalOpen(false); setDeletingId(null) }}
      />
      <ConfirmModal
        open={deleteAllModalOpen}
        variant="danger"
        title={`Excluir todas de ${month}`}
        message={`Tem certeza que deseja excluir TODAS as declarações ITR de ${month}? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir todas"
        cancelLabel="Cancelar"
        onConfirm={confirmDeleteAll}
        onCancel={() => setDeleteAllModalOpen(false)}
      />

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground tracking-tight">ITR — {month}</h2>
            <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-accent rounded-full animate-pulse"></span>
              Lançamento de Declarações ITR
            </p>
          </div>
          <button onClick={() => setDeleteAllModalOpen(true)}
            className="px-5 py-2.5 bg-destructive text-destructive-foreground rounded-xl hover:shadow-lg hover:shadow-destructive/30 transition-all text-sm font-semibold flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Excluir Todas
          </button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 text-primary-foreground shadow-xl shadow-primary/20">
            <p className="text-xs font-bold uppercase tracking-wide opacity-80">Declarações ITR</p>
            <p className="text-3xl font-bold mt-1">{filtered.length}</p>
          </div>
          <div className="bg-gradient-to-br from-accent to-accent/80 rounded-2xl p-5 text-accent-foreground shadow-xl shadow-accent/20">
            <p className="text-xs font-bold uppercase tracking-wide opacity-80">Total Recebido</p>
            <p className="text-3xl font-bold mt-1">R$ {totalRecebido.toFixed(2)}</p>
          </div>
          <div className="bg-gradient-to-br from-success to-success/80 rounded-2xl p-5 text-success-foreground shadow-xl shadow-success/20">
            <p className="text-xs font-bold uppercase tracking-wide opacity-80">Comissões (Pago)</p>
            <p className="text-3xl font-bold mt-1">R$ {totalComissao.toFixed(2)}</p>
          </div>
        </div>

        {/* Add Form */}
        <div className="bg-card border-2 border-border rounded-2xl p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-xl font-bold text-card-foreground">Nova Declaração ITR</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Colaborador</label>
              <select value={formData.colaborador}
                onChange={(e) => setFormData({ ...formData, colaborador: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-input-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground">
                <option value="">Selecione...</option>
                {colaboradores.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Nome do Cliente</label>
              <input type="text" value={formData.cliente}
                onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-input-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                placeholder="Nome do cliente" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">CPF</label>
              <input type="text" value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: formatCPF(e.target.value) })}
                className="w-full px-3 py-2 text-sm bg-input-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                placeholder="000.000.000-00" maxLength={14} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Valor (R$)</label>
              <input type="number" value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-input-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                placeholder="0,00" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Tipo</label>
              <select value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as 'Sócio' | 'Diversos' })}
                className="w-full px-3 py-2 text-sm bg-input-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground">
                <option value="Sócio">Sócio</option>
                <option value="Diversos">Diversos</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-2">Status</label>
              <select value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'PAGO' | 'AGUARDANDO' | 'DOAÇÃO' })}
                className="w-full px-3 py-2 text-sm bg-input-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground">
                <option value="AGUARDANDO">Aguardando</option>
                <option value="PAGO">Pago</option>
                <option value="DOAÇÃO">Doação</option>
              </select>
            </div>
            {formData.status === 'PAGO' && (
              <div>
                <DatePicker
                  label="Data do Pagamento (comissão entra neste mês)"
                  value={formData.paymentDate}
                  onChange={(v) => setFormData({ ...formData, paymentDate: v })}
                  placeholder="DD/MM/AAAA"
                />
              </div>
            )}
          </div>
          <button onClick={handleAdd}
            className="mt-6 px-8 py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20 font-semibold flex items-center gap-2">
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" value={filterColaborador} onChange={(e) => setFilterColaborador(e.target.value)}
              placeholder="Filtrar colaborador..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-input-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-foreground" />
          </div>
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" value={filterCliente} onChange={(e) => setFilterCliente(e.target.value)}
              placeholder="Filtrar cliente..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-input-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-foreground" />
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border-2 border-border rounded-2xl overflow-hidden shadow-xl">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <svg className="animate-spin w-6 h-6 mr-2" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Carregando...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted border-b border-border sticky top-0 z-10">
                    <tr>
                      {['Colaborador', 'Cliente', 'CPF', 'Valor', 'Tipo', 'Status', 'Mês Pgto', 'Comissão', 'Ações'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginated.length === 0 ? (
                      <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">Nenhuma declaração ITR encontrada</td></tr>
                    ) : paginated.map(d => (
                      <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                        {editingId === d.id && editFormData ? (
                          <>
                            <td className="px-4 py-2">
                              <select value={editFormData.collaborator}
                                onChange={(e) => setEditFormData({ ...editFormData, collaborator: e.target.value })}
                                className="w-full px-2 py-1 text-xs bg-input-background border border-input rounded text-foreground">
                                {colaboradores.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <input value={editFormData.cliente}
                                onChange={(e) => setEditFormData({ ...editFormData, cliente: e.target.value })}
                                className="w-full px-2 py-1 text-xs bg-input-background border border-input rounded text-foreground" />
                            </td>
                            <td className="px-4 py-2">
                              <input value={editFormData.cpfCliente || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, cpfCliente: formatCPF(e.target.value) })}
                                className="w-full px-2 py-1 text-xs bg-input-background border border-input rounded text-foreground" maxLength={14} />
                            </td>
                            <td className="px-4 py-2">
                              <input type="number" value={editFormData.valorRecebido / 100}
                                onChange={(e) => setEditFormData({ ...editFormData, valorRecebido: Math.round(parseFloat(e.target.value) * 100) })}
                                className="w-24 px-2 py-1 text-xs bg-input-background border border-input rounded text-foreground" />
                            </td>
                            <td className="px-4 py-2">
                              <select value={editFormData.clienteType}
                                onChange={(e) => setEditFormData({ ...editFormData, clienteType: e.target.value as 'Sócio' | 'Diversos' })}
                                className="w-full px-2 py-1 text-xs bg-input-background border border-input rounded text-foreground">
                                <option value="Sócio">Sócio</option>
                                <option value="Diversos">Diversos</option>
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <select value={editFormData.statusPagamento}
                                onChange={(e) => setEditFormData({ ...editFormData, statusPagamento: e.target.value as 'PAGO' | 'AGUARDANDO' | 'DOAÇÃO' })}
                                className="w-full px-2 py-1 text-xs bg-input-background border border-input rounded text-foreground">
                                <option value="AGUARDANDO">Aguardando</option>
                                <option value="PAGO">Pago</option>
                                <option value="DOAÇÃO">Doação</option>
                              </select>
                            </td>
                            <td className="px-4 py-2 min-w-[200px]">
                              {editFormData.statusPagamento === 'PAGO' && (
                                <DatePicker
                                  value={editFormData.paymentDate || null}
                                  onChange={(v) => setEditFormData({
                                    ...editFormData,
                                    paymentDate: v,
                                    paymentMonth: v ? dateToPaymentMonth(v) : (editFormData.paymentMonth || month)
                                  })}
                                  placeholder="DD/MM/AAAA"
                                />
                              )}
                            </td>
                            <td className="px-4 py-2 text-muted-foreground text-xs">—</td>
                            <td className="px-4 py-2">
                              <div className="flex gap-1">
                                <button onClick={handleSaveEdit} className="p-1.5 bg-success/10 text-success rounded hover:bg-success/20"><Save className="w-3.5 h-3.5" /></button>
                                <button onClick={handleCancelEdit} className="p-1.5 bg-muted text-muted-foreground rounded hover:bg-muted/80"><X className="w-3.5 h-3.5" /></button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Avatar name={d.collaborator} photo={getColabPhoto(d.collaborator)} />
                                <span className="font-medium text-foreground whitespace-nowrap">{d.collaborator}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-foreground">{d.cliente}</td>
                            <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{d.cpfCliente}</td>
                            <td className="px-4 py-3 text-foreground font-medium">R$ {((d.valorRecebido || 0) / 100).toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-full text-xs border bg-muted text-muted-foreground">{d.clienteType}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColor(d.statusPagamento)}`}>{statusLabel(d.statusPagamento)}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {d.statusPagamento === 'PAGO'
                                ? <span className={d.paymentMonth && d.paymentMonth !== d.month ? 'text-accent font-medium' : ''}>
                                    {(d as any).paymentDate || d.paymentMonth || d.month}
                                  </span>
                                : '—'}
                            </td>
                            <td className="px-4 py-3 text-success font-medium">R$ {((d.comissao || 0) / 100).toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-1">
                                <button onClick={() => handleEdit(d)} className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                                <button onClick={() => askDelete(d.id, d.cliente)} className="p-1.5 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
              <p className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} de {filtered.length}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-2 text-sm font-medium">{currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}