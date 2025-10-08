// src/pages/Invites.tsx

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Check, X } from 'lucide-react';

interface Invite {
  id: string;
  status: string;
  grupos: { nome: string };
}

export default function Invites() {
  const { user } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvites = async () => {
    if (!user?.email) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('convites_grupo')
      .select(`
        id,
        status,
        grupos ( nome )
      `)
      .eq('email_convidado', user.email)
      .eq('status', 'pendente');

    if (error) {
      toast({ title: 'Erro ao buscar convites', description: error.message, variant: 'destructive' });
    } else {
      setInvites(data as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchInvites();
    }
  }, [user]);

  const handleInviteResponse = async (inviteId: string, accept: boolean) => {
    if (accept) {
      const { error } = await supabase.rpc('aceitar_convite_grupo', { convite_id: inviteId });
      if (error) {
        toast({ title: 'Erro ao aceitar convite', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Sucesso!', description: 'Você agora faz parte do grupo.' });
      }
    } else {
      const { error } = await supabase.from('convites_grupo').update({ status: 'recusado' }).eq('id', inviteId);
      if (error) {
        toast({ title: 'Erro ao recusar convite', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Convite recusado.' });
      }
    }
    fetchInvites();
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Meus Convites</h2>
          <p className="text-muted-foreground">Aceite ou recuse convites para participar de grupos.</p>
        </div>

        {loading ? (
          <p>Carregando convites...</p>
        ) : invites.length === 0 ? (
          <div className="text-center py-20 border rounded-lg">
            <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Nenhum convite pendente</h3>
            <p className="mt-2 text-sm text-muted-foreground">Você não tem convites para grupos no momento.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invites.map(invite => (
              <Card key={invite.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold">
                      Você foi convidado para o grupo <span className="text-primary">{invite.grupos.nome}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleInviteResponse(invite.id, true)}>
                      <Check className="h-4 w-4 mr-2" /> Aceitar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleInviteResponse(invite.id, false)}>
                      <X className="h-4 w-4 mr-2" /> Recusar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}