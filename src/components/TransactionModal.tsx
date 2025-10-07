// src/components/TransactionModal.tsx

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Transaction, CreditCard } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { addMonths, format, addDays } from 'date-fns';
import { Switch } from '@/components/ui/switch';

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onSuccess: () => void;
}

export default function TransactionModal({ open, onClose, transaction, onSuccess }: TransactionModalProps) {
  const { encrypt, decrypt, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'receita' | 'despesa' | 'cartao'>('despesa');
  const [categoria, setCategoria] = useState('');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState('');
  const [recorrencia, setRecorrencia] = useState<string>('unica');
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | undefined>(undefined);
  const [installments, setInstallments] = useState<number>(1);
  const [interestRate, setInterestRate] = useState<string>('');
  const [dailyRepetitions, setDailyRepetitions] = useState<string>('1');
  const [isIndefinite, setIsIndefinite] = useState(true);
  const [monthlyRepetitions, setMonthlyRepetitions] = useState<string>('12');


  useEffect(() => {
    if (open) {
      fetchCards();
      if (transaction) {
        let decryptedPaymentMethod = 'despesa';
        try { decryptedPaymentMethod = decrypt(transaction.payment_method); } catch {}

        setPaymentMethod(decryptedPaymentMethod as any);
        setCategoria(transaction.categoria ? decrypt(transaction.categoria) : '');
        setValor(transaction.valor ? decrypt(transaction.valor) : '');
        setDescricao(transaction.descricao ? decrypt(transaction.descricao).replace(/\s\(\d+\/\d+\)$/, '').trim() : '');
        setData(transaction.data);
        setRecorrencia(transaction.recorrencia ? decrypt(transaction.recorrencia) : 'unica');
        setSelectedCard(transaction.card_id || undefined);
        setInstallments(transaction.installments || 1);
        setInterestRate('');
        setDailyRepetitions('1');
        setIsIndefinite(!transaction.installments);
        setMonthlyRepetitions(transaction.installments?.toString() || '12');
      } else {
        // Reset state for new transaction
        setPaymentMethod('despesa');
        setCategoria('');
        setValor('');
        setDescricao('');
        setData(new Date().toISOString().split('T')[0]);
        setRecorrencia('unica');
        setSelectedCard(undefined);
        setInstallments(1);
        setInterestRate('');
        setDailyRepetitions('1');
        setIsIndefinite(true);
        setMonthlyRepetitions('12');
      }
    }
  }, [transaction, open, decrypt]);

  const fetchCards = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('credit_cards').select('*').eq('user_id', user.id);
    if (data) setCards(data);
  };

  const handleEndRecurrence = async () => {
    if (!transaction) return;
    setLoading(true);
    const { error } = await supabase
      .from('transacoes')
      .update({ recorrencia: encrypt('unica'), installments: null, current_installment: null })
      .eq('id', transaction.id);

    if (error) {
      toast({ title: 'Erro ao encerrar recorrência', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Recorrência encerrada', description: 'Esta transação não se repetirá mais.' });
      onSuccess();
      onClose();
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) { throw new Error('Usuário não autenticado.'); }
      
      const parsedValue = parseFloat(valor);
      const interest = parseFloat(interestRate) || 0;

      if (isNaN(parsedValue) || parsedValue <= 0) { throw new Error('Por favor, insira um valor válido maior que zero.'); }
      if (!categoria.trim()) { throw new Error('O campo Categoria é obrigatório.'); }
      if (paymentMethod === 'cartao' && !selectedCard) { throw new Error('Selecione um cartão de crédito.'); }
      
      if (transaction && getDecryptedText(transaction.recorrencia) !== 'unica') {
          toast({ title: 'Ação não permitida', description: 'Use o botão "Encerrar Recorrência" para parar as repetições. Não é possível alterar os detalhes de uma transação recorrente.', variant: 'destructive' });
          setLoading(false);
          return;
      }

      if (recorrencia === 'diaria' && !transaction) {
        const repetitions = parseInt(dailyRepetitions, 10) || 1;
        const transactionsToInsert = [];
        for (let i = 0; i < repetitions; i++) {
          const transactionDate = addDays(new Date(data), i);
          transactionsToInsert.push({
            user_id: user.id,
            tipo: encrypt(paymentMethod === 'receita' ? 'receita' : 'despesa'),
            payment_method: encrypt(paymentMethod),
            categoria: encrypt(categoria.trim()),
            valor: encrypt(parsedValue.toString()),
            descricao: encrypt(`${descricao.trim()} (${i + 1}/${repetitions})`),
            data: format(transactionDate, 'yyyy-MM-dd'),
            recorrencia: encrypt('unica'),
          });
        }
        const { error } = await supabase.from('transacoes').insert(transactionsToInsert);
        if (error) throw error;

      } else if (paymentMethod === 'cartao' && installments > 1) {
        const finalValue = parsedValue * (1 + interest / 100);
        const installmentValue = finalValue / installments;
        const transactionsToInsert = [];

        for (let i = 0; i < installments; i++) {
          const installmentDate = addMonths(new Date(data), i);
          transactionsToInsert.push({
            user_id: user.id,
            tipo: encrypt('despesa'),
            payment_method: encrypt('cartao'),
            card_id: selectedCard,
            categoria: encrypt(categoria.trim()),
            valor: encrypt(installmentValue.toFixed(2)),
            descricao: encrypt(`${descricao.trim()} ${i + 1}/${installments}`),
            data: format(installmentDate, 'yyyy-MM-dd'),
            recorrencia: encrypt('unica'),
            installments,
            current_installment: i + 1,
          });
        }
        const { error } = await supabase.from('transacoes').insert(transactionsToInsert);
        if (error) throw error;
        
      } else {
        const transactionData = {
          user_id: user.id,
          tipo: encrypt(paymentMethod === 'receita' ? 'receita' : 'despesa'),
          payment_method: encrypt(paymentMethod),
          card_id: paymentMethod === 'cartao' ? selectedCard : null,
          categoria: encrypt(categoria.trim()),
          valor: encrypt(parsedValue.toString()),
          descricao: descricao ? encrypt(descricao.trim()) : null,
          data,
          recorrencia: encrypt(recorrencia),
          installments: recorrencia === 'mensal' && !isIndefinite ? parseInt(monthlyRepetitions, 10) : (paymentMethod === 'cartao' ? installments : null),
          current_installment: recorrencia === 'mensal' && !isIndefinite ? 1 : (paymentMethod === 'cartao' && installments > 1 ? 1 : null),
        };
        const { error } = transaction
          ? await supabase.from('transacoes').update(transactionData).eq('id', transaction.id)
          : await supabase.from('transacoes').insert([transactionData]);
        if (error) { throw new Error(error.message); }
      }
      
      toast({ title: transaction ? 'Transação atualizada' : 'Transação(ões) criada(s)', description: 'Salva com sucesso.' });
      onSuccess();
      onClose();
      
    } catch (error: any) {
      console.error("Erro ao salvar transação:", error);
      toast({ title: 'Erro ao salvar', description: error.message || 'Ocorreu um erro inesperado.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const totalValue = parseFloat(valor) || 0;
  const interest = parseFloat(interestRate) || 0;
  const finalValue = totalValue * (1 + interest / 100);
  const installmentValue = installments > 0 ? finalValue / installments : 0;
  const getDecryptedText = (text: string | null) => {
    if (!text) return '';
    try {
      return decrypt(text);
    } catch {
      return text;
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{transaction ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
          <DialogDescription>Preencha os detalhes da sua movimentação financeira.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Método de Pagamento</Label>
            <Select value={paymentMethod} onValueChange={(value: 'receita' | 'despesa' | 'cartao') => setPaymentMethod(value)}>
              <SelectTrigger id="paymentMethod"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
                <SelectItem value="cartao">Cartão de Crédito</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === 'cartao' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="card">Cartão</Label>
                <Select value={selectedCard} onValueChange={setSelectedCard} required>
                  <SelectTrigger id="card"><SelectValue placeholder="Selecione um cartão" /></SelectTrigger>
                  <SelectContent>
                    {cards.map(card => (
                      <SelectItem key={card.id} value={card.id}>{card.card_name} (final {card.last_four_digits})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="installments">Parcelas</Label>
                  <Input id="installments" type="number" min="1" value={installments} onChange={(e) => setInstallments(parseInt(e.target.value, 10) || 1)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interestRate">Juros (%)</Label>
                  <Input id="interestRate" type="number" step="0.01" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="Ex: 1.99" disabled={installments <= 1} />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="categoria">Categoria</Label>
            <Input id="categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ex: Alimentação, Salário" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valor">{paymentMethod === 'cartao' ? 'Valor Total (R$)' : 'Valor (R$)'}</Label>
            <Input id="valor" type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0.00" required />
          </div>

          {paymentMethod === 'cartao' && installments > 1 && valor && (
            <div className="text-sm text-muted-foreground border-t pt-4 mt-4 space-y-2">
              <div className="flex justify-between">
                <span>Total com juros:</span>
                <span className="font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalValue)}</span>
              </div>
              <div className="flex justify-between">
                <span>Valor da parcela:</span>
                <span className="font-medium">{installments}x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(installmentValue)}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="data">Data</Label>
            <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </div>
          
          <div className="space-y-2">
            <Label>Recorrência</Label>
            <Select value={recorrencia} onValueChange={setRecorrencia} disabled={paymentMethod === 'cartao' || !!transaction}>
              <SelectTrigger id="recorrencia"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unica">Única</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="diaria">Diária</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recorrencia === 'diaria' && !transaction && (
            <div className="space-y-2">
              <Label htmlFor="dailyRepetitions">Repetir por quantos dias?</Label>
              <Input id="dailyRepetitions" type="number" min="1" value={dailyRepetitions} onChange={(e) => setDailyRepetitions(e.target.value)} />
            </div>
          )}

          {recorrencia === 'mensal' && !transaction && (
            <div className="space-y-4 rounded-md border p-4">
              <div className="flex items-center space-x-2">
                <Switch id="indefinite-switch" checked={isIndefinite} onCheckedChange={setIsIndefinite} />
                <Label htmlFor="indefinite-switch">Duração Indefinida</Label>
              </div>
              {!isIndefinite && (
                <div className="space-y-2">
                  <Label htmlFor="monthlyRepetitions">Número de Meses</Label>
                  <Input id="monthlyRepetitions" type="number" min="1" value={monthlyRepetitions} onChange={(e) => setMonthlyRepetitions(e.target.value)} />
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Textarea id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Detalhes da transação" rows={3} />
          </div>
          <div className="flex justify-between items-center gap-2 pt-4">
            <div>
              {transaction && getDecryptedText(transaction.recorrencia) === 'mensal' && (
                <Button type="button" variant="destructive" onClick={handleEndRecurrence} disabled={loading}>
                  {loading ? 'Encerrando...' : 'Encerrar Recorrência'}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}