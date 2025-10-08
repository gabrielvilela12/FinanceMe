// src/pages/Installments.tsx

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Transaction, CreditCard } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2 } from 'lucide-react';
import { getCategoryColor } from '@/lib/colors';

export default function Installments() {
  const { user, decrypt } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Transaction[] | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [transactionsRes, cardsRes] = await Promise.all([
      supabase.from('transacoes').select('*').gt('installments', 1).order('data', { ascending: true }),
      supabase.from('credit_cards').select('*').eq('user_id', user.id)
    ]);

    if (transactionsRes.data) setTransactions(transactionsRes.data as Transaction[]);
    if (cardsRes.data) setCards(cardsRes.data as CreditCard[]);
    setLoading(false);
  };

  const getDecryptedText = (text: string | null) => {
    if (!text) return '';
    try { return decrypt(text); } catch { return text; }
  };

  const handlePaymentStatusChange = async (transactionId: string, isPaid: boolean) => {
    const { error } = await supabase.from('transacoes').update({ is_paid: isPaid }).eq('id', transactionId);

    if (error) {
      toast({ title: 'Erro ao atualizar pagamento', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Parcela marcada como ${isPaid ? 'paga' : 'pendente'}` });
      setSelectedGroup(prevGroup => 
        prevGroup ? prevGroup.map(t => t.id === transactionId ? { ...t, is_paid: isPaid } : t) : null
      );
      fetchData();
    }
  };

  const groupedInstallments = useMemo(() => {
    const groups: { [key: string]: Transaction[] } = {};
    transactions.forEach(t => {
      const description = getDecryptedText(t.descricao);
      const baseDescription = description.replace(/\s\d+\/\d+$/, '').trim();
      const key = `${baseDescription}_${t.card_id}_${t.installments}`;

      if (!groups[key]) { groups[key] = []; }
      groups[key].push(t);
    });
    return Object.values(groups);
  }, [transactions, decrypt]);

  const openModalWithGroup = (group: Transaction[]) => {
    setSelectedGroup(group);
    setIsModalOpen(true);
  };
  
  if (loading) return <Layout><div className="text-center py-12">Carregando parcelamentos...</div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold">Controle de Parcelamentos</h2>
          <p className="text-muted-foreground">Acompanhe suas compras parceladas e marque as faturas como pagas.</p>
        </div>

        {groupedInstallments.length === 0 && !loading ? (
          <p className="text-center text-muted-foreground py-12">Nenhuma compra parcelada encontrada.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedInstallments.map((group, index) => {
              const first = group[0];
              const card = cards.find(c => c.id === first.card_id);
              const paidCount = group.filter(t => t.is_paid).length;
              const progressValue = (paidCount / (first.installments || 1)) * 100;
              const baseDescription = getDecryptedText(first.descricao).replace(/\s\d+\/\d+$/, '').trim();
              const isFullyPaid = paidCount === first.installments;
              const nextUnpaidInstallment = group.find(t => !t.is_paid);
              const category = getDecryptedText(first.categoria);
              const categoryColor = getCategoryColor(category);

              return (
                <Card 
                  key={index} 
                  onClick={() => openModalWithGroup(group)} 
                  className={`cursor-pointer hover:ring-2 hover:ring-primary transition-all flex flex-col overflow-hidden ${isFullyPaid ? 'opacity-60' : ''}`}
                >
                  <CardHeader style={{ backgroundColor: categoryColor }}>
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle className="truncate pr-2 text-lg font-semibold text-white">{baseDescription}</CardTitle>
                      <Badge variant="outline" className="border-white/50 bg-white/20 text-white">{category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-between">
                    {isFullyPaid ? (
                      <div className="flex flex-col items-center justify-center text-center my-4">
                          <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
                          <p className="font-semibold text-green-600">Totalmente Pago</p>
                      </div>
                    ) : (
                      <div className="space-y-1 pt-6"> {/* Adicionado pt-6 para compensar remoção do padding do CardContent */}
                        <p className="text-sm text-muted-foreground">Próxima Parcela:</p>
                        <p className="text-2xl font-bold">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(decrypt(nextUnpaidInstallment?.valor) || '0'))}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Vence em: {new Date(nextUnpaidInstallment?.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    )}
                    <div className="mt-4 pt-4 border-t">
                       <Progress value={progressValue} className="h-2" />
                       <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                        <span>{paidCount} de {first.installments} pagas</span>
                        <span>{card?.card_name}</span>
                       </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          {selectedGroup && (
            <>
              <DialogHeader>
                <DialogTitle>{getDecryptedText(selectedGroup[0].descricao).replace(/\s\d+\/\d+$/, '').trim()}</DialogTitle>
                <DialogDescription>
                  Detalhes do parcelamento. Marque as parcelas que já foram pagas.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Status</TableHead>
                      <TableHead>Parcela</TableHead>
                      <TableHead>Data Venc.</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedGroup.map(t => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`modal-paid-${t.id}`}
                              checked={t.is_paid}
                              onCheckedChange={(checked) => handlePaymentStatusChange(t.id, !!checked)}
                            />
                            <Label htmlFor={`modal-paid-${t.id}`}>
                              {t.is_paid ? <Badge variant="secondary">Pago</Badge> : <Badge variant="outline">Pendente</Badge>}
                            </Label>
                          </div>
                        </TableCell>
                        <TableCell>{t.current_installment}/{t.installments}</TableCell>
                        <TableCell>{new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(decrypt(t.valor) || '0'))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}