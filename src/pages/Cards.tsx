// src/pages/Cards.tsx

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CreditCard } from '@/types';

export default function Cards() {
  const { user } = useAuth();
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [cardName, setCardName] = useState('');
  const [cardBrand, setCardBrand] = useState('');
  const [lastFour, setLastFour] = useState('');

  useEffect(() => {
    if (user) {
      fetchCards();
    }
  }, [user]);

  const fetchCards = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      toast({ title: 'Erro ao buscar cartões', description: error.message, variant: 'destructive' });
    } else {
      setCards(data || []);
    }
    setLoading(false);
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !cardName || !cardBrand || !lastFour) return;

    const { error } = await supabase
      .from('credit_cards')
      .insert([{ user_id: user.id, card_name: cardName, card_brand: cardBrand, last_four_digits: lastFour }]);

    if (error) {
      toast({ title: 'Erro ao adicionar cartão', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Cartão adicionado com sucesso!' });
      setModalOpen(false);
      fetchCards();
      // Reset form
      setCardName('');
      setCardBrand('');
      setLastFour('');
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    const { error } = await supabase.from('credit_cards').delete().eq('id', cardId);
    if (error) {
      toast({ title: 'Erro ao excluir cartão', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Cartão excluído com sucesso' });
      fetchCards();
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold">Meus Cartões</h2>
          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Adicionar Cartão</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Novo Cartão</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddCard} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cardName">Nome do Cartão (Ex: Nubank, Inter)</Label>
                  <Input id="cardName" value={cardName} onChange={(e) => setCardName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cardBrand">Bandeira (Ex: Visa, Mastercard)</Label>
                  <Input id="cardBrand" value={cardBrand} onChange={(e) => setCardBrand(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastFour">Últimos 4 dígitos</Label>
                  <Input id="lastFour" value={lastFour} onChange={(e) => setLastFour(e.target.value)} maxLength={4} required />
                </div>
                <Button type="submit" className="w-full">Salvar Cartão</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <p>Carregando cartões...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cards.map((card) => (
              <Card key={card.id}>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    {card.card_name}
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteCard(card.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{card.card_brand}</p>
                  <p className="text-lg font-mono">**** **** **** {card.last_four_digits}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}