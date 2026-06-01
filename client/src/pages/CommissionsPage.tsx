import { trpc } from "@/lib/trpc";
import { TrendingUp, DollarSign } from "lucide-react";

const fmt = (v: number) => (v / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function CommissionsPage() {
  const { data: marco } = trpc.declarations.listByMonth.useQuery('Março');
  const { data: abril } = trpc.declarations.listByMonth.useQuery('Abril');
  const { data: maio } = trpc.declarations.listByMonth.useQuery('Maio');

  const all = [...(marco || []), ...(abril || []), ...(maio || [])];

  const byCollaborator = () => {
    const map: Record<string, { total: any; marco: any; abril: any; maio: any }> = {};
    const empty = () => ({ qty: 0, value: 0, commission: 0 });

    const add = (decl: any, bucket: any) => {
      bucket.qty++;
      bucket.value += decl.valorRecebido || 0;
      if (decl.statusPagamento === 'PAGO') bucket.commission += decl.comissao || 0;
    };

    const process = (decls: any[] | undefined, key: 'marco' | 'abril' | 'maio') => {
      decls?.forEach(d => {
        if (!map[d.collaborator]) map[d.collaborator] = { total: empty(), marco: empty(), abril: empty(), maio: empty() };
        add(d, map[d.collaborator][key]);
        add(d, map[d.collaborator].total);
      });
    };

    process(marco, 'marco');
    process(abril, 'abril');
    process(maio, 'maio');
    return Object.entries(map).map(([name, data]) => ({ name, ...data }));
  };

  const collabs = byCollaborator();
  const totalQty = all.length;
  const totalValue = all.reduce((s, d) => s + (d.valorRecebido || 0), 0);
  const totalComm = all.filter(d => d.statusPagamento === 'PAGO').reduce((s, d) => s + (d.comissao || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Comissões</h1>
        <p className="text-sm text-gray-500 mt-1">Acompanhamento de vendas e comissões dos colaboradores</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1a7a40] rounded-xl p-5 text-white flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Total de Vendas</p>
            <p className="text-4xl font-bold mt-2">{totalQty}</p>
            <p className="text-xs opacity-70 mt-1">Março a Maio</p>
          </div>
          <TrendingUp className="w-8 h-8 opacity-30" />
        </div>
        <div className="bg-[#e85d1a] rounded-xl p-5 text-white flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Total Recebido</p>
            <p className="text-3xl font-bold mt-2">{fmt(totalValue)}</p>
            <p className="text-xs opacity-70 mt-1">Todos os colaboradores</p>
          </div>
          <DollarSign className="w-8 h-8 opacity-30" />
        </div>
        <div className="bg-[#2db55d] rounded-xl p-5 text-white flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Total Comissões</p>
            <p className="text-3xl font-bold mt-2">{fmt(totalComm)}</p>
            <p className="text-xs opacity-70 mt-1">Apenas pagos</p>
          </div>
          <DollarSign className="w-8 h-8 opacity-30" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase" rowSpan={2}>Colaborador</th>
                <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-l border-gray-200" colSpan={3}>Total (3 meses)</th>
                <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-l border-gray-200" colSpan={3}>Março</th>
                <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-l border-gray-200" colSpan={3}>Abril</th>
                <th className="text-center px-4 py-2 text-xs font-semibold text-gray-500 uppercase border-l border-gray-200" colSpan={3}>Maio</th>
              </tr>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
                {['Vendas', 'Recebido', 'Comissão', 'Vendas', 'Recebido', 'Comissão', 'Vendas', 'Recebido', 'Comissão', 'Vendas', 'Recebido', 'Comissão'].map((h, i) => (
                  <th key={i} className={`px-3 py-2 font-medium text-center ${i % 3 === 0 ? 'border-l border-gray-200' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {collabs.map(c => (
                <tr key={c.name} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  {[c.total, c.marco, c.abril, c.maio].map((b, i) => (
                    <>
                      <td key={`${i}q`} className={`px-3 py-3 text-center text-gray-700 ${i === 0 ? 'border-l border-gray-200' : 'border-l border-gray-200'}`}>{b.qty}</td>
                      <td key={`${i}v`} className="px-3 py-3 text-center text-gray-700">{fmt(b.value)}</td>
                      <td key={`${i}c`} className="px-3 py-3 text-center font-medium text-[#1a7a40]">{fmt(b.commission)}</td>
                    </>
                  ))}
                </tr>
              ))}
              {!collabs.length && (
                <tr><td colSpan={13} className="text-center py-10 text-gray-400">Nenhuma comissão registrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}