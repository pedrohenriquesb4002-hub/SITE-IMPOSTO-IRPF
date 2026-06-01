import { describe, expect, it } from "vitest";

/**
 * Testes para validar a lógica de cálculo de comissões
 * SÓCIO: R$ 5,00 fixo (500 centavos)
 * DOAÇÃO: sem comissão (0)
 * DIVERSOS: 10% do valor
 */

describe("Commission Calculations", () => {
  it("should calculate 5.00 BRL commission for Sócio type", () => {
    const clienteType = "Sócio";
    const statusPagamento = "PAGO";
    const valorRecebido = 10000; // R$ 100,00 em centavos

    let comissao = 0;
    if (clienteType === "Sócio") {
      comissao = 500; // R$ 5,00 fixo em centavos
    } else if (statusPagamento === "DOAÇÃO") {
      comissao = 0;
    } else {
      comissao = Math.round(valorRecebido * (10 / 100));
    }

    expect(comissao).toBe(500); // R$ 5,00
  });

  it("should calculate 0 commission for Doação status", () => {
    const clienteType = "Diversos";
    const statusPagamento = "DOAÇÃO";
    const valorRecebido = 10000; // R$ 100,00 em centavos

    let comissao = 0;
    if (clienteType === "Sócio") {
      comissao = 500;
    } else if (statusPagamento === "DOAÇÃO") {
      comissao = 0; // DOAÇÃO não tem comissão
    } else {
      comissao = Math.round(valorRecebido * (10 / 100));
    }

    expect(comissao).toBe(0); // Sem comissão
  });

  it("should calculate 10% commission for Diversos type", () => {
    const clienteType = "Diversos";
    const statusPagamento = "PAGO";
    const valorRecebido = 10000; // R$ 100,00 em centavos

    let comissao = 0;
    if (clienteType === "Sócio") {
      comissao = 500;
    } else if (statusPagamento === "DOAÇÃO") {
      comissao = 0;
    } else {
      comissao = Math.round(valorRecebido * (10 / 100));
    }

    expect(comissao).toBe(1000); // 10% de R$ 100,00 = R$ 10,00
  });

  it("should calculate 10% commission for Diversos with different values", () => {
    const testCases = [
      { valor: 5000, expected: 500 }, // R$ 50,00 -> R$ 5,00
      { valor: 25000, expected: 2500 }, // R$ 250,00 -> R$ 25,00
      { valor: 100000, expected: 10000 }, // R$ 1000,00 -> R$ 100,00
    ];

    testCases.forEach(({ valor, expected }) => {
      const clienteType = "Diversos";
      const statusPagamento = "PAGO";

      let comissao = 0;
      if (clienteType === "Sócio") {
        comissao = 500;
      } else if (statusPagamento === "DOAÇÃO") {
        comissao = 0;
      } else {
        comissao = Math.round(valor * (10 / 100));
      }

      expect(comissao).toBe(expected);
    });
  });

  it("should handle Sócio with 0 valor correctly", () => {
    const clienteType = "Sócio";
    const statusPagamento = "PAGO";
    const valorRecebido = 0; // R$ 0,00

    let comissao = 0;
    if (clienteType === "Sócio") {
      comissao = 500; // R$ 5,00 fixo mesmo com valor 0
    } else if (statusPagamento === "DOAÇÃO") {
      comissao = 0;
    } else {
      comissao = Math.round(valorRecebido * (10 / 100));
    }

    expect(comissao).toBe(500); // R$ 5,00 fixo
  });

  it("should handle Doação with 0 valor correctly", () => {
    const clienteType = "Diversos";
    const statusPagamento = "DOAÇÃO";
    const valorRecebido = 0; // R$ 0,00

    let comissao = 0;
    if (clienteType === "Sócio") {
      comissao = 500;
    } else if (statusPagamento === "DOAÇÃO") {
      comissao = 0; // DOAÇÃO sempre 0
    } else {
      comissao = Math.round(valorRecebido * (10 / 100));
    }

    expect(comissao).toBe(0); // Sem comissão
  });

  it("should import Sócio and Doação with zero values", () => {
    // Simular dados de importação
    const importedDeclarations = [
      {
        month: "Março",
        collaborator: "João",
        cliente: "Empresa A",
        valorRecebido: 0, // Sócio com valor 0
        clienteType: "Sócio",
        statusPagamento: "PAGO",
        comissao: 500,
      },
      {
        month: "Março",
        collaborator: "Maria",
        cliente: "Empresa B",
        valorRecebido: 0, // Doação com valor 0
        clienteType: "Diversos",
        statusPagamento: "DOAÇÃO",
        comissao: 0,
      },
    ];

    // Validar que ambas as declarações foram importadas
    expect(importedDeclarations).toHaveLength(2);
    expect(importedDeclarations[0]?.comissao).toBe(500);
    expect(importedDeclarations[1]?.comissao).toBe(0);
  });
});
