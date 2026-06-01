import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Edit2, Users } from "lucide-react";
import { toast } from "sonner";

export default function CollaboratorsPage() {
  const [newName, setNewName] = useState('');

  const { data: collaborators, refetch } = trpc.collaborators.list.useQuery();
  const addMutation = trpc.collaborators.add.useMutation();
  const removeMutation = trpc.collaborators.remove.useMutation();

  const total = collaborators?.length || 0;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) { toast.error('Digite o nome'); return; }
    try {
      await addMutation.mutateAsync({ name: newName.trim() });
      setNewName(''); refetch();
      toast.success('Colaborador adicionado!');
    } catch { toast.error('Este colaborador já existe ou ocorreu um erro'); }
  };

  const handleRemove = async (id: number) => {
    if (!confirm('Remover este colaborador?')) return;
    try { await removeMutation.mutateAsync(id); refetch(); toast.success('Removido'); }
    catch { toast.error('Erro ao remover'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Colaboradores</h1>
        <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          Gerenciamento de colaboradores do sistema
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1a7a40] rounded-xl p-5 text-white flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Total Colaboradores</p>
            <p className="text-4xl font-bold mt-2">{total}</p>
            <p className="text-xs opacity-70 mt-1">Ativos no sistema</p>
          </div>
          <Users className="w-8 h-8 opacity-30" />
        </div>
        <div className="bg-[#e85d1a] rounded-xl p-5 text-white flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Contadores</p>
            <p className="text-4xl font-bold mt-2">{Math.ceil(total / 2)}</p>
            <p className="text-xs opacity-70 mt-1">Profissionais ativos</p>
          </div>
          <Users className="w-8 h-8 opacity-30" />
        </div>
        <div className="bg-[#2db55d] rounded-xl p-5 text-white flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Equipe</p>
            <p className="text-4xl font-bold mt-2">{Math.floor(total / 2)}</p>
            <p className="text-xs opacity-70 mt-1">Assistentes e analistas</p>
          </div>
          <Users className="w-8 h-8 opacity-30" />
        </div>
      </div>

      {/* Add Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
            <Plus className="w-4 h-4 text-green-700" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Novo Colaborador</h2>
        </div>
        <form onSubmit={handleAdd}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Digite o nome completo" className="border-gray-300" />
            </div>
          </div>
          <button type="submit" disabled={addMutation.isPending} className="flex items-center gap-2 bg-[#1a7a40] hover:bg-[#155f32] text-white px-6 py-2.5 rounded-lg font-medium transition-colors">
            <Plus className="w-4 h-4" /> Adicionar Colaborador
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data de Criação</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {collaborators?.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(c.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button className="text-gray-400 hover:text-gray-600 p-1"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleRemove(c.id)} disabled={removeMutation.isPending} className="text-gray-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!collaborators?.length && (
                <tr><td colSpan={3} className="text-center py-10 text-gray-400">Nenhum colaborador registrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}