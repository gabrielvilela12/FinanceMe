// src/pages/Insights.tsx

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { useGroup } from '@/contexts/GroupContext';
import { Transaction } from '@/types';
import { format, parseISO, getMonth, getYear } from 'date-fns';
import { getCategoryColor } from '@/lib/colors';
import { ArrowDown, ArrowUp } from 'lucide-react';

export default function Insights() {
  const { user, decrypt } = useAuth();
  const { selectedGroup, addRefreshListener } = useGroup();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase.from('transacoes').select('*');

    if (selectedGroup) {
      query = query.eq('group_id', selectedGroup);
    } else {
      query = query.is('group_id', null).eq('user_id', user.id);
    }

    const { data, error } = await query.order('data', { ascending: false });
    if (data) {
      setTransactions(data as Transaction[]);
    }
    setLoading(false);
  };
  
  useEffect(() => {
    if (user) {
      const removeListener = addRefreshListener(fetchTransactions);
      fetchTransactions();
      return () => removeListener();
    }
  }, [user, selectedGroup, addRefreshListener]);

  const getNumericValue = (value: string | number) => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    try {
      const decrypted = decrypt(value);
      const num = parseFloat(decrypted);
      return isNaN(num) ? 0 : num;
    } catch {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
  };
  
  const getDecryptedText = (text: string | null) => {
      if (!text) return '';
      try {
        return decrypt(text);
      } catch {
        return text;
      }
  }

  const analysis = useMemo(() => {
    if (transactions.length === 0) return null;

    const expenses = transactions.filter(t => getDecryptedText(t.tipo) === 'despesa');
    const incomes = transactions.filter(t => getDecryptedText(t.tipo) === 'receita');

    const spendingByCategory = expenses.reduce((acc, t) => {
      const category = getDecryptedText(t.categoria);
      const value = getNumericValue(t.valor);
      acc[category] = (acc[category] || 0) + value;
      return acc;
    }, {} as Record<string, number>);

    const topCategories = Object.entries(spendingByCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));
      
    const incomeByCategory = incomes.reduce((acc, t) => {
      const category = getDecryptedText(t.categoria);
      const value = getNumericValue(t.valor);
      acc[category] = (acc[category] || 0) + value;
      return acc;
    }, {} as Record<string, number>);

    const topIncomeSources = Object.entries(incomeByCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    const monthlySpending: Record<string, { despesas: number, receitas: number }> = {};
    transactions.forEach(t => {
      const month = format(parseISO(t.data), 'yyyy-MM');
      if (!monthlySpending[month]) {
        monthlySpending[month] = { despesas: 0, receitas: 0 };
      }
      const value = getNumericValue(t.valor);
      if (getDecryptedText(t.tipo) === 'despesa') {
        monthlySpending[month].despesas += value;
      } else {
        monthlySpending[month].receitas += value;
      }
    });

    const spendingHistory = Object.entries(monthlySpending)
        .map(([month, values]) => ({
            month: format(parseISO(`${month}-01`), 'MMM/yy'),
            ...values,
        }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());


    const firstTransactionDate = parseISO(transactions[transactions.length - 1].data);
    const lastTransactionDate = parseISO(transactions[0].data);
    const totalDays = Math.max(1, (lastTransactionDate.getTime() - firstTransactionDate.getTime()) / (1000 * 3600 * 24));
    const totalMonths = Math.max(1, (getYear(lastTransactionDate) - getYear(firstTransactionDate)) * 12 + getMonth(lastTransactionDate) - getMonth(firstTransactionDate) + 1);
    
    const totalExpenses = expenses.reduce((sum, t) => sum + getNumericValue(t.valor), 0);
    const averageDailySpending = totalExpenses / totalDays;
    const averageMonthlySpending = totalExpenses / totalMonths;

    const biggestExpense = expenses.length > 0 ? expenses.reduce((max, t) => getNumericValue(t.valor) > getNumericValue(max.valor) ? t : max, expenses[0]) : null;
    const biggestIncome = incomes.length > 0 ? incomes.reduce((max, t) => getNumericValue(t.valor) > getNumericValue(max.valor) ? t : max, incomes[0]) : null;

    return {
      topCategories,
      topIncomeSources,
      spendingHistory,
      averageDailySpending,
      averageMonthlySpending,
      biggestExpense,
      biggestIncome,
    };
  }, [transactions, decrypt]);

  if (loading) return <Layout><div className="text-center py-12">Analisando seu histórico...</div></Layout>;
  if (!analysis) return <Layout><div className="text-center py-12">Dados insuficientes para gerar insights.</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Insights do Histórico</h2>
          <p className="text-muted-foreground">Uma análise detalhada dos seus hábitos financeiros.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Média de Gasto Diário</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(analysis.averageDailySpending)}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Média de Gasto Mensal</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(analysis.averageMonthlySpending)}</p>
                </CardContent>
            </Card>
            <Card className="bg-red-50 dark:bg-red-900/20">
                <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center text-red-600 dark:text-red-400">
                        <ArrowDown className="h-4 w-4 mr-2"/> Maior Despesa
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {analysis.biggestExpense ? (
                        <>
                            <p className="text-2xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getNumericValue(analysis.biggestExpense.valor))}</p>
                            <p className="text-xs text-muted-foreground truncate">{getDecryptedText(analysis.biggestExpense.descricao) || getDecryptedText(analysis.biggestExpense.categoria)}</p>
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground">Nenhuma despesa registrada.</p>
                    )}
                </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-900/20">
                <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center text-green-600 dark:text-green-400">
                        <ArrowUp className="h-4 w-4 mr-2"/> Maior Receita
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {analysis.biggestIncome ? (
                        <>
                            <p className="text-2xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getNumericValue(analysis.biggestIncome.valor))}</p>
                            <p className="text-xs text-muted-foreground truncate">{getDecryptedText(analysis.biggestIncome.descricao) || getDecryptedText(analysis.biggestIncome.categoria)}</p>
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground">Nenhuma receita registrada.</p>
                    )}
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Categorias de Despesa</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analysis.topCategories}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {analysis.topCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Top 5 Categorias de Receita</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analysis.topIncomeSources}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {analysis.topIncomeSources.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
            <CardHeader>
              <CardTitle>Histórico Mensal</CardTitle>
              <CardDescription>Receitas vs. Despesas ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analysis.spendingHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))} />
                  <Legend />
                  <Bar dataKey="receitas" fill="#66BB6A" name="Receitas" />
                  <Bar dataKey="despesas" fill="#EF5350" name="Despesas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>
    </Layout>
  );
}