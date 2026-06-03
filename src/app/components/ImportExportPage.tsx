import { useState } from 'react'
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { api } from '../../lib/store'

export default function ImportExportPage() {
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null)

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.xlsx,.xls,.csv'
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      setImporting(true)
      setImportResult(null)
      try {
        const buffer = await file.arrayBuffer()
        const wb = XLSX.read(buffer, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws)

        const monthMap: Record<string, string> = {
          marco: 'Março', março: 'Março', marco_: 'Março',
          abril: 'Abril', maio: 'Maio',
          agosto: 'Agosto', setembro: 'Setembro',
        }
        const statusMap: Record<string, string> = {
          pago: 'PAGO', aguardando: 'AGUARDANDO', doação: 'DOAÇÃO', doacao: 'DOAÇÃO',
        }

        const declarations: unknown[] = []
        const collaboratorSet = new Set<string>()

        for (const row of rows) {
          const collab = String(row['Colaborador'] || row['colaborador'] || '').trim()
          const cliente = String(row['Cliente'] || row['cliente'] || '').trim()
          const cpf = String(row['CPF'] || row['cpf'] || '').trim()
          const valor = parseFloat(String(row['Valor'] || row['valor'] || '0').replace(',', '.'))
          const tipo = String(row['Tipo'] || row['tipo'] || 'Sócio').trim()
          const statusRaw = String(row['Status'] || row['status'] || 'AGUARDANDO').trim().toLowerCase()
          const mesRaw = String(row['Mês'] || row['mes'] || row['Mês'] || '').trim().toLowerCase()
          const categoria = String(row['Categoria'] || row['categoria'] || 'IRPF').trim().toUpperCase()
          const status = statusMap[statusRaw] || 'AGUARDANDO'
          const mes = monthMap[mesRaw] || mesRaw

          if (!collab || !cliente) continue
          collaboratorSet.add(collab)
          declarations.push({ collaborator: collab, cliente, cpfCliente: cpf, valorRecebido: Math.round(valor * 100), clienteType: tipo, statusPagamento: status, month: mes, categoria })
        }

        const result = await api.importExcel({
          declarations,
          collaborators: Array.from(collaboratorSet),
        }) as { imported: number; errors: string[] }
        setImportResult(result)
        toast.success(`${result.imported} declarações importadas`)
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Erro ao importar')
      } finally {
        setImporting(false)
      }
    }
    input.click()
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const data = await api.exportExcel() as {
        irpf: Record<string, unknown[]>
        itr: Record<string, unknown[]>
        commissions: unknown[]
      }

      const wb = XLSX.utils.book_new()

      // IRPF sheets per month
      const irpfMonths = ['Março', 'Abril', 'Maio']
      irpfMonths.forEach((m) => {
        const decls = (data.irpf?.[m] || []) as Array<Record<string, unknown>>
        if (decls.length > 0) {
          const rows = decls.map((d) => ({
            Colaborador: d.collaborator,
            Cliente: d.cliente,
            CPF: d.cpfCliente,
            'Valor (R$)': ((Number(d.valorRecebido) || 0) / 100).toFixed(2),
            Tipo: d.clienteType,
            Status: d.statusPagamento,
            'Comissão (R$)': ((Number(d.comissao) || 0) / 100).toFixed(2),
            Mês: d.month,
            Categoria: 'IRPF',
          }))
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), `IRPF-${m}`)
        }
      })

      // ITR sheets per month
      const itrMonths = ['Agosto', 'Setembro']
      itrMonths.forEach((m) => {
        const decls = (data.itr?.[m] || []) as Array<Record<string, unknown>>
        if (decls.length > 0) {
          const rows = decls.map((d) => ({
            Colaborador: d.collaborator,
            Cliente: d.cliente,
            CPF: d.cpfCliente,
            'Valor (R$)': ((Number(d.valorRecebido) || 0) / 100).toFixed(2),
            Tipo: d.clienteType,
            Status: d.statusPagamento,
            'Comissão (R$)': ((Number(d.comissao) || 0) / 100).toFixed(2),
            Mês: d.month,
            Categoria: 'ITR',
          }))
          XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), `ITR-${m}`)
        }
      })

      // Commissions summary
      if (data.commissions?.length > 0) {
        const comRows = (data.commissions as Array<Record<string, unknown>>).map((c) => ({
          Colaborador: c.collaborator,
          'Total Vendas': c.totalVendas,
          'Total Recebido (R$)': ((Number(c.totalRecebido) || 0) / 100).toFixed(2),
          'Total Comissão (R$)': ((Number(c.totalComissao) || 0) / 100).toFixed(2),
        }))
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(comRows), 'Comissões')
      }

      const date = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `IRPF-ITR-${date}.xlsx`)
      toast.success('Exportado com sucesso!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao exportar')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-8 bg-gradient-to-br from-background via-muted/20 to-background min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Importar/Exportar</h2>
          <p className="text-muted-foreground mt-1">Gerencie seus dados através de planilhas Excel</p>
        </div>

        <div className="bg-gradient-to-r from-primary/10 to-chart-1/10 border border-primary/20 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h3 className="text-foreground mb-1">Importante</h3>
              <p className="text-sm text-muted-foreground">
                Certifique-se de que sua planilha Excel está no formato correto antes de importar.
                Ao exportar, todos os dados atuais serão incluídos no arquivo.
              </p>
            </div>
          </div>
        </div>

        {importResult && (
          <div className={`border rounded-lg p-5 flex items-start gap-3 ${
            importResult.errors.length === 0
              ? 'bg-success/10 border-success/20'
              : 'bg-warning/10 border-warning/20'
          }`}>
            <CheckCircle className="w-5 h-5 text-success mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">{importResult.imported} declarações importadas</p>
              {importResult.errors.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {importResult.errors.map((e, i) => <li key={i} className="text-sm text-muted-foreground">• {e}</li>)}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border-2 border-border rounded-2xl p-8 shadow-xl hover:shadow-md transition-shadow">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl text-foreground mb-2">Importar Planilha</h3>
                <p className="text-sm text-muted-foreground">
                  Importe dados a partir de uma planilha Excel (.xlsx, .xls, .csv)
                </p>
              </div>
              <button
                onClick={handleImport}
                disabled={importing}
                className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {importing ? (
                  <><svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg> Importando...</>
                ) : (
                  <><Upload className="w-5 h-5" /> Selecionar Arquivo</>
                )}
              </button>
            </div>
          </div>

          <div className="bg-card border-2 border-border rounded-2xl p-8 shadow-xl hover:shadow-md transition-shadow">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center">
                <Download className="w-8 h-8 text-success" />
              </div>
              <div>
                <h3 className="text-xl text-foreground mb-2">Exportar Planilha</h3>
                <p className="text-sm text-muted-foreground">
                  Exporte todos os dados de declarações para uma planilha Excel
                </p>
              </div>
              <button
                onClick={handleExport}
                disabled={exporting}
                className="w-full px-6 py-3 bg-success text-success-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {exporting ? (
                  <><svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg> Exportando...</>
                ) : (
                  <><Download className="w-5 h-5" /> Exportar Dados</>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-xl">
          <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Formato da Planilha para Importação
          </h3>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Sua planilha deve conter as seguintes colunas (na primeira linha):</p>
            <ul className="space-y-2 ml-4">
              <li>• <span className="text-foreground font-medium">Colaborador</span> — Nome do colaborador</li>
              <li>• <span className="text-foreground font-medium">Cliente</span> — Nome do cliente</li>
              <li>• <span className="text-foreground font-medium">CPF</span> — CPF do cliente</li>
              <li>• <span className="text-foreground font-medium">Valor</span> — Valor recebido (numérico)</li>
              <li>• <span className="text-foreground font-medium">Tipo</span> — Sócio ou Diversos</li>
              <li>• <span className="text-foreground font-medium">Status</span> — Pago, Aguardando ou Doação</li>
              <li>• <span className="text-foreground font-medium">Mês</span> — Março, Abril, Maio, Agosto ou Setembro</li>
              <li>• <span className="text-foreground font-medium">Categoria</span> — IRPF ou ITR</li>
            </ul>
          </div>
        </div>

        {/* Sample table */}
        <div className="bg-card border-2 border-border rounded-2xl overflow-hidden shadow-xl">
          <div className="bg-muted px-6 py-4 border-b border-border">
            <h3 className="text-sm text-foreground">Exemplo de Planilha</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {['Colaborador','Cliente','CPF','Valor','Tipo','Status','Mês','Categoria'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-foreground">João Silva</td>
                  <td className="px-4 py-3 text-foreground">Maria Santos</td>
                  <td className="px-4 py-3 text-foreground">123.456.789-00</td>
                  <td className="px-4 py-3 text-foreground">350</td>
                  <td className="px-4 py-3 text-foreground">Sócio</td>
                  <td className="px-4 py-3 text-foreground">Pago</td>
                  <td className="px-4 py-3 text-foreground">Março</td>
                  <td className="px-4 py-3 text-foreground">IRPF</td>
                </tr>
                <tr className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-foreground">Ana Paula</td>
                  <td className="px-4 py-3 text-foreground">Carlos Oliveira</td>
                  <td className="px-4 py-3 text-foreground">987.654.321-00</td>
                  <td className="px-4 py-3 text-foreground">250</td>
                  <td className="px-4 py-3 text-foreground">Diversos</td>
                  <td className="px-4 py-3 text-foreground">Aguardando</td>
                  <td className="px-4 py-3 text-foreground">Agosto</td>
                  <td className="px-4 py-3 text-foreground">ITR</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
