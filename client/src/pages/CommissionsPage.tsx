import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CommissionsPage() {
  const { data: declarationsMarcao } = trpc.declarations.listByMonth.useQuery('Março');
  const { data: declarationsAbril } = trpc.declarations.listByMonth.useQuery('Abril');
  const { data: declarationsMaio } = trpc.declarations.listByMonth.useQuery('Maio');

  const formatValue = (value: number) => {
    return (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Agrupar declarações por colaborador e calcular totais
  const groupByCollaborator = (declarations: any[] | undefined) => {
    if (!declarations) return [];
    
    const grouped: Record<string, { quantity: number; totalValue: number; totalCommission: number }> = {};
    
    declarations.forEach((decl) => {
      if (!grouped[decl.collaborator]) {
        grouped[decl.collaborator] = { quantity: 0, totalValue: 0, totalCommission: 0 };
      }
      grouped[decl.collaborator].quantity += 1;
      grouped[decl.collaborator].totalValue += decl.valorRecebido || 0;
      if (decl.statusPagamento === 'PAGO') {
        grouped[decl.collaborator].totalCommission += decl.comissao || 0;
      }
    });
    
    return Object.entries(grouped).map(([name, data]) => ({
      collaborator: name,
      ...data,
    }));
  };

  const renderMonthSummary = (declarations: any[] | undefined) => {
    const grouped = groupByCollaborator(declarations);
    const totalQuantity = grouped.reduce((sum, g) => sum + g.quantity, 0);
    
    if (!declarations) {
      return (
        <div className="text-center py-8 text-slate-500">
          Carregando dados...
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Summary Card */}
        <Card className="p-6 border-slate-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-sm font-medium text-slate-600 mb-2">Total de Vendas</div>
          <div className="text-3xl font-bold text-blue-900">{totalQuantity}</div>
        </Card>

        {/* Collaborators Summary Table */}
        <Card className="border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-200">
                  <TableHead className="text-slate-900">Colaborador</TableHead>
                  <TableHead className="text-slate-900 text-right">Quantidade de Vendas</TableHead>
                  <TableHead className="text-slate-900 text-right">Valor Total Recebido</TableHead>
                  <TableHead className="text-slate-900 text-right">Comissão Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.length > 0 ? (
                  grouped.map((group) => (
                    <TableRow key={group.collaborator} className="border-b border-slate-200 hover:bg-slate-50">
                      <TableCell className="font-medium text-slate-900">{group.collaborator}</TableCell>
                      <TableCell className="text-right text-slate-600">{group.quantity}</TableCell>
                      <TableCell className="text-right text-slate-900">{formatValue(group.totalValue)}</TableCell>
                      <TableCell className="text-right font-medium text-slate-900">{formatValue(group.totalCommission)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                      Nenhuma venda registrada neste mês
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    );
  };

  const renderMonthDetails = (month: 'Março' | 'Abril' | 'Maio', declarations: any[] | undefined) => {
    if (!declarations) {
      return (
        <div className="text-center py-8 text-slate-500">
          Carregando dados...
        </div>
      );
    }

    // Filtrar apenas declarações com status PAGO
    const paidDeclarations = declarations.filter(d => d.statusPagamento === 'PAGO');

    return (
      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="text-slate-900">Colaborador</TableHead>
                <TableHead className="text-slate-900">Cliente</TableHead>
                <TableHead className="text-slate-900 text-right">Valor Recebido</TableHead>
                <TableHead className="text-slate-900 text-right">Comissão</TableHead>
                <TableHead className="text-slate-900">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paidDeclarations.length > 0 ? (
                paidDeclarations.map((decl) => (
                  <TableRow key={decl.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-900">{decl.collaborator}</TableCell>
                    <TableCell className="text-slate-600">{decl.nomeCliente}</TableCell>
                    <TableCell className="text-right text-slate-900">{formatValue(decl.valorRecebido)}</TableCell>
                    <TableCell className="text-right font-medium text-slate-900">{formatValue(decl.comissao)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        PAGO
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    Nenhuma venda paga neste mês
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    );
  };

  const renderTotalSummary = () => {
    const allDeclarations = [
      ...(declarationsMarcao || []),
      ...(declarationsAbril || []),
      ...(declarationsMaio || []),
    ];
    
    const grouped = groupByCollaborator(allDeclarations);
    const totalQuantity = grouped.reduce((sum, g) => sum + g.quantity, 0);
    const totalValue = grouped.reduce((sum, g) => sum + g.totalValue, 0);
    const totalCommission = grouped.reduce((sum, g) => sum + g.totalCommission, 0);

    return (
      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 border-slate-200 bg-gradient-to-br from-blue-50 to-blue-100">
            <div className="text-sm font-medium text-slate-600 mb-2">Total de Vendas</div>
            <div className="text-3xl font-bold text-blue-900">{totalQuantity}</div>
          </Card>

          <Card className="p-6 border-slate-200 bg-gradient-to-br from-green-50 to-green-100">
            <div className="text-sm font-medium text-slate-600 mb-2">Valor Total Recebido</div>
            <div className="text-3xl font-bold text-green-900">{formatValue(totalValue)}</div>
          </Card>

          <Card className="p-6 border-slate-200 bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="text-sm font-medium text-slate-600 mb-2">Comissão Total (PAGO)</div>
            <div className="text-3xl font-bold text-purple-900">{formatValue(totalCommission)}</div>
          </Card>
        </div>

        {/* Total by Collaborator Table */}
        <Card className="border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b border-slate-200">
                  <TableHead className="text-slate-900">Colaborador</TableHead>
                  <TableHead className="text-slate-900 text-right">Quantidade de Vendas</TableHead>
                  <TableHead className="text-slate-900 text-right">Valor Total Recebido</TableHead>
                  <TableHead className="text-slate-900 text-right">Comissão Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.length > 0 ? (
                  grouped.map((group) => (
                    <TableRow key={group.collaborator} className="border-b border-slate-200 hover:bg-slate-50">
                      <TableCell className="font-medium text-slate-900">{group.collaborator}</TableCell>
                      <TableCell className="text-right text-slate-600">{group.quantity}</TableCell>
                      <TableCell className="text-right text-slate-900">{formatValue(group.totalValue)}</TableCell>
                      <TableCell className="text-right font-medium text-slate-900">{formatValue(group.totalCommission)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                      Nenhuma venda registrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Comissões</h1>
      </div>

      <Tabs defaultValue="total" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="total">TOTAL</TabsTrigger>
          <TabsTrigger value="marco">Março</TabsTrigger>
          <TabsTrigger value="abril">Abril</TabsTrigger>
          <TabsTrigger value="maio">Maio</TabsTrigger>
        </TabsList>

        {/* TOTAL Tab */}
        <TabsContent value="total" className="space-y-4">
          {renderTotalSummary()}
        </TabsContent>

        {/* Março Tab */}
        <TabsContent value="marco" className="space-y-4">
          {renderMonthSummary(declarationsMarcao)}
        </TabsContent>

        {/* Abril Tab */}
        <TabsContent value="abril" className="space-y-4">
          {renderMonthSummary(declarationsAbril)}
        </TabsContent>

        {/* Maio Tab */}
        <TabsContent value="maio" className="space-y-4">
          {renderMonthSummary(declarationsMaio)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
