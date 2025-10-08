// src/components/GoalModal.tsx

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useGroup } from '@/contexts/GroupContext';
import { Goal } from '@/types';

interface GoalModalProps {
  open: boolean;
  onClose: () => void;
  goal: Goal | null;
  onSuccess: () => void;
}

export default function GoalModal({ open, onClose, goal, onSuccess }: GoalModalProps) {
  const { user } = useAuth();
  const { selectedGroup } = useGroup();
  const [loading, setLoading] = useState(false);
  
  const [nome, setNome] = useState('');
  const [valorAlvo, setValorAlvo] = useState('');
  const [valorAtual, setValorAtual] = useState('');
  const [dataAlvo, setDataAlvo] = useState('');

  useEffect(() => {
    if (open) {
      if (goal) {
        setNome(goal.nome);
        setValorAlvo(goal.valor_alvo.toString());
        setValorAtual(goal.valor_atual.toString());
        setDataAlvo(goal.data_alvo ? goal.data_alvo : '');
      } else {
        setNome('');
        setValorAlvo('');
        setValorAtual('0');
        setDataAlvo('');
      }
    }
  }, [goal, open]);

  const handleSave = async () => {
    if (!user || !nome || !valorAlvo) {
      toast({ title: 'Campos obrigatórios', description: 'Nome e Valor Alvo são obrigatórios.', variant: 'destructive' });
      return;
    }
    setLoading(true);

    const goalData = {
      user_id: user.id,
      nome,
      valor_alvo: parseFloat(valorAlvo),
      valor_atual: parseFloat(valorAtual) || 0,
      data_alvo: dataAlvo || null,
      group_id: goal ? goal.group_id : selectedGroup,
    };

    const { error } = goal
      ? await supabase.from('metas').update(goalData).eq('id', goal.id)
      : await supabase.from('metas').insert([goalData]);

    if (error) {
      toast({ title: 'Erro ao salvar meta', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Meta salva!', description: 'Seu objetivo foi salvo com sucesso.' });
      onSuccess();
      onClose();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{goal ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
          <DialogDescription>Defina seu objetivo e acompanhe seu progresso.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da Meta</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Viagem de Férias" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor-alvo">Valor Alvo (R$)</Label>
              <Input id="valor-alvo" type="number" value={valorAlvo} onChange={(e) => setValorAlvo(e.target.value)} placeholder="5000.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor-atual">Valor Inicial (R$)</Label>
              <Input id="valor-atual" type="number" value={valorAtual} onChange={(e) => setValorAtual(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="data-alvo">Data Alvo (Opcional)</Label>
            <Input id="data-alvo" type="date" value={dataAlvo} onChange={(e) => setDataAlvo(e.target.value)} />
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