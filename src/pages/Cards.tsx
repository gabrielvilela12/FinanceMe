// gabrielvilela12/financeme/FinanceMe-6f8279cdb4ab871580606730d3580777b0e78c31/src/pages/Cards.tsx

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard } from '@/types';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export default function Cards() {
  const { user } = useAuth();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  
  // State for form data
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
        const channel = supabase
          .channel('credit-cards-changes')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'credit_cards' }, fetchCards)
          .subscribe();
        return () => { supabase.removeChannel(channel); };
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
    setLimit(card.limite_gastos.toString()); // ALTERADO DE card.limit PARA card.limite_gastos
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

    if (!cardName || !lastFourDigits || !limit || !closingDay || !dueDay) {
        toast({ title: 'Campos obrigatórios', description: 'Por favor, preencha todos os campos.', variant: 'destructive' });
        return;
    }
    const parsedLimit = parseFloat(limit);
    const parsedClosingDay = parseInt(closingDay, 10);
    const parsedDueDay = parseInt(dueDay, 10);
    if (isNaN(parsedLimit) || isNaN(parsedClosingDay) || isNaN(parsedDueDay)) {
        toast({ title: 'Valores inválidos', description: 'Limite, dia de fechamento e dia de vencimento devem ser números.', variant: 'destructive' });
        return;
    }
    if (parsedClosingDay < 1 || parsedClosingDay > 31 || parsedDueDay < 1 || parsedDueDay > 31) {
        toast({ title: 'Dias inválidos', description: 'Os dias devem estar entre 1 e 31.', variant: 'destructive' });
        return;
    }


    const cardData = {
      user_id: user.id,
      card_name: cardName,
      last_four_digits: lastFourDigits,
      limite_gastos: parsedLimit, // ESTA LINHA ESTÁ CORRETA
      closing_day: parsedClosingDay,
      due_day: parsedDueDay,
    };

    let error;
    if (editingCard) {
      const { error: updateError } = await supabase
        .from('credit_cards')
        .update(cardData)
        .eq('id', editingCard.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('credit_cards')
        .insert([cardData]);
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
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Meus Cartões</h2>
            <p className="text-muted-foreground">Gerencie seus cartões de crédito.</p>
          </div>
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar Cartão
          </Button>
        </div>
        
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
                    {/* ALTERADO DE card.limit PARA card.limite_gastos */}
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
                <TableRow><TableCell colSpan={6} className="text-center">Nenhum cartão cadastrado.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingCard ? 'Editar Cartão' : 'Adicionar Novo Cartão'}</DialogTitle>
            <DialogDescription>
              Preencha as informações do seu cartão de crédito.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="card-name" className="text-right">Nome</Label>
              <Input id="card-name" value={cardName} onChange={(e) => setCardName(e.target.value)} className="col-span-3" placeholder="Ex: Nubank, Inter" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="last-four" className="text-right">Últimos 4 dígitos</Label>
              <Input id="last-four" value={lastFourDigits} onChange={(e) => setLastFourDigits(e.target.value.replace(/\D/g, '').slice(0, 4))} maxLength={4} className="col-span-3" placeholder="1234" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="limite_gastos" className="text-right">Limite (R$)</Label>
              <Input id="limite_gastos" type="number" value={limit} onChange={(e) => setLimit(e.target.value)} className="col-span-3" placeholder="5000.00" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="closing-day" className="text-right">Dia do Fechamento</Label>
              <Input id="closing-day" type="number" min="1" max="31" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} className="col-span-3" placeholder="Ex: 25" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="due-day" className="text-right">Dia do Vencimento</Label>
              <Input id="due-day" type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} className="col-span-3" placeholder="Ex: 05" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}