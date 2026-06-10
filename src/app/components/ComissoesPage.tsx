import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../lib/store'

interface ColCommission {
  collaborator: string
  months: Record<string, { vendas: number; recebido: number; comissao: number; aguardando?: number }>
}

type SortField = 'name' | 'comissao' | null
type SortDir = 'asc' | 'desc'

export default function ComissoesPage() {
  const [activeTab, setActiveTab] = useState<'irpf' | 'itr'>('irpf')
  const [irpfData, setIrpfData] = useState<ColCommission[]>([])
  const [itrData, setItrData] = useState<ColCommission[]>([])
  const [loading, setLoading] = useState(true)
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [irpf, itr] = await Promise.all([api.commissions.all(), api.commissions.itr()])
        setIrpfData(irpf)
        setItrData(itr)
      } catch { toast.error('Erro ao carregar comissões') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const irpfMonths = ['Março', 'Abril', 'Maio']
  const itrMonths = ['Agosto', 'Setembro']

  const calcTotal = (data: ColCommission[], months: string[]) =>
    data.reduce((acc, col) => {
      months.forEach((m) => {
        const d = col.months[m] || { vendas: 0, recebido: 0, comissao: 0 }
        acc.vendas += d.vendas; acc.recebido += d.recebido; acc.comissao += d.comissao
      })
      return acc
    }, { vendas: 0, recebido: 0, comissao: 0 })

  const getCollabTotal = (col: ColCommission, months: string[]) =>
    months.reduce((acc, m) => {
      const d = col.months[m] || { vendas: 0, recebido: 0, comissao: 0 }
      return { vendas: acc.vendas + d.vendas, recebido: acc.recebido + d.recebido, comissao: acc.comissao + d.comissao }
    }, { vendas: 0, recebido: 0, comissao: 0 })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sortData = (data: ColCommission[], months: string[]) => {
    if (!sortField) return data
    return [...data].sort((a, b) => {
      if (sortField === 'name') {
        const cmp = a.collaborator.localeCompare(b.collaborator, 'pt-BR')
        return sortDir === 'asc' ? cmp : -cmp
      }
      if (sortField === 'comissao') {
        const ca = getCollabTotal(a, months).comissao
        const cb = getCollabTotal(b, months).comissao
        return sortDir === 'asc' ? ca - cb : cb - ca
      }
      return 0
    })
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-3.5 h-3.5 opacity-40" />
    return sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-primary" /> : <ChevronDown className="w-3.5 h-3.5 text-primary" />
  }

  const totalIRPF = calcTotal(irpfData, irpfMonths)
  const totalITR = calcTotal(itrData, itrMonths)
  const sortedIRPF = sortData(irpfData, irpfMonths)
  const sortedITR = sortData(itrData, itrMonths)

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <svg className="animate-spin w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  )

  const activeData = activeTab === 'irpf' ? sortedIRPF : sortedITR
  const activeMonths = activeTab === 'irpf' ? irpfMonths : itrMonths
  const activeTotal = activeTab === 'irpf' ? totalIRPF : totalITR

  return (
    <div className="p-8 bg-gradient-to-br from-background via-muted/20 to-background min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Comissões</h2>
          <p className="text-sm text-muted-foreground mt-1">Acompanhamento de vendas e comissões dos colaboradores</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border">
          {(['irpf', 'itr'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-semibold transition-all rounded-t-lg ${
                activeTab === tab
                  ? 'border-b-2 border-primary text-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}>
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Cards resumo — melhorados (ATT 3) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="relative overflow-hidden bg-gradient-to-br from-primary to-primary/90 rounded-2xl p-6 shadow-xl shadow-primary/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
            <p className="text-xs font-bold text-white/80 uppercase tracking-widest mb-1">Total de Vendas</p>
            <p className="text-5xl font-black text-white mt-2">{activeTotal.vendas}</p>
            <p className="text-xs text-white/60 mt-3">{activeTab === 'irpf' ? 'Março · Abril · Maio' : 'Agosto · Setembro'}</p>
            <TrendingUp className="absolute bottom-4 right-4 w-10 h-10 text-white/20" />
          </div>
          <div className="relative overflow-hidden bg-gradient-to-br from-accent to-accent/90 rounded-2xl p-6 shadow-xl shadow-accent/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
            <p className="text-xs font-bold text-white/80 uppercase tracking-widest mb-1">Total Recebido</p>
            <p className="text-4xl font-black text-white mt-2">R$ {(activeTotal.recebido / 100).toFixed(2)}</p>
            <p className="text-xs text-white/60 mt-3">Todos os colaboradores</p>
            <DollarSign className="absolute bottom-4 right-4 w-10 h-10 text-white/20" />
          </div>
          <div className="relative overflow-hidden bg-gradient-to-br from-success to-success/90 rounded-2xl p-6 shadow-xl shadow-success/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
            <p className="text-xs font-bold text-white/80 uppercase tracking-widest mb-1">Total Comissões</p>
            <p className="text-4xl font-black text-white mt-2">R$ {(activeTotal.comissao / 100).toFixed(2)}</p>
            <p className="text-xs text-white/60 mt-3">Apenas declarações pagas</p>
            <DollarSign className="absolute bottom-4 right-4 w-10 h-10 text-white/20" />
          </div>
        </div>

        {/* Tabela com filtros A-Z e maior comissão (ATT 6) */}
        <div className="bg-card border-2 border-border rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Detalhamento por Colaborador</h3>
            <p className="text-xs text-muted-foreground">Clique nas setas para ordenar</p>
          </div>
          <div className="overflow-x-auto">
            <div className="max-h-[520px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted border-b border-border sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-left sticky left-0 bg-muted">
                      <button onClick={() => handleSort('name')}
                        className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors">
                        Colaborador <SortIcon field="name" />
                      </button>
                    </th>
                    <th colSpan={3} className="px-6 py-4 text-center text-xs font-semibold text-muted-foreground uppercase border-x border-border">
                      Total ({activeMonths.length} {activeMonths.length === 1 ? 'mês' : 'meses'})
                    </th>
                    {activeMonths.map((m) => (
                      <th key={m} colSpan={3} className="px-6 py-4 text-center text-xs font-semibold text-muted-foreground uppercase border-r border-border">{m}</th>
                    ))}
                  </tr>
                  <tr className="bg-muted/50">
                    <th className="px-6 py-3 sticky left-0 bg-muted/50" />
                    {[...Array(activeMonths.length + 1)].map((_, i) => (
                      <>
                        <th key={`v${i}`} className="px-4 py-3 text-center text-xs text-muted-foreground">Vendas</th>
                        <th key={`r${i}`} className="px-4 py-3 text-center text-xs text-muted-foreground">Recebido</th>
                        <th key={`c${i}`} className="px-4 py-3 text-center border-r border-border">
                          {i === 0 ? (
                            <button onClick={() => handleSort('comissao')}
                              className="flex items-center gap-1 mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors">
                              Comissão <SortIcon field="comissao" />
                            </button>
                          ) : <span className="text-xs text-muted-foreground">Comissão</span>}
                        </th>
                      </>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activeData.length === 0 ? (
                    <tr><td colSpan={3 + activeMonths.length * 3 + 1} className="px-4 py-16 text-center text-muted-foreground">
                      <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-20" />
                      Sem dados de comissão
                    </td></tr>
                  ) : activeData.map((col, i) => {
                    const totals = getCollabTotal(col, activeMonths)
                    return (
                      <tr key={i} className="hover:bg-muted/20 transition-colors group">
                        <td className="px-6 py-4 sticky left-0 bg-card group-hover:bg-muted/20 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0 ring-2 ring-primary/20">
                              {col.collaborator.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-foreground whitespace-nowrap">{col.collaborator}</span>
                          </div>
                        </td>
                        {/* Total */}
                        <td className="px-4 py-4 text-center font-medium text-foreground">{totals.vendas}</td>
                        <td className="px-4 py-4 text-center text-foreground">R$ {(totals.recebido / 100).toFixed(2)}</td>
                        <td className="px-4 py-4 text-center border-r border-border">
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-success/10 text-success rounded-full text-xs font-bold ring-1 ring-success/20">
                            R$ {(totals.comissao / 100).toFixed(2)}
                          </span>
                        </td>
                        {/* Por mês */}
                        {activeMonths.map((m) => {
                          const d = col.months[m] || { vendas: 0, recebido: 0, comissao: 0 }
                          return (
                            <>
                              <td key={`${i}${m}v`} className="px-4 py-4 text-center text-muted-foreground text-sm">{d.vendas || '—'}</td>
                              <td key={`${i}${m}r`} className="px-4 py-4 text-center text-muted-foreground text-sm">{d.recebido ? `R$ ${(d.recebido/100).toFixed(2)}` : '—'}</td>
                              <td key={`${i}${m}c`} className="px-4 py-4 text-center border-r border-border">
                                {d.comissao
                                  ? <span className="text-success font-medium text-sm">R$ {(d.comissao/100).toFixed(2)}</span>
                                  : <span className="text-muted-foreground/40 text-sm">—</span>}
                              </td>
                            </>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Regras */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
          <h3 className="text-sm font-bold text-foreground mb-3">📋 Regras de Comissão</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground">
            <div className="bg-card rounded-lg p-3 border border-border">
              <p className="font-semibold text-foreground mb-1">Sócio</p>
              <p>R$ 5,00 fixo por declaração</p>
            </div>
            <div className="bg-card rounded-lg p-3 border border-border">
              <p className="font-semibold text-foreground mb-1">Diversos</p>
              <p>10% do valor recebido</p>
            </div>
            <div className="bg-card rounded-lg p-3 border border-border">
              <p className="font-semibold text-foreground mb-1">Doação</p>
              <p>Sem comissão</p>
            </div>
            <div className="bg-card rounded-lg p-3 border border-border">
              <p className="font-semibold text-foreground mb-1">Contagem</p>
              <p>Apenas status PAGO</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}