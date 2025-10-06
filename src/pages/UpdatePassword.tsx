// src/pages/UpdatePassword.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { DollarSign } from 'lucide-react';

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Efeito para verificar se o usuário chegou através do link de redefinição
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // O evento 'PASSWORD_RECOVERY' confirma que o usuário está no fluxo de redefinição
      if (event === 'PASSWORD_RECOVERY') {
        // A sessão está pronta, podemos permitir a troca de senha
      }
    });

    // É uma boa prática verificar se há um fragmento de erro na URL
    const hash = window.location.hash;
    if (hash.includes('error_code=401')) {
        toast({
            title: 'Link expirado',
            description: 'O link de redefinição de senha expirou. Por favor, solicite um novo.',
            variant: 'destructive',
        });
        navigate('/auth');
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: 'Erro', description: 'As senhas não coincidem.', variant: 'destructive' });
      return;
    }
     if (password.length < 6) {
        toast({ title: 'Erro', description: 'A senha deve ter no mínimo 6 caracteres.', variant: 'destructive' });
        return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({ title: 'Erro ao atualizar a senha', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso!', description: 'Sua senha foi atualizada. Você será redirecionado para o login.' });
      // Desloga o usuário da sessão de recuperação e o envia para a tela de login
      await supabase.auth.signOut();
      navigate('/auth');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Crie sua Nova Senha</CardTitle>
          <CardDescription>Digite e confirme sua nova senha de acesso.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova Senha</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Nova Senha'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}