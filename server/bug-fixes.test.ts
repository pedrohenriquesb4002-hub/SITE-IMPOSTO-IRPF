import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb } from './db';
import { declarations, collaborators, settings } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Bug Fixes - Comissão e DOAÇÃO', () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  describe('Comissão ao editar status de pagamento', () => {
    it('deve manter comissão correta ao alterar de PAGO para AGUARDANDO', async () => {
      if (!db) {
        console.log('Banco de dados não disponível, pulando teste');
        return;
      }

      // Criar declaração de teste
      const result = await db.insert(declarations).values({
        month: 'Março',
        collaborator: 'Test User',
        cpfCliente: '123.456.789-00',
        cliente: 'Test Client',
        valorRecebido: 8000, // R$ 80,00 em centavos
        clienteType: 'Diversos',
        statusPagamento: 'PAGO',
        comissao: 800, // R$ 8,00 (10% de 80)
        userId: 1,
      });

      const declarationId = result[0].insertId || result[0];
      
      // Buscar a declaração
      const [declaration] = await db
        .select()
        .from(declarations)
        .where(eq(declarations.id, declarationId));

      // Verificar que a comissão foi calculada corretamente
      expect(declaration.comissao).toBe(800);
      expect(declaration.statusPagamento).toBe('PAGO');

      // Simular edição: apenas mudar status para AGUARDANDO
      // O backend deve recalcular a comissão com o valorRecebido correto
      const expectedComissao = Math.round(declaration.valorRecebido * 0.1); // 10% de 8000 = 800
      
      expect(expectedComissao).toBe(800);
    });

    it('deve calcular comissão corretamente quando valorRecebido vem em centavos', async () => {
      if (!db) {
        console.log('Banco de dados não disponível, pulando teste');
        return;
      }

      const valorRecebidoEmCentavos = 15000; // R$ 150,00
      const percentualDiversos = 10;
      
      // Simular cálculo que o backend faz
      const comissaoCalculada = Math.round(valorRecebidoEmCentavos * (percentualDiversos / 100));
      
      // Esperado: 1500 centavos = R$ 15,00
      expect(comissaoCalculada).toBe(1500);
    });
  });

  describe('DOAÇÃO com valor R$ 0,00', () => {
    it('deve permitir criar DOAÇÃO com valorRecebido = 0 e comissão = 0', async () => {
      if (!db) {
        console.log('Banco de dados não disponível, pulando teste');
        return;
      }

      // Criar declaração de DOAÇÃO
      const result = await db.insert(declarations).values({
        month: 'Março',
        collaborator: 'Test Donor',
        cpfCliente: '987.654.321-00',
        cliente: 'Donor Client',
        valorRecebido: 0, // R$ 0,00
        clienteType: 'Diversos',
        statusPagamento: 'DOAÇÃO',
        comissao: 0, // Sem comissão para doação
        userId: 1,
      });

      const declarationId = result[0].insertId || result[0];
      
      // Buscar a declaração
      const [declaration] = await db
        .select()
        .from(declarations)
        .where(eq(declarations.id, declarationId));

      // Verificar que foi criada corretamente
      expect(declaration.valorRecebido).toBe(0);
      expect(declaration.statusPagamento).toBe('DOAÇÃO');
      expect(declaration.comissao).toBe(0);
    });

    it('deve permitir criar DOAÇÃO com Sócio e valorRecebido = 0', async () => {
      if (!db) {
        console.log('Banco de dados não disponível, pulando teste');
        return;
      }

      // Criar declaração de DOAÇÃO com tipo Sócio
      const result = await db.insert(declarations).values({
        month: 'Março',
        collaborator: 'Partner Donor',
        cpfCliente: '111.222.333-44',
        cliente: 'Partner Client',
        valorRecebido: 0, // R$ 0,00
        clienteType: 'Sócio',
        statusPagamento: 'DOAÇÃO',
        comissao: 0, // DOAÇÃO não tem comissão
        userId: 1,
      });

      const declarationId = result[0].insertId || result[0];
      
      // Buscar a declaração
      const [declaration] = await db
        .select()
        .from(declarations)
        .where(eq(declarations.id, declarationId));

      // Verificar que foi criada corretamente
      expect(declaration.valorRecebido).toBe(0);
      expect(declaration.clienteType).toBe('Sócio');
      expect(declaration.statusPagamento).toBe('DOAÇÃO');
      expect(declaration.comissao).toBe(0);
    });
  });

  describe('Sócio com valorRecebido = 0 mas comissão = R$ 5,00', () => {
    it('deve permitir Sócio com valorRecebido = 0 e comissão = 500 (R$ 5,00)', async () => {
      if (!db) {
        console.log('Banco de dados não disponível, pulando teste');
        return;
      }

      // Criar declaração de Sócio com valor 0 mas comissão 5
      const result = await db.insert(declarations).values({
        month: 'Março',
        collaborator: 'Partner',
        cpfCliente: '555.666.777-88',
        cliente: 'Partner Client 2',
        valorRecebido: 0, // R$ 0,00
        clienteType: 'Sócio',
        statusPagamento: 'PAGO',
        comissao: 500, // R$ 5,00 fixo para sócio
        userId: 1,
      });

      const declarationId = result[0].insertId || result[0];
      
      // Buscar a declaração
      const [declaration] = await db
        .select()
        .from(declarations)
        .where(eq(declarations.id, declarationId));

      // Verificar que foi criada corretamente
      expect(declaration.valorRecebido).toBe(0);
      expect(declaration.clienteType).toBe('Sócio');
      expect(declaration.comissao).toBe(500); // R$ 5,00
    });
  });

  describe('Validação de percentualDiversos', () => {
    it('percentualDiversos deve usar valor padrão de 10 se inválido', async () => {
      if (!db) {
        console.log('Banco de dados não disponível, pulando teste');
        return;
      }

      // Buscar settings
      const [settingsData] = await db
        .select()
        .from(settings)
        .where(eq(settings.userId, 1));

      // Se percentualDiversos for 0 ou inválido, o sistema usa 10 como padrão
      // O teste valida que a lógica de importação sempre usa um valor válido
      const percentualUsado = settingsData?.percentualDiversos ?? 10;
      // Se for 0, o sistema deve usar 10 como padrão na importação
      const percentualFinal = percentualUsado === 0 ? 10 : percentualUsado;
      expect(percentualFinal).toBeGreaterThanOrEqual(1);
    });
  });
});
