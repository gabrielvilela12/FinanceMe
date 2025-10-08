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
  group_id?: string | null;
}

// ... (restante das interfaces)

// NOVA INTERFACE ADICIONADA
export interface Category {
    id: string;
    user_id: string;
    group_id: string | null;
    name: string;
    created_at: string;
}