import { describe, it, expect } from 'vitest';
import { calculateCommission } from './commissionCalculator';

describe('calculateCommission - Função Compartilhada', () => {
  describe('DOAÇÃO - sem comissão', () => {
    it('deve retornar 0 para DOAÇÃO independente do valor', () => {
      expect(calculateCommission(0, 'Diversos', 'DOAÇÃO')).toBe(0);
      expect(calculateCommission(10000, 'Diversos', 'DOAÇÃO')).toBe(0);
      expect(calculateCommission(50000, 'Sócio', 'DOAÇÃO')).toBe(0);
    });
  });

  describe('SÓCIO - R$ 5,00 fixo', () => {
    it('deve retornar 500 centavos (R$ 5,00) para SÓCIO PAGO', () => {
      expect(calculateCommission(0, 'Sócio', 'PAGO')).toBe(500);
      expect(calculateCommission(10000, 'Sócio', 'PAGO')).toBe(500);
      expect(calculateCommission(100000, 'Sócio', 'PAGO')).toBe(500);
    });

    it('deve retornar 500 centavos (R$ 5,00) para SÓCIO AGUARDANDO', () => {
      expect(calculateCommission(0, 'Sócio', 'AGUARDANDO')).toBe(500);
      expect(calculateCommission(10000, 'Sócio', 'AGUARDANDO')).toBe(500);
    });
  });

  describe('DIVERSOS - 10% do valor', () => {
    it('deve retornar 10% para DIVERSOS PAGO', () => {
      expect(calculateCommission(10000, 'Diversos', 'PAGO')).toBe(1000); // 10% de R$ 100,00
      expect(calculateCommission(20000, 'Diversos', 'PAGO')).toBe(2000); // 10% de R$ 200,00
      expect(calculateCommission(50000, 'Diversos', 'PAGO')).toBe(5000); // 10% de R$ 500,00
    });

    it('deve retornar 10% para DIVERSOS AGUARDANDO', () => {
      expect(calculateCommission(10000, 'Diversos', 'AGUARDANDO')).toBe(1000);
      expect(calculateCommission(30000, 'Diversos', 'AGUARDANDO')).toBe(3000);
    });

    it('deve arredondar corretamente valores fracionários', () => {
      expect(calculateCommission(12345, 'Diversos', 'PAGO')).toBe(1235); // Math.round(1234.5)
      expect(calculateCommission(12344, 'Diversos', 'PAGO')).toBe(1234); // Math.round(1234.4)
      expect(calculateCommission(12346, 'Diversos', 'PAGO')).toBe(1235); // Math.round(1234.6)
    });

    it('deve retornar 0 para valor 0', () => {
      expect(calculateCommission(0, 'Diversos', 'PAGO')).toBe(0);
    });
  });

  describe('Casos extremos', () => {
    it('deve lidar com valores muito grandes', () => {
      // R$ 1.000.000,00
      expect(calculateCommission(100000000, 'Diversos', 'PAGO')).toBe(10000000);
    });

    it('deve lidar com valores muito pequenos', () => {
      // R$ 0,01
      expect(calculateCommission(1, 'Diversos', 'PAGO')).toBe(0); // Math.round(0.1)
      // R$ 0,10
      expect(calculateCommission(10, 'Diversos', 'PAGO')).toBe(1); // Math.round(1)
    });
  });

  describe('Integração com tipos de cliente', () => {
    it('deve diferenciar corretamente entre Sócio e Diversos', () => {
      const valor = 50000; // R$ 500,00
      const socioComissao = calculateCommission(valor, 'Sócio', 'PAGO');
      const diversosComissao = calculateCommission(valor, 'Diversos', 'PAGO');

      expect(socioComissao).toBe(500); // R$ 5,00 fixo
      expect(diversosComissao).toBe(5000); // 10% de R$ 500,00
      expect(socioComissao).not.toBe(diversosComissao);
    });
  });

  describe('Integração com status de pagamento', () => {
    it('deve retornar 0 para DOAÇÃO independente do tipo de cliente', () => {
      const valor = 50000;
      expect(calculateCommission(valor, 'Sócio', 'DOAÇÃO')).toBe(0);
      expect(calculateCommission(valor, 'Diversos', 'DOAÇÃO')).toBe(0);
    });

    it('deve calcular comissão para PAGO e AGUARDANDO', () => {
      const valor = 50000;
      const pagoSocio = calculateCommission(valor, 'Sócio', 'PAGO');
      const aguardandoSocio = calculateCommission(valor, 'Sócio', 'AGUARDANDO');

      expect(pagoSocio).toBe(500);
      expect(aguardandoSocio).toBe(500);
      expect(pagoSocio).toBe(aguardandoSocio);
    });
  });
});
