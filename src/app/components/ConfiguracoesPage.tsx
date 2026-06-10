import { useState, useEffect } from 'react'
import { User, Mail, Image as ImageIcon, Moon, Sun, Save } from 'lucide-react'
import { toast } from 'sonner'
import { api, useAuthStore } from '../../lib/store'

interface ConfiguracoesPageProps {
  darkMode: boolean
  toggleDarkMode: () => void
  onUpdateProfile?: (name: string, photo: string | null) => void
}

export default function ConfiguracoesPage({ darkMode, toggleDarkMode, onUpdateProfile }: ConfiguracoesPageProps) {
  const { user, updateUser } = useAuthStore()
  const [profileImage, setProfileImage] = useState<string | null>(user?.photo || null)
  const [profileName, setProfileName] = useState(user?.name || 'Administrador')
  const [profileEmail, setProfileEmail] = useState(user?.email || '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Carrega sempre do store (que vem do banco na autenticação)
  useEffect(() => {
    if (user) {
      setProfileName(user.name || '')
      setProfileEmail(user.email || '')
      setProfileImage(user.photo || null)
    }
  }, [user])

  const handleImageUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      if (file.size > 5 * 1024 * 1024) { toast.error('Imagem deve ter no máximo 5MB'); return }
      const reader = new FileReader()
      reader.onload = (ev) => { setProfileImage(ev.target?.result as string) }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const handleSaveProfile = async () => {
    if (!profileName.trim()) { toast.error('Digite um nome'); return }
    setSavingProfile(true)
    try {
      const updated = await api.updateProfile({
        name: profileName.trim(),
        email: profileEmail.trim() || undefined,
        photo: profileImage,
      })
      updateUser({ name: updated.name, email: updated.email, photo: updated.photo })
      if (onUpdateProfile) onUpdateProfile(updated.name, updated.photo || null)
      toast.success('Perfil salvo com sucesso!')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar perfil')
    } finally { setSavingProfile(false) }
  }

  return (
    <div className="p-8 bg-gradient-to-br from-background via-muted/20 to-background min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Configurações</h2>
          <p className="text-muted-foreground mt-1">Gerencie suas preferências e configurações do sistema</p>
        </div>

        {/* Profile Photo */}
        <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-xl">
          <h3 className="text-base font-semibold text-foreground mb-6">Foto de Perfil</h3>
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-chart-5 flex items-center justify-center overflow-hidden ring-4 ring-primary/20">
                {profileImage
                  ? <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                  : <User className="w-12 h-12 text-white" />}
              </div>
            </div>
            <div className="flex-1">
              <button onClick={handleImageUpload}
                className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 shadow-xl transition-opacity flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> Alterar Foto
              </button>
              <p className="text-sm text-muted-foreground mt-2">JPG, PNG ou GIF (máx. 5MB)</p>
              <p className="text-xs text-muted-foreground mt-1 text-primary">
                ✓ Sua foto aparece no lançamento das declarações
              </p>
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-xl">
          <h3 className="text-base font-semibold text-foreground mb-2">Informações de Perfil</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Ao alterar seu nome aqui, ele será atualizado automaticamente na aba Colaboradores.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-2 flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Nome de Exibição
              </label>
              <input type="text" value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-input-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                placeholder="Seu nome" />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" /> Email
              </label>
              <input type="email" value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-input-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                placeholder="email@sistema.com" />
            </div>
          </div>
          <button onClick={handleSaveProfile} disabled={savingProfile}
            className="mt-6 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all shadow-lg font-semibold flex items-center gap-2 disabled:opacity-50">
            <Save className="w-4 h-4" />
            {savingProfile ? 'Salvando...' : 'Salvar Perfil'}
          </button>
        </div>

        {/* Dark Mode */}
        <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-xl">
          <h3 className="text-base font-semibold text-foreground mb-6">Aparência</h3>
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-warning" />}
              <div>
                <p className="text-sm font-medium text-foreground">{darkMode ? 'Modo Escuro' : 'Modo Claro'}</p>
                <p className="text-xs text-muted-foreground">Tema atual da interface</p>
              </div>
            </div>
            <button onClick={toggleDarkMode}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${darkMode ? 'bg-primary' : 'bg-muted'}`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}