import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { FileText, DollarSign, Receipt, Upload, Settings, Moon, Sun, ChevronLeft, ChevronRight, Calendar, User, LogOut, Users } from 'lucide-react'
import { Toaster } from 'sonner'
import LoginPage from './pages/LoginPage'
import IRPFPage from './components/IRPFPage'
import ITRPage from './components/ITRPage'
import ComissoesPage from './components/ComissoesPage'
import QuotasPage from './components/QuotasPage'
import ImportExportPage from './components/ImportExportPage'
import ConfiguracoesPage from './components/ConfiguracoesPage'
import ColaboradoresPage from './components/ColaboradoresPage'
import { useAuthStore } from '../lib/store'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function Dashboard() {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true'
  })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [currentPage, setCurrentPage] = useState('irpf')
  const [irpfMonth, setIrpfMonth] = useState('Março')
  const [itrMonth, setItrMonth] = useState('Agosto')
  const [userName, setUserName] = useState(user?.name || 'Usuário')
  const [userPhoto, setUserPhoto] = useState<string | null>(null)

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
    localStorage.setItem('darkMode', String(darkMode))
  }, [darkMode])

  const handleLogout = () => {
    if (confirm('Deseja realmente sair?')) {
      clearAuth()
      navigate('/login', { replace: true })
    }
  }

  const menuItems = [
    { id: 'irpf', label: 'IRPF', icon: FileText, hasSubmenu: true },
    { id: 'itr', label: 'ITR', icon: Calendar, hasSubmenu: true },
    { id: 'comissoes', label: 'Comissões', icon: DollarSign },
    { id: 'quotas', label: 'Quotas', icon: Receipt },
    { id: 'colaboradores', label: 'Colaboradores', icon: Users },
    { id: 'import-export', label: 'Importar/Exportar', icon: Upload },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ]

  const irpfMonths = [
    { id: 'Março', label: 'Março' },
    { id: 'Abril', label: 'Abril' },
    { id: 'Maio', label: 'Maio' },
  ]

  const itrMonths = [
    { id: 'Agosto', label: 'Agosto' },
    { id: 'Setembro', label: 'Setembro' },
  ]

  const renderContent = () => {
    switch (currentPage) {
      case 'irpf': return <IRPFPage month={irpfMonth} />
      case 'itr': return <ITRPage month={itrMonth} />
      case 'comissoes': return <ComissoesPage />
      case 'quotas': return <QuotasPage />
      case 'colaboradores': return <ColaboradoresPage />
      case 'import-export': return <ImportExportPage />
      case 'settings':
        return (
          <ConfiguracoesPage
            darkMode={darkMode}
            toggleDarkMode={() => setDarkMode(!darkMode)}
            onUpdateProfile={(name, photo) => {
              setUserName(name)
              setUserPhoto(photo)
            }}
          />
        )
      default: return <IRPFPage month={irpfMonth} />
    }
  }

  return (
    <div className="size-full flex bg-background min-h-screen">
      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-20' : 'w-72'} bg-sidebar transition-all duration-300 flex flex-col shadow-2xl flex-shrink-0`}>
        {/* Header */}
        <div className="px-6 py-6 border-b border-sidebar-border/50 flex items-center justify-between">
          {!sidebarCollapsed && (
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground tracking-tight">IRPF/ITR</h1>
              <p className="text-xs text-sidebar-foreground/70 mt-1">Sistema de Gestão</p>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2 hover:bg-sidebar-accent/50 rounded-lg transition-colors"
          >
            {sidebarCollapsed
              ? <ChevronRight className="w-4 h-4 text-sidebar-foreground/70" />
              : <ChevronLeft className="w-4 h-4 text-sidebar-foreground/70" />}
          </button>
        </div>

        {/* Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <div key={item.id}>
              <button
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  currentPage === item.id
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/30'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>

              {item.id === 'irpf' && currentPage === 'irpf' && !sidebarCollapsed && (
                <div className="ml-8 mt-2 space-y-1 mb-2">
                  {irpfMonths.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setIrpfMonth(m.id)}
                      className={`w-full text-left px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                        irpfMonth === m.id
                          ? 'bg-sidebar-accent text-accent border-l-2 border-accent'
                          : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}

              {item.id === 'itr' && currentPage === 'itr' && !sidebarCollapsed && (
                <div className="ml-8 mt-2 space-y-1 mb-2">
                  {itrMonths.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setItrMonth(m.id)}
                      className={`w-full text-left px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                        itrMonth === m.id
                          ? 'bg-sidebar-accent text-accent border-l-2 border-accent'
                          : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-sidebar-border/50 space-y-3">
          <div className={`flex items-center gap-3 px-2 py-2 rounded-xl bg-sidebar-accent/30 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-primary flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-accent/50">
              {userPhoto
                ? <img src={userPhoto} alt="Profile" className="w-full h-full object-cover" />
                : <User className="w-5 h-5 text-white" />}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">{userName}</p>
                <p className="text-xs text-sidebar-foreground/60">● Online</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent transition-all"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            {!sidebarCollapsed && <span>{darkMode ? 'Modo Claro' : 'Modo Escuro'}</span>}
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-all"
          >
            <LogOut className="w-5 h-5" />
            {!sidebarCollapsed && <span>Sair</span>}
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <>
      <Toaster richColors position="top-right" />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
      </Routes>
    </>
  )
}
