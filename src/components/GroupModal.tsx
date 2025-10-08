// src/components/GroupModal.tsx

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Group } from '@/types';

interface GroupModalProps {
  open: boolean;
  onClose: () => void;
  group: Group | null;
  onSuccess: () => void;
}

export default function GroupModal({ open, onClose, group, onSuccess }: GroupModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState('');

  useEffect(() => {
    if (open) {
      setNome(group ? group.nome : '');
    }
  }, [group, open]);

  const handleSave = async () => {
    if (!user || !nome) {
      toast({ title: 'Nome obrigatório', description: 'O nome do grupo é obrigatório.', variant: 'destructive' });
      return;
    }
    setLoading(true);

    if (group) {
      // Lógica de Edição (futura)
      const { error } = await supabase.from('grupos').update({ nome }).eq('id', group.id);
      if (error) {
        toast({ title: 'Erro ao atualizar grupo', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Grupo atualizado!', description: 'O nome do grupo foi alterado.' });
        onSuccess();
        onClose();
      }
    } else {
      // Lógica de Criação
      const { data, error } = await supabase.rpc('create_group_and_add_member', { group_name: nome });
      
      if (error) {
        toast({ title: 'Erro ao criar grupo', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Grupo criado!', description: `O grupo "${nome}" foi criado com sucesso.` });
        onSuccess();
        onClose();
      }
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{group ? 'Editar Grupo' : 'Criar Novo Grupo'}</DialogTitle>
          <DialogDescription>Dê um nome para seu espaço compartilhado.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Grupo</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Finanças da Família" />
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