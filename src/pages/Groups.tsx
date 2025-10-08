// src/pages/Groups.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Group } from '@/types';
import { Plus, Users, Settings } from 'lucide-react';
import GroupModal from '@/components/GroupModal';
import { useGroup } from '@/contexts/GroupContext';

export default function Groups() {
  const { user } = useAuth();
  const { selectedGroup } = useGroup();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const navigate = useNavigate();

  const fetchGroups = async () => {
    if (!user) return;
    setLoading(true);
    
    const { data: memberData, error: memberError } = await supabase
      .from('membros_grupo')
      .select('group_id')
      .eq('user_id', user.id);

    if (memberError) {
      toast({ title: 'Erro ao buscar seus grupos', description: memberError.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    const groupIds = memberData.map(m => m.group_id);

    if (groupIds.length > 0) {
      const { data: groupData, error: groupError } = await supabase
        .from('grupos')
        .select('*')
        .in('id', groupIds);
      
      if (groupError) {
        toast({ title: 'Erro ao carregar detalhes dos grupos', description: groupError.message, variant: 'destructive' });
      } else {
        setGroups(groupData as Group[]);
      }
    } else {
      setGroups([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

  const handleAddNew = () => {
    setEditingGroup(null);
    setIsModalOpen(true);
  };

  const displayedGroups = selectedGroup ? groups.filter(g => g.id === selectedGroup) : groups;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Meus Grupos</h2>
            <p className="text-muted-foreground">Gerencie seus espaços financeiros compartilhados.</p>
          </div>
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" /> Criar Novo Grupo
          </Button>
        </div>

        {loading ? (
          <p>Carregando grupos...</p>
        ) : displayedGroups.length === 0 ? (
          <div className="text-center py-20 border rounded-lg">
            <Users className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">{selectedGroup ? "Grupo não encontrado" : "Você ainda não faz parte de um grupo"}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{selectedGroup ? "O grupo selecionado não foi encontrado ou você não é membro." : "Crie um grupo para compartilhar finanças com sua família ou amigos."}</p>
            <Button className="mt-6" onClick={handleAddNew}>Criar Grupo</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedGroups.map(group => (
              <Card key={group.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{group.nome}</CardTitle>
                  <CardDescription>Gerencie as finanças deste grupo.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground">Você faz parte deste grupo.</p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" onClick={() => navigate(`/grupo/${group.id}`)}>
                    <Settings className="mr-2 h-4 w-4" /> Gerenciar
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <GroupModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        group={editingGroup}
        onSuccess={fetchGroups}
      />
    </Layout>
  );
}