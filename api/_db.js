import { neon } from '@neondatabase/serverless'

let _sql: ReturnType<typeof neon> | null = null

export function getDb() {
  if (!_sql) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL não configurado')
    _sql = neon(url)
  }
  return _sql
}

export function calculateCommission(
  valorRecebido: number,
  clienteType: string,
  statusPagamento: string,
  percentualDiversos = 10,
  valorFixoSocio = 500
): number {
  if (statusPagamento === 'DOAÇÃO') return 0
  if (clienteType === 'Sócio') return valorFixoSocio
  return Math.round(valorRecebido * (percentualDiversos / 100))
}
