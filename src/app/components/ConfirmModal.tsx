import { useEffect, useRef } from 'react'
import { AlertTriangle, LogOut, Trash2, X } from 'lucide-react'

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'logout'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  // Fecha com ESC
  useEffect(() => {
    if (!open) return
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [open, onCancel])

  // Foca no botão de confirmar ao abrir
  useEffect(() => {
    if (open) setTimeout(() => confirmRef.current?.focus(), 50)
  }, [open])

  if (!open) return null

  const colors = {
    danger: {
      icon: <Trash2 className="w-6 h-6 text-destructive" />,
      iconBg: 'bg-destructive/10 border-destructive/20',
      btn: 'bg-destructive hover:bg-destructive/90 shadow-destructive/30',
      ring: 'focus:ring-destructive/30',
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-warning" />,
      iconBg: 'bg-warning/10 border-warning/20',
      btn: 'bg-warning hover:bg-warning/90 shadow-warning/30 text-black',
      ring: 'focus:ring-warning/30',
    },
    logout: {
      icon: <LogOut className="w-6 h-6 text-primary" />,
      iconBg: 'bg-primary/10 border-primary/20',
      btn: 'bg-primary hover:bg-primary/90 shadow-primary/30',
      ring: 'focus:ring-primary/30',
    },
  }

  const c = colors[variant]

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      {/* Backdrop blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-card border-2 border-border rounded-2xl shadow-2xl shadow-black/30 animate-in zoom-in-95 duration-150">

        {/* Botão fechar */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6">
          {/* Ícone */}
          <div className={`w-14 h-14 rounded-2xl border-2 ${c.iconBg} flex items-center justify-center mb-5`}>
            {c.icon}
          </div>

          {/* Texto */}
          <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
        </div>

        {/* Botões */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-xl border-2 border-border text-foreground font-semibold text-sm hover:bg-muted transition-all"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`flex-1 py-2.5 px-4 rounded-xl text-white font-semibold text-sm shadow-lg transition-all focus:outline-none focus:ring-2 ${c.btn} ${c.ring}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}