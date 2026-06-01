import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ImportResult {
  declarationsImported: number;
  collaboratorsImported: number;
  errors: string[];
}

export default function ImportPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const importMutation = trpc.import.importExcel.useMutation();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setResult(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });

      const declarations: any[] = [];
      const collaborators = new Set<string>();

      ['Março', 'Abril', 'Maio'].forEach(month => {
        const sheet = workbook.Sheets[month];
        if (sheet) {
          const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[];

          let headerRowIndex = -1;
          let headerRow: any[] | null = null;

          for (let i = 0; i < Math.min(5, data.length); i++) {
            const row = data[i];
            if (row && row.some((cell: any) => cell?.toString().toLowerCase().includes('colaborador'))) {
              headerRowIndex = i;
              headerRow = row;
              break;
            }
          }

          if (headerRow && headerRowIndex >= 0) {
            const colIndices = {
              colaborador: headerRow.findIndex((h: any) => h?.toString().toLowerCase().includes('colaborador')),
              cpf: headerRow.findIndex((h: any) => h?.toString().toLowerCase().includes('cpf')),
              cliente: headerRow.findIndex((h: any) => h?.toString().toLowerCase().trim() === 'cliente'),
              valor: headerRow.findIndex((h: any) => h?.toString().toLowerCase().includes('valor') && h?.toString().toLowerCase().includes('recebido')),
              tipo: headerRow.findIndex((h: any) => h?.toString().toLowerCase().trim() === 'tipo'),
              comissao: headerRow.findIndex((h: any) => h?.toString().toLowerCase().includes('comiss')),
              status: headerRow.findIndex((h: any) => h?.toString().toLowerCase().includes('status')),
            };

            for (let i = headerRowIndex + 1; i < data.length; i++) {
              const row = data[i];
              if (!row || !row[colIndices.colaborador]) break;

              const normalizeName = (name: string) => {
                if (!name) return '';
                return name.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
              };

              const colaborador = row[colIndices.colaborador]?.toString().trim();
              const cpfCliente = row[colIndices.cpf]?.toString().trim() || '';
              const clienteRaw = row[colIndices.cliente]?.toString().trim() || '';
              const cliente = normalizeName(clienteRaw);

              const valorRaw = row[colIndices.valor]?.toString() || '0';
              const valorCleaned = valorRaw.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim();
              const valorRecebido = parseFloat(valorCleaned) || 0;

              let clienteTypeRaw = row[colIndices.tipo]?.toString().trim() || 'Diversos';
              let clienteType = 'Diversos';
              if (clienteTypeRaw.toLowerCase().includes('sócio') || clienteTypeRaw.toLowerCase().includes('socio')) {
                clienteType = 'Sócio';
              }

              let statusPagamentoRaw = row[colIndices.status]?.toString().trim() || 'AGUARDANDO';
              let statusPagamento = 'AGUARDANDO';
              if (statusPagamentoRaw.toUpperCase().includes('PAGO')) {
                statusPagamento = 'PAGO';
              } else if (statusPagamentoRaw.toUpperCase().includes('DOAÇÃO') || statusPagamentoRaw.toUpperCase().includes('DOACAO')) {
                statusPagamento = 'DOAÇÃO';
              }

              if (colaborador && cliente) {
                const valorEmCentavos = Math.round(valorRecebido * 100);
                declarations.push({
                  month,
                  collaborator: colaborador,
                  cpfCliente,
                  cliente,
                  valorRecebido: valorEmCentavos,
                  clienteType,
                  statusPagamento: ['PAGO', 'AGUARDANDO', 'DOAÇÃO'].includes(statusPagamento) ? statusPagamento : 'AGUARDANDO',
                });
                collaborators.add(colaborador);
              }
            }
          }
        }
      });

      const commissionsSheet = workbook.Sheets['Comissoes'];
      if (commissionsSheet) {
        const data = XLSX.utils.sheet_to_json(commissionsSheet, { header: 1 }) as any[];
        for (let i = 2; i < data.length; i++) {
          const row = data[i];
          if (!row || !row[0]) break;
          const name = row[0]?.toString().trim();
          if (name && name !== 'COLABORADOR' && name !== '⚙️  RESUMO TOTAL (MARÇO A MAIO)') {
            collaborators.add(name);
          }
        }
      }

      const importResult = await importMutation.mutateAsync({
        declarations,
        collaborators: Array.from(collaborators),
      });

      setResult({
        declarationsImported: importResult.declarationsImported,
        collaboratorsImported: importResult.collaboratorsImported,
        errors: importResult.errors || [],
      });

      if (importResult.declarationsImported > 0) {
        toast.success(`✅ ${importResult.declarationsImported} declarações importadas com sucesso!`);
      }
      if (importResult.errors && importResult.errors.length > 0) {
        toast.error(`⚠️ ${importResult.errors.length} erro(s) durante a importação`);
      }
    } catch (error) {
      console.error('Erro ao importar:', error);
      toast.error('Erro ao processar arquivo Excel');
      setResult({
        declarationsImported: 0,
        collaboratorsImported: 0,
        errors: ['Erro ao processar arquivo'],
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Importar Declarações do Excel</CardTitle>
          <CardDescription>
            Selecione um arquivo Excel com as declarações de vendas para importar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-accent/50 transition-colors">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={isLoading}
              className="hidden"
              id="file-input"
            />
            <label htmlFor="file-input" className="cursor-pointer">
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold">Clique para selecionar arquivo</p>
              <p className="text-sm text-muted-foreground">ou arraste um arquivo Excel aqui</p>
            </label>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processando arquivo...</span>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {result.declarationsImported > 0 && (
                <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-green-900">Importação Bem-sucedida!</p>
                    <p className="text-sm text-green-800">{result.declarationsImported} declaração(ões) importada(s)</p>
                    {result.collaboratorsImported > 0 && (
                      <p className="text-sm text-green-800">{result.collaboratorsImported} colaborador(es) adicionado(s)</p>
                    )}
                  </div>
                </div>
              )}

              {result.errors && result.errors.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-red-900">Erros na Importação</p>
                    {result.errors.map((error, idx) => (
                      <p key={idx} className="text-sm text-red-800">• {error}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <Card className="bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-base">Formato esperado do Excel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>Sua planilha deve conter:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>Abas por mês:</strong> Março, Abril, Maio</li>
                <li><strong>Colunas necessárias:</strong> Colaborador, CPF, Cliente, Valor Recebido, Tipo, Status</li>
                <li><strong>Tipo:</strong> "Sócio" ou "Diversos"</li>
                <li><strong>Status:</strong> "PAGO", "AGUARDANDO" ou "DOAÇÃO"</li>
              </ul>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}