// src/pages/Profile.tsx

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export default function Profile() {
  const { user } = useAuth();
  const [loadingPassword, setLoadingPassword] = useState(false);

  const handlePasswordReset = async () => {
    if (!user?.email) {
      toast({ title: 'Erro', description: 'Não foi possível encontrar o seu e-mail.', variant: 'destructive' });
      return;
    }

    setLoadingPassword(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      toast({ title: 'Erro ao enviar email', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: 'Email enviado!',
        description: 'Verifique sua caixa de entrada para o link de redefinição de senha.'
      });
    }
    setLoadingPassword(false);
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl">
        <h2 className="text-3xl font-bold">Meu Perfil</h2>

        {/* Card com a informação de e-mail */}
        <Card>
          <CardHeader>
            <CardTitle>Informações da Conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p>{user?.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Card para alteração de senha */}
        <Card>
          <CardHeader>
            <CardTitle>Alterar Senha</CardTitle>
            <CardDescription>
              Você receberá um e-mail com as instruções para criar uma nova senha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handlePasswordReset} disabled={loadingPassword}>
              {loadingPassword ? 'Enviando...' : 'Enviar Email de Redefinição'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}