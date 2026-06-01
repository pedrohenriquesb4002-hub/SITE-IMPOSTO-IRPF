import { useState } from 'react';
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

// Divide array em lotes de tamanho N
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

// Normaliza texto para comparação: minúsculo, sem acentos, sem espaços extras
const norm = (s: any) =>
  (s ?? '').toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim();

// Encontra índice de coluna pelo cabeçalho com correspondência flexível
function findCol(header: any[], ...patterns: string[]): number {
  for (const pat of patterns) {
    const n = norm(pat);
    const idx = header.findIndex((h: any) => norm(h).includes(n));
    if (idx >= 0) return idx;
  }
  return -1;
}

// Mapeia valor de status para enum esperado pelo backend
function parseStatus(raw: any): 'PAGO' | 'AGUARDANDO' | 'DOAÇÃO' {
  const s = norm(raw);
  if (s.includes('pago') || s === 'p') return 'PAGO';
  if (s.includes('doa')) return 'DOAÇÃO';
  return 'AGUARDANDO';
}

// Mapeia tipo de cliente
function parseTipo(raw: any): 'Sócio' | 'Diversos' {
  const s = norm(raw);
  if (s.includes('soci') || s.includes('sócio') || s === 's') return 'Sócio';
  return 'Diversos';
}

export default function ImportPage() {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState('');

  const importMutation = trpc.importData.importExcel.useMutation();
  const exportQuery = trpc.declarations.exportToExcel.useQuery(undefined, { enabled: false });

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setResult(null);
    setProgress('Lendo arquivo...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      const declarations: any[] = [];
      const collaborators = new Set<string>();

      // Tenta encontrar abas pelo nome (ignora acentos e maiúsculas)
      const findSheet = (name: string) => {
        const n = norm(name);
        const key = workbook.SheetNames.find(k => norm(k) === n || norm(k).includes(n));
        return key ? workbook.Sheets[key] : undefined;
      };

      const months: { label: 'Março' | 'Abril' | 'Maio'; aliases: string[] }[] = [
        { label: 'Março', aliases: ['março', 'marco', 'mar'] },
        { label: 'Abril', aliases: ['abril', 'abr'] },
        { label: 'Maio',  aliases: ['maio', 'mai'] },
      ];

      for (const { label, aliases } of months) {
        let sheet: XLSX.WorkSheet | undefined;
        for (const alias of aliases) {
          sheet = findSheet(alias);
          if (sheet) break;
        }
        if (!sheet) continue;

        // Tenta sheet_to_json com header:1 (array de arrays)
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
        if (!data.length) continue;

        // Encontra linha de cabeçalho (até linha 10)
        let headerRowIndex = -1;
        let headerRow: any[] = [];
        for (let i = 0; i < Math.min(10, data.length); i++) {
          const row = data[i];
          if (!row) continue;
          // Considera cabeçalho se contiver ao menos 2 células não-vazias
          const nonEmpty = row.filter((c: any) => c !== '' && c != null);
          if (nonEmpty.length >= 2) {
            const rowNorm = row.map(norm).join(' ');
            // Prefere linha que menciona colaborador, cliente, cpf ou valor
            if (
              rowNorm.includes('colab') ||
              rowNorm.includes('cliente') ||
              rowNorm.includes('cpf') ||
              rowNorm.includes('valor') ||
              rowNorm.includes('nome')
            ) {
              headerRowIndex = i;
              headerRow = row;
              break;
            }
          }
        }

        // Se não achou header com palavras-chave, usa a 1ª linha com dados
        if (headerRowIndex < 0) {
          for (let i = 0; i < Math.min(5, data.length); i++) {
            const row = data[i];
            if (row && row.filter((c: any) => c !== '' && c != null).length >= 2) {
              headerRowIndex = i;
              headerRow = row;
              break;
            }
          }
        }
        if (headerRowIndex < 0) continue;

        const idx = {
          colaborador: findCol(headerRow, 'colaborador', 'colab', 'responsavel', 'contador'),
          cliente:     findCol(headerRow, 'cliente', 'nome do cliente', 'nome', 'contribuinte'),
          cpf:         findCol(headerRow, 'cpf', 'cpf/cnpj', 'documento'),
          valor:       findCol(headerRow, 'valor recebido', 'valor', 'vl recebido', 'vl', 'honorario'),
          tipo:        findCol(headerRow, 'tipo', 'tipo cliente', 'categoria'),
          status:      findCol(headerRow, 'status', 'status pagamento', 'pagamento', 'situacao'),
        };

        // Fallback: se não achou colaborador, tenta coluna 0
        if (idx.colaborador < 0) idx.colaborador = 0;
        if (idx.cliente < 0) idx.cliente = idx.colaborador === 0 ? 1 : 0;

        for (let i = headerRowIndex + 1; i < data.length; i++) {
          const row = data[i];
          if (!row) continue;
          if (row.every((v: any) => v === null || v === undefined || v === '')) continue;

          const colaborador = idx.colaborador >= 0
            ? row[idx.colaborador]?.toString().trim()
            : null;
          if (!colaborador) continue;

          const clienteRaw = idx.cliente >= 0 ? row[idx.cliente]?.toString().trim() : '';
          const cpfRaw = idx.cpf >= 0 && row[idx.cpf] != null
            ? row[idx.cpf].toString().trim()
            : '';

          const cliente = normalizeName(clienteRaw) || normalizeName(cpfRaw) || `Cliente_${i}`;
          const cpfCliente = cpfRaw;

          const valorEmCentavos = idx.valor >= 0 ? parseValorBRL(row[idx.valor]) : 0;
          const clienteType = idx.tipo >= 0 ? parseTipo(row[idx.tipo]) : 'Diversos';
          const statusPagamento = idx.status >= 0 ? parseStatus(row[idx.status]) : 'AGUARDANDO';

          declarations.push({
            month: label,
            collaborator: colaborador,
            cpfCliente,
            cliente,
            valorRecebido: valorEmCentavos,
            clienteType,
            statusPagamento,
          });
          collaborators.add(colaborador);
        }
      }

      // Colaboradores da aba Cotas (se existir)
      const cotasSheet = findSheet('cotas');
      if (cotasSheet) {
        const data = XLSX.utils.sheet_to_json(cotasSheet, { header: 1, defval: '' }) as any[][];
        for (let i = 1; i < data.length; i++) {
          const name = data[i]?.[0]?.toString().trim();
          if (name) collaborators.add(name);
        }
      }

      if (!declarations.length) {
        toast.error('Nenhuma declaração encontrada. Verifique se a planilha tem abas chamadas Março, Abril ou Maio com dados.');
        setResult({ declarationsImported: 0, collaboratorsImported: 0, errors: ['Nenhuma declaração encontrada. Abas disponíveis: ' + workbook.SheetNames.join(', ')] });
        return;
      }

      // ── Enviar em lotes de 50 para não estourar o limite do Vercel ──────────
      const BATCH = 50;
      const batches = chunk(declarations, BATCH);
      let totalImported = 0;
      let totalCollabs = 0;
      const allErrors: string[] = [];

      // Primeiro lote envia os colaboradores; os demais mandam lista vazia
      for (let b = 0; b < batches.length; b++) {
        setProgress(`Importando lote ${b + 1} de ${batches.length}...`);
        const r = await importMutation.mutateAsync({
          declarations: batches[b],
          collaborators: b === 0 ? Array.from(collaborators) : [],
        });
        totalImported += r.declarationsImported;
        totalCollabs += r.collaboratorsImported;
        if (r.errors?.length) allErrors.push(...r.errors);
      }

      setResult({ declarationsImported: totalImported, collaboratorsImported: totalCollabs, errors: allErrors });
      if (totalImported > 0) toast.success(`✅ ${totalImported} declarações importadas!`);
      else toast.error('Nenhuma declaração foi importada. Verifique os erros abaixo.');
      if (allErrors.length) toast.error(`⚠️ ${allErrors.length} erro(s) durante importação`);

    } catch (err: any) {
      const msg = err?.message || 'Erro desconhecido';
      toast.error('Erro ao processar arquivo: ' + msg);
      setResult({ declarationsImported: 0, collaboratorsImported: 0, errors: [msg] });
    } finally {
      setIsImporting(false);
      setProgress('');
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
          'Colaborador': d.collaborator, 'Cliente': d.cliente, 'CPF': d.cpfCliente || '',
          'Valor Recebido': d.valorRecebido / 100, 'Tipo': d.clienteType,
          'Comissão': (d.comissao ?? 0) / 100, 'Status': d.statusPagamento,
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

      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
        <Info className="w-5 h-5 text-green-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-green-800">Formato aceito</p>
          <p className="text-sm text-green-700 mt-0.5">
            A planilha deve ter abas chamadas <strong>Março</strong>, <strong>Abril</strong> e/ou <strong>Maio</strong>.
            As colunas podem ter os nomes: <strong>Colaborador, Cliente, CPF, Valor Recebido, Tipo, Status</strong> — o sistema reconhece variações automaticamente.
          </p>
        </div>
      </div>

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
            {isImporting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> {progress || 'Importando...'}</>
              : <><Upload className="w-4 h-4" /> Selecionar Arquivo</>}
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