import { Card } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-600 mt-2">Valores de comissão fixos do sistema</p>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6 border-slate-200 bg-blue-50">
          <h3 className="font-semibold text-slate-900 mb-4">Comissão: Diversos</h3>
          <div className="space-y-3 text-sm text-slate-600">
            <div>
              <p className="text-slate-500">Percentual:</p>
              <p className="font-bold text-2xl text-blue-900">10%</p>
            </div>
            <div className="border-t border-blue-200 pt-3">
              <p className="text-slate-500 mb-2">Exemplo de cálculo:</p>
              <div className="bg-white rounded p-3 space-y-1">
                <p>Valor Recebido: R$ 100,00</p>
                <p className="font-medium text-slate-900">
                  Comissão: R$ 10,00
                </p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 border-slate-200 bg-green-50">
          <h3 className="font-semibold text-slate-900 mb-4">Comissão: Sócio</h3>
          <div className="space-y-3 text-sm text-slate-600">
            <div>
              <p className="text-slate-500">Valor Fixo:</p>
              <p className="font-bold text-2xl text-green-900">R$ 5,00</p>
            </div>
            <div className="border-t border-green-200 pt-3">
              <p className="text-slate-500 mb-2">Exemplo de cálculo:</p>
              <div className="bg-white rounded p-3 space-y-1">
                <p>Valor Recebido: R$ 1.000,00</p>
                <p className="font-medium text-slate-900">
                  Comissão: R$ 5,00
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 border-slate-200 bg-purple-50">
        <h3 className="font-semibold text-slate-900 mb-4">Comissão: Doação</h3>
        <div className="space-y-3 text-sm text-slate-600">
          <div>
            <p className="text-slate-500">Valor de Comissão:</p>
            <p className="font-bold text-2xl text-purple-900">R$ 0,00</p>
          </div>
          <div className="border-t border-purple-200 pt-3">
            <p className="text-slate-500">Doações contam como declarações feitas pelo colaborador, mas não geram comissão.</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 border-slate-200 bg-slate-50">
        <h3 className="font-semibold text-slate-900 mb-4">Resumo das Regras</h3>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-start gap-3">
            <span className="text-blue-600 font-bold">•</span>
            <span><strong>Diversos:</strong> 10% sobre o valor recebido</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-green-600 font-bold">•</span>
            <span><strong>Sócio:</strong> R$ 5,00 fixos por declaração</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-purple-600 font-bold">•</span>
            <span><strong>Doação:</strong> Sem comissão (R$ 0,00)</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
