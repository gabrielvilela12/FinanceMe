// src/components/AppointmentModal.tsx

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Appointment } from '@/types';
import { format } from 'date-fns';
import { Switch } from '@/components/ui/switch';

interface AppointmentModalProps {
  open: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  selectedDate: Date | undefined;
  onSuccess: () => void;
}

export default function AppointmentModal({ open, onClose, appointment, selectedDate, onSuccess }: AppointmentModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [valor, setValor] = useState<string>('');
  const [recorrencia, setRecorrencia] = useState<'unica' | 'mensal'>('unica');
  const [isIndefinite, setIsIndefinite] = useState(true);
  const [monthlyRepetitions, setMonthlyRepetitions] = useState<string>('12');

  useEffect(() => {
    if (open) {
      if (appointment) {
        setTitle(appointment.title);
        setDescription(appointment.description || '');
        setDate(appointment.date);
        setTime(appointment.time || '');
        setValor(appointment.valor?.toString() || '');
        setRecorrencia(appointment.recorrencia || 'unica');
        setIsIndefinite(appointment.installments === null);
        setMonthlyRepetitions(appointment.installments?.toString() || '12');
      } else {
        setTitle('');
        setDescription('');
        setDate(selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '');
        setTime('');
        setValor('');
        setRecorrencia('unica');
        setIsIndefinite(true);
        setMonthlyRepetitions('12');
      }
    }
  }, [appointment, open, selectedDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title || !date) {
      toast({ title: 'Campos obrigatórios', description: 'Título e data são necessários.', variant: 'destructive' });
      return;
    }
    setLoading(true);

    const appointmentData = {
      user_id: user.id,
      title,
      description: description || null,
      date,
      time: time || null,
      valor: valor ? parseFloat(valor) : null,
      recorrencia: recorrencia,
      installments: recorrencia === 'mensal' ? (isIndefinite ? null : parseInt(monthlyRepetitions, 10)) : null,
    };

    const { error } = appointment
      ? await supabase.from('agendamentos').update(appointmentData).eq('id', appointment.id)
      : await supabase.from('agendamentos').insert([appointmentData]);
    
    if (error) {
      toast({ title: 'Erro ao salvar agendamento', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Agendamento salvo!', description: 'Seu compromisso foi salvo com sucesso.' });
      onSuccess();
      onClose();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{appointment ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
          <DialogDescription>Adicione um novo compromisso ao seu calendário.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Hora (Opcional)</Label>
              <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="valor">Valor (Opcional)</Label>
              <Input id="valor" type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recorrencia">Recorrência</Label>
              <Select value={recorrencia} onValueChange={(value: 'unica' | 'mensal') => setRecorrencia(value)}>
                <SelectTrigger id="recorrencia"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unica">Único</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {recorrencia === 'mensal' && (
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
            <Label htmlFor="description">Descrição (Opcional)</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <DialogFooter className='pt-4'>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}