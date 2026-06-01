import { describe, expect, it } from "vitest";

/**
 * Unit tests for commission calculation logic
 * These tests validate the business rules for commission calculations
 */

describe("Commission Calculation Logic", () => {
  /**
   * Helper function to calculate commission based on business rules
   */
  function calculateCommission(
    clienteType: "Sócio" | "Diversos",
    statusPagamento: "PAGO" | "AGUARDANDO" | "DOAÇÃO",
    valorRecebido: number,
    percentualDiversos: number = 10
  ): number {
    // DOAÇÃO: sem comissão (0)
    if (statusPagamento === "DOAÇÃO") {
      return 0;
    }
    // SÓCIO: R$ 5,00 fixo (sempre 500 centavos)
    else if (clienteType === "Sócio") {
      return 500;
    }
    // DIVERSOS: percentualDiversos% do valor
    else {
      return Math.round(valorRecebido * (percentualDiversos / 100));
    }
  }

  describe("Sócio commission", () => {
    it("should always be R$ 5,00 (500 cents) regardless of valorRecebido", () => {
      // Sócio with valorRecebido = 0
      const result1 = calculateCommission("Sócio", "PAGO", 0);
      expect(result1).toBe(500); // R$ 5,00 em centavos

      // Sócio with valorRecebido = 10000 (R$ 100,00)
      const result2 = calculateCommission("Sócio", "PAGO", 10000);
      expect(result2).toBe(500); // R$ 5,00 em centavos (sempre)

      // Sócio with valorRecebido = 50000 (R$ 500,00)
      const result3 = calculateCommission("Sócio", "PAGO", 50000);
      expect(result3).toBe(500); // R$ 5,00 em centavos (sempre)
    });

    it("should be R$ 5,00 even with AGUARDANDO status", () => {
      const result = calculateCommission("Sócio", "AGUARDANDO", 5000);
      expect(result).toBe(500); // R$ 5,00 em centavos
    });

    it("should be 0 with DOAÇÃO status (DOAÇÃO takes precedence)", () => {
      const result = calculateCommission("Sócio", "DOAÇÃO", 10000);
      expect(result).toBe(0); // Doação não tem comissão
    });
  });

  describe("Diversos commission", () => {
    it("should be 10% of valorRecebido", () => {
      // Diversos with valorRecebido = 10000 (R$ 100,00)
      // Expected commission = 10% = 1000 (R$ 10,00)
      const result = calculateCommission("Diversos", "PAGO", 10000);
      expect(result).toBe(1000); // 10% em centavos
    });

    it("should be 10% for both PAGO and AGUARDANDO status", () => {
      const result1 = calculateCommission("Diversos", "PAGO", 5000);
      expect(result1).toBe(500); // 10% de 5000

      const result2 = calculateCommission("Diversos", "AGUARDANDO", 5000);
      expect(result2).toBe(500); // 10% de 5000
    });

    it("should be 0 for zero valorRecebido", () => {
      const result = calculateCommission("Diversos", "PAGO", 0);
      expect(result).toBe(0); // 0% de 0
    });

    it("should handle custom percentualDiversos", () => {
      // With 15% commission
      const result1 = calculateCommission("Diversos", "PAGO", 10000, 15);
      expect(result1).toBe(1500); // 15% de 10000

      // With 5% commission
      const result2 = calculateCommission("Diversos", "PAGO", 10000, 5);
      expect(result2).toBe(500); // 5% de 10000
    });
  });

  describe("Doação commission", () => {
    it("should always be 0 regardless of valorRecebido or clienteType", () => {
      // Doação with high value
      const result1 = calculateCommission("Diversos", "DOAÇÃO", 10000);
      expect(result1).toBe(0); // Doação não tem comissão

      // Doação with Sócio type
      const result2 = calculateCommission("Sócio", "DOAÇÃO", 5000);
      expect(result2).toBe(0); // Doação não tem comissão

      // Doação with zero value
      const result3 = calculateCommission("Diversos", "DOAÇÃO", 0);
      expect(result3).toBe(0); // Doação não tem comissão
    });
  });

  describe("Commission calculation edge cases", () => {
    it("should handle rounding correctly", () => {
      // 10% of 333 = 33.3 -> should round to 33
      const result1 = calculateCommission("Diversos", "PAGO", 333);
      expect(result1).toBe(33);

      // 10% of 335 = 33.5 -> should round to 34
      const result2 = calculateCommission("Diversos", "PAGO", 335);
      expect(result2).toBe(34);
    });

    it("should handle large values", () => {
      // 10% of 1,000,000 (R$ 10,000,00) = 100,000 (R$ 1,000,00)
      const result = calculateCommission("Diversos", "PAGO", 1000000);
      expect(result).toBe(100000);
    });

    it("should handle very small percentages", () => {
      // 1% of 10000 = 100
      const result = calculateCommission("Diversos", "PAGO", 10000, 1);
      expect(result).toBe(100);
    });
  });

  describe("Status precedence", () => {
    it("DOAÇÃO status should override clienteType", () => {
      // Even though it's Sócio, DOAÇÃO should result in 0 commission
      const result = calculateCommission("Sócio", "DOAÇÃO", 100000);
      expect(result).toBe(0);
    });

    it("clienteType should override percentualDiversos", () => {
      // Sócio should always be 500, not affected by percentualDiversos
      const result = calculateCommission("Sócio", "PAGO", 10000, 50);
      expect(result).toBe(500); // Still 500, not 5000
    });
  });
});
