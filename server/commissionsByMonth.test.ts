import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getCommissionsByMonth, getAllMonthsCommissions, getTotalCommissions } from './commissionsByMonth';

describe('Comissões por Mês', () => {
  describe('getCommissionsByMonth', () => {
    it('deve retornar estrutura correta para um mês', async () => {
      const result = await getCommissionsByMonth(1, 'Março');
      
      expect(result).toHaveProperty('month');
      expect(result).toHaveProperty('quantity');
      expect(result).toHaveProperty('totalValue');
      expect(result).toHaveProperty('totalCommission');
      expect(result.month).toBe('Março');
    });

    it('deve retornar dados válidos para Março', async () => {
      const result = await getCommissionsByMonth(1, 'Março');
      
      expect(result.quantity).toBeGreaterThanOrEqual(0);
      expect(result.totalValue).toBeGreaterThanOrEqual(0);
      expect(result.totalCommission).toBeGreaterThanOrEqual(0);
    });

    it('deve retornar dados válidos para Abril', async () => {
      const result = await getCommissionsByMonth(1, 'Abril');
      
      expect(result.quantity).toBeGreaterThanOrEqual(0);
      expect(result.totalValue).toBeGreaterThanOrEqual(0);
      expect(result.totalCommission).toBeGreaterThanOrEqual(0);
    });

    it('deve retornar dados válidos para Maio', async () => {
      const result = await getCommissionsByMonth(1, 'Maio');
      
      expect(result.quantity).toBeGreaterThanOrEqual(0);
      expect(result.totalValue).toBeGreaterThanOrEqual(0);
      expect(result.totalCommission).toBeGreaterThanOrEqual(0);
    });

    it('deve retornar valores padrão se banco de dados não estiver disponível', async () => {
      const result = await getCommissionsByMonth(999, 'Março');
      
      expect(result.month).toBe('Março');
      expect(result.quantity).toBe(0);
      expect(result.totalValue).toBe(0);
      expect(result.totalCommission).toBe(0);
    });
  });

  describe('getAllMonthsCommissions', () => {
    it('deve retornar array com 3 meses', async () => {
      const result = await getAllMonthsCommissions(1);
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
    });

    it('deve retornar meses na ordem correta', async () => {
      const result = await getAllMonthsCommissions(1);
      
      expect(result[0].month).toBe('Março');
      expect(result[1].month).toBe('Abril');
      expect(result[2].month).toBe('Maio');
    });

    it('cada mês deve ter estrutura válida', async () => {
      const result = await getAllMonthsCommissions(1);
      
      result.forEach(month => {
        expect(month).toHaveProperty('month');
        expect(month).toHaveProperty('quantity');
        expect(month).toHaveProperty('totalValue');
        expect(month).toHaveProperty('totalCommission');
      });
    });

    it('todos os valores devem ser não-negativos', async () => {
      const result = await getAllMonthsCommissions(1);
      
      result.forEach(month => {
        expect(month.quantity).toBeGreaterThanOrEqual(0);
        expect(month.totalValue).toBeGreaterThanOrEqual(0);
        expect(month.totalCommission).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('getTotalCommissions', () => {
    it('deve retornar estrutura correta', async () => {
      const result = await getTotalCommissions(1);
      
      expect(result).toHaveProperty('totalQuantity');
      expect(result).toHaveProperty('totalValue');
      expect(result).toHaveProperty('totalCommission');
    });

    it('deve somar corretamente todos os meses', async () => {
      const result = await getTotalCommissions(1);
      const monthsData = await getAllMonthsCommissions(1);
      
      const expectedQuantity = monthsData.reduce((sum, m) => sum + m.quantity, 0);
      const expectedValue = monthsData.reduce((sum, m) => sum + m.totalValue, 0);
      const expectedCommission = monthsData.reduce((sum, m) => sum + m.totalCommission, 0);
      
      expect(result.totalQuantity).toBe(expectedQuantity);
      expect(result.totalValue).toBe(expectedValue);
      expect(result.totalCommission).toBe(expectedCommission);
    });

    it('todos os valores totais devem ser não-negativos', async () => {
      const result = await getTotalCommissions(1);
      
      expect(result.totalQuantity).toBeGreaterThanOrEqual(0);
      expect(result.totalValue).toBeGreaterThanOrEqual(0);
      expect(result.totalCommission).toBeGreaterThanOrEqual(0);
    });

    it('total deve ser maior ou igual a qualquer mês individual', async () => {
      const result = await getTotalCommissions(1);
      const monthsData = await getAllMonthsCommissions(1);
      
      monthsData.forEach(month => {
        expect(result.totalQuantity).toBeGreaterThanOrEqual(month.quantity);
        expect(result.totalValue).toBeGreaterThanOrEqual(month.totalValue);
        expect(result.totalCommission).toBeGreaterThanOrEqual(month.totalCommission);
      });
    });
  });

  describe('Integração entre funções', () => {
    it('soma dos meses deve ser igual ao total', async () => {
      const monthsData = await getAllMonthsCommissions(1);
      const totalData = await getTotalCommissions(1);
      
      const sumQuantity = monthsData.reduce((sum, m) => sum + m.quantity, 0);
      const sumValue = monthsData.reduce((sum, m) => sum + m.totalValue, 0);
      const sumCommission = monthsData.reduce((sum, m) => sum + m.totalCommission, 0);
      
      expect(totalData.totalQuantity).toBe(sumQuantity);
      expect(totalData.totalValue).toBe(sumValue);
      expect(totalData.totalCommission).toBe(sumCommission);
    });
  });
});
