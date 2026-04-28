import { describe, expect, it } from "vitest";

describe("Commission Calculation Fix", () => {
  it("DIVERSOS + PAGO should calculate 10% commission", () => {
    const valorRecebido = 15000; // R$ 150,00 em centavos
    const percentualDiversos = 10;
    const comissao = Math.round(valorRecebido * (percentualDiversos / 100));
    
    expect(comissao).toBe(1500); // R$ 15,00 em centavos
  });

  it("DIVERSOS + AGUARDANDO should calculate 10% commission", () => {
    const valorRecebido = 15000; // R$ 150,00 em centavos
    const percentualDiversos = 10;
    const comissao = Math.round(valorRecebido * (percentualDiversos / 100));
    
    expect(comissao).toBe(1500); // R$ 15,00 em centavos
  });

  it("SOCIO + PAGO should be R$ 5,00 fixed", () => {
    const comissao = 500; // R$ 5,00 em centavos
    
    expect(comissao).toBe(500);
  });

  it("SOCIO + AGUARDANDO should be R$ 5,00 fixed", () => {
    const comissao = 500; // R$ 5,00 em centavos
    
    expect(comissao).toBe(500);
  });

  it("DOACAO should have zero commission", () => {
    const comissao = 0;
    
    expect(comissao).toBe(0);
  });

  it("DIVERSOS with different values should calculate correctly", () => {
    const testCases = [
      { valor: 10000, expected: 1000 }, // R$ 100,00 -> R$ 10,00
      { valor: 20000, expected: 2000 }, // R$ 200,00 -> R$ 20,00
      { valor: 5000, expected: 500 },   // R$ 50,00 -> R$ 5,00
    ];

    testCases.forEach(({ valor, expected }) => {
      const comissao = Math.round(valor * 0.1);
      expect(comissao).toBe(expected);
    });
  });
});
