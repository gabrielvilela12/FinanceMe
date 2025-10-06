import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { TrendingUp, TrendingDown, DollarSign, Calendar as CalendarIcon } from 'lucide-react';
import { Transaction } from '@/types';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DateRange } from 'react-day-picker';
import { format, subMonths } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { decrypt } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [date, setDate] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 1),
    to: new Date(),
  });

  useEffect(() => {
    checkAuth();
    fetchTransactions();

    const channel = supabase
      .channel('transacoes-changes-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transacoes' }, () => {
        fetchTransactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transacoes')
      .select('*')
      .order('data', { ascending: false });

    if (!error && data) {
      setTransactions(data as Transaction[]);
    }
    setLoading(false);
  };

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

  const filteredTransactions = transactions.filter(t => {
    // CORREÇÃO APLICADA AQUI: Adiciona 'T00:00:00' para tratar a data como local
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
  const COLORS = ['#EF5350', '#FF7043', '#FF8A65', '#FFAB91', '#FFCCBC'];

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Despesas por Categoria</CardTitle></CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                      {pieData.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
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
      </div>
    </Layout>
  );
}