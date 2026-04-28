import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function CollaboratorsPage() {
  const [newName, setNewName] = useState('');
  
  const { data: collaborators, refetch } = trpc.collaborators.list.useQuery();
  const addMutation = trpc.collaborators.add.useMutation();
  const removeMutation = trpc.collaborators.remove.useMutation();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newName.trim()) {
      toast.error('Digite o nome do colaborador');
      return;
    }

    try {
      await addMutation.mutateAsync({ name: newName });
      setNewName('');
      refetch();
      toast.success('Colaborador adicionado com sucesso');
    } catch (error: any) {
      if (error.message?.includes('Unique constraint')) {
        toast.error('Este colaborador já existe');
      } else {
        toast.error('Erro ao adicionar colaborador');
      }
    }
  };

  const handleRemove = async (id: number) => {
    if (confirm('Tem certeza que deseja remover este colaborador?')) {
      try {
        await removeMutation.mutateAsync(id);
        refetch();
        toast.success('Colaborador removido');
      } catch (error) {
        toast.error('Erro ao remover colaborador');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Gestão de Colaboradores</h1>
        <p className="text-slate-600 mt-2">Adicione ou remova colaboradores da lista fixa</p>
      </div>

      {/* Add Form */}
      <Card className="p-6 border-slate-200">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Novo Colaborador</h2>
        <form onSubmit={handleAdd} className="flex gap-4">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do colaborador"
            className="flex-1"
          />
          <Button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700"
            disabled={addMutation.isPending}
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </form>
      </Card>

      {/* Collaborators List */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50">
          <h2 className="text-xl font-semibold text-slate-900">
            Lista de Colaboradores ({collaborators?.length || 0})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b border-slate-200">
                <TableHead className="text-slate-900">Nome</TableHead>
                <TableHead className="text-slate-900">Data de Criação</TableHead>
                <TableHead className="text-slate-900 w-16">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collaborators?.length ? (
                collaborators.map((collab) => (
                  <TableRow key={collab.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <TableCell className="font-medium text-slate-900">{collab.name}</TableCell>
                    <TableCell className="text-slate-600">
                      {new Date(collab.createdAt).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(collab.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                    Nenhum colaborador registrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Info Card */}
      <Card className="p-6 border-slate-200 bg-blue-50">
        <h3 className="font-semibold text-slate-900 mb-2">Informações</h3>
        <ul className="space-y-2 text-sm text-slate-600">
          <li>• Os colaboradores adicionados aqui aparecerão automaticamente na aba de Comissões</li>
          <li>• Ao remover um colaborador, seus dados históricos serão mantidos no sistema</li>
          <li>• Use nomes únicos para evitar duplicatas na lista</li>
        </ul>
      </Card>
    </div>
  );
}
