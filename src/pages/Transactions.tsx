// src/pages/Transactions.tsx

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import TransactionModal from '@/components/TransactionModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Download, Calendar as CalendarIcon, Search, CreditCard as CreditCardIcon } from 'lucide-react';
import { Transaction, CreditCard } from '@/types';
import { toast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

export default function Transactions() {
  const navigate = useNavigate();
  const { user, decrypt } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('todos');
  const [filterDescricao, setFilterDescricao] = useState<string>('');
  const [filterCategoria, setFilterCategoria] = useState<string>('Todas');
  const [filterCard, setFilterCard] = useState<string>('todos');
  const [date, setDate] = useState<DateRange | undefined>(undefined);

  useEffect(() => {
    checkAuth();
    fetchData();
    const channel = supabase
      .channel('transacoes-changes-transactions-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transacoes' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate('/auth');
  };

  const fetchData = async () => {
    setLoading(true);
    if (!user) {
        setLoading(false);
        return;
    }

    const [transactionsRes, cardsRes] = await Promise.all([
        supabase.from('transacoes').select('*').order('data', { ascending: false }),
        supabase.from('credit_cards').select('*').eq('user_id', user.id)
    ]);

    if (!transactionsRes.error && transactionsRes.data) {
        setTransactions(transactionsRes.data as Transaction[]);
    }
    if (!cardsRes.error && cardsRes.data) {
        setCards(cardsRes.data as CreditCard[]);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('transacoes').delete().eq('id', id);
    if (error) { toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'Transação excluída', description: 'Removida com sucesso.' }); fetchData(); }
  };

  const handleEdit = (transaction: Transaction) => { setEditingTransaction(transaction); setModalOpen(true); };
  const handleAddNewTransaction = () => { setEditingTransaction(null); setModalOpen(true); };

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
    if (isNaN(num)) {
        const rawNum = parseFloat(value as string);
        return isNaN(rawNum) ? 0 : rawNum;
    }
    return num;
  };

  const getDecryptedText = (text: string | null) => {
    if (!text) return '';
    try {
      return decrypt(text);
    } catch {
      return text;
    }
  }

  const uniqueCategories = useMemo(() => {
    const categories = new Set(
      transactions
        .map(t => getDecryptedText(t.categoria))
        .filter(cat => cat && cat.trim())
    );
    return ['Todas', ...Array.from(categories)];
  }, [transactions, decrypt]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
        const transactionDate = new Date(t.data + 'T00:00:00');
        const from = date?.from ? new Date(date.from.setHours(0, 0, 0, 0)) : null;
        const to = date?.to ? new Date(date.to.setHours(23, 59, 59, 999)) : null;
        const decryptedPaymentMethod = getDecryptedText(t.payment_method);
        const decryptedCategoria = getDecryptedText(t.categoria);
        const decryptedDescricao = getDecryptedText(t.descricao);
        const matchDate = (!from || transactionDate >= from) && (!to || transactionDate <= to);
        const matchPaymentMethod = filterPaymentMethod === 'todos' || decryptedPaymentMethod === filterPaymentMethod;
        const matchCategoria = filterCategoria === 'Todas' || decryptedCategoria === filterCategoria;
        const matchDescricao = filterDescricao === '' || decryptedDescricao.toLowerCase().includes(filterDescricao.toLowerCase());
        const matchCard = filterCard === 'todos' || t.card_id === filterCard;
        return matchDate && matchPaymentMethod && matchCategoria && matchDescricao && matchCard;
    });
  }, [transactions, filterPaymentMethod, filterCategoria, filterDescricao, filterCard, date, decrypt]);

  const handleExportCSV = () => {
    // ... (lógica de exportação permanece a mesma)
  };

  if (loading) return <Layout><div className="text-center py-12">Carregando...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Transações</h2>
            <p className="text-muted-foreground">Visualize e gerencie suas movimentações.</p>
          </div>
          <div className="flex w-full sm:w-auto gap-2">
            <Button variant="outline" onClick={handleExportCSV} className="w-full sm:w-auto"><Download className="h-4 w-4 mr-2" />Exportar</Button>
            <Button onClick={handleAddNewTransaction} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" />Nova Transação</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-4 border rounded-lg bg-card">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Filtrar por descrição..." className="pl-8" value={filterDescricao} onChange={(e) => setFilterDescricao(e.target.value)} />
          </div>
          <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
            <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Tipos</SelectItem>
              <SelectItem value="receita">Receita</SelectItem>
              <SelectItem value="despesa">Despesa</SelectItem>
              <SelectItem value="cartao">Cartão de Crédito</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategoria} onValueChange={setFilterCategoria}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              {uniqueCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterCard} onValueChange={setFilterCard}>
            <SelectTrigger><SelectValue placeholder="Cartão" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Cartões</SelectItem>
              {cards.map(card => <SelectItem key={card.id} value={card.id}>{card.card_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (date.to ? `${format(date.from, "dd/MM/yyyy")} - ${format(date.to, "dd/MM/yyyy")}` : format(date.from, "dd/MM/yyyy")) : <span>Escolha uma data</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2} />
            </PopoverContent>
          </Popover>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Cartão</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Recorrência</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => {
                  const decryptedPaymentMethod = getDecryptedText(transaction.payment_method);
                  const tipo = decryptedPaymentMethod === 'receita' ? 'receita' : 'despesa';
                  const cardInfo = decryptedPaymentMethod === 'cartao'
                    ? cards.find(c => c.id === transaction.card_id)
                    : null;

                  return (
                  <TableRow key={transaction.id}>
                    <TableCell>{new Date(transaction.data + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${tipo === 'receita' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {decryptedPaymentMethod === 'cartao' && <CreditCardIcon className="h-3 w-3 mr-1.5" />}
                            {decryptedPaymentMethod}
                        </span>
                    </TableCell>
                    <TableCell>{getDecryptedText(transaction.categoria)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {getDecryptedText(transaction.descricao)}
                      {transaction.installments && transaction.installments > 1 && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({transaction.current_installment}/{transaction.installments})
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {cardInfo ? (
                        <span className="text-xs">{cardInfo.card_name} (**** {cardInfo.last_four_digits})</span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className={tipo === 'receita' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getNumericValue(transaction.valor))}
                    </TableCell>
                    <TableCell>{getDecryptedText(transaction.recorrencia)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(transaction)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(transaction.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )})
              }
            </TableBody>
          </Table>
        </div>
      </div>
      <TransactionModal open={modalOpen} onClose={() => { setModalOpen(false); setEditingTransaction(null); }} transaction={editingTransaction} onSuccess={fetchData} />
    </Layout>
  );
}