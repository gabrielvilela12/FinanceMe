// src/components/BudgetModal.tsx

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useGroup } from '@/contexts/GroupContext';
import { Budget } from '@/types';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BudgetModalProps {
  open: boolean;
  onClose: () => void;
  budget: Budget | null;
  onSuccess: () => void;
  currentMonth: string; // Formato YYYY-MM
}

export default function BudgetModal({ open, onClose, budget, onSuccess, currentMonth }: BudgetModalProps) {
  const { user } = useAuth();
  const { selectedGroup } = useGroup();
  const [loading, setLoading] = useState(false);
  
  const [categoria, setCategoria] = useState('');
  const [valorOrcado, setValorOrcado] = useState('');

  useEffect(() => {
    if (open) {
      if (budget) {
        setCategoria(budget.categoria);
        setValorOrcado(budget.valor_orcado.toString());
      } else {
        setCategoria('');
        setValorOrcado('');
      }
    }
  }, [budget, open]);

  const handleSave = async () => {
    if (!user || !categoria || !valorOrcado) {
      toast({ title: 'Campos obrigatórios', description: 'Categoria e Valor Orçado são obrigatórios.', variant: 'destructive' });
      return;
    }
    setLoading(true);

    const budgetData = {
      user_id: user.id,
      categoria,
      valor_orcado: parseFloat(valorOrcado),
      mes: currentMonth,
      group_id: budget ? budget.group_id : selectedGroup
    };

    const { error } = budget
      ? await supabase.from('orcamentos').update(budgetData).eq('id', budget.id)
      : await supabase.from('orcamentos').insert([budgetData]);

    if (error) {
      if (error.code === '23505') { // Código de violação de constraint UNIQUE
          toast({ title: 'Erro: Orçamento duplicado', description: `Já existe um orçamento para a categoria "${categoria}" neste mês.`, variant: 'destructive' });
      } else {
          toast({ title: 'Erro ao salvar orçamento', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: 'Orçamento salvo!', description: 'Seu orçamento foi salvo com sucesso.' });
      onSuccess();
      onClose();
    }
    setLoading(false);
  };

  const monthForDisplay = format(parse(currentMonth, 'yyyy-MM', new Date()), 'MMMM/yyyy', { locale: ptBR });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{budget ? 'Editar Orçamento' : 'Novo Orçamento'}</DialogTitle>
          <DialogDescription>
            Defina um limite de gastos para uma categoria no mês de <span className="font-semibold capitalize">{monthForDisplay}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="categoria">Categoria</Label>
            <Input id="categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ex: Alimentação" disabled={!!budget} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valor-orcado">Valor Orçado (R$)</Label>
            <Input id="valor-orcado" type="number" value={valorOrcado} onChange={(e) => setValorOrcado(e.target.value)} placeholder="500.00" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}