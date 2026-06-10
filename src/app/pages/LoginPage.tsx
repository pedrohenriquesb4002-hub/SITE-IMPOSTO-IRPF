import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, User, Eye, EyeOff, AlertCircle, Mail, CheckCircle, ArrowLeft, ShieldCheck } from 'lucide-react'
import { api, useAuthStore } from '../../lib/store'

type View = 'login' | 'register' | 'pending'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [view, setView] = useState<View>('login')

  // Login
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loadingLogin, setLoadingLogin] = useState(false)
  const [errorLogin, setErrorLogin] = useState('')

  // Cadastro
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regPassword2, setRegPassword2] = useState('')
  const [showRegPass, setShowRegPass] = useState(false)
  const [loadingReg, setLoadingReg] = useState(false)
  const [errorReg, setErrorReg] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorLogin('')
    if (!username.trim() || !password.trim()) {
      setErrorLogin('Preencha usuário e senha.'); return
    }
    setLoadingLogin(true)
    try {
      const { token, user } = await api.login(username.trim(), password)
      setAuth(token, user)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      setErrorLogin(err instanceof Error ? err.message : 'Credenciais inválidas.')
    } finally { setLoadingLogin(false) }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorReg('')

    if (!regName.trim() || !regEmail.trim() || !regUsername.trim() || !regPassword) {
      setErrorReg('Preencha todos os campos.'); return
    }
    if (regPassword !== regPassword2) {
      setErrorReg('As senhas não coincidem.'); return
    }
    if (regPassword.length < 8) {
      setErrorReg('Senha deve ter pelo menos 8 caracteres.'); return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) {
      setErrorReg('E-mail inválido.'); return
    }
    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(regUsername)) {
      setErrorReg('Usuário deve ter 3-32 caracteres (letras, números, . _ -)'); return
    }

    setLoadingReg(true)
    try {
      await api.registerRequest({
        name: regName.trim(),
        email: regEmail.trim(),
        username: regUsername.trim(),
        password: regPassword,
      })
      setView('pending')
    } catch (err: unknown) {
      setErrorReg(err instanceof Error ? err.message : 'Erro ao enviar solicitação.')
    } finally { setLoadingReg(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar via-sidebar-accent to-sidebar-accent/80 p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'radial-gradient(circle at 25px 25px, white 2%, transparent 0%), radial-gradient(circle at 75px 75px, white 2%, transparent 0%)', backgroundSize: '100px 100px' }} />

      <div className="relative w-full max-w-md">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-sidebar-primary shadow-2xl shadow-sidebar-primary/50 mb-4">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">IRPF/ITR</h1>
          <p className="text-sidebar-foreground/70 mt-1 text-sm">Sistema de Gestão</p>
        </div>

        {/* ─── VIEW: LOGIN ─── */}
        {view === 'login' && (
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6 text-center">Entrar na conta</h2>

            {errorLogin && (
              <div className="flex items-center gap-2 bg-destructive/20 border border-destructive/40 text-white rounded-lg px-4 py-3 mb-4 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorLogin}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4" autoComplete="on">
              <div>
                <label className="block text-sm font-medium text-sidebar-foreground/90 mb-1.5">Usuário</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground/50" />
                  <input type="text" autoComplete="username" value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Digite seu usuário"
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sidebar-primary focus:border-transparent transition-all text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-sidebar-foreground/90 mb-1.5">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground/50" />
                  <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite sua senha"
                    className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sidebar-primary focus:border-transparent transition-all text-sm" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loadingLogin}
                className="w-full py-3 bg-sidebar-primary hover:bg-sidebar-primary/90 text-white font-semibold rounded-xl transition-all shadow-lg shadow-sidebar-primary/30 disabled:opacity-50 disabled:cursor-not-allowed mt-2">
                {loadingLogin ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Entrando...
                  </span>
                ) : 'Entrar'}
              </button>
            </form>

            {/* Link para cadastro */}
            <div className="mt-6 pt-5 border-t border-white/10 text-center">
              <p className="text-sm text-white/60 mb-3">Não tem acesso ainda?</p>
              <button onClick={() => { setView('register'); setErrorReg('') }}
                className="w-full py-2.5 border border-white/30 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all text-sm font-medium">
                Solicitar Cadastro
              </button>
            </div>
          </div>
        )}

        {/* ─── VIEW: CADASTRO ─── */}
        {view === 'register' && (
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
            <button onClick={() => { setView('login'); setErrorReg('') }}
              className="flex items-center gap-1.5 text-white/60 hover:text-white text-sm mb-5 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar para login
            </button>

            <h2 className="text-xl font-bold text-white mb-1">Solicitar Cadastro</h2>
            <p className="text-white/50 text-xs mb-6">
              Após o envio, o administrador irá analisar e aprovar seu acesso.
            </p>

            {errorReg && (
              <div className="flex items-center gap-2 bg-destructive/20 border border-destructive/40 text-white rounded-lg px-4 py-3 mb-4 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorReg}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-3" autoComplete="off">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">Nome completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input type="text" value={regName} onChange={(e) => setRegName(e.target.value)}
                    placeholder="Seu nome completo" autoComplete="off"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-sidebar-primary text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="seu@email.com" autoComplete="off"
                    className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-sidebar-primary text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  Usuário <span className="text-white/30">(para login)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm font-medium">@</span>
                  <input type="text" value={regUsername} onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                    placeholder="usuario" autoComplete="off" maxLength={32}
                    className="w-full pl-8 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-sidebar-primary text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input type={showRegPass ? 'text' : 'password'} value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres" autoComplete="new-password"
                    className="w-full pl-10 pr-10 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-sidebar-primary text-sm" />
                  <button type="button" onClick={() => setShowRegPass(!showRegPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                    {showRegPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {/* Indicador de força da senha */}
                {regPassword && (
                  <div className="mt-1.5 flex gap-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                        regPassword.length >= i * 3
                          ? i <= 1 ? 'bg-destructive' : i <= 2 ? 'bg-warning' : i <= 3 ? 'bg-accent' : 'bg-success'
                          : 'bg-white/10'
                      }`} />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">Confirmar senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input type="password" value={regPassword2} onChange={(e) => setRegPassword2(e.target.value)}
                    placeholder="Digite a senha novamente" autoComplete="new-password"
                    className={`w-full pl-10 pr-4 py-2.5 bg-white/10 border rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-sidebar-primary text-sm transition-colors ${
                      regPassword2 && regPassword !== regPassword2 ? 'border-destructive/60' : 'border-white/20'
                    }`} />
                </div>
              </div>

              <button type="submit" disabled={loadingReg}
                className="w-full py-3 bg-sidebar-primary hover:bg-sidebar-primary/90 text-white font-semibold rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2">
                {loadingReg ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Enviando...
                  </span>
                ) : 'Enviar Solicitação'}
              </button>
            </form>

            <div className="mt-5 p-3 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-white/40 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-white/40 leading-relaxed">
                  Sua solicitação será enviada ao administrador por e-mail. Após aprovação, você receberá um e-mail de confirmação.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── VIEW: AGUARDANDO APROVAÇÃO ─── */}
        {view === 'pending' && (
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-20 h-20 bg-success/20 border-2 border-success/40 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <h2 className="text-xl font-bold text-white mb-3">Solicitação Enviada!</h2>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              Sua solicitação foi enviada para análise do administrador.
              Você receberá um <strong className="text-white/80">e-mail</strong> quando seu acesso for aprovado.
            </p>

            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 text-left space-y-2">
              <div className="flex items-center gap-2 text-sm text-white/60">
                <span className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                <span>Administrador recebeu o pedido por e-mail</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/40">
                <span className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                <span>Ele aprova ou recusa com 1 clique</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-white/40">
                <span className="w-5 h-5 bg-white/10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                <span>Você recebe e-mail de confirmação</span>
              </div>
            </div>

            <button onClick={() => { setView('login'); setRegName(''); setRegEmail(''); setRegUsername(''); setRegPassword(''); setRegPassword2('') }}
              className="w-full py-2.5 border border-white/30 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all text-sm font-medium">
              Voltar para o Login
            </button>
          </div>
        )}

      </div>
    </div>
  )
}