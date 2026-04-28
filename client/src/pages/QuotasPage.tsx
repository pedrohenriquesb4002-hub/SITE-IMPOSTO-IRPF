import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

export default function QuotasPage() {
  const [formData, setFormData] = useState({
    collaborator: '',
    cliente: '',
    quantidadeCotas: '8',
    meioEnvio: 'WhatsApp' as 'WhatsApp' | 'Email' | 'SMS' | 'Presencial' | 'Outro',
  });

  const { data: quotas, refetch } = trpc.quotas.list.useQuery();
  const createMutation = trpc.quotas.create.useMutation();
  const deleteMutation = trpc.quotas.delete.useMutation();
  const updateCotasMutation = trpc.quotas.updateCotasEnviadas.useMutation();
  const { data: collaborators } = trpc.collaborators.list.useQuery();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.collaborator || !formData.cliente || !formData.quantidadeCotas) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      await createMutation.mutateAsync({
        collaborator: formData.collaborator,
        cliente: formData.cliente,
        quantidadeCotas: parseInt(formData.quantidadeCotas),
        meioEnvio: formData.meioEnvio,
      });

      setFormData({
        collaborator: '',
        cliente: '',
        quantidadeCotas: '8',
        meioEnvio: 'WhatsApp',
      });

      refetch();
      toast.success('Cota adicionada com sucesso');
    } catch (error) {
      toast.error('Erro ao adicionar cota');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
      refetch();
      toast.success('Cota removida');
    } catch (error) {
      toast.error('Erro ao remover cota');
    }
  };

  const handleUpdateCotas = async (quotaId: number, quantidadeCotas: number) => {
    const newCotas = prompt(
      `Quantas cotas foram enviadas? (máximo ${quantidadeCotas})`,
      '0'
    );
    if (newCotas !== null) {
      const num = parseInt(newCotas);
      if (num >= 0 && num <= quantidadeCotas) {
        try {
          await updateCotasMutation.mutateAsync({ quotaId, cotasEnviadas: num });
          refetch();
          toast.success('Cotas atualizadas');
        } catch (error) {
          toast.error('Erro ao atualizar cotas');
        }
      } else {
        toast.error(`Digite um número entre 0 e ${quantidadeCotas}`);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Gerenciamento de Cotas</h1>
      </div>

      <Card className="p-6 border-slate-200">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Nova Cota</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Colaborador *</label>
            <Select value={formData.collaborator} onValueChange={(value) => setFormData({ ...formData, collaborator: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um colaborador" />
              </SelectTrigger>
              <SelectContent>
                {collaborators?.map((collab) => (
                  <SelectItem key={collab.id} value={collab.name}>
                    {collab.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cliente *</label>
            <Input
              value={formData.cliente}
              onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
              placeholder="Nome do cliente"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade de Cotas *</label>
            <Input
              type="number"
              min="1"
              value={formData.quantidadeCotas}
              onChange={(e) => setFormData({ ...formData, quantidadeCotas: e.target.value })}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Meio de Envio</label>
            <Select value={formData.meioEnvio} onValueChange={(value) => setFormData({ ...formData, meioEnvio: value as any })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                <SelectItem value="Email">Email</SelectItem>
                <SelectItem value="SMS">SMS</SelectItem>
                <SelectItem value="Presencial">Presencial</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="col-span-1 md:col-span-2 lg:col-span-3 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Cota
          </Button>
        </form>
      </Card>

      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-slate-700">Colaborador</TableHead>
                <TableHead className="text-slate-700">Cliente</TableHead>
                <TableHead className="text-slate-700 text-center">Cotas</TableHead>
                <TableHead className="text-slate-700">Progresso</TableHead>
                <TableHead className="text-slate-700">Meio de Envio</TableHead>
                <TableHead className="text-slate-700">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotas?.map((quota) => {
                const percentual = (quota.cotasEnviadas / quota.quantidadeCotas) * 100;
                return (
                  <TableRow key={quota.id} className="hover:bg-slate-50">
                    <TableCell className="text-slate-900 font-medium">{quota.collaborator}</TableCell>
                    <TableCell className="text-slate-900">{quota.cliente}</TableCell>
                    <TableCell className="text-slate-900 text-center font-medium">{quota.cotasEnviadas} / {quota.quantidadeCotas}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={percentual} className="w-24" />
                        <span className="text-sm text-slate-600">{Math.round(percentual)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        quota.meioEnvio === 'WhatsApp' ? 'bg-green-100 text-green-700' :
                        quota.meioEnvio === 'Email' ? 'bg-blue-100 text-blue-700' :
                        quota.meioEnvio === 'SMS' ? 'bg-purple-100 text-purple-700' :
                        quota.meioEnvio === 'Presencial' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {quota.meioEnvio}
                      </span>
                    </TableCell>
                    <TableCell className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleUpdateCotas(quota.id, quota.quantidadeCotas)} className="h-8">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(quota.id)} className="h-8">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {quotas && quotas.length > 0 && (
        <Card className="p-6 border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Resumo de Cotas</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-slate-600">Total de Cotas</p>
              <p className="text-2xl font-bold text-slate-900">
                {quotas.reduce((sum, q) => sum + q.quantidadeCotas, 0)}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-slate-600">Cotas Enviadas</p>
              <p className="text-2xl font-bold text-slate-900">
                {quotas.reduce((sum, q) => sum + q.cotasEnviadas, 0)}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm text-slate-600">Progresso Geral</p>
              <p className="text-2xl font-bold text-slate-900">
                {Math.round(
                  (quotas.reduce((sum, q) => sum + q.cotasEnviadas, 0) /
                    quotas.reduce((sum, q) => sum + q.quantidadeCotas, 0)) *
                    100
                )}
                %
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
