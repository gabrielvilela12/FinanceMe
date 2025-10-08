// src/components/CategoryModal.tsx

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useGroup } from '@/contexts/GroupContext';
import { Category } from '@/types';

interface CategoryModalProps {
  open: boolean;
  onClose: () => void;
  category: Category | null;
  onSuccess: () => void;
}

export default function CategoryModal({ open, onClose, category, onSuccess }: CategoryModalProps) {
  const { user, encrypt, decrypt } = useAuth();
  const { selectedGroup } = useGroup();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) {
      setName(category ? decrypt(category.name) : '');
    }
  }, [category, open, decrypt]);

  const handleSave = async () => {
    if (!user || !name.trim()) {
      toast({ title: 'Campo obrigatório', description: 'O nome da categoria é obrigatório.', variant: 'destructive' });
      return;
    }
    setLoading(true);

    const encryptedName = encrypt(name.trim());

    const categoryData = {
      user_id: user.id,
      name: encryptedName,
      group_id: category ? category.group_id : selectedGroup,
    };

    const { error } = category
      ? await supabase.from('categories').update({ name: encryptedName }).eq('id', category.id)
      : await supabase.from('categories').insert([categoryData]);

    if (error) {
        if (error.code === '23505') { // Unique constraint violation
            toast({ title: 'Erro', description: 'Essa categoria já existe.', variant: 'destructive' });
        } else {
            toast({ title: 'Erro ao salvar categoria', description: error.message, variant: 'destructive' });
        }
    } else {
      toast({ title: 'Categoria salva!', description: 'Sua categoria foi salva com sucesso.' });
      onSuccess();
      onClose();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
          <DialogDescription>Dê um nome para a sua categoria.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Categoria</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Mercado" />
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