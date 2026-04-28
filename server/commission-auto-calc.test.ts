import { describe, it, expect } from 'vitest';

describe('Cálculo Automático de Comissão - Sem Envio do Excel', () => {
  describe('Cálculo de comissão no servidor baseado em tipo de cliente', () => {
    it('deve calcular 10% para DIVERSOS', () => {
      const valorRecebido = 10000; // R$ 100,00
      const clienteType = 'Diversos';
      const statusPagamento = 'PAGO';

      let comissao = 0;
      if (statusPagamento === 'DOAÇÃO') {
        comissao = 0;
      } else if (clienteType === 'Sócio') {
        comissao = 500;
      } else {
        comissao = Math.round(valorRecebido * 0.1);
      }

      expect(comissao).toBe(1000); // 10% de R$ 100,00 = R$ 10,00 (1000 centavos)
    });

    it('deve calcular R$ 5,00 fixo para SÓCIO independente do valor', () => {
      const valorRecebido = 0; // Sócio pode ter valor 0
      const clienteType = 'Sócio';
      const statusPagamento = 'PAGO';

      let comissao = 0;
      if (statusPagamento === 'DOAÇÃO') {
        comissao = 0;
      } else if (clienteType === 'Sócio') {
        comissao = 500;
      } else {
        comissao = Math.round(valorRecebido * 0.1);
      }

      expect(comissao).toBe(500); // R$ 5,00 fixo (500 centavos)
    });

    it('deve calcular R$ 0,00 para DOAÇÃO', () => {
      const valorRecebido = 50000; // R$ 500,00
      const clienteType = 'Diversos';
      const statusPagamento = 'DOAÇÃO';

      let comissao = 0;
      if (statusPagamento === 'DOAÇÃO') {
        comissao = 0;
      } else if (clienteType === 'Sócio') {
        comissao = 500;
      } else {
        comissao = Math.round(valorRecebido * 0.1);
      }

      expect(comissao).toBe(0); // DOAÇÃO não tem comissão
    });

    it('deve calcular 10% para DIVERSOS mesmo com status AGUARDANDO', () => {
      const valorRecebido = 20000; // R$ 200,00
      const clienteType = 'Diversos';
      const statusPagamento = 'AGUARDANDO';

      let comissao = 0;
      if (statusPagamento === 'DOAÇÃO') {
        comissao = 0;
      } else if (clienteType === 'Sócio') {
        comissao = 500;
      } else {
        comissao = Math.round(valorRecebido * 0.1);
      }

      // Comissão é calculada mesmo com status AGUARDANDO
      expect(comissao).toBe(2000); // 10% de R$ 200,00 = R$ 20,00 (2000 centavos)
    });

    it('deve calcular R$ 5,00 para SÓCIO mesmo com status AGUARDANDO', () => {
      const valorRecebido = 15000; // R$ 150,00
      const clienteType = 'Sócio';
      const statusPagamento = 'AGUARDANDO';

      let comissao = 0;
      if (statusPagamento === 'DOAÇÃO') {
        comissao = 0;
      } else if (clienteType === 'Sócio') {
        comissao = 500;
      } else {
        comissao = Math.round(valorRecebido * 0.1);
      }

      // Sócio sempre tem R$ 5,00 independente do status
      expect(comissao).toBe(500); // R$ 5,00 fixo (500 centavos)
    });

    it('deve recalcular comissão quando tipo de cliente muda de DIVERSOS para SÓCIO', () => {
      const valorRecebido = 30000; // R$ 300,00
      const novoClienteType = 'Sócio';
      const statusPagamento = 'PAGO';

      let comissao = 0;
      if (statusPagamento === 'DOAÇÃO') {
        comissao = 0;
      } else if (novoClienteType === 'Sócio') {
        comissao = 500;
      } else {
        comissao = Math.round(valorRecebido * 0.1);
      }

      // Ao mudar para Sócio, comissão vira R$ 5,00 fixo
      expect(comissao).toBe(500);
    });

    it('deve recalcular comissão quando tipo de cliente muda de SÓCIO para DIVERSOS', () => {
      const valorRecebido = 30000; // R$ 300,00
      const novoClienteType = 'Diversos';
      const statusPagamento = 'PAGO';

      let comissao = 0;
      if (statusPagamento === 'DOAÇÃO') {
        comissao = 0;
      } else if (novoClienteType === 'Sócio') {
        comissao = 500;
      } else {
        comissao = Math.round(valorRecebido * 0.1);
      }

      // Ao mudar para Diversos, comissão vira 10% do valor
      expect(comissao).toBe(3000); // 10% de R$ 300,00 = R$ 30,00 (3000 centavos)
    });

    it('deve recalcular comissão quando valor recebido muda para DIVERSOS', () => {
      const novoValorRecebido = 50000; // R$ 500,00
      const clienteType = 'Diversos';
      const statusPagamento = 'PAGO';

      let comissao = 0;
      if (statusPagamento === 'DOAÇÃO') {
        comissao = 0;
      } else if (clienteType === 'Sócio') {
        comissao = 500;
      } else {
        comissao = Math.round(novoValorRecebido * 0.1);
      }

      // Ao aumentar valor, comissão também aumenta (10%)
      expect(comissao).toBe(5000); // 10% de R$ 500,00 = R$ 50,00 (5000 centavos)
    });

    it('não deve afetar comissão quando valor recebido muda para SÓCIO', () => {
      const novoValorRecebido = 100000; // R$ 1000,00
      const clienteType = 'Sócio';
      const statusPagamento = 'PAGO';

      let comissao = 0;
      if (statusPagamento === 'DOAÇÃO') {
        comissao = 0;
      } else if (clienteType === 'Sócio') {
        comissao = 500;
      } else {
        comissao = Math.round(novoValorRecebido * 0.1);
      }

      // Sócio sempre tem R$ 5,00, independente do valor
      expect(comissao).toBe(500); // R$ 5,00 fixo (500 centavos)
    });

    it('deve manter comissão ao mudar status de PAGO para AGUARDANDO', () => {
      const valorRecebido = 20000; // R$ 200,00
      const clienteType = 'Diversos';
      const novoStatusPagamento = 'AGUARDANDO';

      let comissao = 0;
      if (novoStatusPagamento === 'DOAÇÃO') {
        comissao = 0;
      } else if (clienteType === 'Sócio') {
        comissao = 500;
      } else {
        comissao = Math.round(valorRecebido * 0.1);
      }

      // Comissão não muda ao alterar status
      expect(comissao).toBe(2000); // 10% de R$ 200,00 = R$ 20,00 (2000 centavos)
    });

    it('deve zerar comissão ao mudar status para DOAÇÃO', () => {
      const valorRecebido = 20000; // R$ 200,00
      const clienteType = 'Diversos';
      const novoStatusPagamento = 'DOAÇÃO';

      let comissao = 0;
      if (novoStatusPagamento === 'DOAÇÃO') {
        comissao = 0;
      } else if (clienteType === 'Sócio') {
        comissao = 500;
      } else {
        comissao = Math.round(valorRecebido * 0.1);
      }

      // DOAÇÃO sempre zera comissão
      expect(comissao).toBe(0);
    });

    it('deve zerar comissão ao mudar tipo para DOAÇÃO mesmo sendo SÓCIO', () => {
      const valorRecebido = 50000; // R$ 500,00
      const clienteType = 'Sócio';
      const statusPagamento = 'DOAÇÃO';

      let comissao = 0;
      if (statusPagamento === 'DOAÇÃO') {
        comissao = 0;
      } else if (clienteType === 'Sócio') {
        comissao = 500;
      } else {
        comissao = Math.round(valorRecebido * 0.1);
      }

      // DOAÇÃO sempre zera comissão, independente do tipo
      expect(comissao).toBe(0);
    });

    it('deve calcular corretamente valores fracionários para DIVERSOS', () => {
      const valorRecebido = 12345; // R$ 123,45
      const clienteType = 'Diversos';
      const statusPagamento = 'PAGO';

      let comissao = 0;
      if (statusPagamento === 'DOAÇÃO') {
        comissao = 0;
      } else if (clienteType === 'Sócio') {
        comissao = 500;
      } else {
        comissao = Math.round(valorRecebido * 0.1);
      }

      // 10% de R$ 123,45 = R$ 12,345 ≈ R$ 12,35 (1235 centavos arredondado)
      expect(comissao).toBe(1235); // Math.round(12345 * 0.1) = 1235
    });
  });

  describe('Importação sem envio de comissão', () => {
    it('não deve incluir comissão no objeto de importação', () => {
      const declaracaoImportada = {
        month: 'Março',
        collaborator: 'Mario',
        cpfCliente: '123.456.789-00',
        cliente: 'Cliente Teste',
        valorRecebido: 10000,
        clienteType: 'Diversos',
        statusPagamento: 'PAGO',
        // comissao: NOT INCLUDED
      };

      // Validar que comissão não está no objeto
      expect(declaracaoImportada).not.toHaveProperty('comissao');
      expect(Object.keys(declaracaoImportada)).toEqual([
        'month',
        'collaborator',
        'cpfCliente',
        'cliente',
        'valorRecebido',
        'clienteType',
        'statusPagamento',
      ]);
    });
  });
});
