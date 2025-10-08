// src/pages/Reports.tsx

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRange } from 'react-day-picker';
import { useAuth } from '@/contexts/AuthContext';
import { Transaction } from '@/types';
import { format, subMonths, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, FileDown, TrendingDown, TrendingUp, Scale } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Reports() {
  const { user, decrypt } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 1),
    to: new Date(),
  });
  const [typeFilter, setTypeFilter] = useState<'todos' | 'receita' | 'despesa'>('todos');
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');

  const fetchTransactions = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase.from('transacoes').select('*').order('data', { ascending: false });
    if (data) setTransactions(data as Transaction[]);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const getNumericValue = (value: string) => decrypt(value) ? parseFloat(decrypt(value)) : 0;
  const getDecryptedText = (text: string | null) => text ? (decrypt(text) || text) : '';

  const uniqueCategories = useMemo(() => {
    const categories = new Set(transactions.map(t => getDecryptedText(t.categoria)).filter(Boolean));
    return ['todas', ...Array.from(categories)];
  }, [transactions, decrypt]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const transactionDate = new Date(t.data);
      const from = date?.from ? new Date(date.from.setHours(0, 0, 0, 0)) : null;
      const to = date?.to ? new Date(date.to.setHours(23, 59, 59, 999)) : null;
      
      const matchDate = (!from || transactionDate >= from) && (!to || transactionDate <= to);
      const matchType = typeFilter === 'todos' || getDecryptedText(t.tipo) === typeFilter;
      const matchCategory = categoryFilter === 'todas' || getDecryptedText(t.categoria) === categoryFilter;

      return matchDate && matchType && matchCategory;
    });
  }, [transactions, date, typeFilter, categoryFilter, decrypt]);

  const reportSummary = useMemo(() => {
    const totalReceitas = filteredTransactions
      .filter(t => getDecryptedText(t.tipo) === 'receita')
      .reduce((sum, t) => sum + getNumericValue(t.valor), 0);
    const totalDespesas = filteredTransactions
      .filter(t => getDecryptedText(t.tipo) === 'despesa')
      .reduce((sum, t) => sum + getNumericValue(t.valor), 0);
    const saldo = totalReceitas - totalDespesas;
    return { totalReceitas, totalDespesas, saldo };
  }, [filteredTransactions]);
  
  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Relatório Financeiro", 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    const filterInfo = `Período: ${date?.from ? format(date.from, "dd/MM/yyyy") : 'N/A'} - ${date?.to ? format(date.to, "dd/MM/yyyy") : 'N/A'}`;
    doc.text(filterInfo, 14, 32);

    doc.setFontSize(12);
    doc.text("Resumo do Período", 14, 45);
    autoTable(doc, {
        startY: 50,
        body: [
            ['Total de Receitas', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reportSummary.totalReceitas)],
            ['Total de Despesas', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reportSummary.totalDespesas)],
            ['Saldo', new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reportSummary.saldo)],
        ],
        theme: 'grid',
        styles: { fontStyle: 'bold' },
    });

    const tableStartY = (doc as any).lastAutoTable.finalY + 15;
    doc.text("Transações Detalhadas", 14, tableStartY);

    const head = [['Data', 'Descrição', 'Categoria', 'Valor']];
    const body = filteredTransactions.map(t => {
        const valor = getNumericValue(t.valor);
        const tipo = getDecryptedText(t.tipo);
        const valorFormatado = `${tipo === 'despesa' ? '-' : ''}${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)}`;
        return [
            format(parseISO(t.data), 'dd/MM/yyyy'),
            getDecryptedText(t.descricao) || '-',
            getDecryptedText(t.categoria),
            valorFormatado,
        ]
    });

    autoTable(doc, {
        startY: tableStartY + 5,
        head: head,
        body: body,
        theme: 'striped',
        headStyles: { fillColor: '#10b981' }, // Cor verde para o cabeçalho
    });

    doc.save(`Relatorio_FinanceMe_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Relatórios Financeiros</h2>
                <p className="text-muted-foreground">Gere relatórios detalhados de suas movimentações.</p>
            </div>
            <Button onClick={handleExportPDF}>
                <FileDown className="mr-2 h-4 w-4" /> Exportar para PDF
            </Button>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Filtros do Relatório</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (date.to ? `${format(date.from, "dd/MM/yy")} - ${format(date.to, "dd/MM/yy")}` : format(date.from, "dd/MM/yy")) : <span>Escolha uma data</span>}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2} />
                    </PopoverContent>
                </Popover>
                 <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
                    <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="todos">Todas as Movimentações</SelectItem>
                        <SelectItem value="receita">Apenas Receitas</SelectItem>
                        <SelectItem value="despesa">Apenas Despesas</SelectItem>
                    </SelectContent>
                </Select>
                 <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                    <SelectContent>
                        {uniqueCategories.map(cat => <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>)}
                    </SelectContent>
                </Select>
            </CardContent>
        </Card>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Receitas no Período</CardTitle><TrendingUp className="h-4 w-4 text-primary" /></CardHeader>
            <CardContent><div className="text-2xl font-bold text-primary">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reportSummary.totalReceitas)}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Despesas no Período</CardTitle><TrendingDown className="h-4 w-4 text-destructive" /></CardHeader>
            <CardContent><div className="text-2xl font-bold text-destructive">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reportSummary.totalDespesas)}</div></CardContent>
          </Card>
           <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Saldo do Período</CardTitle><Scale className="h-4 w-4 text-muted-foreground" /></CardHeader>
            <CardContent><div className={`text-2xl font-bold ${reportSummary.saldo >= 0 ? 'text-primary' : 'text-destructive'}`}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reportSummary.saldo)}</div></CardContent>
          </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Transações do Período</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Categoria</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={4} className="text-center">Carregando...</TableCell></TableRow>
                        ) : filteredTransactions.length > 0 ? (
                            filteredTransactions.map(t => (
                                <TableRow key={t.id}>
                                    <TableCell>{format(parseISO(t.data), 'dd/MM/yyyy')}</TableCell>
                                    <TableCell>{getDecryptedText(t.descricao) || '-'}</TableCell>
                                    <TableCell>{getDecryptedText(t.categoria)}</TableCell>
                                    <TableCell className={`text-right font-medium ${getDecryptedText(t.tipo) === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getNumericValue(t.valor))}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow><TableCell colSpan={4} className="text-center">Nenhuma transação encontrada para os filtros selecionados.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

      </div>
    </Layout>
  );
}