import { useState } from "react";
import { Input } from "@/components/ui/input";
import { User, Mail, Phone, Lock, Image, Save } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const [form, setForm] = useState({ name: 'Usuário Admin', email: 'admin@sistema.com', phone: '(11) 99999-9999' });
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [darkMode, setDarkMode] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Alterações salvas com sucesso!');
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Configurações da Conta</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie suas informações pessoais e preferências</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Profile Photo */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Foto de Perfil</h2>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#1a7a40] flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <button type="button" className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors">
                <Image className="w-4 h-4" /> Alterar Foto
              </button>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG ou GIF (máx. 5MB)</p>
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Informações Pessoais</h2>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"><User className="w-4 h-4 text-[#1a7a40]" /> Nome Completo</label>
            <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="border-gray-300" />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"><Mail className="w-4 h-4 text-[#1a7a40]" /> Email</label>
            <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="border-gray-300" />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"><Phone className="w-4 h-4 text-[#1a7a40]" /> Telefone</label>
            <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="border-gray-300" />
          </div>
        </div>

        {/* Password */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900"><Lock className="w-4 h-4 text-[#1a7a40]" /> Alterar Senha</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual</label>
            <Input type="password" value={passwords.current} onChange={e => setPasswords({ ...passwords, current: e.target.value })} placeholder="Digite sua senha atual" className="border-gray-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
            <Input type="password" value={passwords.newPass} onChange={e => setPasswords({ ...passwords, newPass: e.target.value })} placeholder="Digite a nova senha" className="border-gray-300" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
            <Input type="password" value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} placeholder="Confirme a nova senha" className="border-gray-300" />
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Aparência</h2>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-700">Tema do Sistema</p>
              <p className="text-xs text-gray-400">Escolha entre modo claro e modo escuro</p>
            </div>
            <button
              type="button"
              onClick={() => setDarkMode(!darkMode)}
              className={`relative w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-[#1a7a40]' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${darkMode ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-4">
          <button type="button" onClick={() => toast.info('Cancelado')} className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancelar
          </button>
          <button type="submit" className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1a7a40] hover:bg-[#155f32] text-white text-sm font-medium transition-colors">
            <Save className="w-4 h-4" /> Salvar Alterações
          </button>
        </div>
      </form>
    </div>
  );
}