// src/pages/Agenda.tsx

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import AppointmentModal from '@/components/AppointmentModal';
import DetailsModal from '@/components/DetailsModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/contexts/AuthContext';
import { Transaction, Appointment } from '@/types';
import { format, parseISO, isSameDay, getDate, isAfter, differenceInCalendarMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Clock, DollarSign, Pencil, Trash2, CreditCard } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function Agenda() {
  const { user, decrypt } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Transaction | Appointment | null>(null);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [transRes, apptRes] = await Promise.all([
      supabase.from('transacoes').select('*').eq('user_id', user.id),
      supabase.from('agendamentos').select('*').eq('user_id', user.id)
    ]);
    if (transRes.data) setTransactions(transRes.data as Transaction[]);
    if (apptRes.data) setAppointments(apptRes.data as Appointment[]);
    setLoading(false);
  };
  
  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const getNumericValue = (value: string) => decrypt(value) ? parseFloat(decrypt(value)) : 0;

  const dailyItems = useMemo(() => {
    if (!selectedDate) return { installments: [], otherExpenses: [], appointments: [] };

    const allExpensesToday = transactions.filter(t => {
      const isExpense = decrypt(t.tipo) === 'despesa';
      const isMonthly = decrypt(t.recorrencia) === 'mensal';

      if (!isExpense) return false;

      const startDate = parseISO(t.data);
      if (isMonthly) {
        const dayOfMonthMatches = getDate(startDate) === getDate(selectedDate);
        const isAfterStartDate = !isAfter(startDate, selectedDate);
        const monthsPassed = differenceInCalendarMonths(selectedDate, startDate);
        const totalInstallments = t.installments;
        const isWithinInstallmentLimit = totalInstallments === null || monthsPassed < totalInstallments;
        return dayOfMonthMatches && isAfterStartDate && isWithinInstallmentLimit;
      }
      
      return isSameDay(startDate, selectedDate);
    });

    const installments = allExpensesToday.filter(t => decrypt(t.payment_method) === 'cartao');
    const otherExpenses = allExpensesToday.filter(t => decrypt(t.payment_method) !== 'cartao');
    
    const appointmentsOnDate = appointments.filter(a => 
      isSameDay(parseISO(a.date), selectedDate)
    );

    return { installments, otherExpenses, appointments: appointmentsOnDate };
  }, [selectedDate, transactions, appointments, decrypt]);

  const modifiers = useMemo(() => ({
    expense: transactions
      .filter(t => decrypt(t.tipo) === 'despesa' || decrypt(t.payment_method) === 'cartao')
      .map(t => parseISO(t.data)),
    income: transactions
      .filter(t => decrypt(t.tipo) === 'receita')
      .map(t => parseISO(t.data)),
  }), [transactions, decrypt]);

  const handleNewAppointment = () => {
    setEditingAppointment(null);
    setIsAppointmentModalOpen(true);
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setIsAppointmentModalOpen(true);
  };

  const handleDeleteAppointment = async (id: string) => {
    const { error } = await supabase.from('agendamentos').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Agendamento excluído' });
      fetchData();
    }
  };

  const handleViewDetails = (item: Transaction | Appointment) => {
    setSelectedItem(item);
    setIsDetailsModalOpen(true);
  };


  return (
    <Layout>
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Agenda Financeira</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Calendário Financeiro</CardTitle>
                <CardDescription>Visualize suas transações e compromissos.</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="p-0"
                  locale={ptBR}
                  modifiers={modifiers}
                  modifiersClassNames={{
                    expense: 'day-expense',
                    income: 'day-income',
                  }}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gasto do Dia</CardTitle>
                <CardDescription>Despesas do dia (exceto cartão de crédito).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? <p>Carregando...</p> : (
                  dailyItems.otherExpenses.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">Nenhum gasto extra para hoje.</p>
                  ) : (
                    dailyItems.otherExpenses.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-sm cursor-pointer hover:bg-muted/50 p-2 rounded-md" onClick={() => handleViewDetails(item)}>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground"/>
                          <p>{decrypt(item.categoria)}</p>
                        </div>
                        <p className="font-medium text-red-600">
                          - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getNumericValue(item.valor))}
                        </p>
                      </div>
                    ))
                  )
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Parcelas e Agendamentos</CardTitle>
                  <CardDescription>{selectedDate ? format(selectedDate, 'dd/MM/yyyy') : 'Selecione um dia'}</CardDescription>
                </div>
                <Button size="sm" onClick={handleNewAppointment}><Plus className="h-4 w-4 mr-2"/> Agendar</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? <p>Carregando...</p> : (
                <>
                  {dailyItems.installments.length === 0 && dailyItems.appointments.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-muted-foreground">Nenhuma pendência para hoje.</p>
                    </div>
                  ) : (
                    <>
                      {dailyItems.installments.length > 0 && <h4 className="font-semibold text-sm text-purple-500">PARCELAS</h4>}
                      {dailyItems.installments.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-sm cursor-pointer hover:bg-muted/50 p-2 rounded-md" onClick={() => handleViewDetails(item)}>
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground"/>
                            {/* LINHA ALTERADA: Exibe a categoria em vez da descrição */}
                            <p className='truncate'>{decrypt(item.categoria)}</p>
                          </div>
                          <p className="font-medium text-red-600">
                            - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getNumericValue(item.valor))}
                          </p>
                        </div>
                      ))}

                      {dailyItems.appointments.length > 0 && <h4 className="font-semibold text-sm text-blue-500 mt-4">AGENDAMENTOS</h4>}
                      {dailyItems.appointments.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-sm group cursor-pointer hover:bg-muted/50 p-2 rounded-md" onClick={() => handleViewDetails(item)}>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground"/>
                            <div>
                                <p>{item.title}</p>
                                {item.time && <p className="text-xs text-muted-foreground">{format(parseISO(`1970-01-01T${item.time}`), 'HH:mm')}</p>}
                            </div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {e.stopPropagation(); handleEditAppointment(item)}}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => {e.stopPropagation(); handleDeleteAppointment(item.id)}}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <AppointmentModal 
        open={isAppointmentModalOpen} 
        onClose={() => setIsAppointmentModalOpen(false)} 
        appointment={editingAppointment}
        selectedDate={selectedDate}
        onSuccess={fetchData} 
      />
      <DetailsModal 
        isOpen={isDetailsModalOpen} 
        onClose={() => setIsDetailsModalOpen(false)} 
        item={selectedItem} 
      />
    </Layout>
  );
}