// src/pages/Cards.tsx

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard } from '@/types';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function CardsSettings() {
  const { user } = useAuth();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  
  const [cardName, setCardName] = useState('');
  const [lastFourDigits, setLastFourDigits] = useState('');
  const [limit, setLimit] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');

  const fetchCards = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      toast({ title: 'Erro ao buscar cartões', description: error.message, variant: 'destructive' });
    } else if (data) {
      setCards(data as CreditCard[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
        fetchCards();
    }
  }, [user]);

  const resetForm = () => {
    setCardName('');
    setLastFourDigits('');
    setLimit('');
    setClosingDay('');
    setDueDay('');
    setEditingCard(null);
  };

  const handleAddNew = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleEdit = (card: CreditCard) => {
    setEditingCard(card);
    setCardName(card.card_name);
    setLastFourDigits(card.last_four_digits);
    setLimit(card.limite_gastos.toString());
    setClosingDay(card.closing_day.toString());
    setDueDay(card.due_day.toString());
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('credit_cards').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir cartão', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Cartão excluído', description: 'O cartão foi removido com sucesso.' });
      fetchCards();
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // ... (validações)

    const cardData = {
      user_id: user.id,
      card_name: cardName,
      last_four_digits: lastFourDigits,
      limite_gastos: parseFloat(limit),
      closing_day: parseInt(closingDay),
      due_day: parseInt(dueDay),
    };

    let error;
    if (editingCard) {
      const { error: updateError } = await supabase.from('credit_cards').update(cardData).eq('id', editingCard.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase.from('credit_cards').insert([cardData]);
      error = insertError;
    }

    if (error) {
      toast({ title: 'Erro ao salvar cartão', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Cartão salvo!', description: 'Seu cartão foi salvo com sucesso.' });
      setIsModalOpen(false);
      fetchCards();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-center">
        <div>
          <CardTitle>Gerenciar Cartões</CardTitle>
          <CardDescription>Adicione e gerencie seus cartões de crédito.</CardDescription>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar Cartão
        </Button>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Cartão</TableHead>
                <TableHead>Final</TableHead>
                <TableHead>Limite</TableHead>
                <TableHead>Fechamento</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center">Carregando...</TableCell></TableRow>
              ) : cards.length > 0 ? (
                cards.map((card) => (
                  <TableRow key={card.id}>
                    <TableCell className="font-medium">{card.card_name}</TableCell>
                    <TableCell>**** {card.last_four_digits}</TableCell>
                    <TableCell>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.limite_gastos)}</TableCell>
                    <TableCell>Dia {card.closing_day}</TableCell>
                    <TableCell>Dia {card.due_day}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(card)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(card.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={6} className="text-center h-24">Nenhum cartão cadastrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingCard ? 'Editar Cartão' : 'Adicionar Novo Cartão'}</DialogTitle>
            <DialogDescription>Preencha as informações do seu cartão de crédito.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cardName" className="text-right">
                Nome
              </Label>
              <Input id="cardName" value={cardName} onChange={(e) => setCardName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lastFourDigits" className="text-right">
                Final
              </Label>
              <Input id="lastFourDigits" value={lastFourDigits} onChange={(e) => setLastFourDigits(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="limit" className="text-right">
                Limite
              </Label>
              <Input id="limit" value={limit} onChange={(e) => setLimit(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="closingDay" className="text-right">
                Fechamento
              </Label>
              <Input id="closingDay" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dueDay" className="text-right">
                Vencimento
              </Label>
              <Input id="dueDay" value={dueDay} onChange={(e) => setDueDay(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}