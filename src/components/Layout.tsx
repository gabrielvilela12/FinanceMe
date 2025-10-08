// src/components/Layout.tsx

import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { 
  DollarSign, LayoutDashboard, Receipt, Settings, User, LogOut, PanelLeft, 
  CreditCard as CreditCardIcon, Landmark, LineChart, CalendarDays, BarChart, 
  Target, Wallet, FileText, Users, Mail 
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '../contexts/AuthContext';
import ViewSwitcher from './ViewSwitcher';

interface LayoutProps {
  children: ReactNode;
}

const NavContent = () => {
  const navigate = useNavigate();
  return (
    <nav className="flex flex-col space-y-2 pt-4">
      <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/dashboard')}>
        <LayoutDashboard className="h-4 w-4 mr-2" />
        Dashboard
      </Button>
      <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/transacoes')}>
        <Receipt className="h-4 w-4 mr-2" />
        Transações
      </Button>
      <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/cards')}>
        <CreditCardIcon className="h-4 w-4 mr-2" />
        Cartões
      </Button>
      <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/installments')}>
        <Landmark className="h-4 w-4 mr-2" />
        Parcelamentos
      </Button>
      <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/projections')}>
        <LineChart className="h-4 w-4 mr-2" />
        Projeções
      </Button>
      <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/agenda')}>
        <CalendarDays className="h-4 w-4 mr-2" />
        Agenda
      </Button>
      <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/insights')}>
        <BarChart className="h-4 w-4 mr-2" />
        Insights
      </Button>
      <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/metas')}>
        <Target className="h-4 w-4 mr-2" />
        Metas
      </Button>
      <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/orcamentos')}>
        <Wallet className="h-4 w-4 mr-2" />
        Orçamentos
      </Button>
      <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/relatorios')}>
        <FileText className="h-4 w-4 mr-2" />
        Relatórios
      </Button>
      <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/grupos')}>
        <Users className="h-4 w-4 mr-2" />
        Grupos
      </Button>
      <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/convites')}>
        <Mail className="h-4 w-4 mr-2" />
        Convites
      </Button>
      <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/configuracoes')}>
        <Settings className="h-4 w-4 mr-2" />
        Configurações
      </Button>
      <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/perfil')}>
        <User className="h-4 w-4 mr-2" />
        Perfil
      </Button>
    </nav>
  );
};

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && !session) {
      navigate('/');
    }
  }, [session, loading, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: 'Logout realizado',
      description: 'Até logo!'
    });
    navigate('/auth');
  };
  
  if (loading || !session) {
    return (
      <div className="flex h-screen items-center justify-center">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <PanelLeft className="h-5 w-5" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-4">
                <NavContent />
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">FinanceMe</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ViewSwitcher />
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden md:flex md:w-64 flex-col min-h-[calc(100vh-73px)] border-r bg-card p-4">
          <NavContent />
        </aside>

        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}