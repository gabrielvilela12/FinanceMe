// src/pages/Settings.tsx

import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Importe os componentes das páginas que vamos aninhar
import CardsSettings from './Cards';
import CategoriesSettings from './Categories';
import GoalsSettings from './Goals';
import SpendingLimitSettings from './SpendingLimit';

export default function Settings() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
          <p className="text-muted-foreground">
            Gerencie suas configurações de conta, cartões, categorias e metas.
          </p>
        </div>
        
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="cards">Cartões</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
            <TabsTrigger value="goals">Metas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general">
            <SpendingLimitSettings />
          </TabsContent>
          
          <TabsContent value="cards">
            <CardsSettings />
          </TabsContent>

          <TabsContent value="categories">
            <CategoriesSettings />
          </TabsContent>
          
          <TabsContent value="goals">
            <GoalsSettings />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}