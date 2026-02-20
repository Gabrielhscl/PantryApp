import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { SyncService } from '../services/SyncService';

// 1. DEFINIÇÃO DA INTERFACE (Aqui dizemos ao TypeScript o que o Contexto tem)
type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
};

// 2. CRIAÇÃO DO CONTEXTO
const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
});

// 3. PROVIDER (O componente que "embrulha" a App)
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Busca a sessão inicial ao abrir a app
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Se já abriu a app logado, faz um sync silencioso!
      if (session?.user) {
        SyncService.syncAll(session.user.id, true);
      }
    });

    // Escuta mudanças de estado (Login, Logout, Token renovado)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user && _event === 'SIGNED_IN') {
        SyncService.syncAll(session.user.id, true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // --- FUNÇÕES DE AUTENTICAÇÃO ---

  const signIn = async (email: string, password: string) => {
    try {
      const response = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return response;
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const response = await supabase.auth.signUp({
        email,
        password,
      });
      return response;
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // 1. Apaga os dados locais (ISOLAMENTO DE CONTA)
      await SyncService.clearLocalData();
      // 2. Faz logout na nuvem
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  // 4. PASSA AS FUNÇÕES PARA A APLICAÇÃO
  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// 5. HOOK PERSONALIZADO (Para usar nos ecrãs)
export const useAuth = () => {
  return useContext(AuthContext);
};