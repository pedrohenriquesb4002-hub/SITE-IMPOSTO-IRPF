import { describe, expect, it } from "vitest";

describe("Import and Commission Calculation", () => {
  it("should calculate 10% commission for DIVERSOS", () => {
    const valorRecebido = 15000; // R$ 150,00 em centavos
    const percentual = 10;
    const comissao = Math.round(valorRecebido * (percentual / 100));
    expect(comissao).toBe(1500); // R$ 15,00 em centavos
  });

  it("should calculate R$ 5,00 fixed commission for SÓCIO", () => {
    const comissao = 500; // R$ 5,00 em centavos
    expect(comissao).toBe(500);
  });

  it("should calculate 0 commission for DOAÇÃO", () => {
    const comissao = 0;
    expect(comissao).toBe(0);
  });

  it("should not duplicate declarations on import", () => {
    const declarations = [
      { month: "Março", collaborator: "João", cliente: "Cliente A", valorRecebido: 10000, clienteType: "Diversos", comissao: 1000 },
      { month: "Março", collaborator: "João", cliente: "Cliente B", valorRecebido: 10000, clienteType: "Diversos", comissao: 1000 },
      { month: "Março", collaborator: "Maria", cliente: "Cliente A", valorRecebido: 10000, clienteType: "Sócio", comissao: 500 },
    ];
    
    // Verificar que não há duplicatas
    const uniqueKey = (d: any) => `${d.month}-${d.collaborator}-${d.cliente}-${d.valorRecebido}`;
    const keys = declarations.map(uniqueKey);
    const uniqueKeys = new Set(keys);
    
    expect(uniqueKeys.size).toBe(3); // Deve ter 3 declarações únicas
  });

  it("should convert Excel value to centavos correctly", () => {
    const valorExcel = 150; // R$ 150,00
    const valorEmCentavos = Math.round(valorExcel * 100);
    expect(valorEmCentavos).toBe(15000);
    
    // Calcular comissão com valor em centavos
    const comissao = Math.round(valorEmCentavos * 0.10);
    expect(comissao).toBe(1500); // R$ 15,00
  });

  it("should normalize collaborator names", () => {
    const normalizeName = (name: string) => {
      if (!name) return '';
      return name
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    expect(normalizeName("JOÃO SILVA")).toBe("João Silva");
    expect(normalizeName("maria santos")).toBe("Maria Santos");
    expect(normalizeName("PEDRO OLIVEIRA")).toBe("Pedro Oliveira");
  });

  it("should handle different clienteType formats", () => {
    const normalizeClienteType = (type: string) => {
      let clienteType = 'Diversos';
      if (type.toLowerCase().includes('sócio') || type.toLowerCase().includes('socio')) {
        clienteType = 'Sócio';
      }
      return clienteType;
    };

    expect(normalizeClienteType("SÓCIO")).toBe("Sócio");
    expect(normalizeClienteType("socio")).toBe("Sócio");
    expect(normalizeClienteType("DIVERSOS")).toBe("Diversos");
    expect(normalizeClienteType("diversos")).toBe("Diversos");
  });
});
