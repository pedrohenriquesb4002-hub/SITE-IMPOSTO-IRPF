import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../lib/store'

interface ColCommission {
  collaborator: string
  months: Record<string, { vendas: number; recebido: number; comissao: number }>
}

export default function ComissoesPage() {
  const [activeTab, setActiveTab] = useState<'irpf' | 'itr'>('irpf')
  const [irpfData, setIrpfData] = useState<ColCommission[]>([])
  const [itrData, setItrData] = useState<ColCommission[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [irpf, itr] = await Promise.all([
          api.commissions.all(),
          api.commissions.itr(),
        ])
        setIrpfData(irpf)
        setItrData(itr)
      } catch {
        toast.error('Erro ao carregar comissões')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const irpfMonths = ['Março', 'Abril', 'Maio']
  const itrMonths = ['Agosto', 'Setembro']

  const calcTotal = (data: ColCommission[], months: string[]) => {
    return data.reduce(
      (acc, col) => {
        months.forEach((m) => {
          const d = col.months[m] || { vendas: 0, recebido: 0, comissao: 0 }
          acc.vendas += d.vendas
          acc.recebido += d.recebido
          acc.comissao += d.comissao
        })
        return acc
      },
      { vendas: 0, recebido: 0, comissao: 0 }
    )
  }

  const totalIRPF = calcTotal(irpfData, irpfMonths)
  const totalITR = calcTotal(itrData, itrMonths)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <svg className="animate-spin w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

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
              className={`px-4 py-2.5 text-sm font-medium transition-all rounded-t-md ${
                activeTab === tab
                  ? 'border-b-2 border-primary text-primary bg-primary/5'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}>
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {activeTab === 'irpf' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-primary to-primary/90 rounded-2xl p-6 shadow-xl shadow-primary/20">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-white/90 uppercase tracking-wide">Total de Vendas</p>
                  <TrendingUp className="w-8 h-8 text-white/60" />
                </div>
                <p className="text-4xl font-bold text-white">{totalIRPF.vendas}</p>
                <p className="text-xs text-white/70 mt-2">Março a Maio</p>
              </div>
              <div className="bg-gradient-to-br from-accent to-accent/90 rounded-2xl p-6 shadow-xl shadow-accent/20">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-white/90 uppercase tracking-wide">Total Recebido</p>
                  <DollarSign className="w-8 h-8 text-white/60" />
                </div>
                <p className="text-4xl font-bold text-white">R$ {(totalIRPF.recebido / 100).toFixed(2)}</p>
                <p className="text-xs text-white/70 mt-2">Todos os colaboradores</p>
              </div>
              <div className="bg-gradient-to-br from-success to-success/90 rounded-2xl p-6 shadow-xl shadow-success/20">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-bold text-white/90 uppercase tracking-wide">Total Comissões</p>
                  <DollarSign className="w-8 h-8 text-white/60" />
                </div>
                <p className="text-4xl font-bold text-white">R$ {(totalIRPF.comissao / 100).toFixed(2)}</p>
                <p className="text-xs text-white/70 mt-2">Sócio R$5 / Diversos 10%</p>
              </div>
            </div>

            <div className="bg-card border-2 border-border rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted border-b border-border">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase sticky left-0 bg-muted">Colaborador</th>
                      <th colSpan={3} className="px-6 py-4 text-center text-sm text-muted-foreground border-x border-border">Total (3 meses)</th>
                      {irpfMonths.map((m) => (
                        <th key={m} colSpan={3} className="px-6 py-4 text-center text-sm text-muted-foreground border-r border-border">{m}</th>
                      ))}
                    </tr>
                    <tr className="bg-muted/50">
                      <th className="px-6 py-3 sticky left-0 bg-muted/50"></th>
                      {[...Array(4)].map((_, i) => (
                        <>
                          <th key={`v${i}`} className="px-4 py-3 text-center text-xs text-muted-foreground">Vendas</th>
                          <th key={`r${i}`} className="px-4 py-3 text-center text-xs text-muted-foreground">Recebido</th>
                          <th key={`c${i}`} className="px-4 py-3 text-center text-xs text-muted-foreground border-r border-border">Comissão</th>
                        </>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {irpfData.length === 0 ? (
                      <tr><td colSpan={13} className="px-4 py-12 text-center text-muted-foreground">Sem dados de comissão</td></tr>
                    ) : irpfData.map((col, i) => {
                      const totals = irpfMonths.reduce((acc, m) => {
                        const d = col.months[m] || { vendas: 0, recebido: 0, comissao: 0 }
                        acc.vendas += d.vendas; acc.recebido += d.recebido; acc.comissao += d.comissao
                        return acc
                      }, { vendas: 0, recebido: 0, comissao: 0 })
                      return (
                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4 text-foreground font-medium sticky left-0 bg-card">{col.collaborator}</td>
                          <td className="px-4 py-4 text-center text-foreground">{totals.vendas}</td>
                          <td className="px-4 py-4 text-center text-foreground">R$ {(totals.recebido / 100).toFixed(2)}</td>
                          <td className="px-4 py-4 text-center text-success border-r border-border font-medium">R$ {(totals.comissao / 100).toFixed(2)}</td>
                          {irpfMonths.map((m) => {
                            const d = col.months[m] || { vendas: 0, recebido: 0, comissao: 0 }
                            return (
                              <>
                                <td key={`${i}${m}v`} className="px-4 py-4 text-center text-foreground">{d.vendas}</td>
                                <td key={`${i}${m}r`} className="px-4 py-4 text-center text-foreground">R$ {(d.recebido / 100).toFixed(2)}</td>
                                <td key={`${i}${m}c`} className="px-4 py-4 text-center text-muted-foreground border-r border-border">R$ {(d.comissao / 100).toFixed(2)}</td>
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

            <div className="bg-muted/30 border border-border rounded-lg p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Regras de Comissão</h3>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• Sócio: R$ 5,00 fixo por declaração</li>
                <li>• Diversos: 10% do valor recebido</li>
                <li>• Doação: sem comissão</li>
                <li>• Apenas declarações com status PAGO contam para o total</li>
              </ul>
            </div>
          </>
        )}

        {activeTab === 'itr' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-6 text-primary-foreground shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm opacity-90">Total de Vendas</p>
                  <TrendingUp className="w-5 h-5 opacity-80" />
                </div>
                <p className="text-3xl">{totalITR.vendas}</p>
                <p className="text-sm opacity-80 mt-1">Agosto e Setembro</p>
              </div>
              <div className="bg-gradient-to-br from-success to-success/80 rounded-xl p-6 text-success-foreground shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm opacity-90">Total Recebido</p>
                  <DollarSign className="w-5 h-5 opacity-80" />
                </div>
                <p className="text-3xl">R$ {(totalITR.recebido / 100).toFixed(2)}</p>
                <p className="text-sm opacity-80 mt-1">Todos os colaboradores</p>
              </div>
              <div className="bg-gradient-to-br from-accent to-accent/80 rounded-xl p-6 text-accent-foreground shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm opacity-90">Total Comissões</p>
                  <DollarSign className="w-5 h-5 opacity-80" />
                </div>
                <p className="text-3xl">R$ {(totalITR.comissao / 100).toFixed(2)}</p>
                <p className="text-sm opacity-80 mt-1">Sócio R$5 / Diversos 10%</p>
              </div>
            </div>

            <div className="bg-card border-2 border-border rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted border-b border-border">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase sticky left-0 bg-muted">Colaborador</th>
                      <th colSpan={3} className="px-6 py-4 text-center text-sm text-muted-foreground border-x border-border">Total (2 meses)</th>
                      {itrMonths.map((m) => (
                        <th key={m} colSpan={3} className="px-6 py-4 text-center text-sm text-muted-foreground border-r border-border">{m}</th>
                      ))}
                    </tr>
                    <tr className="bg-muted/50">
                      <th className="px-6 py-3 sticky left-0 bg-muted/50"></th>
                      {[...Array(3)].map((_, i) => (
                        <>
                          <th key={`v${i}`} className="px-4 py-3 text-center text-xs text-muted-foreground">Vendas</th>
                          <th key={`r${i}`} className="px-4 py-3 text-center text-xs text-muted-foreground">Recebido</th>
                          <th key={`c${i}`} className="px-4 py-3 text-center text-xs text-muted-foreground border-r border-border">Comissão</th>
                        </>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {itrData.length === 0 ? (
                      <tr><td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">Sem dados ITR</td></tr>
                    ) : itrData.map((col, i) => {
                      const totals = itrMonths.reduce((acc, m) => {
                        const d = col.months[m] || { vendas: 0, recebido: 0, comissao: 0 }
                        acc.vendas += d.vendas; acc.recebido += d.recebido; acc.comissao += d.comissao
                        return acc
                      }, { vendas: 0, recebido: 0, comissao: 0 })
                      return (
                        <tr key={i} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4 text-foreground font-medium sticky left-0 bg-card">{col.collaborator}</td>
                          <td className="px-4 py-4 text-center text-foreground">{totals.vendas}</td>
                          <td className="px-4 py-4 text-center text-foreground">R$ {(totals.recebido / 100).toFixed(2)}</td>
                          <td className="px-4 py-4 text-center text-success border-r border-border font-medium">R$ {(totals.comissao / 100).toFixed(2)}</td>
                          {itrMonths.map((m) => {
                            const d = col.months[m] || { vendas: 0, recebido: 0, comissao: 0 }
                            return (
                              <>
                                <td key={`${i}${m}v`} className="px-4 py-4 text-center text-foreground">{d.vendas}</td>
                                <td key={`${i}${m}r`} className="px-4 py-4 text-center text-foreground">R$ {(d.recebido / 100).toFixed(2)}</td>
                                <td key={`${i}${m}c`} className="px-4 py-4 text-center text-muted-foreground border-r border-border">R$ {(d.comissao / 100).toFixed(2)}</td>
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
          </>
        )}
      </div>
    </div>
  )
}
