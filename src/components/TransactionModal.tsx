// src/components/TransactionModal.tsx

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Transaction, CreditCard, Category } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { addMonths, format, addDays } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { useGroup } from '@/contexts/GroupContext';
import { Combobox } from './ui/combobox';

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onSuccess: () => void;
}

export default function TransactionModal({ open, onClose, transaction, onSuccess }: TransactionModalProps) {
  const { encrypt, decrypt, user } = useAuth();
  const { selectedGroup } = useGroup();
  const [loading, setLoading] = useState(false);
  
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa');
  const [paymentMethod, setPaymentMethod] = useState<'dinheiro' | 'pix' | 'cartao' | 'despesa'>('dinheiro');
  const [categoria, setCategoria] = useState('');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState('');
  const [recorrencia, setRecorrencia] = useState<string>('unica');
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | undefined>(undefined);
  const [installments, setInstallments] = useState<number>(1);
  const [interestRate, setInterestRate] = useState<string>('');
  const [dailyRepetitions, setDailyRepetitions] = useState<string>('1');
  const [isIndefinite, setIsIndefinite] = useState(true);
  const [monthlyRepetitions, setMonthlyRepetitions] = useState<string>('12');

  const fetchCardsAndCategories = async () => {
    if (!user) return;
    
    const { data: cardsData } = await supabase.from('credit_cards').select('*').eq('user_id', user.id);
    if (cardsData) setCards(cardsData);

    let query = supabase.from('categories').select('*');
    if (selectedGroup) {
      query = query.eq('group_id', selectedGroup);
    } else {
      query = query.is('group_id', null).eq('user_id', user.id);
    }
    const { data: categoriesData } = await query;
    if (categoriesData) setCategories(categoriesData);
  };
  
  useEffect(() => {
    if (open) {
      fetchCardsAndCategories();
      if (transaction) {
        const decryptedTipo = decrypt(transaction.tipo) as 'receita' | 'despesa';
        const decryptedPaymentMethod = decrypt(transaction.payment_method);

        setTipo(decryptedTipo);
        if (decryptedTipo === 'despesa') {
            setPaymentMethod(decryptedPaymentMethod as any);
        }

        setCategoria(transaction.categoria); // Categoria já é o nome criptografado
        setValor(transaction.valor ? decrypt(transaction.valor) : '');
        setDescricao(transaction.descricao ? decrypt(transaction.descricao) : '');
        setData(transaction.data);
        setRecorrencia(transaction.recorrencia ? decrypt(transaction.recorrencia) : 'unica');
        setSelectedCard(transaction.card_id || undefined);
        setInstallments(transaction.installments || 1);
        setInterestRate('');
        setDailyRepetitions('1');
        setIsIndefinite(!transaction.installments);
        setMonthlyRepetitions(transaction.installments?.toString() || '12');
      } else {
        setTipo('despesa');
        setPaymentMethod('dinheiro');
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

  const handleCreateCategory = async (newCategoryName: string) => {
    if (!user || !newCategoryName.trim()) return;

    const encryptedName = encrypt(newCategoryName.trim());
    
    const { data, error } = await supabase
      .from('categories')
      .insert({
        user_id: user.id,
        name: encryptedName,
        group_id: selectedGroup,
      })
      .select()
      .single();

    if (error) {
        if (error.code === '23505') { // Unique constraint violation
            toast({ title: 'Categoria já existe', variant: 'destructive' });
        } else {
            toast({ title: 'Erro ao criar categoria', description: error.message, variant: 'destructive' });
        }
    } else if (data) {
        toast({ title: 'Categoria criada!', description: `"${newCategoryName}" foi adicionada.` });
        setCategories(prev => [...prev, data]);
        setCategoria(data.name); // Seleciona a nova categoria
    }
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
          toast({ title: 'Ação não permitida', description: 'Use o botão "Encerrar Recorrência" para parar as repetições.', variant: 'destructive' });
          setLoading(false);
          return;
      }

      const finalPaymentMethod = tipo === 'receita' ? 'receita' : paymentMethod;
      const groupId = transaction ? transaction.group_id : selectedGroup;

      if (recorrencia === 'diaria' && !transaction) {
        const repetitions = parseInt(dailyRepetitions, 10) || 1;
        const transactionsToInsert = [];
        for (let i = 0; i < repetitions; i++) {
          const transactionDate = addDays(new Date(data), i);
          transactionsToInsert.push({
            user_id: user.id,
            tipo: encrypt(tipo),
            payment_method: encrypt(finalPaymentMethod),
            categoria: categoria, // Categoria já é o nome criptografado
            valor: encrypt(parsedValue.toString()),
            descricao: encrypt(descricao.trim()),
            data: format(transactionDate, 'yyyy-MM-dd'),
            recorrencia: encrypt('unica'),
            group_id: groupId,
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
            categoria: categoria, // Categoria já é o nome criptografado
            valor: encrypt(installmentValue.toFixed(2)),
            descricao: encrypt(`${descricao.trim()} ${i + 1}/${installments}`),
            data: format(installmentDate, 'yyyy-MM-dd'),
            recorrencia: encrypt('unica'),
            installments,
            current_installment: i + 1,
            group_id: groupId,
          });
        }
        const { error } = await supabase.from('transacoes').insert(transactionsToInsert);
        if (error) throw error;
        
      } else {
        const transactionData = {
          user_id: user.id,
          tipo: encrypt(tipo),
          payment_method: encrypt(finalPaymentMethod),
          card_id: paymentMethod === 'cartao' ? selectedCard : null,
          categoria: categoria, // Categoria já é o nome criptografado
          valor: encrypt(parsedValue.toString()),
          descricao: descricao ? encrypt(descricao.trim()) : null,
          data,
          recorrencia: encrypt(recorrencia),
          installments: recorrencia === 'mensal' && !isIndefinite ? parseInt(monthlyRepetitions, 10) : (paymentMethod === 'cartao' ? installments : null),
          current_installment: recorrencia === 'mensal' && !isIndefinite ? 1 : (paymentMethod === 'cartao' && installments > 1 ? 1 : null),
          group_id: groupId,
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

  const categoryOptions = categories.map(c => ({
    value: c.name,
    label: decrypt(c.name),
  }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>{transaction ? 'Editar Transação' : 'Nova Transação'}</DialogTitle>
          <DialogDescription>Preencha os detalhes da sua movimentação financeira.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6">
          <form id="transaction-form" onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select value={tipo} onValueChange={(value: 'receita' | 'despesa') => setTipo(value)}>
                  <SelectTrigger id="tipo"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receita">Receita</SelectItem>
                    <SelectItem value="despesa">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {tipo === 'despesa' && (
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Método de Pagamento</Label>
                  <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                    <SelectTrigger id="paymentMethod"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="cartao">Cartão de Crédito</SelectItem>
                      <SelectItem value="despesa">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {tipo === 'despesa' && paymentMethod === 'cartao' && (
                <div className="space-y-4 rounded-md border p-4">
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
                  {installments > 1 && valor && (
                      <div className="text-sm text-muted-foreground pt-2 space-y-1">
                        <div className="flex justify-between"><span>Total c/ juros:</span><span className="font-medium">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalValue)}</span></div>
                        <div className="flex justify-between"><span>Parcela:</span><span className="font-medium">{installments}x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(installmentValue)}</span></div>
                      </div>
                  )}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Combobox
                  options={categoryOptions}
                  value={categoria}
                  onChange={setCategoria}
                  onCreate={handleCreateCategory}
                  placeholder="Selecione ou crie uma categoria"
                  searchPlaceholder="Pesquisar ou criar..."
                  emptyMessage="Nenhuma categoria encontrada."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor">Valor (R$)</Label>
                <Input id="valor" type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0.00" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data">Data</Label>
                <Input id="data" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
              </div>
              
              <div className="space-y-2">
                <Label>Recorrência</Label>
                <Select value={recorrencia} onValueChange={setRecorrencia} disabled={(tipo === 'despesa' && paymentMethod === 'cartao') || !!transaction}>
                  <SelectTrigger id="recorrencia"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unica">Única</SelectItem>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="diaria">Diária</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {recorrencia === 'diaria' && !transaction && (
                <div className="space-y-2"><Label htmlFor="dailyRepetitions">Repetir por quantos dias?</Label><Input id="dailyRepetitions" type="number" min="1" value={dailyRepetitions} onChange={(e) => setDailyRepetitions(e.target.value)} /></div>
              )}

              {recorrencia === 'mensal' && !transaction && (
                <div className="space-y-4 rounded-md border p-4">
                  <div className="flex items-center space-x-2"><Switch id="indefinite-switch" checked={isIndefinite} onCheckedChange={setIsIndefinite} /><Label htmlFor="indefinite-switch">Duração Indefinida</Label></div>
                  {!isIndefinite && (<div className="space-y-2"><Label htmlFor="monthlyRepetitions">Número de Meses</Label><Input id="monthlyRepetitions" type="number" min="1" value={monthlyRepetitions} onChange={(e) => setMonthlyRepetitions(e.target.value)} /></div>)}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição (opcional)</Label>
                <Textarea id="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Detalhes da transação" rows={3} />
              </div>
          </form>
        </div>

        <DialogFooter className="p-6 pt-4 border-t">
          <div className="flex justify-between items-center w-full">
            <div>
              {transaction && getDecryptedText(transaction.recorrencia) === 'mensal' && (
                <Button type="button" variant="destructive" onClick={handleEndRecurrence} disabled={loading}>
                  {loading ? 'Encerrando...' : 'Encerrar Recorrência'}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" form="transaction-form" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}