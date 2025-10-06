import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';
import CryptoJS from 'crypto-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  encrypt: (text: string) => string;
  decrypt: (ciphertext: string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // A chave secreta agora virá da variável de ambiente
  const secretKey = import.meta.env.VITE_ENCRYPTION_KEY;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // A função de login não precisa mais armazenar a senha
  const login = async (password: string) => {
    // A lógica de login pode ser ajustada conforme necessário,
    // mas não precisa mais interagir com a chave de criptografia
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const encrypt = useCallback((text: string): string => {
    if (!secretKey) throw new Error("Chave de criptografia não está disponível.");
    return CryptoJS.AES.encrypt(text, secretKey).toString();
  }, [secretKey]);

  const decrypt = useCallback((ciphertext: string): string => {
    if (!secretKey) return "••••••••";
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
      const originalText = bytes.toString(CryptoJS.enc.Utf8);
      return originalText || "Dado criptografado";
    } catch (e) {
      console.error("Erro ao descriptografar:", e);
      return "Dado inválido";
    }
  }, [secretKey]);

  const value = { session, user, loading, login, logout, encrypt, decrypt };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}