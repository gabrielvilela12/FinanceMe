// src/contexts/GroupContext.tsx

import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import { Group } from '@/types';

interface GroupContextType {
  groups: Group[];
  selectedGroup: string | null;
  setSelectedGroup: (groupId: string | null) => void;
  loadingGroups: boolean;
  refreshData: () => void; // Função para forçar a atualização
  addRefreshListener: (listener: () => void) => () => void; // Adicionar e remover listeners
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export function GroupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [refreshListeners, setRefreshListeners] = useState<(() => void)[]>([]);

  const addRefreshListener = useCallback((listener: () => void) => {
    setRefreshListeners(prev => [...prev, listener]);
    // Retorna uma função para remover o listener
    return () => {
      setRefreshListeners(prev => prev.filter(l => l !== listener));
    };
  }, []);

  const refreshData = useCallback(() => {
    refreshListeners.forEach(listener => listener());
  }, [refreshListeners]);

  useEffect(() => {
    const fetchGroups = async () => {
      if (!user) {
        setGroups([]);
        setLoadingGroups(false);
        return;
      };

      setLoadingGroups(true);
      const { data: memberData, error: memberError } = await supabase
        .from('membros_grupo')
        .select('group_id')
        .eq('user_id', user.id);

      if (memberError) {
        console.error("Error fetching user's groups:", memberError);
        setGroups([]);
        setLoadingGroups(false);
        return;
      }

      const groupIds = memberData.map(m => m.group_id);

      if (groupIds.length > 0) {
        const { data: groupData, error: groupError } = await supabase
          .from('grupos')
          .select('*')
          .in('id', groupIds);
        
        if (groupData) {
          setGroups(groupData as Group[]);
        }
      } else {
        setGroups([]);
      }
      setLoadingGroups(false);
    };

    fetchGroups();
  }, [user]);
  
  // Quando o grupo selecionado mudar, chama a atualização dos dados
  useEffect(() => {
    refreshData();
  }, [selectedGroup, refreshData]);

  return (
    <GroupContext.Provider value={{ groups, selectedGroup, setSelectedGroup, loadingGroups, refreshData, addRefreshListener }}>
      {children}
    </GroupContext.Provider>
  );
}

export function useGroup() {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error('useGroup must be used within a GroupProvider');
  }
  return context;
}