import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MONTHS = ['Março', 'Abril', 'Maio'] as const;

export default function SummaryPage() {
  const { data: summaryAll, isLoading: isLoadingSummary } = trpc.summary.getAll.useQuery();
  const { data: commissions, isLoading: isLoadingCommissions } = trpc.commissions.listAll.useQuery();

  const formatValue = (value: number) => {
    return (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const totalQuantity = summaryAll?.reduce((sum, s) => sum + s.totalQuantity, 0) || 0;
  const totalValue = summaryAll?.reduce((sum, s) => sum + s.totalValue, 0) || 0;
  const totalCommission = summaryAll?.reduce((sum, s) => sum + s.totalCommission, 0) || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Resumo Geral</h1>
        <p className="text-slate-600 mt-2">Visão consolidada de todas as declarações, comissões e desempenho por mês</p>
      </div>

      {/* Main Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-8 border-slate-200 bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50">
          <div className="text-sm font-medium text-slate-600 mb-3">Total de Declarações</div>
          <div className="text-4xl font-bold text-blue-900">{totalQuantity}</div>
          <p className="text-xs text-slate-600 mt-3">Todas as declarações registradas</p>
        </Card>

        <Card className="p-8 border-slate-200 bg-gradient-to-br from-green-50 via-green-100 to-green-50">
          <div className="text-sm font-medium text-slate-600 mb-3">Valor Total Recebido</div>
          <div className="text-4xl font-bold text-green-900">{formatValue(totalValue)}</div>
          <p className="text-xs text-slate-600 mt-3">Soma de todos os valores</p>
        </Card>

        <Card className="p-8 border-slate-200 bg-gradient-to-br from-purple-50 via-purple-100 to-purple-50">
          <div className="text-sm font-medium text-slate-600 mb-3">Comissão Total Paga</div>
          <div className="text-4xl font-bold text-purple-900">{formatValue(totalCommission)}</div>
          <p className="text-xs text-slate-600 mt-3">Status PAGO apenas</p>
        </Card>
      </div>

      {/* Summary by Month */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Resumo por Mês
          </h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="text-slate-900">Mês</TableHead>
                <TableHead className="text-slate-900 text-right">Quantidade</TableHead>
                <TableHead className="text-slate-900 text-right">Valor Recebido</TableHead>
                <TableHead className="text-slate-900 text-right">Comissão Paga</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingSummary ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : summaryAll?.length ? (
                summaryAll.map((summary) => (
                  <TableRow key={summary.month} className="border-b border-slate-200 hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-900">{summary.month}</TableCell>
                    <TableCell className="text-right text-slate-600">{summary.totalQuantity}</TableCell>
                    <TableCell className="text-right text-slate-900">{formatValue(summary.totalValue)}</TableCell>
                    <TableCell className="text-right font-medium text-slate-900">{formatValue(summary.totalCommission)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                    Nenhum dado disponível
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Collaborators Summary */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h2 className="text-xl font-semibold text-slate-900">Resumo por Colaborador</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="text-slate-900">Colaborador</TableHead>
                <TableHead className="text-slate-900 text-right">Quantidade</TableHead>
                <TableHead className="text-slate-900 text-right">Valor Recebido</TableHead>
                <TableHead className="text-slate-900 text-right">Comissão Paga</TableHead>
                <TableHead className="text-slate-900 text-right">% do Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingCommissions ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : commissions?.length ? (
                commissions.map((commission) => (
                  <TableRow key={commission.collaborator} className="border-b border-slate-200 hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-900">{commission.collaborator}</TableCell>
                    <TableCell className="text-right text-slate-600">{commission.quantity}</TableCell>
                    <TableCell className="text-right text-slate-900">{formatValue(commission.totalValue)}</TableCell>
                    <TableCell className="text-right font-medium text-slate-900">{formatValue(commission.totalCommission)}</TableCell>
                    <TableCell className="text-right text-slate-600">
                      {totalCommission > 0 ? ((commission.totalCommission / totalCommission) * 100).toFixed(1) : 0}%
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    Nenhum dado disponível
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 border-slate-200">
          <div className="text-sm text-slate-600 mb-2">Média por Declaração</div>
          <div className="text-2xl font-bold text-slate-900">
            {totalQuantity > 0 ? formatValue(Math.round(totalValue / totalQuantity)) : 'R$ 0,00'}
          </div>
        </Card>

        <Card className="p-6 border-slate-200">
          <div className="text-sm text-slate-600 mb-2">Comissão Média</div>
          <div className="text-2xl font-bold text-slate-900">
            {totalQuantity > 0 ? formatValue(Math.round(totalCommission / totalQuantity)) : 'R$ 0,00'}
          </div>
        </Card>

        <Card className="p-6 border-slate-200">
          <div className="text-sm text-slate-600 mb-2">Taxa Média de Comissão</div>
          <div className="text-2xl font-bold text-slate-900">
            {totalValue > 0 ? ((totalCommission / totalValue) * 100).toFixed(2) : 0}%
          </div>
        </Card>
      </div>
    </div>
  );
}
