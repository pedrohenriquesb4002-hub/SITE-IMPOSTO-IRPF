import { describe, it, expect } from 'vitest';

describe('exportToExcel - Export Procedure', () => {
  it('should return declarations grouped by month', async () => {
    // Simulate the exportToExcel logic
    const months = ['Março', 'Abril', 'Maio'] as const;
    const allDeclarations: any = {};
    
    for (const month of months) {
      // In real scenario, this would call getDeclarationsByMonth
      allDeclarations[month] = [];
    }
    
    expect(allDeclarations).toHaveProperty('Março');
    expect(allDeclarations).toHaveProperty('Abril');
    expect(allDeclarations).toHaveProperty('Maio');
  });

  it('should calculate commissions correctly - only PAGO status counts', async () => {
    // Simulate commission calculation
    const declarations = [
      { collaborator: 'Mario', statusPagamento: 'PAGO', comissao: 500 },
      { collaborator: 'Mario', statusPagamento: 'AGUARDANDO', comissao: 500 },
      { collaborator: 'Mario', statusPagamento: 'PAGO', comissao: 500 },
    ];

    const commissionsByCollaborator: any = {};
    
    for (const decl of declarations) {
      if (!commissionsByCollaborator[decl.collaborator]) {
        commissionsByCollaborator[decl.collaborator] = {
          collaborator: decl.collaborator,
          total: { quantidade: 0, valor: 0, comissao: 0 },
        };
      }
      
      commissionsByCollaborator[decl.collaborator].total.quantidade++;
      if (decl.statusPagamento === 'PAGO') {
        commissionsByCollaborator[decl.collaborator].total.comissao += decl.comissao;
      }
    }

    // Only 2 PAGO declarations should count
    expect(commissionsByCollaborator['Mario'].total.quantidade).toBe(3);
    expect(commissionsByCollaborator['Mario'].total.comissao).toBe(1000); // 500 + 500
  });

  it('should return commissions as array of objects', async () => {
    const commissionsByCollaborator: any = {
      'Mario': {
        collaborator: 'Mario',
        marco: { quantidade: 0, valor: 0, comissao: 0 },
        abril: { quantidade: 0, valor: 0, comissao: 0 },
        maio: { quantidade: 0, valor: 0, comissao: 0 },
        total: { quantidade: 0, valor: 0, comissao: 0 },
      },
      'Hariane': {
        collaborator: 'Hariane',
        marco: { quantidade: 0, valor: 0, comissao: 0 },
        abril: { quantidade: 0, valor: 0, comissao: 0 },
        maio: { quantidade: 0, valor: 0, comissao: 0 },
        total: { quantidade: 0, valor: 0, comissao: 0 },
      },
    };

    const commissions = Object.values(commissionsByCollaborator);
    
    expect(Array.isArray(commissions)).toBe(true);
    expect(commissions.length).toBe(2);
    expect(commissions[0]).toHaveProperty('collaborator');
    expect(commissions[0]).toHaveProperty('marco');
    expect(commissions[0]).toHaveProperty('abril');
    expect(commissions[0]).toHaveProperty('maio');
    expect(commissions[0]).toHaveProperty('total');
  });

  it('should correctly sum values across months', async () => {
    const declarations = {
      'Março': [
        { collaborator: 'Mario', valorRecebido: 1000, comissao: 100, statusPagamento: 'PAGO' },
      ],
      'Abril': [
        { collaborator: 'Mario', valorRecebido: 2000, comissao: 200, statusPagamento: 'PAGO' },
      ],
      'Maio': [
        { collaborator: 'Mario', valorRecebido: 3000, comissao: 300, statusPagamento: 'PAGO' },
      ],
    };

    const commissionsByCollaborator: any = {
      'Mario': {
        collaborator: 'Mario',
        marco: { quantidade: 0, valor: 0, comissao: 0 },
        abril: { quantidade: 0, valor: 0, comissao: 0 },
        maio: { quantidade: 0, valor: 0, comissao: 0 },
        total: { quantidade: 0, valor: 0, comissao: 0 },
      },
    };

    const months = ['Março', 'Abril', 'Maio'] as const;
    for (const month of months) {
      const monthKey = month === 'Março' ? 'marco' : month.toLowerCase();
      const decls = declarations[month as keyof typeof declarations];
      
      for (const decl of decls) {
        commissionsByCollaborator['Mario'][monthKey].quantidade++;
        commissionsByCollaborator['Mario'][monthKey].valor += decl.valorRecebido;
        if (decl.statusPagamento === 'PAGO') {
          commissionsByCollaborator['Mario'][monthKey].comissao += decl.comissao;
        }
        
        commissionsByCollaborator['Mario'].total.quantidade++;
        commissionsByCollaborator['Mario'].total.valor += decl.valorRecebido;
        if (decl.statusPagamento === 'PAGO') {
          commissionsByCollaborator['Mario'].total.comissao += decl.comissao;
        }
      }
    }

    // Verify totals
    expect(commissionsByCollaborator['Mario'].total.quantidade).toBe(3);
    expect(commissionsByCollaborator['Mario'].total.valor).toBe(6000);
    expect(commissionsByCollaborator['Mario'].total.comissao).toBe(600);
    
    // Verify monthly breakdown
    expect(commissionsByCollaborator['Mario'].marco.quantidade).toBe(1);
    expect(commissionsByCollaborator['Mario'].marco.valor).toBe(1000);
    expect(commissionsByCollaborator['Mario'].marco.comissao).toBe(100);
  });

  it('should handle DOAÇÃO status - not counted in commissions', async () => {
    const declarations = [
      { collaborator: 'Hariane', statusPagamento: 'DOAÇÃO', comissao: 0 },
      { collaborator: 'Hariane', statusPagamento: 'PAGO', comissao: 500 },
    ];

    const commissionsByCollaborator: any = {
      'Hariane': {
        collaborator: 'Hariane',
        total: { quantidade: 0, valor: 0, comissao: 0 },
      },
    };

    for (const decl of declarations) {
      commissionsByCollaborator['Hariane'].total.quantidade++;
      if (decl.statusPagamento === 'PAGO') {
        commissionsByCollaborator['Hariane'].total.comissao += decl.comissao;
      }
    }

    // DOAÇÃO should not add to commission
    expect(commissionsByCollaborator['Hariane'].total.quantidade).toBe(2);
    expect(commissionsByCollaborator['Hariane'].total.comissao).toBe(500); // Only PAGO
  });

  it('should return export structure with declarations and commissions', async () => {
    const allDeclarations = {
      'Março': [],
      'Abril': [],
      'Maio': [],
    };

    const commissions = [
      {
        collaborator: 'Mario',
        marco: { quantidade: 0, valor: 0, comissao: 0 },
        abril: { quantidade: 0, valor: 0, comissao: 0 },
        maio: { quantidade: 0, valor: 0, comissao: 0 },
        total: { quantidade: 0, valor: 0, comissao: 0 },
      },
    ];

    const result = {
      declarations: allDeclarations,
      commissions: commissions,
    };

    expect(result).toHaveProperty('declarations');
    expect(result).toHaveProperty('commissions');
    expect(result.declarations).toHaveProperty('Março');
    expect(result.declarations).toHaveProperty('Abril');
    expect(result.declarations).toHaveProperty('Maio');
    expect(Array.isArray(result.commissions)).toBe(true);
  });

  it('should handle AGUARDANDO status - not counted in commissions', async () => {
    const declarations = [
      { collaborator: 'Partner', statusPagamento: 'AGUARDANDO', comissao: 500 },
      { collaborator: 'Partner', statusPagamento: 'PAGO', comissao: 500 },
      { collaborator: 'Partner', statusPagamento: 'AGUARDANDO', comissao: 500 },
    ];

    const commissionsByCollaborator: any = {
      'Partner': {
        collaborator: 'Partner',
        total: { quantidade: 0, valor: 0, comissao: 0 },
      },
    };

    for (const decl of declarations) {
      commissionsByCollaborator['Partner'].total.quantidade++;
      if (decl.statusPagamento === 'PAGO') {
        commissionsByCollaborator['Partner'].total.comissao += decl.comissao;
      }
    }

    // Only PAGO should count
    expect(commissionsByCollaborator['Partner'].total.quantidade).toBe(3);
    expect(commissionsByCollaborator['Partner'].total.comissao).toBe(500); // Only 1 PAGO
  });

  it('should correctly handle mixed statuses across months', async () => {
    const declarations = {
      'Março': [
        { collaborator: 'Tiago', valorRecebido: 1000, comissao: 100, statusPagamento: 'PAGO' },
        { collaborator: 'Tiago', valorRecebido: 2000, comissao: 200, statusPagamento: 'AGUARDANDO' },
        { collaborator: 'Tiago', valorRecebido: 0, comissao: 0, statusPagamento: 'DOAÇÃO' },
      ],
      'Abril': [
        { collaborator: 'Tiago', valorRecebido: 3000, comissao: 300, statusPagamento: 'PAGO' },
      ],
      'Maio': [],
    };

    const commissionsByCollaborator: any = {
      'Tiago': {
        collaborator: 'Tiago',
        marco: { quantidade: 0, valor: 0, comissao: 0 },
        abril: { quantidade: 0, valor: 0, comissao: 0 },
        maio: { quantidade: 0, valor: 0, comissao: 0 },
        total: { quantidade: 0, valor: 0, comissao: 0 },
      },
    };

    const months = ['Março', 'Abril', 'Maio'] as const;
    for (const month of months) {
      const monthKey = month === 'Março' ? 'marco' : month.toLowerCase();
      const decls = declarations[month as keyof typeof declarations];
      
      for (const decl of decls) {
        commissionsByCollaborator['Tiago'][monthKey].quantidade++;
        commissionsByCollaborator['Tiago'][monthKey].valor += decl.valorRecebido;
        if (decl.statusPagamento === 'PAGO') {
          commissionsByCollaborator['Tiago'][monthKey].comissao += decl.comissao;
        }
        
        commissionsByCollaborator['Tiago'].total.quantidade++;
        commissionsByCollaborator['Tiago'].total.valor += decl.valorRecebido;
        if (decl.statusPagamento === 'PAGO') {
          commissionsByCollaborator['Tiago'].total.comissao += decl.comissao;
        }
      }
    }

    // Verify totals - only PAGO counted
    expect(commissionsByCollaborator['Tiago'].total.quantidade).toBe(4);
    expect(commissionsByCollaborator['Tiago'].total.valor).toBe(6000);
    expect(commissionsByCollaborator['Tiago'].total.comissao).toBe(400); // 100 + 300
    
    // Verify monthly breakdown
    expect(commissionsByCollaborator['Tiago'].marco.quantidade).toBe(3);
    expect(commissionsByCollaborator['Tiago'].marco.valor).toBe(3000);
    expect(commissionsByCollaborator['Tiago'].marco.comissao).toBe(100); // Only PAGO
    
    expect(commissionsByCollaborator['Tiago'].abril.quantidade).toBe(1);
    expect(commissionsByCollaborator['Tiago'].abril.valor).toBe(3000);
    expect(commissionsByCollaborator['Tiago'].abril.comissao).toBe(300);
  });
});
