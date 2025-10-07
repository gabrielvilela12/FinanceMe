import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Transaction, CreditCard } from '../types';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import { addMonths, format } from 'date-fns';

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

  useEffect(() => {
    if (open) {
      fetchCards();
      if (transaction) {
        let decryptedPaymentMethod = 'despesa';
        try { decryptedPaymentMethod = decrypt(transaction.payment_method); } catch {}

        setPaymentMethod(decryptedPaymentMethod as any);
        setCategoria(transaction.categoria ? decrypt(transaction.categoria) : '');
        setValor(transaction.valor ? decrypt(transaction.valor) : '');
        setDescricao(transaction.descricao ? decrypt(transaction.descricao) : '');
        setData(transaction.data);
        setRecorrencia(transaction.recorrencia ? decrypt(transaction.recorrencia) : 'unica');
        setSelectedCard(transaction.card_id || undefined);
        setInstallments(transaction.installments || 1);
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
      }
    }
  }, [transaction, open, decrypt]);

  const fetchCards = async () => {
    if (!user) return;
    const { data, error } = await supabase.from('credit_cards').select('*').eq('user_id', user.id);
    if (data) setCards(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) { throw new Error('Usuário não autenticado.'); }
      
      const parsedValor = parseFloat(valor);
      if (isNaN(parsedValor) || parsedValor <= 0) { throw new Error('Por favor, insira um valor válido maior que zero.'); }
      if (!categoria.trim()) { throw new Error('O campo Categoria é obrigatório.'); }
      if (paymentMethod === 'cartao' && !selectedCard) { throw new Error('Selecione um cartão de crédito.'); }

      if (paymentMethod === 'cartao' && installments > 1) {
        const installmentValue = parsedValor / installments;
        const transactionsToInsert = [];

        for (let i = 0; i < installments; i++) {
          const installmentDate = addMonths(new Date(data), i);
          transactionsToInsert.push({
            user_id: user.id,
            tipo: encrypt('despesa'), // Parcelas são sempre despesas
            payment_method: encrypt('cartao'),
            card_id: selectedCard,
            categoria: encrypt(categoria.trim()),
            valor: encrypt(installmentValue.toFixed(2)),
            descricao: encrypt(`${descricao.trim()} ${i + 1}/${installments}`),
            data: format(installmentDate, 'yyyy-MM-dd'),
            recorrencia: encrypt('unica'), // Cada parcela é uma transação única
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
          valor: encrypt(parsedValor.toString()),
          descricao: descricao ? encrypt(descricao.trim()) : null,
          data,
          recorrencia: encrypt(recorrencia),
          installments: paymentMethod === 'cartao' ? installments : null,
          current_installment: paymentMethod === 'cartao' ? (installments > 1 ? 1 : null) : null,
        };

        const { error } = transaction
          ? await supabase.from('transacoes').update(transactionData).eq('id', transaction.id)
          : await supabase.from('transacoes').insert([transactionData]);

        if (error) { throw new Error(error.message); }
      }
      
      toast({ title: transaction ? 'Transação atualizada' : 'Transação criada', description: 'Salva com sucesso.' });
      onSuccess();
      onClose();
      
    } catch (error: any) {
      console.error("Erro ao salvar transação:", error);
      toast({ title: 'Erro ao salvar', description: error.message || 'Ocorreu um erro inesperado.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

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
                <Select value={selectedCard} onValueChange={setSelectedCard}>
                  <SelectTrigger id="card"><SelectValue placeholder="Selecione um cartão" /></SelectTrigger>
                  <SelectContent>
                    {cards.map(card => (
                      <SelectItem key={card.id} value={card.id}>{card.card_name} (final {card.last_four_digits})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="installments">Número de Parcelas</Label>
                <Input id="installments" type="number" min="1" value={installments} onChange={(e) => setInstallments(parseInt(e.target.value, 10))} />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="categoria">Categoria</Label>
            <Input id="categoria" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ex: Alimentação, Salário" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="valor">Valor (R$)</Label>
            <Input id="valor" type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0.00" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="data">Data</Label>
            <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </div>
          {paymentMethod !== 'cartao' && (
            <div className="space-y-2">
              <Label htmlFor="recorrencia">Recorrência</Label>
              <Select value={recorrencia} onValueChange={setRecorrencia}>
                <SelectTrigger id="recorrencia"><SelectValue placeholder="Única" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unica">Única</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="diaria">Diária</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Textarea id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Detalhes da transação" rows={3} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}