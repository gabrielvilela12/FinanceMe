// src/pages/Projections.tsx

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { Transaction } from '@/types';
import { addMonths, format, getDaysInMonth, startOfMonth, parseISO } from 'date-fns';

interface ProjectionData {
  month: string;
  receitas: number;
  despesas: number;
  saldoFinal: number;
}

export default function Projections() {
  const { user, decrypt } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectionMonths, setProjectionMonths] = useState<string>('12');
  const [initialBalance, setInitialBalance] = useState<string>('');
  const [projectionData, setProjectionData] = useState<ProjectionData[]>([]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.from('transacoes').select('*').order('data', { ascending: true });;
    if (data) {
      setTransactions(data as Transaction[]);
    }
    setLoading(false);
  };

  const getNumericValue = (value: string | number | null): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    try {
      const decrypted = decrypt(value);
      const num = parseFloat(decrypted);
      return isNaN(num) ? 0 : num;
    } catch {
      const num = parseFloat(value);
      return isNaN(num) ? 0 : num;
    }
  };
  
  const calculateCurrentBalance = () => {
    const balance = transactions.reduce((acc, t) => {
        const valor = getNumericValue(t.valor);
        const tipo = decrypt(t.tipo);
        const paymentMethod = decrypt(t.payment_method);
        
        if (tipo === 'receita') {
            return acc + valor;
        } else if (tipo === 'despesa' || paymentMethod === 'cartao') {
            return acc - valor;
        }
        return acc;
    }, 0);
    return balance;
  };

  const handleCalculateProjection = (balance? : number) => {
    const initial = balance !== undefined ? balance : parseFloat(initialBalance);
    if (isNaN(initial)) {
      alert('Por favor, insira um saldo inicial válido ou calcule a partir do histórico.');
      return;
    }

    const months = parseInt(projectionMonths, 10);
    const today = new Date();
    let currentBalance = initial;
    const projections: ProjectionData[] = [];

    const recurringMonthly = transactions.filter(t => decrypt(t.recorrencia) === 'mensal');
    const recurringDaily = transactions.filter(t => decrypt(t.recorrencia) === 'diaria');
    const installments = transactions.filter(t => (t.installments ?? 0) > 1 && !t.is_paid);

    for (let i = 0; i < months; i++) {
      const targetDate = addMonths(startOfMonth(today), i);
      const monthStr = format(targetDate, 'MMM/yy');
      let monthlyReceitas = 0;
      let monthlyDespesas = 0;

      // Recorrências Mensais (incluindo cartão)
      recurringMonthly.forEach(t => {
        const tipo = decrypt(t.tipo);
        const valor = getNumericValue(t.valor);
        const paymentMethod = decrypt(t.payment_method);

        if (tipo === 'receita') {
            monthlyReceitas += valor;
        } else if (tipo === 'despesa' || paymentMethod === 'cartao') {
            monthlyDespesas += valor;
        }
      });

      // Recorrências Diárias
      const daysInMonth = getDaysInMonth(targetDate);
      recurringDaily.forEach(t => {
        const tipo = decrypt(t.tipo);
        const valor = getNumericValue(t.valor);
        if (tipo === 'receita') monthlyReceitas += valor * daysInMonth;
        else if (tipo === 'despesa') monthlyDespesas += valor * daysInMonth;
      });
      
      // Parcelas de cartão de crédito
      installments.forEach(t => {
        const transactionDate = parseISO(t.data);
        if (format(transactionDate, 'yyyy-MM') === format(targetDate, 'yyyy-MM')) {
            monthlyDespesas += getNumericValue(t.valor);
        }
      });


      currentBalance += monthlyReceitas - monthlyDespesas;
      projections.push({
        month: monthStr,
        receitas: monthlyReceitas,
        despesas: monthlyDespesas,
        saldoFinal: currentBalance,
      });
    }
    setProjectionData(projections);
  };

  const handleCalculateFromHistory = () => {
    const currentBalance = calculateCurrentBalance();
    setInitialBalance(currentBalance.toFixed(2));
    handleCalculateProjection(currentBalance);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Projeções Financeiras</h2>
          <p className="text-muted-foreground">
            Visualize o futuro de suas finanças com base em suas transações recorrentes.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configurar Projeção</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row gap-4 items-end">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="initial-balance">Saldo Inicial (R$)</Label>
              <Input
                id="initial-balance"
                type="number"
                placeholder="Ex: 1500.00"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
              />
            </div>
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="projection-months">Período da Projeção</Label>
              <Select value={projectionMonths} onValueChange={setProjectionMonths}>
                <SelectTrigger id="projection-months">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">Próximos 12 meses</SelectItem>
                  <SelectItem value="24">Próximos 24 meses</SelectItem>
                  <SelectItem value="36">Próximos 36 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-full md:w-auto gap-2">
                <Button onClick={() => handleCalculateProjection()} className="w-full">
                Calcular
                </Button>
                <Button onClick={handleCalculateFromHistory} className="w-full" variant="outline">
                Usar Histórico
                </Button>
            </div>
          </CardContent>
        </Card>

        {projectionData.length > 0 && (
          <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Evolução do Saldo</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={projectionData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis tickFormatter={(value) => `R$${value.toLocaleString('pt-BR')}`} />
                            <Tooltip formatter={(value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)} />
                            <Legend />
                            <Line type="monotone" dataKey="saldoFinal" name="Saldo Projetado" stroke="#8884d8" />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detalhes da Projeção</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mês</TableHead>
                      <TableHead className="text-green-600">Receitas</TableHead>
                      <TableHead className="text-red-600">Despesas</TableHead>
                      <TableHead>Saldo Final</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectionData.map((data, index) => (
                      <TableRow key={index}>
                        <TableCell>{data.month}</TableCell>
                        <TableCell className="text-green-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.receitas)}
                        </TableCell>
                        <TableCell className="text-red-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.despesas)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.saldoFinal)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}