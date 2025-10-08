// src/pages/Dashboard.tsx

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import Layout from '../components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar } from '../components/ui/calendar';
import { TrendingUp, TrendingDown, DollarSign, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Transaction } from '../types';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DateRange } from 'react-day-picker';
import { format, subMonths, addMonths, startOfToday, isBefore, parseISO, setDate as setDateFn, addDays, differenceInCalendarMonths } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useGroup } from '@/contexts/GroupContext'; // 1. Importar o hook de grupo
import { getCategoryColor } from '@/lib/colors';

interface UpcomingTransaction {
  nextDate: Date;
  description: string;
  value: number;
  type: 'receita' | 'despesa';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, decrypt } = useAuth();
  const { selectedGroup, addRefreshListener } = useGroup(); // 2. Obter o grupo selecionado
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [date, setDate] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 1),
    to: new Date(),
  });
  
  const fetchTransactions = async () => {
    if (!user) return;
    setLoading(true);
    
    let query = supabase.from('transacoes').select('*');

    // 3. Adicionar o filtro de grupo à consulta
    if (selectedGroup) {
      query = query.eq('group_id', selectedGroup);
    } else {
      query = query.is('group_id', null);
    }

    const { data, error } = await query.order('data', { ascending: false });

    if (error) {
      console.error("Error fetching transactions:", error);
    } else if (data) {
      setTransactions(data as Transaction[]);
    }
    setLoading(false);
  };
  
  useEffect(() => {
    if (user) {
      // 4. Usar o listener para recarregar os dados
      const removeListener = addRefreshListener(fetchTransactions);
      fetchTransactions(); // Busca inicial

      const channel = supabase
        .channel('transacoes-changes-dashboard')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transacoes' }, (payload) => {
            const changedGroupId = payload.new.group_id;
            if ((selectedGroup && changedGroupId === selectedGroup) || (!selectedGroup && !changedGroupId)) {
                fetchTransactions();
            }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        removeListener(); // Limpa o listener ao sair
      };
    }
  }, [user, selectedGroup, addRefreshListener]);


  const getNumericValue = (value: string | number) => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    
    let decryptedText = '';
    try {
      decryptedText = decrypt(value);
    } catch {
      decryptedText = value;
    }
    
    const num = parseFloat(decryptedText);
    return isNaN(num) ? 0 : num;
  };

  const getDecryptedText = (text: string | null) => {
    if (!text) return '';
    try {
      return decrypt(text);
    } catch {
      return text;
    }
  }

  const upcomingTransactions = useMemo<UpcomingTransaction[]>(() => {
    const today = startOfToday();
    const thirtyDaysFromNow = addDays(today, 30);
    const upcoming: UpcomingTransaction[] = [];

    const recurringTransactions = transactions.filter(
      (t) => getDecryptedText(t.recorrencia) === 'mensal'
    );

    recurringTransactions.forEach((t) => {
      const originalDate = parseISO(t.data);
      let nextDate = setDateFn(today, originalDate.getDate());

      if (isBefore(nextDate, today)) {
        nextDate = addMonths(nextDate, 1);
      }
      
      const totalMonths = t.installments;
      const monthsPassed = differenceInCalendarMonths(nextDate, originalDate);
      
      if (totalMonths === null || monthsPassed < totalMonths) {
        if (isBefore(nextDate, thirtyDaysFromNow)) {
          upcoming.push({
            nextDate: nextDate,
            description: getDecryptedText(t.descricao) || getDecryptedText(t.categoria),
            value: getNumericValue(t.valor),
            type: getDecryptedText(t.tipo) === 'receita' ? 'receita' : 'despesa',
          });
        }
      }
    });
    
    return upcoming.sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime());
  }, [transactions, decrypt]);


  const filteredTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.data + 'T00:00:00');
    const from = date?.from ? new Date(date.from.setHours(0, 0, 0, 0)) : null;
    const to = date?.to ? new Date(date.to.setHours(23, 59, 59, 999)) : null;

    return (!from || transactionDate >= from) && (!to || transactionDate <= to);
  });

  const totalReceitas = filteredTransactions
    .filter(t => getDecryptedText(t.tipo) === 'receita')
    .reduce((sum, t) => sum + getNumericValue(t.valor), 0);

  const totalDespesas = filteredTransactions
    .filter(t => getDecryptedText(t.tipo) === 'despesa')
    .reduce((sum, t) => sum + getNumericValue(t.valor), 0);

  const saldo = totalReceitas - totalDespesas;

  const categoriesData = filteredTransactions
    .filter(t => getDecryptedText(t.tipo) === 'despesa')
    .reduce((acc, t) => {
      const cat = getDecryptedText(t.categoria);
      if (cat && cat !== "Dado inválido" && cat !== "Dado criptografado") {
        acc[cat] = (acc[cat] || 0) + getNumericValue(t.valor);
      }
      return acc;
    }, {} as Record<string, number>);

  const pieData = Object.entries(categoriesData).map(([name, value]) => ({ name, value }));

  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return d.toISOString().slice(0, 7);
  });

  const lineData = last6Months.map(month => {
    const monthTrans = transactions.filter(t => t.data.startsWith(month));
    const receitas = monthTrans.filter(t => getDecryptedText(t.tipo) === 'receita').reduce((sum, t) => sum + getNumericValue(t.valor), 0);
    const despesas = monthTrans.filter(t => getDecryptedText(t.tipo) === 'despesa').reduce((sum, t) => sum + getNumericValue(t.valor), 0);
    return {
      month: new Date(month + '-02T00:00:00').toLocaleDateString('pt-BR', { month: 'short', timeZone: 'America/Sao_Paulo' }),
      receitas,
      despesas
    };
  });

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">Carregando...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-3xl font-bold">Dashboard</h2>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={"outline"} className="w-full sm:w-auto justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (date.to ? `${format(date.from, "dd/MM/yyyy")} - ${format(date.to, "dd/MM/yyyy")}` : format(date.from, "dd/MM/yyyy")) : <span>Escolha uma data</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2} />
            </PopoverContent>
          </Popover>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Cards de Saldo, Receitas e Despesas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Saldo do Período</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader>
            <CardContent><div className={`text-2xl font-bold ${saldo >= 0 ? 'text-primary' : 'text-destructive'}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saldo)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Receitas do Período</CardTitle><TrendingUp className="h-4 w-4 text-primary" /></CardHeader>
            <CardContent><div className="text-2xl font-bold text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalReceitas)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Despesas do Período</CardTitle><TrendingDown className="h-4 w-4 text-destructive" /></CardHeader>
            <CardContent><div className="text-2xl font-bold text-destructive">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalDespesas)}</div></CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Despesas por Categoria</CardTitle></CardHeader>
              <CardContent>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                        {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={getCategoryColor(entry.name)} />))}
                      </Pie>
                      <Tooltip formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <div className="text-center py-12 text-muted-foreground">Nenhuma despesa registrada no período</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Evolução (Últimos 6 Meses)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}><LineChart data={lineData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip formatter={(value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))} /><Legend /><Line type="monotone" dataKey="receitas" stroke="#00C853" name="Receitas" /><Line type="monotone" dataKey="despesas" stroke="#EF5350" name="Despesas" /></LineChart></ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center"><Clock className="h-4 w-4 mr-2" />Lançamentos Futuros</CardTitle>
              <CardDescription>Previsão para os próximos 30 dias com base nas suas recorrências.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingTransactions.length > 0 ? (
                  upcomingTransactions.map((t, index) => (
                    <div key={index} className="flex items-center">
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{t.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(t.nextDate, 'dd/MM/yyyy')}
                        </p>
                      </div>
                      <div className={`font-medium ${t.type === 'receita' ? 'text-primary' : 'text-destructive'}`}>
                        {t.type === 'despesa' && '-'}{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.value)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma transação recorrente encontrada para o próximo mês.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}