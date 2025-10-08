// src/pages/Budgets.tsx

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useGroup } from '@/contexts/GroupContext';
import { Budget, Transaction } from '@/types';
import { Plus, Pencil, Trash2, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import BudgetModal from '@/components/BudgetModal';
import { format, parseISO, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Budgets() {
  const { user, decrypt } = useAuth();
  const { selectedGroup, addRefreshListener } = useGroup();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchBudgetData = async () => {
    if (!user) return;
    setLoading(true);

    const monthStr = format(currentMonth, 'yyyy-MM');
    const startDate = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(currentMonth), 'yyyy-MM-dd');

    // Construção das queries base
    let budgetQuery = supabase.from('orcamentos').select('*').eq('mes', monthStr);
    let transQuery = supabase.from('transacoes').select('*').gte('data', startDate).lte('data', endDate);

    // Adicionando o filtro de grupo ou pessoal
    if (selectedGroup) {
      budgetQuery = budgetQuery.eq('group_id', selectedGroup);
      transQuery = transQuery.eq('group_id', selectedGroup);
    } else {
      budgetQuery = budgetQuery.is('group_id', null);
      transQuery = transQuery.is('group_id', null);
    }
    
    // Executando as queries em paralelo
    const [budgetRes, transRes] = await Promise.all([budgetQuery, transQuery]);

    if (budgetRes.error) toast({ title: 'Erro ao buscar orçamentos', description: budgetRes.error.message, variant: 'destructive' });
    else setBudgets(budgetRes.data as Budget[]);

    if (transRes.error) toast({ title: 'Erro ao buscar transações', description: transRes.error.message, variant: 'destructive' });
    else setTransactions(transRes.data as Transaction[]);
    
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      const removeListener = addRefreshListener(fetchBudgetData);
      fetchBudgetData();
      return () => removeListener();
    }
  }, [user, currentMonth, selectedGroup, addRefreshListener]);

  const getNumericValue = (value: string) => decrypt(value) ? parseFloat(decrypt(value)) : 0;

  const budgetWithSpending = useMemo(() => {
    return budgets.map(budget => {
      const spent = transactions
        .filter(t => decrypt(t.categoria) === budget.categoria && decrypt(t.tipo) === 'despesa')
        .reduce((sum, t) => sum + getNumericValue(t.valor), 0);
      return { ...budget, spent };
    });
  }, [budgets, transactions, decrypt]);

  const handleAddNew = () => {
    setEditingBudget(null);
    setIsModalOpen(true);
  };

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('orcamentos').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir orçamento', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Orçamento excluído', description: 'O orçamento foi removido.' });
      fetchBudgetData();
    }
  };
  
  const changeMonth = (amount: number) => {
    setCurrentMonth(prev => amount > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
  };
  
  const getProgressColor = (progress: number) => {
    if (progress > 100) return 'bg-red-600';
    if (progress > 80) return 'bg-yellow-500';
    return 'bg-primary';
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Orçamentos</h2>
            <p className="text-muted-foreground">Controle seus gastos mensais por categoria.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => changeMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="font-semibold text-lg capitalize w-40 text-center">{format(currentMonth, 'MMMM/yyyy', { locale: ptBR })}</span>
            <Button variant="outline" size="icon" onClick={() => changeMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
            <Button onClick={handleAddNew} className="ml-4"><Plus className="mr-2 h-4 w-4" /> Novo Orçamento</Button>
          </div>
        </div>
        
        {loading ? (
          <p>Carregando orçamentos...</p>
        ) : budgetWithSpending.length === 0 ? (
          <div className="text-center py-20 border rounded-lg">
            <Wallet className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Nenhum orçamento para este mês</h3>
            <p className="mt-2 text-sm text-muted-foreground">Crie orçamentos para acompanhar seus gastos.</p>
            <Button className="mt-6" onClick={handleAddNew}>Criar Orçamento</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {budgetWithSpending.map(budget => {
              const progress = (budget.spent / budget.valor_orcado) * 100;
              const remaining = budget.valor_orcado - budget.spent;
              return (
                <Card key={budget.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="truncate pr-4">{budget.categoria}</CardTitle>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(budget)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(budget.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <p className="text-2xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget.spent)}</p>
                        <p className="text-sm text-muted-foreground">
                          de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budget.valor_orcado)}
                        </p>
                      </div>
                      <span className={`font-semibold ${progress > 100 ? 'text-red-600' : 'text-primary'}`}>{progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={Math.min(100, progress)} className={getProgressColor(progress)} />
                  </CardContent>
                  <CardFooter>
                    <p className={`text-sm font-medium ${remaining < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                      {remaining >= 0 ? `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(remaining)} restantes` : `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(remaining))} acima do limite`}
                    </p>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <BudgetModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        budget={editingBudget}
        onSuccess={fetchBudgetData}
        currentMonth={format(currentMonth, 'yyyy-MM')}
      />
    </Layout>
  );
}