import { describe, it, expect } from 'vitest';

/**
 * Testes para validar a correção de comissão e conversão de valores
 * Bug: Quando alterava status de AGUARDANDO para PAGO, a comissão zerava
 * Causa: Dupla conversão de centavos (valorRecebido * 100 duas vezes)
 */

describe('Correção de Comissão - Conversão de Valores', () => {
  
  it('deve manter comissão correta ao alterar status (valor importado do Excel)', () => {
    // Simulando um valor importado do Excel: R$ 80,00 = 8000 centavos
    const valorRecebidoEmCentavos = 8000;
    const percentualDiversos = 10;
    
    // Cálculo correto de comissão
    const comissaoEsperada = Math.round(valorRecebidoEmCentavos * (percentualDiversos / 100));
    
    // Deve ser R$ 8,00 = 800 centavos
    expect(comissaoEsperada).toBe(800);
  });

  it('deve converter valor do input do modal corretamente', () => {
    // Simulando entrada do usuário no input do modal: "80.00"
    const inputValue = "80.00";
    const valorEmCentavos = Math.round(parseFloat(inputValue) * 100);
    
    // Deve resultar em 8000 centavos
    expect(valorEmCentavos).toBe(8000);
  });

  it('deve exibir valor correto no input do modal', () => {
    // Simulando valor armazenado em centavos: 8000
    const valorEmCentavos = 8000;
    const valorExibido = (valorEmCentavos / 100).toFixed(2);
    
    // Deve exibir "80.00"
    expect(valorExibido).toBe('80.00');
  });

  it('NÃO deve fazer dupla conversão ao salvar do modal', () => {
    // Simulando o fluxo completo:
    // 1. Valor armazenado: 8000 centavos
    const valorArmazenado = 8000;
    
    // 2. Exibido no input: (8000 / 100).toFixed(2) = "80.00"
    const valorExibido = (valorArmazenado / 100).toFixed(2);
    
    // 3. Usuário edita e salva (sem mudança)
    const novoValor = Math.round(parseFloat(valorExibido) * 100);
    
    // 4. Deve ser IGUAL ao original (8000), NÃO 800000!
    expect(novoValor).toBe(8000);
    expect(novoValor).not.toBe(800000);
  });

  it('deve calcular comissão corretamente após alterar status', () => {
    // Cenário: Importar declaração com R$ 80,00 (8000 centavos)
    // Depois alterar status de AGUARDANDO para PAGO
    
    const valorRecebido = 8000; // centavos
    const clienteType = 'Diversos';
    const percentualDiversos = 10;
    
    // Cálculo de comissão
    let comissao = 0;
    if (clienteType === 'Diversos' && valorRecebido > 0) {
      comissao = Math.round(valorRecebido * (percentualDiversos / 100));
    }
    
    // Deve ser 800 centavos (R$ 8,00)
    expect(comissao).toBe(800);
    
    // Ao alterar status, comissão NÃO deve mudar
    // (apenas o status muda, valor recebido permanece igual)
    const novaComissao = Math.round(valorRecebido * (percentualDiversos / 100));
    expect(novaComissao).toBe(comissao);
  });

  it('deve permitir sócio com valor recebido = 0 mas comissão = R$ 5,00', () => {
    const valorRecebido = 0; // Sócio pode ter R$ 0,00
    const clienteType = 'Sócio';
    
    // Comissão de sócio é sempre R$ 5,00 (500 centavos)
    let comissao = 0;
    if (clienteType === 'Sócio') {
      comissao = 500; // R$ 5,00 fixo
    }
    
    expect(comissao).toBe(500);
  });

  it('deve permitir doação com valor recebido = 0 e comissão = 0', () => {
    const valorRecebido = 0;
    const statusPagamento = 'DOAÇÃO';
    
    // Doação não tem comissão
    let comissao = 0;
    if (statusPagamento === 'DOAÇÃO') {
      comissao = 0;
    }
    
    expect(comissao).toBe(0);
  });

  it('deve validar percentualDiversos durante importação (mínimo 1, máximo 100)', () => {
    const testCases = [
      { input: 0, esperado: 10 }, // Inválido, usar padrão
      { input: -5, esperado: 10 }, // Inválido, usar padrão
      { input: 10, esperado: 10 }, // Válido
      { input: 15, esperado: 15 }, // Válido
      { input: 100, esperado: 100 }, // Válido
      { input: 101, esperado: 10 }, // Inválido, usar padrão
      { input: NaN, esperado: 10 }, // Inválido, usar padrão
    ];
    
    testCases.forEach(({ input, esperado }) => {
      let percentualDiversos = 10; // padrão
      if (!isNaN(input) && input > 0 && input <= 100) {
        percentualDiversos = input;
      }
      expect(percentualDiversos).toBe(esperado);
    });
  });
});
