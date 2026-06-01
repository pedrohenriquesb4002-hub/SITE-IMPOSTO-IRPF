import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, TrendingUp, FileText, DollarSign, Users, BarChart2, CheckCircle, Clock, Heart } from "lucide-react";

const fmt = (v: number) => (v / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode }> = {
    PAGO:      { cls: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800", icon: <CheckCircle className="w-3 h-3" /> },
    AGUARDANDO:{ cls: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800", icon: <Clock className="w-3 h-3" /> },
    "DOAÇÃO":  { cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800", icon: <Heart className="w-3 h-3" /> },
  };
  const s = map[status] ?? { cls: "bg-muted text-muted-foreground", icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      {s.icon}{status}
    </span>
  );
}

export default function SummaryPage() {
  const { data: summaryAll, isLoading: isLoadingSummary } = trpc.summary.getAll.useQuery();
  const { data: commissions, isLoading: isLoadingCommissions } = trpc.commissions.listAll.useQuery();

  const totalQuantity  = summaryAll?.reduce((s, x) => s + x.totalQuantity, 0)  || 0;
  const totalValue     = summaryAll?.reduce((s, x) => s + x.totalValue, 0)     || 0;
  const totalCommission= summaryAll?.reduce((s, x) => s + x.totalCommission, 0)|| 0;

  const statCards = [
    {
      label: "Total de Declarações",
      value: totalQuantity,
      sub: "Todas registradas",
      icon: FileText,
      color: "text-[#15803d]",
      bg: "bg-[#15803d]/10",
    },
    {
      label: "Valor Total Recebido",
      value: fmt(totalValue),
      sub: "Soma de todos os valores",
      icon: DollarSign,
      color: "text-[#e85d1a]",
      bg: "bg-[#e85d1a]/10",
    },
    {
      label: "Comissão Total Paga",
      value: fmt(totalCommission),
      sub: "Status PAGO apenas",
      icon: BarChart2,
      color: "text-[#15803d]",
      bg: "bg-[#15803d]/10",
    },
    {
      label: "Colaboradores",
      value: commissions?.length ?? "—",
      sub: "Com declarações",
      icon: Users,
      color: "text-[#e85d1a]",
      bg: "bg-[#e85d1a]/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Resumo Geral</h1>
        <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
          <span className="w-2 h-2 bg-[#15803d] rounded-full animate-pulse" />
          Visão consolidada de declarações, comissões e colaboradores
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c) => (
          <Card key={c.label} className="p-5 border-2 shadow-lg hover:shadow-xl transition-shadow">
            <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center mb-4`}>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{isLoadingSummary ? "…" : c.value}</p>
            <p className="text-xs font-semibold text-foreground/80 mt-1">{c.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{c.sub}</p>
          </Card>
        ))}
      </div>

      {/* Resumo por Mês */}
      <Card className="border-2 overflow-hidden shadow-lg">
        <div className="p-6 border-b border-border bg-muted/30 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#15803d]/10 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-[#15803d]" />
          </div>
          <h2 className="text-base font-bold text-foreground">Resumo por Mês</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 border-b border-border">
                <TableHead className="text-foreground font-semibold">Mês</TableHead>
                <TableHead className="text-foreground font-semibold text-right">Quantidade</TableHead>
                <TableHead className="text-foreground font-semibold text-right">Valor Recebido</TableHead>
                <TableHead className="text-foreground font-semibold text-right">Comissão Paga</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingSummary ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : summaryAll?.length ? (
                summaryAll.map((s) => (
                  <TableRow key={s.month} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <TableCell className="font-semibold text-foreground">{s.month}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{s.totalQuantity}</TableCell>
                    <TableCell className="text-right font-medium text-foreground">{fmt(s.totalValue)}</TableCell>
                    <TableCell className="text-right font-bold text-[#15803d]">{fmt(s.totalCommission)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum dado disponível
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Resumo por Colaborador */}
      <Card className="border-2 overflow-hidden shadow-lg">
        <div className="p-6 border-b border-border bg-muted/30 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#e85d1a]/10 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-[#e85d1a]" />
          </div>
          <h2 className="text-base font-bold text-foreground">Resumo por Colaborador</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/20 border-b border-border">
                <TableHead className="text-foreground font-semibold">Colaborador</TableHead>
                <TableHead className="text-foreground font-semibold text-right">Quantidade</TableHead>
                <TableHead className="text-foreground font-semibold text-right">Valor Recebido</TableHead>
                <TableHead className="text-foreground font-semibold text-right">Comissão Paga</TableHead>
                <TableHead className="text-foreground font-semibold text-right">% do Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingCommissions ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : commissions?.length ? (
                commissions.map((c, i) => (
                  <TableRow key={c.collaborator} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          i === 0 ? "bg-yellow-400/20 text-yellow-700" :
                          i === 1 ? "bg-slate-300/30 text-slate-600" :
                          i === 2 ? "bg-orange-400/20 text-orange-700" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {i + 1}
                        </div>
                        <span className="font-semibold text-foreground">{c.collaborator}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{c.quantity}</TableCell>
                    <TableCell className="text-right font-medium text-foreground">{fmt(c.totalValue)}</TableCell>
                    <TableCell className="text-right font-bold text-[#15803d]">{fmt(c.totalCommission)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {totalCommission > 0 ? ((c.totalCommission / totalCommission) * 100).toFixed(1) : 0}%
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum dado disponível
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Média por Declaração", value: totalQuantity > 0 ? fmt(Math.round(totalValue / totalQuantity)) : "R$ 0,00" },
          { label: "Comissão Média", value: totalQuantity > 0 ? fmt(Math.round(totalCommission / totalQuantity)) : "R$ 0,00" },
          { label: "Taxa Média de Comissão", value: `${totalValue > 0 ? ((totalCommission / totalValue) * 100).toFixed(2) : 0}%` },
        ].map((s) => (
          <Card key={s.label} className="p-6 border-2 shadow-lg">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{s.label}</div>
            <div className="text-2xl font-bold text-foreground">{isLoadingSummary ? "…" : s.value}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}