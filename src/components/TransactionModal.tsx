import { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Transaction } from '../types';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';

interface TransactionModalProps {
  open: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  onSuccess: () => void;
}

export default function TransactionModal({ open, onClose, transaction, onSuccess }: TransactionModalProps) {
  const { encrypt, decrypt, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [tipo, setTipo] = useState<'receita' | 'despesa'>('despesa');
  const [categoria, setCategoria] = useState('');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [data, setData] = useState('');
  const [recorrencia, setRecorrencia] = useState<string>('unica');

  useEffect(() => {
    if (open) {
      if (transaction) {
        let decryptedTipo = 'despesa';
        let decryptedRecorrencia = 'unica';
        try { decryptedTipo = decrypt(transaction.tipo); } catch {}
        try { decryptedRecorrencia = transaction.recorrencia ? decrypt(transaction.recorrencia) : 'unica'; } catch {}
        
        let initialValue = '';
        try { initialValue = decrypt(transaction.valor); } 
        catch { initialValue = String(transaction.valor || ''); }

        setTipo(decryptedTipo === 'receita' ? 'receita' : 'despesa');
        setCategoria(transaction.categoria ? decrypt(transaction.categoria) : '');
        setValor(initialValue);
        setDescricao(transaction.descricao ? decrypt(transaction.descricao) : '');
        setData(transaction.data);
        setRecorrencia(decryptedRecorrencia);
      } else {
        setTipo('despesa');
        setCategoria('');
        setValor('');
        setDescricao('');
        setData(new Date().toISOString().split('T')[0]);
        setRecorrencia('unica');
      }
    }
  }, [transaction, open, decrypt]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) { throw new Error('Usuário não autenticado.'); }
      
      const parsedValor = parseFloat(valor);
      if (isNaN(parsedValor) || parsedValor <= 0) { throw new Error('Por favor, insira um valor válido maior que zero.'); }
      if (!categoria.trim()) { throw new Error('O campo Categoria é obrigatório.'); }

      const transactionData = {
        user_id: user.id,
        tipo: encrypt(tipo),
        categoria: encrypt(categoria.trim()),
        valor: encrypt(parsedValor.toString()),
        descricao: descricao ? encrypt(descricao.trim()) : null,
        data,
        recorrencia: encrypt(recorrencia), // Criptografando a recorrência
      };
      
      const { error } = transaction
        ? await supabase.from('transacoes').update(transactionData).eq('id', transaction.id)
        : await supabase.from('transacoes').insert([transactionData]);

      if (error) { throw new Error(error.message); } 
      
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
            <Label htmlFor="tipo">Tipo</Label>
            <Select value={tipo} onValueChange={(value: 'receita' | 'despesa') => setTipo(value)}>
              <SelectTrigger id="tipo"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="receita">Receita</SelectItem>
                <SelectItem value="despesa">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>
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