// src/App.tsx

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { GroupProvider } from "./contexts/GroupContext";

// Importação das Páginas
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import Cards from "./pages/Cards";
import Installments from "./pages/Installments";
import Projections from "./pages/Projections";
import Agenda from "./pages/Agenda";
import Insights from "./pages/Insights";
import Goals from "./pages/Goals";
import Budgets from "./pages/Budgets";
import Reports from "./pages/Reports";
import Groups from "./pages/Groups";
import GroupManagement from "./pages/GroupManagement";
import Invites from "./pages/Invites";
import Categories from "./pages/Categories";
import Help from "./pages/Help"; // <-- Importe a nova página de Ajuda
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import UpdatePassword from "./pages/UpdatePassword";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <GroupProvider>
            <Routes>
              {/* Rotas Públicas */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />

              {/* Rotas Protegidas */}
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/transacoes" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
              <Route path="/installments" element={<ProtectedRoute><Installments /></ProtectedRoute>} />
              <Route path="/projections" element={<ProtectedRoute><Projections /></ProtectedRoute>} />
              <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
              <Route path="/insights" element={<ProtectedRoute><Insights /></ProtectedRoute>} />
              <Route path="/orcamentos" element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
              <Route path="/relatorios" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/grupos" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
              <Route path="/grupo/:groupId" element={<ProtectedRoute><GroupManagement /></ProtectedRoute>} />
              <Route path="/convites" element={<ProtectedRoute><Invites /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/ajuda" element={<ProtectedRoute><Help /></ProtectedRoute>} /> {/* <-- Adicione a nova rota */}
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </GroupProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;