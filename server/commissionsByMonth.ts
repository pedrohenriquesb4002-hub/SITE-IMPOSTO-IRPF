import { and, eq } from "drizzle-orm";
import { declarations } from "../drizzle/schema";
import { getDb } from "./db";

export type MonthCommissions = {
  month: 'Março' | 'Abril' | 'Maio';
  quantity: number;
  totalValue: number;
  totalCommission: number;
};

export type TotalCommissions = {
  totalQuantity: number;
  totalValue: number;
  totalCommission: number;
};

/**
 * Busca comissões de um mês específico
 */
export async function getCommissionsByMonth(
  userId: number,
  month: 'Março' | 'Abril' | 'Maio'
): Promise<MonthCommissions> {
  const db = await getDb();
  if (!db) {
    return { month, quantity: 0, totalValue: 0, totalCommission: 0 };
  }

  const declarations_list = await db
    .select()
    .from(declarations)
    .where(
      and(
        eq(declarations.userId, userId),
        eq(declarations.month, month)
      )
    );

  const quantity = declarations_list.length;
  const totalValue = declarations_list.reduce((sum, d) => sum + (d.valorRecebido || 0), 0);
  const totalCommission = declarations_list
    .filter(d => d.statusPagamento === 'PAGO')
    .reduce((sum, d) => sum + (d.comissao || 0), 0);

  return { month, quantity, totalValue, totalCommission };
}

/**
 * Busca comissões de todos os meses
 */
export async function getAllMonthsCommissions(userId: number): Promise<MonthCommissions[]> {
  const months: Array<'Março' | 'Abril' | 'Maio'> = ['Março', 'Abril', 'Maio'];
  const results = await Promise.all(
    months.map(month => getCommissionsByMonth(userId, month))
  );
  return results;
}

/**
 * Calcula o total de comissões de todos os meses
 */
export async function getTotalCommissions(userId: number): Promise<TotalCommissions> {
  const monthsData = await getAllMonthsCommissions(userId);
  
  const totalQuantity = monthsData.reduce((sum, m) => sum + m.quantity, 0);
  const totalValue = monthsData.reduce((sum, m) => sum + m.totalValue, 0);
  const totalCommission = monthsData.reduce((sum, m) => sum + m.totalCommission, 0);

  return { totalQuantity, totalValue, totalCommission };
}
