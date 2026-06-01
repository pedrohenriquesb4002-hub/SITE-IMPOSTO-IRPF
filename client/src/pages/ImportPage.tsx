import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Download, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ImportResult {
  declarationsImported: number;
  collaboratorsImported: number;
  errors: string[];
}

const normalizeName = (name: string) => {
  if (!name) return '';
  return name.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const parseValorBRL = (raw: any): number => {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') return Math.round(raw * 100);
  const str = raw.toString().replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.round(num * 100);
};

export default function ImportPage() {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const importMutation = trpc.importData.importExcel.useMutation();
  const exportQuery = trpc.declarations.exportToExcel.useQuery(undefined, { enabled: false });

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true); setResult(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const declarations: any[] = [];
      const collaborators = new Set<string>();

      (['Março', 'Abril', 'Maio'] as const).forEach(month => {
        const sheet = workbook.Sheets[month];
        if (!sheet) return;
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

        // Encontrar linha do cabeçalho
        let headerRowIndex = -1;
        let headerRow: any[] | null = null;
        for (let i = 0; i < Math.min(5, data.length); i++) {
          if (data[i]?.some((c: any) => c?.toString().toLowerCase().includes('colaborador'))) {
            headerRowIndex = i; headerRow = data[i]; break;
          }
        }
        if (!headerRow || headerRowIndex < 0) return;

        const idx = {
          colaborador: headerRow.findIndex((h: any) => h?.toString().toLowerCase().includes('colaborador')),
          cliente: headerRow.findIndex((h: any) => {
            const s = h?.toString().toLowerCase().trim();
            return s === 'cliente' || s === 'nome' || s === 'nome do cliente';
          }),
          cpf: headerRow.findIndex((h: any) => h?.toString().toLowerCase().trim() === 'cpf'),
          valor: headerRow.findIndex((h: any) => h?.toString().toLowerCase().includes('valor')),
          tipo: headerRow.findIndex((h: any) => h?.toString().toLowerCase().trim() === 'tipo'),
          status: headerRow.findIndex((h: any) => h?.toString().toLowerCase().trim() === 'status'),
        };

        // Se cliente não encontrado pela busca exata, tentar coluna 1 (índice 1)
        if (idx.cliente < 0) idx.cliente = 1;

        for (let i = headerRowIndex + 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.every((v: any) => v === null || v === undefined || v === '')) continue;

          const colaborador = idx.colaborador >= 0 ? row[idx.colaborador]?.toString().trim() : null;
          if (!colaborador) continue; // pula linha sem colaborador, mas NÃO para o loop

          const clienteRaw = idx.cliente >= 0 ? row[idx.cliente]?.toString().trim() : '';
          // Na planilha real, CPF e Cliente parecem estar na mesma coluna — usar cpf como cliente se cliente estiver vazio
          const cpfRaw = idx.cpf >= 0 && row[idx.cpf] != null ? row[idx.cpf].toString().trim() : '';
          // Se a coluna "Cliente" tem formato de CPF, ela é CPF; usar coluna seguinte como nome
          const isCpfInClienteCol = /^\d{3}[.\-]?\d{3}[.\-]?\d{3}[.\-]?\d{2}$/.test(clienteRaw.replace(/\D/g, '').padStart(11, '0').slice(0, 11));

          let cliente = clienteRaw;
          let cpfCliente = cpfRaw;

          // Na planilha exportada deste sistema, col 1 = Cliente (CPF/nome), col 2 = CPF
          // Detectar se col cliente na verdade é CPF
          if (isCpfInClienteCol && !cpfRaw) {
            cpfCliente = clienteRaw;
            cliente = cpfRaw || clienteRaw; // fallback
          }

          if (!cliente) cliente = cpfCliente || `Cliente_${i}`;
          cliente = normalizeName(cliente);

          const valorEmCentavos = idx.valor >= 0 ? parseValorBRL(row[idx.valor]) : 0;

          const tipoRaw = idx.tipo >= 0 ? row[idx.tipo]?.toString().trim() || '' : '';
          const clienteType: 'Sócio' | 'Diversos' =
            tipoRaw.toLowerCase().includes('sócio') || tipoRaw.toLowerCase().includes('socio') ? 'Sócio' : 'Diversos';

          const statusRaw = idx.status >= 0 ? row[idx.status]?.toString().trim().toUpperCase() || '' : 'AGUARDANDO';
          const statusPagamento: 'PAGO' | 'AGUARDANDO' | 'DOAÇÃO' =
            statusRaw.includes('PAGO') ? 'PAGO' :
            statusRaw.includes('DOA') ? 'DOAÇÃO' : 'AGUARDANDO';

          declarations.push({
            month,
            collaborator: colaborador,
            cpfCliente,
            cliente,
            valorRecebido: valorEmCentavos,
            clienteType,
            statusPagamento,
          });
          collaborators.add(colaborador);
        }
      });

      // Importar colaboradores da aba Comissões também
      const commissionsSheet = workbook.Sheets['Comissões'] || workbook.Sheets['Comissoes'];
      if (commissionsSheet) {
        const data = XLSX.utils.sheet_to_json(commissionsSheet, { header: 1 }) as any[][];
        for (let i = 1; i < data.length; i++) {
          const name = data[i]?.[0]?.toString().trim();
          if (name && name !== 'COLABORADOR' && !name.includes('RESUMO')) collaborators.add(name);
        }
      }

      // Importar colaboradores da aba Cotas
      const cotasSheet = workbook.Sheets['Cotas'];
      if (cotasSheet) {
        const data = XLSX.utils.sheet_to_json(cotasSheet, { header: 1 }) as any[][];
        for (let i = 1; i < data.length; i++) {
          const name = data[i]?.[0]?.toString().trim();
          if (name) collaborators.add(name);
        }
      }

      if (!declarations.length) {
        toast.error('Nenhuma declaração encontrada. Verifique as abas da planilha.');
        setResult({ declarationsImported: 0, collaboratorsImported: 0, errors: ['Nenhuma declaração encontrada nas abas Março, Abril ou Maio'] });
        setIsImporting(false);
        const input = document.getElementById('file-input') as HTMLInputElement;
        if (input) input.value = '';
        return;
      }

      const r = await importMutation.mutateAsync({ declarations, collaborators: Array.from(collaborators) });
      setResult({
        declarationsImported: r.declarationsImported,
        collaboratorsImported: r.collaboratorsImported,
        errors: r.errors || [],
      });
      if (r.declarationsImported > 0) toast.success(`✅ ${r.declarationsImported} declarações importadas!`);
      if (r.errors?.length) toast.error(`⚠️ ${r.errors.length} erro(s) durante importação`);
    } catch (err: any) {
      toast.error('Erro ao processar arquivo: ' + (err?.message || 'Erro desconhecido'));
      setResult({ declarationsImported: 0, collaboratorsImported: 0, errors: [err?.message || 'Erro ao processar arquivo'] });
    } finally {
      setIsImporting(false);
      const input = document.getElementById('file-input') as HTMLInputElement;
      if (input) input.value = '';
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await exportQuery.refetch();
      if (!data.data) { toast.error('Erro ao buscar dados'); return; }
      const wb = XLSX.utils.book_new();
      const { declarations, commissions } = data.data;
      ['Março', 'Abril', 'Maio'].forEach(month => {
        const rows = (declarations[month as keyof typeof declarations] || []).map((d: any) => ({
          'Colaborador': d.collaborator,
          'Cliente': d.cliente,
          'CPF': d.cpfCliente || '',
          'Valor Recebido': d.valorRecebido / 100,
          'Tipo': d.clienteType,
          'Comissão': d.comissao / 100,
          'Status': d.statusPagamento,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), month);
      });
      const commRows = (commissions as any[]).map(c => ({
        'Colaborador': c.collaborator,
        'Março Qtd': c.marco.quantidade, 'Março Valor': c.marco.valor / 100, 'Março Comissão': c.marco.comissao / 100,
        'Abril Qtd': c.abril.quantidade, 'Abril Valor': c.abril.valor / 100, 'Abril Comissão': c.abril.comissao / 100,
        'Maio Qtd': c.maio.quantidade, 'Maio Valor': c.maio.valor / 100, 'Maio Comissão': c.maio.comissao / 100,
        'Total Qtd': c.total.quantidade, 'Total Valor': c.total.valor / 100, 'Total Comissão': c.total.comissao / 100,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(commRows), 'Comissões');
      XLSX.writeFile(wb, `Controle_IRPF_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Planilha exportada!');
    } catch { toast.error('Erro ao exportar'); }
    finally { setIsExporting(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Importar/Exportar</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie seus dados através de planilhas Excel</p>
      </div>

      {/* Info Banner */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-green-800">Importante</p>
          <p className="text-sm text-green-700 mt-0.5">
            A planilha deve ter abas chamadas <strong>Março</strong>, <strong>Abril</strong> e/ou <strong>Maio</strong> com colunas: Colaborador, Cliente, CPF, Valor Recebido, Tipo, Status.
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Import */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
            <Upload className="w-7 h-7 text-[#1a7a40]" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Importar Planilha</h2>
          <p className="text-sm text-gray-500 mb-6">Importe dados de declarações a partir de uma planilha Excel (.xlsx)</p>
          <input type="file" accept=".xlsx,.xls" onChange={handleImport} disabled={isImporting} className="hidden" id="file-input" />
          <label
            htmlFor="file-input"
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white transition-colors cursor-pointer w-full justify-center ${isImporting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1a7a40] hover:bg-[#155f32]'}`}
          >
            {isImporting ? <><Loader2 className="w-4 h-4 animate-spin" /> Importando...</> : <><Upload className="w-4 h-4" /> Selecionar Arquivo</>}
          </label>

          {result && (
            <div className="mt-4 w-full text-left space-y-2">
              {result.declarationsImported > 0 && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>{result.declarationsImported}</strong> declaração(ões) importada(s)
                    {result.collaboratorsImported > 0 && ` • ${result.collaboratorsImported} colaborador(es)`}
                  </span>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    {result.errors.slice(0, 5).map((err, i) => <p key={i}>• {err}</p>)}
                    {result.errors.length > 5 && <p>• ...e mais {result.errors.length - 5} erros</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Export */}
        <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-sm flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4">
            <Download className="w-7 h-7 text-[#1a7a40]" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Exportar Planilha</h2>
          <p className="text-sm text-gray-500 mb-6">Exporte todos os dados de declarações para uma planilha Excel</p>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium text-white transition-colors w-full justify-center ${isExporting ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#1a7a40] hover:bg-[#155f32]'}`}
          >
            {isExporting ? <><Loader2 className="w-4 h-4 animate-spin" /> Exportando...</> : <><Download className="w-4 h-4" /> Exportar Dados</>}
          </button>
        </div>
      </div>
    </div>
  );
}