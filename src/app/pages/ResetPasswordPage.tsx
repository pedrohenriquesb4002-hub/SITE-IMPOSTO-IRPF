import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { api } from '../../lib/store'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('A senha deve ter no mínimo 8 caracteres.'); return }
    if (password !== password2) { setError('As senhas não coincidem.'); return }
    setLoading(true)
    try {
      await api.resetPassword(token, password)
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao redefinir a senha.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar via-sidebar-accent to-sidebar-accent/80 p-4">
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: 'radial-gradient(circle at 25px 25px, white 2%, transparent 0%), radial-gradient(circle at 75px 75px, white 2%, transparent 0%)', backgroundSize: '100px 100px' }} />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-sidebar-primary shadow-2xl shadow-sidebar-primary/50 mb-4">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">IRPF/ITR</h1>
          <p className="text-sidebar-foreground/70 mt-1 text-sm">Sistema de Gestão</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
          {!token ? (
            <div className="text-center">
              <div className="w-20 h-20 bg-destructive/20 border-2 border-destructive/40 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>
              <h2 className="text-xl font-bold text-white mb-3">Link inválido</h2>
              <p className="text-white/60 text-sm leading-relaxed mb-6">
                Esse link de redefinição de senha está incompleto ou inválido. Solicite um novo na tela de login.
              </p>
              <button onClick={() => navigate('/login', { replace: true })}
                className="w-full py-2.5 border border-white/30 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-all text-sm font-medium">
                Voltar para o Login
              </button>
            </div>
          ) : done ? (
            <div className="text-center">
              <div className="w-20 h-20 bg-success/20 border-2 border-success/40 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-success" />
              </div>
              <h2 className="text-xl font-bold text-white mb-3">Senha redefinida!</h2>
              <p className="text-white/60 text-sm leading-relaxed mb-6">
                Sua senha foi alterada com sucesso. Você já pode entrar com a nova senha.
              </p>
              <button onClick={() => navigate('/login', { replace: true })}
                className="w-full py-3 bg-sidebar-primary hover:bg-sidebar-primary/90 text-white font-semibold rounded-xl transition-all shadow-lg shadow-sidebar-primary/30">
                Ir para o Login
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white mb-1">Criar nova senha</h2>
              <p className="text-white/50 text-xs mb-6">Escolha uma nova senha para acessar sua conta.</p>

              {error && (
                <div className="flex items-center gap-2 bg-destructive/20 border border-destructive/40 text-white rounded-lg px-4 py-3 mb-4 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-sidebar-foreground/90 mb-1.5">Nova senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground/50" />
                    <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sidebar-primary focus:border-transparent transition-all text-sm" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-sidebar-foreground/90 mb-1.5">Confirmar nova senha</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground/50" />
                    <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password2}
                      onChange={(e) => setPassword2(e.target.value)}
                      placeholder="Digite a senha novamente"
                      className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sidebar-primary focus:border-transparent transition-all text-sm" />
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-3 bg-sidebar-primary hover:bg-sidebar-primary/90 text-white font-semibold rounded-xl transition-all shadow-lg shadow-sidebar-primary/30 disabled:opacity-50 disabled:cursor-not-allowed mt-2">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Salvando...
                    </span>
                  ) : 'Redefinir senha'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
