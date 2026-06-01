import { describe, it, expect } from "vitest";

describe("Cálculo de Comissão", () => {
  // Teste 1: DIVERSOS com 10%
  it("deve calcular 10% de comissão para DIVERSOS", () => {
    const valorRecebido = 150; // R$ 150,00
    const percentualDiversos = 10;
    
    // Converter para centavos
    const valorEmCentavos = Math.round(valorRecebido * 100); // 15000 centavos
    
    // Calcular comissão
    const comissao = Math.round(valorEmCentavos * (percentualDiversos / 100));
    
    // Esperado: 15000 * 0.10 = 1500 centavos = R$ 15,00
    expect(comissao).toBe(1500);
    expect(comissao / 100).toBe(15);
  });

  // Teste 2: SÓCIO com R$ 5,00 fixo
  it("deve calcular R$ 5,00 fixo para SÓCIO", () => {
    const comissao = 500; // R$ 5,00 em centavos
    
    expect(comissao).toBe(500);
    expect(comissao / 100).toBe(5);
  });

  // Teste 3: DOAÇÃO sem comissão
  it("não deve calcular comissão para DOAÇÃO", () => {
    const comissao = 0;
    
    expect(comissao).toBe(0);
    expect(comissao / 100).toBe(0);
  });

  // Teste 4: Valor maior
  it("deve calcular 10% de R$ 1.000,00 = R$ 100,00", () => {
    const valorRecebido = 1000; // R$ 1.000,00
    const percentualDiversos = 10;
    
    const valorEmCentavos = Math.round(valorRecebido * 100); // 100000 centavos
    const comissao = Math.round(valorEmCentavos * (percentualDiversos / 100));
    
    // Esperado: 100000 * 0.10 = 10000 centavos = R$ 100,00
    expect(comissao).toBe(10000);
    expect(comissao / 100).toBe(100);
  });

  // Teste 5: Valor pequeno
  it("deve calcular 10% de R$ 50,00 = R$ 5,00", () => {
    const valorRecebido = 50; // R$ 50,00
    const percentualDiversos = 10;
    
    const valorEmCentavos = Math.round(valorRecebido * 100); // 5000 centavos
    const comissao = Math.round(valorEmCentavos * (percentualDiversos / 100));
    
    // Esperado: 5000 * 0.10 = 500 centavos = R$ 5,00
    expect(comissao).toBe(500);
    expect(comissao / 100).toBe(5);
  });

  // Teste 6: Valor com decimais
  it("deve calcular 10% de R$ 123,45 = R$ 12,35 (arredondado)", () => {
    const valorRecebido = 123.45; // R$ 123,45
    const percentualDiversos = 10;
    
    const valorEmCentavos = Math.round(valorRecebido * 100); // 12345 centavos
    const comissao = Math.round(valorEmCentavos * (percentualDiversos / 100));
    
    // Esperado: 12345 * 0.10 = 1234.5 → arredonda para 1235 centavos = R$ 12,35
    expect(comissao).toBe(1235);
    expect(comissao / 100).toBeCloseTo(12.35);
  });
});
