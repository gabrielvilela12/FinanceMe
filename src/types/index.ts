// src/types/index.ts

export interface Transaction {
  id: string;
  user_id: string;
  tipo: string;
  payment_method: 'receita' | 'despesa' | 'cartao' | 'dinheiro' | 'pix';
  card_id?: string | null;
  categoria: string;
  valor: string;
  descricao: string | null;
  data: string;
  recorrencia: string;
  installments?: number | null;
  current_installment?: number | null;
  is_paid?: boolean;
}

export interface CreditCard {
  id: string;
  user_id: string;
  card_name: string;
  last_four_digits: string;
  limite_gastos: number;
  closing_day: number;
  due_day: number;
  created_at: string;
}

export interface Appointment {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  date: string;
  time?: string | null;
  created_at: string;
  valor?: number | null;
  recorrencia?: 'unica' | 'mensal' | null;
  installments?: number | null;
}

export interface Goal {
  id: string;
  user_id: string;
  nome: string;
  valor_alvo: number;
  valor_atual: number;
  data_alvo?: string | null;
  created_at: string;
}

// NOVA INTERFACE ADICIONADA
export interface Budget {
  id: string;
  user_id: string;
  categoria: string;
  valor_orcado: number;
  mes: string; // Formato YYYY-MM
  created_at: string;
}

export interface Group {
  id: string;
  nome: string;
  created_by: string;
  created_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
}