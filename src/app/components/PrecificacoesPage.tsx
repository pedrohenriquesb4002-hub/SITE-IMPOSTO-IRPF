import { useState, useEffect } from 'react'
import { Save, Percent, DollarSign, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { api, type Settings } from '../../lib/store'

export default function PrecificacoesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // IRPF
  const [irpfSocio, setIrpfSocio] = useState(5)
  const [irpfDiversos, setIrpfDiversos] = useState(10)

  // ITR
  const [itrSocio, setItrSocio] = useState(5)
  const [itrDiversos, setItrDiversos] = useState(10)

  useEffect(() => {
    api.settings.get().then((s: Settings) => {
      setIrpfSocio((s.valorFixoSocioIRPF ?? s.valorFixoSocio ?? 500) / 100)
      setIrpfDiversos(s.percentualDiversosIRPF ?? s.percentualDiversos ?? 10)
      setItrSocio((s.valorFixoSocioITR ?? s.valorFixoSocio ?? 500) / 100)
      setItrDiversos(s.percentualDiversosITR ?? s.percentualDiversos ?? 10)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.settings.update({
        valorFixoSocioIRPF: Math.round(irpfSocio * 100),
        percentualDiversosIRPF: irpfDiversos,
        valorFixoSocioITR: Math.round(itrSocio * 100),
        percentualDiversosITR: itrDiversos,
        // Mantém os valores legados sincronizados com IRPF por padrão
        valorFixoSocio: Math.round(irpfSocio * 100),
        percentualDiversos: irpfDiversos,
      })
      toast.success('Precificações salvas com sucesso!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <svg className="animate-spin w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  )

  return (
    <div className="p-8 bg-gradient-to-br from-background via-muted/20 to-background min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Tag className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground tracking-tight">Precificações</h2>
            <p className="text-muted-foreground mt-1">Configure os valores de comissão para IRPF e ITR separadamente</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* IRPF */}
          <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                <span className="text-primary font-bold text-sm">IR</span>
              </div>
              <div>
                <h3 className="font-bold text-foreground">IRPF</h3>
                <p className="text-xs text-muted-foreground">Março · Abril · Maio</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-muted/40 rounded-xl p-5 border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Valor Fixo — Sócio</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground font-medium">R$</span>
                  <input type="number" value={irpfSocio}
                    onChange={(e) => setIrpfSocio(Number(e.target.value))}
                    className="w-32 px-3 py-2.5 text-lg font-bold bg-input-background border-2 border-primary/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-center"
                    min="0" step="0.50" />
                  <span className="text-muted-foreground text-sm">por declaração</span>
                </div>
              </div>

              <div className="bg-muted/40 rounded-xl p-5 border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Percent className="w-4 h-4 text-accent" />
                  <p className="text-sm font-semibold text-foreground">Percentual — Diversos</p>
                </div>
                <div className="flex items-center gap-3">
                  <input type="number" value={irpfDiversos}
                    onChange={(e) => setIrpfDiversos(Number(e.target.value))}
                    className="w-24 px-3 py-2.5 text-lg font-bold bg-input-background border-2 border-accent/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent text-foreground text-center"
                    min="0" max="100" />
                  <span className="text-muted-foreground font-medium">%</span>
                  <span className="text-muted-foreground text-sm">do valor recebido</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Prévia: </span>
              Sócio = R$ {irpfSocio.toFixed(2)} fixo · Diversos = {irpfDiversos}% · Doação = R$ 0,00
            </div>
          </div>

          {/* ITR */}
          <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
              <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                <span className="text-accent font-bold text-sm">IT</span>
              </div>
              <div>
                <h3 className="font-bold text-foreground">ITR</h3>
                <p className="text-xs text-muted-foreground">Agosto · Setembro</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-muted/40 rounded-xl p-5 border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-4 h-4 text-accent" />
                  <p className="text-sm font-semibold text-foreground">Valor Fixo — Sócio</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground font-medium">R$</span>
                  <input type="number" value={itrSocio}
                    onChange={(e) => setItrSocio(Number(e.target.value))}
                    className="w-32 px-3 py-2.5 text-lg font-bold bg-input-background border-2 border-accent/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent text-foreground text-center"
                    min="0" step="0.50" />
                  <span className="text-muted-foreground text-sm">por declaração</span>
                </div>
              </div>

              <div className="bg-muted/40 rounded-xl p-5 border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Percent className="w-4 h-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Percentual — Diversos</p>
                </div>
                <div className="flex items-center gap-3">
                  <input type="number" value={itrDiversos}
                    onChange={(e) => setItrDiversos(Number(e.target.value))}
                    className="w-24 px-3 py-2.5 text-lg font-bold bg-input-background border-2 border-primary/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-center"
                    min="0" max="100" />
                  <span className="text-muted-foreground font-medium">%</span>
                  <span className="text-muted-foreground text-sm">do valor recebido</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Prévia: </span>
              Sócio = R$ {itrSocio.toFixed(2)} fixo · Diversos = {itrDiversos}% · Doação = R$ 0,00
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20 font-semibold flex items-center gap-2 disabled:opacity-50 text-base">
            <Save className="w-5 h-5" />
            {saving ? 'Salvando...' : 'Salvar Precificações'}
          </button>
        </div>
      </div>
    </div>
  )
}