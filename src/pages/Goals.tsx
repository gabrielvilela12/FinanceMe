// src/pages/Goals.tsx

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useGroup } from '@/contexts/GroupContext';
import { Goal } from '@/types';
import { Plus, Pencil, Trash2, Target } from 'lucide-react';
import GoalModal from '@/components/GoalModal';
import { format, parseISO } from 'date-fns';

export default function GoalsSettings() {
  const { user } = useAuth();
  const { selectedGroup } = useGroup();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const fetchGoals = async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase.from('metas').select('*');
    if (selectedGroup) {
      query = query.eq('group_id', selectedGroup);
    } else {
      query = query.is('group_id', null).eq('user_id', user.id);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: 'Erro ao buscar metas', description: error.message, variant: 'destructive' });
    } else if (data) {
      setGoals(data as Goal[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchGoals();
    }
  }, [user, selectedGroup]);

  const handleAddNew = () => {
    setEditingGoal(null);
    setIsModalOpen(true);
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('metas').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir meta', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Meta excluída', description: 'Sua meta foi removida com sucesso.' });
      fetchGoals();
    }
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
          <CardTitle>Minhas Metas</CardTitle>
          <CardDescription>Crie e acompanhe seus objetivos financeiros.</CardDescription>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" /> Nova Meta
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Carregando metas...</p>
        ) : goals.length === 0 ? (
          <div className="text-center py-20 border rounded-lg">
            <Target className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Nenhuma meta cadastrada</h3>
            <p className="mt-2 text-sm text-muted-foreground">Comece a planejar seu futuro. Crie sua primeira meta!</p>
            <Button className="mt-6" onClick={handleAddNew}>Criar Meta</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map(goal => {
              const progress = (goal.valor_atual / goal.valor_alvo) * 100;
              return (
                <Card key={goal.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="truncate pr-4">{goal.nome}</CardTitle>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(goal)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(goal.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <p className="text-2xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goal.valor_atual)}</p>
                        <p className="text-sm text-muted-foreground">
                          de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goal.valor_alvo)}
                        </p>
                      </div>
                      <span className="font-semibold text-primary">{progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={progress} />
                  </CardContent>
                  <CardFooter className="flex-col items-start gap-1 text-sm text-muted-foreground">
                    {goal.data_alvo && <p>Data Alvo: {format(parseISO(goal.data_alvo), 'dd/MM/yyyy')}</p>}
                    <p>Criado em: {format(parseISO(goal.created_at), 'dd/MM/yyyy')}</p>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}
      </CardContent>
       <GoalModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        goal={editingGoal}
        onSuccess={fetchGoals}
      />
    </Card>
  );
}