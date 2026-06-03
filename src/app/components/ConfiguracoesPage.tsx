import { useState, useEffect } from 'react'
import { User, Mail, Image as ImageIcon, Moon, Sun, Save, Percent, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '../../lib/store'

interface ConfiguracoesPageProps {
  darkMode: boolean
  toggleDarkMode: () => void
  onUpdateProfile?: (name: string, photo: string | null) => void
}

export default function ConfiguracoesPage({ darkMode, toggleDarkMode, onUpdateProfile }: ConfiguracoesPageProps) {
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [profileName, setProfileName] = useState('Administrador')
  const [profileEmail, setProfileEmail] = useState('')
  const [percentualDiversos, setPercentualDiversos] = useState(10)
  const [valorFixoSocio, setValorFixoSocio] = useState(5)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    api.settings.get()
      .then((s) => {
        setPercentualDiversos(s.percentualDiversos)
        setValorFixoSocio(s.valorFixoSocio / 100)
      })
      .catch(() => {})
  }, [])

  const handleImageUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => { setProfileImage(ev.target?.result as string) }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      if (onUpdateProfile) onUpdateProfile(profileName, profileImage)
      toast.success('Perfil atualizado')
    } finally { setSavingProfile(false) }
  }

  const handleSaveCommissionSettings = async () => {
    setSavingSettings(true)
    try {
      await api.settings.update({
        percentualDiversos,
        valorFixoSocio: Math.round(valorFixoSocio * 100),
      })
      toast.success('Configurações de comissão salvas')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro')
    } finally { setSavingSettings(false) }
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
            </div>
          </div>
        </div>

        {/* Profile Info */}
        <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-xl">
          <h3 className="text-base font-semibold text-foreground mb-6">Informações de Perfil</h3>
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

        {/* Commission Settings */}
        <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-xl">
          <h3 className="text-base font-semibold text-foreground mb-2">Configurações de Comissão</h3>
          <p className="text-sm text-muted-foreground mb-6">Define como as comissões são calculadas automaticamente</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-muted/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Percent className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Percentual Diversos</p>
                  <p className="text-xs text-muted-foreground">% do valor recebido</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input type="number" value={percentualDiversos}
                  onChange={(e) => setPercentualDiversos(Number(e.target.value))}
                  className="w-24 px-3 py-2 text-sm bg-input-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground text-center font-bold"
                  min="0" max="100" />
                <span className="text-muted-foreground text-sm">%</span>
              </div>
            </div>
            <div className="bg-muted/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Valor Fixo Sócio</p>
                  <p className="text-xs text-muted-foreground">R$ por declaração</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground text-sm">R$</span>
                <input type="number" value={valorFixoSocio}
                  onChange={(e) => setValorFixoSocio(Number(e.target.value))}
                  className="w-24 px-3 py-2 text-sm bg-input-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground text-center font-bold"
                  min="0" step="0.01" />
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg text-sm text-muted-foreground">
            <strong className="text-foreground">Regras atuais:</strong> Sócio = R$ {valorFixoSocio.toFixed(2)} fixo | Diversos = {percentualDiversos}% do valor | Doação = R$ 0,00
          </div>
          <button onClick={handleSaveCommissionSettings} disabled={savingSettings}
            className="mt-4 px-6 py-2.5 bg-accent text-accent-foreground rounded-xl hover:opacity-90 transition-all shadow-lg font-semibold flex items-center gap-2 disabled:opacity-50">
            <Save className="w-4 h-4" />
            {savingSettings ? 'Salvando...' : 'Salvar Configurações'}
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
