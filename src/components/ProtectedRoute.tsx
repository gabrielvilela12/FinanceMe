// src/components/ProtectedRoute.tsx

import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Este componente recebe um 'children', que será a página que queremos proteger.
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { session, loading } = useAuth();

  // 1. Enquanto a autenticação está sendo verificada, exibe uma tela de carregamento.
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Carregando...
      </div>
    );
  }

  // 2. Se não houver sessão (usuário não logado), redireciona para a página inicial.
  if (!session) {
    return <Navigate to="/" replace />;
  }

  // 3. Se houver sessão, permite a renderização da página protegida.
  return children;
};

export default ProtectedRoute;