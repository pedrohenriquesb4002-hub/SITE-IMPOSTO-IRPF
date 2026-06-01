import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, FileText, DollarSign, Receipt } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ItrMonth = 'Agosto' | 'Setembro';

const fmt = (v: number) => (v / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ITRPage() {
  const [month, setMonth] = useState<ItrMonth>('Agosto');

  const [formData, setFormData] = useState({
    collaborator: '',
    cpfCliente: '',
    cliente: '',
    valorRecebido: '',
    clienteType: 'Diversos' as 'Sócio' | 'Diversos',
    statusPagamento: 'AGUARDANDO' as 'PAGO' | 'AGUARDANDO' | 'DOAÇÃO',
  });

  const [selectedDeclaration, setSelectedDeclaration] = useState<any>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: declarations, refetch } = trpc.itr.listByMonth.useQuery(month);
  const { data: collaborators } = trpc.collaborators.list.useQuery();
  const createMutation = trpc.itr.create.useMutation();
  const updateMutation = trpc.itr.update.useMutation();
  const deleteMutation = trpc.itr.delete.useMutation();

  const totalVendas = declarations?.length || 0;
  const totalValor = declarations?.reduce((s, d) => s + d.valorRecebido, 0) || 0;
  const declaracoesPagas = declarations?.filter(d => d.statusPagamento === 'PAGO').length || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.collaborator || !formData.cliente || !formData.valorRecebido) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    try {
      const val = parseFloat(formData.valorRecebido);
      if (isNaN(val) || val < 0) { toast.error('Valor inválido'); return; }
      await createMutation.mutateAsync({
        month,
        collaborator: formData.collaborator.trim(),
        cpfCliente: formData.cpfCliente.trim(),
        cliente: formData.cliente.trim(),
        valorRecebido: Math.round(val * 100),
        clienteType: formData.clienteType,
        statusPagamento: formData.statusPagamento,
      });
      setFormData({ collaborator: '', cpfCliente: '', cliente: '', valorRecebido: '', clienteType: 'Diversos', statusPagamento: 'AGUARDANDO' });
      refetch();
      toast.success('Declaração adicionada!');
    } catch {
      toast.error('Erro ao adicionar declaração');
    }
  };

  const handleSaveModal = async () => {
    if (!selectedDeclaration?.id) return;
    try {
      await updateMutation.mutateAsync({
        id: selectedDeclaration.id,
        collaborator: selectedDeclaration.collaborator,
        cpfCliente: selectedDeclaration.cpfCliente,
        cliente: selectedDeclaration.cliente,
        valorRecebido: selectedDeclaration.valorRecebido,
        clienteType: selectedDeclaration.clienteType,
        statusPagamento: selectedDeclaration.statusPagamento,
      });
      setSelectedDeclaration(null);
      refetch();
      toast.success('Declaração atualizada!');
    } catch {
      toast.error('Erro ao atualizar');
    }
  };

  const handleDelete = useCallback(async (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await deleteMutation.mutateAsync(id);
      refetch();
      toast.success('Removida');
    } catch {
      toast.error('Erro ao remover');
    }
  }, [deleteMutation, refetch]);

  const confirmDeleteAll = async () => {
    if (!declarations?.length) return;
    setIsDeleting(true);
    try {
      await Promise.all(declarations.map(d => deleteMutation.mutateAsync(d.id)));
      setShowDeleteAllDialog(false);
      refetch();
      toast.success('Todas as declarações removidas');
    } catch {
      toast.error('Erro ao remover');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">ITR - {month}</h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1a7a40] inline-block animate-pulse" />
            Lançamento de Declarações
          </p>
        </div>
        <button
          onClick={() => declarations?.length && setShowDeleteAllDialog(true)}
          className="flex items-center gap-2 bg-[#e85d1a] hover:bg-[#c94d12] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Trash2 className="w-4 h-4" /> Excluir Todas
        </button>
      </div>

      {/* Seletor de Mês */}
      <Tabs value={month} onValueChange={(v) => setMonth(v as ItrMonth)}>
        <TabsList className="bg-muted">
          <TabsTrigger value="Agosto">Agosto</TabsTrigger>
          <TabsTrigger value="Setembro">Setembro</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Nova Declaração */}
      <div className="bg-card rounded-xl border-2 border-border p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl bg-[#1a7a40]/10 flex items-center justify-center">
            <Plus className="w-4 h-4 text-[#1a7a40]" />
          </div>
          <h2 className="text-base font-bold text-foreground">Nova Declaração</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Colaborador</label>
              <Select value={formData.collaborator} onValueChange={(v) => setFormData({ ...formData, collaborator: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {collaborators?.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Nome do Cliente</label>
              <Input
                placeholder="Digite o nome"
                value={formData.cliente}
                onChange={e => setFormData({ ...formData, cliente: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">CPF</label>
              <Input
                placeholder="000.000.000-00"
                value={formData.cpfCliente}
                onChange={e => setFormData({ ...formData, cpfCliente: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Valor Recebido</label>
              <Input
                placeholder="R$ 0,00"
                type="number"
                step="0.01"
                value={formData.valorRecebido}
                onChange={e => setFormData({ ...formData, valorRecebido: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Tipo</label>
              <Select value={formData.clienteType} onValueChange={(v) => setFormData({ ...formData, clienteType: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sócio">Sócio</SelectItem>
                  <SelectItem value="Diversos">Diversos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Status</label>
              <Select value={formData.statusPagamento} onValueChange={(v) => setFormData({ ...formData, statusPagamento: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AGUARDANDO">Aguardando</SelectItem>
                  <SelectItem value="PAGO">Pago</SelectItem>
                  <SelectItem value="DOAÇÃO">Doação</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex items-center gap-2 bg-[#1a7a40] hover:bg-[#155f32] disabled:opacity-60 text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            {createMutation.isPending ? 'Adicionando...' : 'Adicionar Declaração'}
          </button>
        </form>
      </div>

      {/* Tabela */}
      <div className="bg-card rounded-xl border-2 border-border shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Colaborador</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">CPF</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {declarations?.map(decl => (
                <tr
                  key={decl.id}
                  className="hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedDeclaration({ ...decl })}
                >
                  <td className="px-4 py-3 font-medium text-foreground">{decl.collaborator}</td>
                  <td className="px-4 py-3 text-foreground">{decl.cliente}</td>
                  <td className="px-4 py-3 text-muted-foreground">{decl.cpfCliente || '-'}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{fmt(decl.valorRecebido)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      decl.clienteType === 'Sócio'
                        ? 'bg-[#e85d1a] text-white'
                        : 'bg-orange-500 text-white'
                    }`}>
                      {decl.clienteType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      decl.statusPagamento === 'PAGO'
                        ? 'border-green-400 text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400'
                        : decl.statusPagamento === 'DOAÇÃO'
                        ? 'border-blue-400 text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'border-orange-400 text-orange-700 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400'
                    }`}>
                      {decl.statusPagamento === 'PAGO' ? 'Pago' : decl.statusPagamento === 'DOAÇÃO' ? 'Doação' : 'Aguardando'}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedDeclaration({ ...decl })}
                        className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(decl.id, e)}
                        className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!declarations?.length && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-muted-foreground">
                    Nenhuma declaração registrada para {month}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1a7a40] rounded-xl p-5 text-white flex justify-between items-start shadow-lg">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Total de Declarações</p>
            <p className="text-4xl font-bold mt-2">{totalVendas}</p>
            <p className="text-xs opacity-70 mt-1">Registradas no sistema</p>
          </div>
          <FileText className="w-8 h-8 opacity-30" />
        </div>
        <div className="bg-[#e85d1a] rounded-xl p-5 text-white flex justify-between items-start shadow-lg">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Total Recebido</p>
            <p className="text-3xl font-bold mt-2">{fmt(totalValor)}</p>
            <p className="text-xs opacity-70 mt-1">Valor total arrecadado</p>
          </div>
          <DollarSign className="w-8 h-8 opacity-30" />
        </div>
        <div className="bg-[#2db55d] rounded-xl p-5 text-white flex justify-between items-start shadow-lg">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Declarações Pagas</p>
            <p className="text-4xl font-bold mt-2">{declaracoesPagas}</p>
            <p className="text-xs opacity-70 mt-1">Pagamentos confirmados</p>
          </div>
          <Receipt className="w-8 h-8 opacity-30" />
        </div>
      </div>

      {/* Modal de Edição */}
      <Dialog open={!!selectedDeclaration} onOpenChange={open => !open && setSelectedDeclaration(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Declaração ITR</DialogTitle>
            <DialogDescription>Altere os dados e salve</DialogDescription>
          </DialogHeader>
          {selectedDeclaration && (
            <div className="space-y-3">
              {[
                { label: 'Colaborador', key: 'collaborator' },
                { label: 'CPF Cliente', key: 'cpfCliente' },
                { label: 'Cliente', key: 'cliente' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-foreground mb-1">{f.label}</label>
                  <Input
                    value={selectedDeclaration[f.key] || ''}
                    onChange={e => setSelectedDeclaration({ ...selectedDeclaration, [f.key]: e.target.value })}
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Valor Recebido (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={(selectedDeclaration.valorRecebido / 100).toFixed(2)}
                  onChange={e => setSelectedDeclaration({ ...selectedDeclaration, valorRecebido: Math.round(parseFloat(e.target.value) * 100) })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Tipo</label>
                <Select
                  value={selectedDeclaration.clienteType}
                  onValueChange={v => setSelectedDeclaration({ ...selectedDeclaration, clienteType: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Diversos">Diversos</SelectItem>
                    <SelectItem value="Sócio">Sócio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Status</label>
                <Select
                  value={selectedDeclaration.statusPagamento}
                  onValueChange={v => setSelectedDeclaration({ ...selectedDeclaration, statusPagamento: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AGUARDANDO">Aguardando</SelectItem>
                    <SelectItem value="PAGO">Pago</SelectItem>
                    <SelectItem value="DOAÇÃO">Doação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setSelectedDeclaration(null)}
                  className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveModal}
                  disabled={updateMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-[#1a7a40] text-white text-sm hover:bg-[#155f32] disabled:opacity-60 transition-colors"
                >
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmar Excluir Todas */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Excluir Todas as Declarações</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. {declarations?.length} declaração(ões) de {month} serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAll}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir Tudo'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}