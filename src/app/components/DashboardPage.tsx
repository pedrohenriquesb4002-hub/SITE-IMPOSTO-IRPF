import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Users, FileText, Clock, CheckCircle, BarChart2, Award } from 'lucide-react'
import { api, type DashboardData } from '../../lib/store'

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.dashboard().then(setData).catch(() => {}).finally(() => setLoading(false))
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
          </div>

          {/* Top colaboradores */}
          <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-xl">
            <h3 className="font-bold text-foreground mb-6 flex items-center gap-2">
              <Award className="w-5 h-5 text-accent" /> Top Colaboradores
            </h3>
            {data.topCollaboradores.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Sem dados ainda</p>
            ) : (
              <div className="space-y-3">
                {data.topCollaboradores.map((col, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 ${
                      i === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                      i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                      i === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                      'bg-gradient-to-br from-primary/40 to-primary/60'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{col.name}</p>
                      <p className="text-xs text-muted-foreground">{col.vendas} {col.vendas === 1 ? 'declaração' : 'declarações'}</p>
                    </div>
                    <span className="text-sm font-bold text-success whitespace-nowrap">
                      R$ {(col.comissao / 100).toFixed(2)}
                    </span>
                  </div>
                ))}
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