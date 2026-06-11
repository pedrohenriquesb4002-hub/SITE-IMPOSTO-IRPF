import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'

interface DatePickerProps {
  value: string | null        // formato: "DD/MM/AAAA" ou null
  onChange: (value: string) => void
  placeholder?: string
  label?: string
}

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
]

function parseDateString(v: string): { day: number; month: number; year: number } | null {
  if (!v) return null
  // aceita DD/MM/AAAA
  const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    const d = parseInt(m[1]), mo = parseInt(m[2]) - 1, y = parseInt(m[3])
    if (mo >= 0 && mo <= 11 && d >= 1 && d <= 31 && y >= 2000) return { day: d, month: mo, year: y }
  }
  return null
}

function formatDisplay(d: number, m: number, y: number) {
  return `${String(d).padStart(2,'0')}/${String(m+1).padStart(2,'0')}/${y}`
}

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(month: number, year: number) {
  return new Date(year, month, 1).getDay() // 0=dom
}

export default function DatePicker({ value, onChange, placeholder = 'DD/MM/AAAA', label }: DatePickerProps) {
  const today = new Date()
  const parsed = value ? parseDateString(value) : null

  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value || '')
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth())
  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear())
  const [inputError, setInputError] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Fecha ao clicar fora
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Sincroniza inputValue com value externo
  useEffect(() => {
    setInputValue(value || '')
    if (value) {
      const p = parseDateString(value)
      if (p) { setViewMonth(p.month); setViewYear(p.year) }
    }
  }, [value])

  const handleInputChange = (v: string) => {
    // Auto-formata enquanto digita
    let raw = v.replace(/\D/g, '')
    if (raw.length > 8) raw = raw.slice(0, 8)
    let formatted = raw
    if (raw.length > 4) formatted = raw.slice(0,2) + '/' + raw.slice(2,4) + '/' + raw.slice(4)
    else if (raw.length > 2) formatted = raw.slice(0,2) + '/' + raw.slice(2)
    setInputValue(formatted)
    setInputError(false)

    if (formatted.length === 10) {
      const p = parseDateString(formatted)
      if (p) {
        setViewMonth(p.month)
        setViewYear(p.year)
        onChange(formatted)
        setInputError(false)
      } else {
        setInputError(true)
      }
    }
  }

  const handleDayClick = (day: number) => {
    const formatted = formatDisplay(day, viewMonth, viewYear)
    setInputValue(formatted)
    onChange(formatted)
    setOpen(false)
    setInputError(false)
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const daysInMonth = getDaysInMonth(viewMonth, viewYear)
  const firstDay = getFirstDayOfMonth(viewMonth, viewYear) // 0=dom
  // Ajusta para semana começar na segunda
  const startOffset = (firstDay + 6) % 7

  const selectedParsed = inputValue ? parseDateString(inputValue) : null
  const isSelected = (d: number) =>
    selectedParsed?.day === d && selectedParsed?.month === viewMonth && selectedParsed?.year === viewYear
  const isToday = (d: number) =>
    today.getDate() === d && today.getMonth() === viewMonth && today.getFullYear() === viewYear

  return (
    <div ref={ref} className="relative">
      {label && <label className="block text-xs font-medium text-foreground mb-2">{label}</label>}
      <div className={`flex items-center gap-2 px-3 py-2 bg-input-background border-2 rounded-xl transition-all ${
        open ? 'border-primary ring-2 ring-primary/20' : inputError ? 'border-destructive' : 'border-input hover:border-primary/50'
      }`}>
        <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          maxLength={10}
          className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground focus:outline-none min-w-0"
        />
        {inputValue && (
          <button type="button" onClick={() => { setInputValue(''); onChange(''); setInputError(false) }}
            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {inputError && <p className="text-xs text-destructive mt-1">Data inválida</p>}

      {/* Calendário dropdown */}
      {open && (
        <div className="absolute z-50 top-full mt-2 left-0 bg-card border-2 border-border rounded-2xl shadow-2xl shadow-black/20 p-4 w-72 animate-in fade-in zoom-in-95 duration-100">
          {/* Cabeçalho navegação */}
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={prevMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-foreground">{MONTHS[viewMonth]}</span>
              {/* Seletor de ano */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(parseInt(e.target.value))}
                className="text-sm font-bold text-foreground bg-transparent border-none focus:outline-none cursor-pointer"
              >
                {Array.from({ length: 10 }, (_, i) => today.getFullYear() - 2 + i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <button type="button" onClick={nextMonth}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>
          </div>

          {/* Dias da semana */}
          <div className="grid grid-cols-7 mb-2">
            {['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Dias */}
          <div className="grid grid-cols-7 gap-0.5">
            {/* Espaços vazios antes do primeiro dia */}
            {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}
            {/* Dias do mês */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
              <button
                key={day}
                type="button"
                onClick={() => handleDayClick(day)}
                className={`h-8 w-full rounded-lg text-xs font-medium transition-all ${
                  isSelected(day)
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                    : isToday(day)
                    ? 'bg-primary/10 text-primary font-bold ring-1 ring-primary/30'
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                {day}
              </button>
            ))}
          </div>

          {/* Atalho: Hoje */}
          <button
            type="button"
            onClick={() => {
              const d = today.getDate(), m = today.getMonth(), y = today.getFullYear()
              setViewMonth(m); setViewYear(y)
              const formatted = formatDisplay(d, m, y)
              setInputValue(formatted); onChange(formatted); setOpen(false)
            }}
            className="mt-3 w-full py-1.5 text-xs font-medium text-primary hover:bg-primary/5 rounded-lg transition-colors border border-primary/20"
          >
            Hoje — {formatDisplay(today.getDate(), today.getMonth(), today.getFullYear())}
          </button>
        </div>
      )}
    </div>
  )
}