export interface Transaction {
  id: string;
  user_id: string;
  tipo: string;
  payment_method: 'receita' | 'despesa' | 'cartao';
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
  limite_gastos: string; // Alterado para string para armazenar o valor criptografado
  closing_day: number;
  due_day: number;
  created_at: string;
}

