import { ReactNode, useEffect } from 'react'; // Importe o useEffect
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { DollarSign, LayoutDashboard, Receipt, Settings, LogOut, PanelLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '../contexts/AuthContext'; // Importe o useAuth

interface LayoutProps {
  children: ReactNode;
}

// ... (Componente NavContent permanece o mesmo)
const NavContent = () => {
  const navigate = useNavigate();
  return (
    <nav className="flex flex-col space-y-2 pt-4">
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={() => navigate('/dashboard')}
      >
        <LayoutDashboard className="h-4 w-4 mr-2" />
        Dashboard
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={() => navigate('/transacoes')}
      >
        <Receipt className="h-4 w-4 mr-2" />
        Transações
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-start"
        onClick={() => navigate('/configuracoes')}
      >
        <Settings className="h-4 w-4 mr-2" />
        Configurações
      </Button>
    </nav>
  );
};


export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { session, loading } = useAuth(); // Use o hook de autenticação

  useEffect(() => {
    // Se o carregamento terminou e não há sessão, redireciona para a home
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
  
  // Exibe uma tela de carregamento enquanto a sessão é verificada
  if (loading || !session) {
    return (
      <div className="flex h-screen items-center justify-center">
        Carregando...
      </div>
    );
  }

  // Se o usuário estiver logado, exibe o layout normal
  return (
    <div className="min-h-screen bg-background">
      {/* Cabeçalho */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Botão do Menu para Mobile */}
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

            {/* Logo */}
            <div className="flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">FinanceMe</h1>
            </div>
          </div>

          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Sair</span>
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Barra Lateral para Desktop */}
        <aside className="hidden md:flex md:w-64 flex-col min-h-[calc(100vh-73px)] border-r bg-card p-4">
          <NavContent />
        </aside>

        {/* Conteúdo Principal */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}