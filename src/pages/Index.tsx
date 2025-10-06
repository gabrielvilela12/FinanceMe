import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, PieChart, Shield } from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/dashboard');
      }
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-full">
              <DollarSign className="h-16 w-16 text-primary" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold">
            FinanceMe
          </h1>
          
          <p className="text-xl text-muted-foreground">
            Controle suas finanças pessoais de forma intuitiva e eficiente
          </p>

          <div className="flex justify-center gap-4 pt-8">
            <Button size="lg" onClick={() => navigate('/auth')}>
              Começar Agora
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-16">
            <div className="p-6 border rounded-lg space-y-4">
              <TrendingUp className="h-8 w-8 text-primary mx-auto" />
              <h3 className="text-lg font-semibold">Acompanhe seu Saldo</h3>
              <p className="text-muted-foreground">
                Visualize receitas, despesas e saldo em tempo real
              </p>
            </div>

            <div className="p-6 border rounded-lg space-y-4">
              <PieChart className="h-8 w-8 text-primary mx-auto" />
              <h3 className="text-lg font-semibold">Gráficos Interativos</h3>
              <p className="text-muted-foreground">
                Análise completa com gráficos de categorias e evolução
              </p>
            </div>

            <div className="p-6 border rounded-lg space-y-4">
              <Shield className="h-8 w-8 text-primary mx-auto" />
              <h3 className="text-lg font-semibold">Seguro e Privado</h3>
              <p className="text-muted-foreground">
                Seus dados são protegidos e apenas você tem acesso
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
