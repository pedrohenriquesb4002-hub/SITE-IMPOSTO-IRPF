/**
 * Calcula a comissão baseado no tipo de cliente e status de pagamento
 * 
 * Regras:
 * - DOAÇÃO: sempre R$ 0,00 (sem comissão)
 * - SÓCIO: sempre R$ 5,00 fixo (500 centavos)
 * - DIVERSOS: 10% do valor recebido
 * 
 * A comissão é calculada independente do status de pagamento.
 * O status apenas determina se a comissão conta para o total (PAGO) ou não.
 */
export function calculateCommission(
  valorRecebido: number,
  clienteType: string,
  statusPagamento: string
): number {
  // DOAÇÃO: sem comissão
  if (statusPagamento === 'DOAÇÃO') {
    return 0;
  }

  // SÓCIO: R$ 5,00 fixo (500 centavos)
  if (clienteType === 'Sócio') {
    return 500;
  }

  // DIVERSOS: 10% do valor
  return Math.round(valorRecebido * 0.1);
}
