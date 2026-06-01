import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function QuotasPage() {
  const [nome, setNome] = useState('');
  const [total, setTotal] = useState('');

  const { data: quotas, refetch } = trpc.quotas.list.useQuery();
  const createMutation = trpc.quotas.create.useMutation();
  const deleteMutation = trpc.quotas.delete.useMutation();
  const updateMutation = trpc.quotas.updateCotasEnviadas.useMutation();

  const totalCotas = quotas?.reduce((s, q) => s + q.quantidadeCotas, 0) || 0;
  const totalEnviadas = quotas?.reduce((s, q) => s + q.cotasEnviadas, 0) || 0;
  const concluidos = quotas?.filter(q => q.cotasEnviadas >= q.quantidadeCotas).length || 0;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !total) { toast.error('Preencha todos os campos'); return; }
    try {
      await createMutation.mutateAsync({ collaborator: 'Admin', cliente: nome.trim(), quantidadeCotas: parseInt(total), meioEnvio: 'WhatsApp' });
      setNome(''); setTotal(''); refetch();
      toast.success('Cliente adicionado!');
    } catch { toast.error('Erro ao adicionar'); }
  };

  const handleDelete = async (id: number) => {
    try { await deleteMutation.mutateAsync(id); refetch(); toast.success('Removido'); }
    catch { toast.error('Erro ao remover'); }
  };

  const handleUpdateCotas = async (quotaId: number, current: number, max: number, delta: number) => {
    const next = Math.max(0, Math.min(max, current + delta));
    try { await updateMutation.mutateAsync({ quotaId, cotasEnviadas: next }); refetch(); }
    catch { toast.error('Erro ao atualizar'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Quotas de Impostos</h1>
        <p className="text-sm text-gray-500 mt-1">Gerenciamento de quotas dos clientes</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total de Quotas', value: totalCotas, sub: `${quotas?.length || 0} clientes` },
          { label: 'Quotas Enviadas', value: totalEnviadas, sub: totalCotas ? `${Math.round(totalEnviadas / totalCotas * 100)}% do total` : '0%' },
          { label: 'Clientes Concluídos', value: concluidos, sub: quotas?.length ? `${Math.round(concluidos / quotas.length * 100)}% completo` : '0%' },
        ].map((c, i) => (
          <div key={i} className="bg-[#2db55d] rounded-xl p-5 text-white">
            <p className="text-sm opacity-80">{c.label}</p>
            <p className="text-4xl font-bold mt-2">{c.value}</p>
            <p className="text-xs opacity-70 mt-1">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Add Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Adicionar Cliente</h2>
        <form onSubmit={handleAdd} className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Cliente</label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Digite o nome do cliente" className="border-gray-300" />
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Total de Quotas</label>
            <Input type="number" value={total} onChange={e => setTotal(e.target.value)} placeholder="Número de quotas" className="border-gray-300" />
          </div>
          <div className="flex items-end">
            <button type="submit" className="flex items-center gap-2 bg-[#1a7a40] hover:bg-[#155f32] text-white px-5 py-2.5 rounded-lg font-medium transition-colors whitespace-nowrap">
              <Plus className="w-4 h-4" /> Adicionar Cliente
            </button>
          </div>
        </form>
      </div>

      {/* Quota Cards */}
      <div className="space-y-4">
        {quotas?.map(q => {
          const pct = q.quantidadeCotas > 0 ? (q.cotasEnviadas / q.quantidadeCotas) * 100 : 0;
          const done = q.cotasEnviadas >= q.quantidadeCotas;
          return (
            <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{q.cliente}</h3>
                  {done && (
                    <span className="flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> Concluído
                    </span>
                  )}
                </div>
                <button onClick={() => handleDelete(q.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-3">{q.cotasEnviadas} de {q.quantidadeCotas} quotas enviadas</p>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: done ? '#2db55d' : '#e85d1a' }}
                />
              </div>
              <div className="flex justify-between items-center mt-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateCotas(q.id, q.cotasEnviadas, q.quantidadeCotas, -1)}
                    className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                  >-</button>
                  <span className="text-lg font-semibold text-gray-900 w-8 text-center">{q.cotasEnviadas}</span>
                  <button
                    onClick={() => handleUpdateCotas(q.id, q.cotasEnviadas, q.quantidadeCotas, 1)}
                    className="w-7 h-7 rounded-full bg-[#1a7a40] flex items-center justify-center text-white hover:bg-[#155f32]"
                  >+</button>
                  <span className="text-sm text-gray-500">quotas enviadas</span>
                </div>
                <span className="text-sm font-medium text-gray-500">{Math.round(pct)}%</span>
              </div>
            </div>
          );
        })}
        {!quotas?.length && (
          <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-gray-200">Nenhum cliente registrado</div>
        )}
      </div>
    </div>
  );
}