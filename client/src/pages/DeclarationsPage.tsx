import { useState, useCallback } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MONTHS = ['Março', 'Abril', 'Maio'] as const;

export default function DeclarationsPage() {
  const params = useParams();
  
  // Mapear paths em minúsculas para nomes dos meses em português
  const monthMap: Record<string, typeof MONTHS[number]> = {
    'marco': 'Março',
    'abril': 'Abril',
    'maio': 'Maio',
  };
  
  const month = monthMap[params.month as string] || 'Março' as typeof MONTHS[number];
  const [selectedCollaborator, setSelectedCollaborator] = useState<string | null>(null);
  
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

  const { data: allDeclarations, refetch } = trpc.declarations.listByMonth.useQuery(month);
  const { data: collaborators } = trpc.collaborators.list.useQuery();
  
  // Filtrar declarações por colaborador
  const declarations = selectedCollaborator 
    ? allDeclarations?.filter(d => d.collaborator === selectedCollaborator)
    : allDeclarations;

  // Totais filtrados - APENAS quando status = PAGO
  const totalVendas = declarations?.length || 0;
  const totalValor = declarations?.reduce((sum, d) => sum + d.valorRecebido, 0) || 0;
  const totalComissao = declarations?.reduce((sum, d) => sum + (d.statusPagamento === 'PAGO' ? (d.comissao || 0) : 0), 0) || 0;

  const createMutation = trpc.declarations.create.useMutation();
  const updateMutation = trpc.declarations.update.useMutation();
  const deleteMutation = trpc.declarations.delete.useMutation();
  const { data: settings } = trpc.settings.get.useQuery();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submitted with data:', formData);
    
    if (!formData.collaborator || !formData.cliente || !formData.valorRecebido) {
      console.log('Validation failed:', { collaborator: formData.collaborator, cliente: formData.cliente, valorRecebido: formData.valorRecebido });
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      const valorRecebidoNum = parseFloat(formData.valorRecebido);
      if (isNaN(valorRecebidoNum) || valorRecebidoNum < 0) {
        toast.error('Valor recebido não pode ser negativo');
        return;
      }
      
      // Sócios, Doações e Doações podem ter valorRecebido = 0
      if (formData.clienteType === 'Diversos' && valorRecebidoNum <= 0 && formData.statusPagamento !== 'DOAÇÃO') {
        toast.error('Valor recebido deve ser maior que 0 para vendas diversas (exceto doações)');
        return;
      }

      await createMutation.mutateAsync({
        month,
        collaborator: formData.collaborator.trim(),
        cpfCliente: formData.cpfCliente.trim(),
        cliente: formData.cliente.trim(),
        valorRecebido: Math.round(valorRecebidoNum * 100),
        clienteType: formData.clienteType,
        statusPagamento: formData.statusPagamento,
      });

      setFormData({
        collaborator: '',
        cpfCliente: '',
        cliente: '',
        valorRecebido: '',
        clienteType: 'Diversos',
        statusPagamento: 'AGUARDANDO',
      });

      refetch();
      toast.success('Declaração adicionada com sucesso');
    } catch (error) {
      console.error('Erro ao adicionar declaração:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao adicionar declaração');
    }
  };

  const handleSaveFromModal = async () => {
    if (!selectedDeclaration || !selectedDeclaration.id) return;

    if (!selectedDeclaration.collaborator || !selectedDeclaration.cliente) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      // O valorRecebido já vem em centavos do input do modal (linha 441)
      // Não fazer conversão adicional!
      const valorRecebidoEmCentavos = selectedDeclaration.valorRecebido;

      await updateMutation.mutateAsync({
        id: selectedDeclaration.id,
        collaborator: selectedDeclaration.collaborator,
        cpfCliente: selectedDeclaration.cpfCliente,
        cliente: selectedDeclaration.cliente,
        valorRecebido: valorRecebidoEmCentavos,
        clienteType: selectedDeclaration.clienteType,
        statusPagamento: selectedDeclaration.statusPagamento,
      });

      setSelectedDeclaration(null);
      refetch();
      toast.success('Declaração atualizada com sucesso');
    } catch (error) {
      toast.error('Erro ao atualizar declaração');
    }
  };

  const handleDelete = useCallback(async (id: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    try {
      await deleteMutation.mutateAsync(id);
      refetch();
      toast.success('Declaração removida');
    } catch (error) {
      toast.error('Erro ao remover declaração');
    }
  }, [deleteMutation, refetch]);

  const handleRowClick = useCallback((decl: any) => {
    setSelectedDeclaration({ ...decl });
  }, []);

  const handleDeleteAll = async () => {
    if (!declarations || declarations.length === 0) {
      toast.error('Não há declarações para remover');
      return;
    }

    setShowDeleteAllDialog(true);
  };

  const confirmDeleteAll = async () => {
    if (!declarations || declarations.length === 0) return;

    setIsDeleting(true);
    try {
      const idsToDelete = declarations.map(d => d.id);
      
      await Promise.all(
        idsToDelete.map(id => deleteMutation.mutateAsync(id))
      );
      
      setShowDeleteAllDialog(false);
      refetch();
      toast.success(`${idsToDelete.length} declarações removidas com sucesso`);
    } catch (error) {
      console.error('Erro ao remover declarações:', error);
      toast.error('Erro ao remover declarações');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatValue = (value: number) => {
    return (value / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Declarações - {month}</h1>
      </div>

      {/* Filter Section */}
      <Card className="p-4 border-slate-200 bg-slate-50">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">Filtrar por Colaborador</label>
            <Select value={selectedCollaborator || '__all__'} onValueChange={(value) => setSelectedCollaborator(value === '__all__' ? null : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os colaboradores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos os colaboradores</SelectItem>
                {collaborators?.map((collab) => (
                  <SelectItem key={collab.id} value={collab.name}>
                    {collab.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedCollaborator && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setSelectedCollaborator(null)}
              className="mb-0"
            >
              <X className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          )}
        </div>
      </Card>

      {/* Summary Cards - Totais Filtrados (APENAS PAGO) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 border-slate-200 bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="text-sm font-medium text-slate-600 mb-2">Total de Vendas</div>
          <div className="text-3xl font-bold text-blue-900">{totalVendas}</div>
        </Card>
        <Card className="p-6 border-slate-200 bg-gradient-to-br from-green-50 to-green-100">
          <div className="text-sm font-medium text-slate-600 mb-2">Valor Total Arrecadado</div>
          <div className="text-3xl font-bold text-green-900">{formatValue(totalValor)}</div>
        </Card>
        <Card className="p-6 border-slate-200 bg-gradient-to-br from-purple-50 to-purple-100">
          <div className="text-sm font-medium text-slate-600 mb-2">Total de Comissão (PAGO)</div>
          <div className="text-3xl font-bold text-purple-900">{formatValue(totalComissao)}</div>
        </Card>
      </div>

      {/* Form Card */}
      <Card className="p-6 border-slate-200">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Nova Declaração</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Colaborador *</label>
            <Select 
              value={formData.collaborator} 
              onValueChange={(value) => {
                if (value && value.trim()) {
                  setFormData({ ...formData, collaborator: value.trim() });
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o colaborador" />
              </SelectTrigger>
              <SelectContent>
                {collaborators && collaborators.length > 0 ? (
                  collaborators.map((collab) => (
                    <SelectItem key={collab.id} value={collab.name}>
                      {collab.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="__empty__" disabled>Nenhum colaborador disponível</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">CPF Cliente</label>
            <Input
              placeholder="000.000.000-00"
              value={formData.cpfCliente}
              onChange={(e) => setFormData({ ...formData, cpfCliente: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Cliente *</label>
            <Input
              placeholder="Nome do cliente"
              value={formData.cliente}
              onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Valor Recebido (R$) *</label>
            <Input
              placeholder="0.00"
              type="number"
              step="0.01"
              value={formData.valorRecebido}
              onChange={(e) => setFormData({ ...formData, valorRecebido: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Cliente</label>
            <Select value={formData.clienteType} onValueChange={(value) => setFormData({ ...formData, clienteType: value as 'Sócio' | 'Diversos' })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Diversos">Diversos</SelectItem>
                <SelectItem value="Sócio">Sócio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status de Pagamento</label>
            <Select value={formData.statusPagamento} onValueChange={(value) => setFormData({ ...formData, statusPagamento: value as 'PAGO' | 'AGUARDANDO' | 'DOAÇÃO' })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="AGUARDANDO">AGUARDANDO</SelectItem>
                <SelectItem value="PAGO">PAGO</SelectItem>
                <SelectItem value="DOAÇÃO">DOAÇÃO</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="md:col-span-2 lg:col-span-1 gap-2">
            <Plus className="w-4 h-4" />
            Adicionar Declaração
          </Button>
        </form>
      </Card>

      {/* Delete All Button */}
      {declarations && declarations.length > 0 && (
        <div className="flex justify-end">
          <Button 
            variant="destructive" 
            onClick={handleDeleteAll}
            className="gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Excluir Tudo ({declarations.length})
          </Button>
        </div>
      )}

      {/* Simplified Table Card */}
      <Card className="border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="text-slate-700">Colaborador</TableHead>
                <TableHead className="text-slate-700">CPF Cliente</TableHead>
                <TableHead className="text-slate-700">Cliente</TableHead>
                <TableHead className="text-slate-700">Status</TableHead>
                <TableHead className="text-slate-700">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {declarations?.map((decl) => (
                <TableRow 
                  key={decl.id} 
                  className="hover:bg-slate-50 cursor-pointer"
                  onClick={() => setSelectedDeclaration(decl)}
                >
                  <TableCell className="text-slate-900 font-medium">{decl.collaborator}</TableCell>
                  <TableCell className="text-slate-600">{decl.cpfCliente || '-'}</TableCell>
                  <TableCell className="text-slate-900">{decl.cliente}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      decl.statusPagamento === 'PAGO' ? 'bg-green-100 text-green-800' :
                      decl.statusPagamento === 'DOAÇÃO' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {decl.statusPagamento}
                    </span>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleDelete(decl.id)} 
                        className="h-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={!!selectedDeclaration} onOpenChange={(open) => !open && setSelectedDeclaration(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da Declaração</DialogTitle>
            <DialogDescription>
              Visualize e edite as informações da declaração
            </DialogDescription>
          </DialogHeader>

          {selectedDeclaration && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Colaborador</label>
                <Input
                  value={selectedDeclaration.collaborator}
                  onChange={(e) => setSelectedDeclaration({ ...selectedDeclaration, collaborator: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">CPF Cliente</label>
                <Input
                  value={selectedDeclaration.cpfCliente}
                  onChange={(e) => setSelectedDeclaration({ ...selectedDeclaration, cpfCliente: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                <Input
                  value={selectedDeclaration.cliente}
                  onChange={(e) => setSelectedDeclaration({ ...selectedDeclaration, cliente: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Valor Recebido (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={(selectedDeclaration.valorRecebido / 100).toFixed(2)}
                  onChange={(e) => setSelectedDeclaration({ ...selectedDeclaration, valorRecebido: Math.round(parseFloat(e.target.value) * 100) })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Cliente</label>
                <Select 
                  value={selectedDeclaration.clienteType} 
                  onValueChange={(value) => setSelectedDeclaration({ ...selectedDeclaration, clienteType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Diversos">Diversos</SelectItem>
                    <SelectItem value="Sócio">Sócio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Comissão Calculada</label>
                <div className="p-3 bg-slate-100 rounded font-semibold text-slate-900">
                  {formatValue(selectedDeclaration.comissao || 0)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status de Pagamento</label>
                <Select 
                  value={selectedDeclaration.statusPagamento} 
                  onValueChange={(value) => setSelectedDeclaration({ ...selectedDeclaration, statusPagamento: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AGUARDANDO">AGUARDANDO</SelectItem>
                    <SelectItem value="PAGO">PAGO</SelectItem>
                    <SelectItem value="DOAÇÃO">DOAÇÃO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedDeclaration(null)}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveFromModal}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Salvar Alterações
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete All Confirmation Dialog */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Excluir Todas as Declarações</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Tem certeza que deseja excluir <strong>{declarations?.length || 0} declaração(ões)</strong>? Esta ação não pode ser desfeita e todos os dados serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
            <strong>Aviso:</strong> Esta operação é irreversível. Certifique-se antes de confirmar.
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAll}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir Tudo'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
