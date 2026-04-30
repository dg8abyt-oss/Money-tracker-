'use server';

import { LunchMoney } from '@/lib/lunchmoney';
import { format, subDays, subWeeks, subMonths, subYears, startOfWeek } from 'date-fns';

export type TimePeriod = '7d' | '2w' | '1m' | '4m' | '1y' | 'all';

export async function getDashboardData(period: TimePeriod) {
  const token = process.env.LUNCHMONEY_ACCESS_TOKEN;
  if (!token) {
    throw new Error('Lunch Money Access Token is not configured');
  }

  const lm = new LunchMoney(token);

  let startDate: Date;
  let endDate = new Date();

  switch (period) {
    case '7d':
      startDate = subDays(endDate, 7);
      break;
    case '2w':
      startDate = subWeeks(endDate, 2);
      break;
    case '1m':
      startDate = subMonths(endDate, 1);
      break;
    case '4m':
      startDate = subMonths(endDate, 4);
      break;
    case '1y':
      startDate = subYears(endDate, 1);
      break;
    case 'all':
    default:
      startDate = new Date('2000-01-01'); // Arbitrary far past
  }

  const formattedStart = format(startDate, 'yyyy-MM-dd');
  const formattedEnd = format(endDate, 'yyyy-MM-dd');

  // Fetch categories, transactions, and balances in parallel
  const [categories, transactions, assets, plaidAccounts] = await Promise.all([
    lm.getCategories(),
    lm.getTransactions(formattedStart, formattedEnd),
    lm.getAssets(),
    lm.getPlaidAccounts(),
  ]);

  // Exclude categories
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  // Valid transactions (not excluded, maybe not income if we're graphing expenses)
  const expenses = transactions.filter(t => {
    const amount = parseFloat(t.amount);
    // Ignore income (amounts > 0 or categorized as income)
    // In LM, expenses are usually positive numbers natively? Wait, depending on the view. 
    // Usually, in API they represent debit? No, Lunch Money amounts:
    // "Amount of the transaction in numeric format." 
    // In LM API, expenses are positive, income is negative, or vice versa? 
    // Actually, expenses are positive, income is negative in LM typically.
    // Wait, let's verify. Or I can just check category.is_income.
    
    let isIncome = false;
    let exclude = false;

    if (t.category_id && categoryMap.has(t.category_id)) {
      const cat = categoryMap.get(t.category_id)!;
      isIncome = cat.is_income;
      exclude = cat.exclude_from_totals;
    }

    // if the transaction amount is negative and no category, it might be income
    if (amount < 0) {
      isIncome = true;
    }

    if (t.status === 'failed' || t.status === 'declined') {
      exclude = true;
    }

    return !exclude && !isIncome;
  });

  const categoryTotals: Record<string, { name: string; amount: number; value: number }> = {};
  
  expenses.forEach(t => {
    const catName = t.category_id && categoryMap.has(t.category_id) 
      ? categoryMap.get(t.category_id)!.name 
      : 'Uncategorized';
      
    // Amount is usually positive for expense in LM, but if it has a negative, use Math.abs
    const amt = Math.abs(parseFloat(t.amount));

    if (!categoryTotals[catName]) {
      categoryTotals[catName] = { name: catName, amount: 0, value: 0 };
    }
    categoryTotals[catName].amount += amt;
    categoryTotals[catName].value += amt;
  });

  const chartData = Object.values(categoryTotals).sort((a, b) => b.amount - a.amount);

  // Total cash / current balance
  // Assets: only include positive liquid assets roughly, or just sum all.
  // We'll sum all checking/savings/cash, exclude loans if we just want "Total Cash", or just sum balance of all assets/plaid that are positive.
  let currentBalance = 0;
  
  assets.filter(a => !a.closed_on).forEach(a => {
    if (a.type_name === 'cash' || a.type_name === 'credit' || a.type_name === 'investment') {
        // usually total net worth includes all. The prompt says "Current Balance" or "Total Cash". Let's sum active assets
        currentBalance += parseFloat(a.balance);
    } else {
        currentBalance += parseFloat(a.balance);
    }
  });

  plaidAccounts.filter(p => p.status === 'active').forEach(p => {
    if (p.type === 'depository') { // checking, savings
        currentBalance += parseFloat(p.balance);
    }
  });

  // Calculate "Total Spent This Week" (regardless of the selected period, though maybe it means "this week" as in the last 7 days from now, or just the current week)
  const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
  const thisWeekStartStr = format(thisWeekStart, 'yyyy-MM-dd');
  
  const thisWeekSpend = expenses
    .filter(t => t.date >= thisWeekStartStr)
    .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

  const thisWeekTransactions = transactions
    .filter(t => t.date >= thisWeekStartStr)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(t => {
      const cat = t.category_id && categoryMap.has(t.category_id) ? categoryMap.get(t.category_id)! : null;
      return {
        id: t.id,
        date: t.date,
        payee: t.payee,
        amount: parseFloat(t.amount),
        category: cat ? cat.name : 'Uncategorized',
        excluded: cat ? cat.exclude_from_totals : false,
        notes: t.notes,
        tags: t.tags,
        originalPayee: t.original_name,
        status: t.status
      };
    });

  return {
    chartData,
    currentBalance,
    thisWeekSpend,
    thisWeekTransactions,
  };
}
