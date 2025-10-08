// src/pages/GroupManagement.tsx

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Group } from '@/types';
import { UserPlus, Users, Mail } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface Member {
  email: string;
}
interface Invite {
  id: string;
  email_convidado: string;
}

export default function GroupManagement() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchGroupDetails = useCallback(async () => {
    if (!user || !groupId) return;
    setLoading(true);

    // Busca detalhes do grupo
    const { data: groupData, error: groupError } = await supabase.from('grupos').select('*').eq('id', groupId).single();
    if (groupError || !groupData) {
      toast({ title: 'Erro', description: 'Grupo não encontrado.', variant: 'destructive' });
      navigate('/grupos');
      return;
    }
    setGroup(groupData as Group);

    // Busca membros do grupo usando a nova função RPC
    const { data: membersData, error: membersError } = await supabase.rpc('get_group_members', { group_id_input: groupId });
    if (membersError) {
      toast({ title: 'Erro ao buscar membros', description: membersError.message, variant: 'destructive' });
    } else {
      setMembers(membersData || []);
    }
    
    // Busca convites pendentes
    const { data: invitesData } = await supabase.from('convites_grupo').select('id, email_convidado').eq('group_id', groupId).eq('status', 'pendente');
    setInvites(invitesData || []);

    setLoading(false);
  }, [user, groupId, navigate]);

  useEffect(() => {
    fetchGroupDetails();
  }, [fetchGroupDetails]);

  const handleSendInvite = async () => {
    if (!user || !groupId || !inviteEmail) {
      toast({ title: 'Preencha o e-mail', description: 'Você precisa digitar um e-mail para convidar.', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('convites_grupo').insert({
      group_id: groupId,
      email_convidado: inviteEmail,
      convidado_por: user.id
    });

    if (error) {
      toast({ title: 'Erro ao enviar convite', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Convite enviado!', description: `Um convite foi enviado para ${inviteEmail}.` });
      setInviteEmail('');
      fetchGroupDetails();
    }
  };

  if (loading) {
    return <Layout><p>Carregando gerenciamento do grupo...</p></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
            <h2 className="text-3xl font-bold tracking-tight">Gerenciar Grupo: {group?.nome}</h2>
            <p className="text-muted-foreground">Convide pessoas e gerencie os membros do seu grupo.</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center"><UserPlus className="h-5 w-5 mr-2" />Convidar Novo Membro</CardTitle>
                  <CardDescription>Envie um convite por e-mail para alguém se juntar a este grupo.</CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                  <Input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                  />
                  <Button onClick={handleSendInvite}>Convidar</Button>
              </CardContent>
          </Card>
          <Card>
              <CardHeader>
                  <CardTitle className="flex items-center"><Users className="h-5 w-5 mr-2" />Membros do Grupo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                  {members.map(member => (
                    <div key={member.email} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                            <AvatarFallback>{member.email.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{member.email}</span>
                    </div>
                  ))}
              </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Mail className="h-5 w-5 mr-2" />Convites Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            {invites.length > 0 ? (
              <div className="space-y-2">
                {invites.map(invite => (
                  <div key={invite.id} className="flex items-center justify-between text-sm">
                    <p>{invite.email_convidado}</p>
                    <Badge variant="secondary">Pendente</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum convite pendente no momento.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}