import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function ExportPage() {
  const [isLoading, setIsLoading] = useState(false);
  const exportQuery = trpc.declarations.exportToExcel.useQuery(undefined, {
    enabled: false,
  });

  const handleExport = async () => {
    setIsLoading(true);
    try {
      const data = await exportQuery.refetch();
      
      if (!data.data) {
        toast.error('Erro ao buscar dados para exportação');
        return;
      }

      const workbook = XLSX.utils.book_new();
      const { declarations, commissions } = data.data;

      // Adicionar abas de meses
      ['Março', 'Abril', 'Maio'].forEach((month) => {
        const monthDeclarations = declarations[month as keyof typeof declarations] || [];
        
        const sheetData = monthDeclarations.map((decl: any) => ({
          'Colaborador': decl.collaborator,
          'CPF Cliente': decl.cpfCliente || '',
          'Cliente': decl.cliente,
          'Valor Recebido': decl.valorRecebido / 100,
          'Tipo': decl.clienteType,
          'Comissão': decl.comissao / 100,
          'Status': decl.statusPagamento,
        }));

        const worksheet = XLSX.utils.json_to_sheet(sheetData);
        
        // Configurar largura das colunas
        worksheet['!cols'] = [
          { wch: 15 },
          { wch: 18 },
          { wch: 20 },
          { wch: 15 },
          { wch: 12 },
          { wch: 12 },
          { wch: 12 },
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, month);
      });

      // Adicionar aba de comissões
      const commissionsData = (commissions as any[]).map((comm) => ({
        'Colaborador': comm.collaborator,
        'Março - Qtd': comm.marco.quantidade,
        'Março - Valor': comm.marco.valor / 100,
        'Março - Comissão': comm.marco.comissao / 100,
        'Abril - Qtd': comm.abril.quantidade,
        'Abril - Valor': comm.abril.valor / 100,
        'Abril - Comissão': comm.abril.comissao / 100,
        'Maio - Qtd': comm.maio.quantidade,
        'Maio - Valor': comm.maio.valor / 100,
        'Maio - Comissão': comm.maio.comissao / 100,
        'Total - Qtd': comm.total.quantidade,
        'Total - Valor': comm.total.valor / 100,
        'Total - Comissão': comm.total.comissao / 100,
      }));

      const commissionsSheet = XLSX.utils.json_to_sheet(commissionsData);
      commissionsSheet['!cols'] = [
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
      ];

      XLSX.utils.book_append_sheet(workbook, commissionsSheet, 'Comissões');

      // Gerar arquivo
      const fileName = `Controle_IRPF_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success('Planilha exportada com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar planilha');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Exportar para Excel</h1>
        <p className="text-slate-600 mt-2">Baixe um backup completo de todas as declarações e comissões</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Backup de Dados</CardTitle>
          <CardDescription>
            Exporte todas as declarações dos meses (Março, Abril, Maio) e um resumo de comissões por colaborador
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Conteúdo da exportação:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✓ Aba "Março" - Todas as declarações de Março</li>
                <li>✓ Aba "Abril" - Todas as declarações de Abril</li>
                <li>✓ Aba "Maio" - Todas as declarações de Maio</li>
                <li>✓ Aba "Comissões" - Resumo de comissões por colaborador</li>
              </ul>
            </div>

            <Button 
              onClick={handleExport}
              disabled={isLoading}
              size="lg"
              className="gap-2 w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Baixar Planilha Excel
                </>
              )}
            </Button>

            <p className="text-xs text-slate-500 text-center">
              A planilha será salva com o nome: Controle_IRPF_[data].xlsx
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Informações sobre o backup</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 space-y-2">
          <p>
            • Cada mês tem sua própria aba com todas as declarações lançadas
          </p>
          <p>
            • A aba "Comissões" mostra o resumo de quantidade, valor e comissão por colaborador
          </p>
          <p>
            • Apenas declarações com status "PAGO" contam para o total de comissão
          </p>
          <p>
            • Você pode usar este backup para recuperar dados em caso de problema no site
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
