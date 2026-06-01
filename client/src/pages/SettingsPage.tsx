import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { User, Mail, Phone, Lock, Image, Save, Moon, Sun } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = 'irpf_settings';

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

function saveSettings(data: any) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

export default function SettingsPage() {
  const saved = loadSettings();
  const [form, setForm] = useState({
    name: saved?.name || 'Usuário Admin',
    email: saved?.email || 'admin@sistema.com',
    phone: saved?.phone || '(11) 99999-9999',
  });
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [darkMode, setDarkMode] = useState(() => {
    return saved?.darkMode ?? document.documentElement.classList.contains('dark');
  });
  const [avatarUrl, setAvatarUrl] = useState<string>(saved?.avatarUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Aplicar dark mode no DOM quando o estado muda
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx. 5MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setAvatarUrl(url);
      toast.success('Foto carregada! Clique em "Salvar Alterações" para confirmar.');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (passwords.newPass) {
      if (!passwords.current) { toast.error('Digite a senha atual'); return; }
      if (passwords.newPass !== passwords.confirm) { toast.error('As senhas não coincidem'); return; }
      if (passwords.newPass.length < 6) { toast.error('Senha deve ter pelo menos 6 caracteres'); return; }
    }

    saveSettings({ name: form.name, email: form.email, phone: form.phone, darkMode, avatarUrl });
    setPasswords({ current: '', newPass: '', confirm: '' });
    toast.success('Alterações salvas com sucesso!');
  };

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Configurações da Conta</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie suas informações pessoais e preferências</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Profile Photo */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Foto de Perfil</h2>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#1a7a40] flex items-center justify-center overflow-hidden shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-white" />
              )}
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                <Image className="w-4 h-4" /> Alterar Foto
              </button>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG, GIF ou WebP (máx. 5MB)</p>
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Informações Pessoais</h2>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <User className="w-4 h-4 text-[#1a7a40]" /> Nome Completo
            </label>
            <Input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Mail className="w-4 h-4 text-[#1a7a40]" /> Email
            </label>
            <Input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Phone className="w-4 h-4 text-[#1a7a40]" /> Telefone
            </label>
            <Input
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* Password */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm space-y-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
            <Lock className="w-4 h-4 text-[#1a7a40]" /> Alterar Senha
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha Atual</label>
            <Input
              type="password"
              value={passwords.current}
              onChange={e => setPasswords({ ...passwords, current: e.target.value })}
              placeholder="Digite sua senha atual"
              className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nova Senha</label>
            <Input
              type="password"
              value={passwords.newPass}
              onChange={e => setPasswords({ ...passwords, newPass: e.target.value })}
              placeholder="Digite a nova senha"
              className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmar Nova Senha</label>
            <Input
              type="password"
              value={passwords.confirm}
              onChange={e => setPasswords({ ...passwords, confirm: e.target.value })}
              placeholder="Confirme a nova senha"
              className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Aparência</h2>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Tema do Sistema</p>
              <p className="text-xs text-gray-400">{darkMode ? 'Modo escuro ativado' : 'Modo claro ativado'}</p>
            </div>
            <button
              type="button"
              onClick={toggleDarkMode}
              className={`relative w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-[#1a7a40]' : 'bg-gray-200'}`}
              aria-label="Alternar tema"
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform flex items-center justify-center ${darkMode ? 'translate-x-7' : 'translate-x-1'}`}>
                {darkMode
                  ? <Moon className="w-2.5 h-2.5 text-gray-500" />
                  : <Sun className="w-2.5 h-2.5 text-yellow-500" />
                }
              </span>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-4">
          <button
            type="button"
            onClick={() => {
              const saved2 = loadSettings();
              if (saved2) {
                setForm({ name: saved2.name || 'Usuário Admin', email: saved2.email || '', phone: saved2.phone || '' });
              }
              setPasswords({ current: '', newPass: '', confirm: '' });
              toast.info('Alterações canceladas');
            }}
            className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50 transition-colors dark:border-gray-600 dark:text-gray-200"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1a7a40] hover:bg-[#155f32] text-white text-sm font-medium transition-colors"
          >
            <Save className="w-4 h-4" /> Salvar Alterações
          </button>
        </div>
      </form>
    </div>
  );
}