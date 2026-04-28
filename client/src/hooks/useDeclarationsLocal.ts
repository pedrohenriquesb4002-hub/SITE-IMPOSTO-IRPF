import { useLocalStorage } from './useLocalStorage';

export interface Declaration {
  id: string;
  month: 'Março' | 'Abril' | 'Maio';
  collaborator: string;
  cpfCliente: string;
  cliente: string;
  valorRecebido: number;
  clienteType: 'Sócio' | 'Diversos';
  comissao: number;
  statusPagamento: 'PAGO' | 'AGUARDANDO' | 'DOAÇÃO';
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  percentualDiversos: number;
  valorFixoSocio: number;
}

export function useDeclarationsLocal() {
  const [declarations, setDeclarations] = useLocalStorage<Declaration[]>('declarations', []);
  const [settings, setSettings] = useLocalStorage<Settings>('settings', {
    percentualDiversos: 10,
    valorFixoSocio: 500,
  });

  const calculateCommission = (valorRecebido: number, clienteType: 'Sócio' | 'Diversos', statusPagamento: 'PAGO' | 'AGUARDANDO' | 'DOAÇÃO'): number => {
    if (statusPagamento === 'DOAÇÃO') return 0;
    if (clienteType === 'Sócio') return settings.valorFixoSocio;
    return Math.round(valorRecebido * (settings.percentualDiversos / 100));
  };

  const addDeclaration = (data: Omit<Declaration, 'id' | 'createdAt' | 'updatedAt' | 'comissao'>) => {
    const comissao = calculateCommission(data.valorRecebido, data.clienteType, data.statusPagamento);
    const newDeclaration: Declaration = {
      ...data,
      id: Date.now().toString(),
      comissao,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDeclarations([...declarations, newDeclaration]);
    return newDeclaration;
  };

  const updateDeclaration = (id: string, data: Partial<Omit<Declaration, 'id' | 'createdAt'>>) => {
    const declaration = declarations.find(d => d.id === id);
    if (!declaration) throw new Error('Declaration not found');

    const updatedData = {
      ...declaration,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    // Recalculate commission if needed
    if (data.valorRecebido !== undefined || data.clienteType !== undefined || data.statusPagamento !== undefined) {
      updatedData.comissao = calculateCommission(
        data.valorRecebido ?? declaration.valorRecebido,
        data.clienteType ?? declaration.clienteType,
        data.statusPagamento ?? declaration.statusPagamento
      );
    }

    setDeclarations(declarations.map(d => d.id === id ? updatedData : d));
    return updatedData;
  };

  const deleteDeclaration = (id: string) => {
    setDeclarations(declarations.filter(d => d.id !== id));
  };

  const deleteAllDeclarations = () => {
    setDeclarations([]);
  };

  const getDeclarationsByMonth = (month: 'Março' | 'Abril' | 'Maio') => {
    return declarations.filter(d => d.month === month);
  };

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings({ ...settings, ...newSettings });
  };

  return {
    declarations,
    settings,
    addDeclaration,
    updateDeclaration,
    deleteDeclaration,
    deleteAllDeclarations,
    getDeclarationsByMonth,
    updateSettings,
  };
}
