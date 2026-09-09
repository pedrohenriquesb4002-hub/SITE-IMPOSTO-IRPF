import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Users, FileText, Clock, CheckCircle, BarChart2, Award, Crown, ArrowRight, Search, X } from 'lucide-react'
import { api, type DashboardData, type Collaborator } from '../../lib/store'

interface DashboardPageProps {
  onNavigate?: (page: 'irpf' | 'itr', month: string, cliente: string) => void
}

export default function DashboardPage({ onNavigate }: DashboardPageProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [colaboradores, setColaboradores] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [rankCategoria, setRankCategoria] = useState<'ambos' | 'irpf' | 'itr'>('ambos')
  const [pendCategoria, setPendCategoria] = useState<'todos' | 'IRPF' | 'ITR'>('todos')
  const [pendColaborador, setPendColaborador] = useState('')

  useEffect(() => {
    Promise.all([api.dashboard(), api.collaborators.list()])
      .then(([d, c]) => { setData(d); setColaboradores(c) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <svg className="animate-spin w-10 h-10 text-primary mx-auto mb-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-muted-foreground text-sm">Carregando dashboard...</p>
      </div>
    </div>
  )

  if (!data) return (
    <div className="flex items-center justify-center min-h-screen text-muted-foreground">Erro ao carregar dados</div>
  )

  const totalDeclaracoes = data.irpf.total + data.itr.total
  const totalPago = data.irpf.pago + data.itr.pago
  const totalAguardando = data.irpf.aguardando + data.itr.aguardando
  const totalRecebido = data.irpf.recebidoPago + data.itr.recebidoPago
  const totalComissao = data.irpf.comissaoTotal + data.itr.comissaoTotal
  const taxaPagamento = totalDeclaracoes > 0 ? Math.round((totalPago / totalDeclaracoes) * 100) : 0

  const irpfMonths = ['Março', 'Abril', 'Maio']
  const itrMonths = ['Agosto', 'Setembro']

  const maxRecebido = Math.max(
    ...irpfMonths.map(m => data.irpf.byMonth[m]?.recebido || 0),
    ...itrMonths.map(m => data.itr.byMonth[m]?.recebido || 0),
    1
  )

  const getColabPhoto = (name: string) => colaboradores.find(c => c.name === name)?.photo || null

  const colaboradoresComPendencia = Array.from(new Set(data.pendentes.map(p => p.collaborator))).sort((a, b) => a.localeCompare(b))
  const pendentesFiltrados = data.pendentes.filter(p =>
    (pendCategoria === 'todos' || p.categoria === pendCategoria) &&
    (!pendColaborador || p.collaborator === pendColaborador)
  )
  const pendFiltroAtivo = pendCategoria !== 'todos' || pendColaborador !== ''

  const rankedColaboradores = data.topCollaboradores
    .map(c => ({
      name: c.name,
      total: rankCategoria === 'irpf' ? c.irpf.total : rankCategoria === 'itr' ? c.itr.total : c.irpf.total + c.itr.total,
      comissao: rankCategoria === 'irpf' ? c.irpf.comissao : rankCategoria === 'itr' ? c.itr.comissao : c.irpf.comissao + c.itr.comissao,
    }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)
  const maxRankTotal = Math.max(...rankedColaboradores.map(c => c.total), 1)

  return (
    <div className="p-8 bg-gradient-to-br from-background via-muted/20 to-background min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
              <BarChart2 className="w-8 h-8 text-primary" />
              Dashboard
            </h2>
            <p className="text-muted-foreground mt-1">Visão geral de toda a operação</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Atualizado agora</p>
            <div className="flex items-center gap-1.5 justify-end mt-1">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
              <p className="text-xs text-success font-medium">Sistema online</p>
            </div>
          </div>
        </div>

        {/* KPIs principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Declarações', value: totalDeclaracoes, icon: FileText, color: 'from-primary to-primary/80', shadow: 'shadow-primary/20' },
            { label: 'Declarações Pagas', value: totalPago, icon: CheckCircle, color: 'from-success to-success/80', shadow: 'shadow-success/20' },
            { label: 'Aguardando', value: totalAguardando, icon: Clock, color: 'from-warning to-warning/80', shadow: 'shadow-warning/20' },
            { label: 'Colaboradores', value: data.totalColaboradores, icon: Users, color: 'from-accent to-accent/80', shadow: 'shadow-accent/20' },
          ].map((kpi, i) => (
            <div key={i} className={`relative overflow-hidden bg-gradient-to-br ${kpi.color} rounded-2xl p-6 shadow-xl ${kpi.shadow}`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-6 translate-x-6" />
              <p className="text-xs font-bold text-white/80 uppercase tracking-wider mb-2">{kpi.label}</p>
              <p className="text-4xl font-black text-white">{kpi.value}</p>
              <kpi.icon className="absolute bottom-4 right-4 w-8 h-8 text-white/20" />
            </div>
          ))}
        </div>

        {/* Financeiro */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-card border-2 border-border rounded-2xl p-6 shadow-xl">
            <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" /> Resumo Financeiro
            </h3>
            <p className="text-xs text-muted-foreground mb-6">Apenas declarações com status PAGO</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-xl p-4 border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Receita Total (Pago)</p>
                <p className="text-2xl font-black text-foreground">R$ {(totalRecebido / 100).toFixed(2)}</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>IRPF</span>
                    <span className="font-medium">R$ {(data.irpf.recebidoPago / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>ITR</span>
                    <span className="font-medium">R$ {(data.itr.recebidoPago / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-success/5 rounded-xl p-4 border border-success/20">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Comissões</p>
                <p className="text-2xl font-black text-success">R$ {(totalComissao / 100).toFixed(2)}</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>IRPF</span>
                    <span className="font-medium text-success">R$ {(data.irpf.comissaoTotal / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>ITR</span>
                    <span className="font-medium text-success">R$ {(data.itr.comissaoTotal / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Taxa de pagamento */}
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground font-medium">Taxa de Pagamento</span>
                <span className="font-bold text-foreground">{taxaPagamento}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-primary to-success h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${taxaPagamento}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{totalPago} pagas</span>
                <span>{totalAguardando} aguardando</span>
              </div>
            </div>

            {/* Clientes em aberto */}
            {data.pendentes.length > 0 && (
              <div className="mt-7">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-warning/10 rounded-lg flex items-center justify-center">
                      <Clock className="w-4 h-4 text-warning" />
                    </div>
                    <h4 className="text-sm font-bold text-foreground">Em aberto para pagamento</h4>
                    <span className="text-xs font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                      {pendentesFiltrados.length}{pendFiltroAtivo ? ` / ${data.pendentes.length}` : ''}
                    </span>
                  </div>
                  {pendFiltroAtivo && (
                    <button
                      onClick={() => { setPendCategoria('todos'); setPendColaborador('') }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
                    >
                      <X className="w-3 h-3" /> Limpar
                    </button>
                  )}
                </div>

                {/* Filtros */}
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  <div className="flex items-center gap-1 bg-muted/40 rounded-full p-1">
                    {([
                      { key: 'todos', label: 'Todos' },
                      { key: 'IRPF', label: 'IRPF' },
                      { key: 'ITR', label: 'ITR' },
                    ] as const).map(opt => (
                      <button key={opt.key} onClick={() => setPendCategoria(opt.key)}
                        className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
                          pendCategoria === opt.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    <select value={pendColaborador} onChange={(e) => setPendColaborador(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-muted/40 border-none rounded-full focus:outline-none focus:ring-2 focus:ring-ring text-foreground appearance-none cursor-pointer">
                      <option value="">Todos os colaboradores</option>
                      {colaboradoresComPendencia.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {pendentesFiltrados.length === 0 ? (
                  <div className="border border-dashed border-border rounded-xl p-8 text-center">
                    <Search className="w-6 h-6 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum lançamento em aberto com esse filtro</p>
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto pr-1 space-y-2">
                    {pendentesFiltrados.map((pnd) => {
                      const photo = getColabPhoto(pnd.collaborator)
                      const isItr = pnd.categoria === 'ITR'
                      return (
                        <button
                          key={`${pnd.categoria}-${pnd.id}`}
                          onClick={() => onNavigate?.(isItr ? 'itr' : 'irpf', pnd.month, pnd.cliente)}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl bg-muted/20 border-l-4 hover:bg-muted/40 hover:shadow-sm transition-all text-left group ${
                            isItr ? 'border-accent' : 'border-primary'
                          }`}
                        >
                          <div className={`w-9 h-9 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center ring-2 ${
                            isItr ? 'ring-accent/30' : 'ring-primary/30'
                          } bg-gradient-to-br from-muted to-muted/50`}>
                            {photo
                              ? <img src={photo} alt={pnd.collaborator} className="w-full h-full object-cover" />
                              : <span className={`text-xs font-bold ${isItr ? 'text-accent' : 'text-primary'}`}>{pnd.collaborator.charAt(0).toUpperCase()}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold text-foreground truncate">{pnd.cliente}</p>
                              <span className={`flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                                isItr ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'
                              }`}>
                                {pnd.categoria}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{pnd.collaborator} · {pnd.month}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-sm font-bold text-warning whitespace-nowrap">
                              R$ {(pnd.valorRecebido / 100).toFixed(2)}
                            </span>
                            <div className="w-6 h-6 rounded-full flex items-center justify-center bg-muted/0 group-hover:bg-card transition-colors">
                              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Top colaboradores */}
          <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Award className="w-5 h-5 text-accent" /> Top Colaboradores
              </h3>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">por declarações</span>
            </div>

            {/* Filtro de categoria */}
            <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-1 mb-5">
              {([
                { key: 'ambos', label: 'Ambos' },
                { key: 'irpf', label: 'IRPF' },
                { key: 'itr', label: 'ITR' },
              ] as const).map(opt => (
                <button key={opt.key} onClick={() => setRankCategoria(opt.key)}
                  className={`flex-1 px-2 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    rankCategoria === opt.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>

            {rankedColaboradores.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Sem dados ainda</p>
            ) : (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {rankedColaboradores.map((col, i) => {
                  const photo = getColabPhoto(col.name)
                  return (
                    <div key={col.name}
                      className={`relative overflow-hidden rounded-xl p-3 transition-all ${
                        i === 0
                          ? 'bg-gradient-to-r from-yellow-400/10 via-yellow-400/5 to-transparent border border-yellow-400/30'
                          : 'bg-muted/20 border border-transparent hover:border-border'
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center ring-2 ${
                            i === 0 ? 'ring-yellow-400/60' : i === 1 ? 'ring-gray-300/60' : i === 2 ? 'ring-orange-400/60' : 'ring-border'
                          } bg-gradient-to-br from-primary/30 to-primary/10`}>
                            {photo
                              ? <img src={photo} alt={col.name} className="w-full h-full object-cover" />
                              : <span className="text-sm font-bold text-primary">{col.name.charAt(0).toUpperCase()}</span>}
                          </div>
                          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white ring-2 ring-card ${
                            i === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                            i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                            i === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                            'bg-gradient-to-br from-primary/50 to-primary/70'
                          }`}>
                            {i === 0 ? <Crown className="w-3 h-3" /> : i + 1}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{col.name}</p>
                          <p className="text-xs text-muted-foreground">R$ {(col.comissao / 100).toFixed(2)} em comissão</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-black text-foreground leading-none">{col.total}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">
                            {col.total === 1 ? 'declaração' : 'declarações'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2.5 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            i === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 'bg-gradient-to-r from-primary to-primary/60'
                          }`}
                          style={{ width: `${Math.max((col.total / maxRankTotal) * 100, 6)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Gráfico de barras por mês */}
        <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-xl">
          <h3 className="font-bold text-foreground mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> Receita por Mês
          </h3>
          <div className="flex items-end gap-4 h-48">
            {irpfMonths.map((m) => {
              const v = data.irpf.byMonth[m]?.recebido || 0
              const h = maxRecebido > 0 ? Math.max((v / maxRecebido) * 100, 2) : 2
              return (
                <div key={m} className="flex-1 flex flex-col items-center gap-2">
                  <p className="text-xs font-bold text-primary">R$ {(v / 100).toFixed(0)}</p>
                  <div className="w-full flex items-end justify-center" style={{ height: '140px' }}>
                    <div
                      className="w-full bg-gradient-to-t from-primary to-primary/60 rounded-t-lg transition-all duration-700"
                      style={{ height: `${h}%` }}
                      title={`IRPF ${m}: R$ ${(v/100).toFixed(2)}`}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">{m}</p>
                  <p className="text-xs text-primary/60">IRPF</p>
                </div>
              )
            })}
            <div className="w-px bg-border self-stretch" />
            {itrMonths.map((m) => {
              const v = data.itr.byMonth[m]?.recebido || 0
              const h = maxRecebido > 0 ? Math.max((v / maxRecebido) * 100, 2) : 2
              return (
                <div key={m} className="flex-1 flex flex-col items-center gap-2">
                  <p className="text-xs font-bold text-accent">R$ {(v / 100).toFixed(0)}</p>
                  <div className="w-full flex items-end justify-center" style={{ height: '140px' }}>
                    <div
                      className="w-full bg-gradient-to-t from-accent to-accent/60 rounded-t-lg transition-all duration-700"
                      style={{ height: `${h}%` }}
                      title={`ITR ${m}: R$ ${(v/100).toFixed(2)}`}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">{m}</p>
                  <p className="text-xs text-accent/60">ITR</p>
                </div>
              )
            })}
          </div>
          <div className="flex gap-6 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-primary" /> IRPF</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-accent" /> ITR</div>
          </div>
        </div>

        {/* Grid IRPF vs ITR detalhado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: 'IRPF', data: data.irpf, months: irpfMonths, color: 'primary', period: 'Março · Abril · Maio' },
            { label: 'ITR', data: data.itr, months: itrMonths, color: 'accent', period: 'Agosto · Setembro' },
          ].map((section) => (
            <div key={section.label} className="bg-card border-2 border-border rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-foreground text-lg">{section.label}</h3>
                <span className="text-xs text-muted-foreground">{section.period}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="text-center p-3 bg-muted/30 rounded-xl">
                  <p className="text-2xl font-black text-foreground">{section.data.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total</p>
                </div>
                <div className="text-center p-3 bg-success/5 rounded-xl border border-success/20">
                  <p className="text-2xl font-black text-success">{section.data.pago}</p>
                  <p className="text-xs text-muted-foreground mt-1">Pagas</p>
                </div>
                <div className="text-center p-3 bg-warning/5 rounded-xl border border-warning/20">
                  <p className="text-2xl font-black text-warning">{section.data.aguardando}</p>
                  <p className="text-xs text-muted-foreground mt-1">Aguardando</p>
                </div>
              </div>
              <div className="space-y-2">
                {section.months.map((m) => {
                  const md = section.data.byMonth[m] || { total: 0, recebido: 0, comissao: 0 }
                  return (
                    <div key={m} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/50">
                      <span className="text-sm font-medium text-foreground">{m}</span>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>{md.total} decl.</span>
                        <span className="font-medium text-foreground">R$ {(md.recebido / 100).toFixed(2)}</span>
                        <span className="text-success font-bold">+R$ {(md.comissao / 100).toFixed(2)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}