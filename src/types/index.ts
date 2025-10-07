export type Transaction = {
  id: string;
  user_id: string;
  tipo: string;
  categoria: string;
  valor: string;
  descricao: string;
  data: string;
  recorrencia: string | null;
  criado_em: string;
  payment_method: 'receita' | 'despesa' | 'cartao'; // Novo campo
  card_id?: string | null; // Novo campo
  installments?: number | null; // Novo campo
  current_installment?: number | null; // Novo campo
};

export type CreditCard = {
  id: string;
  user_id: string;
  card_name: string;
  card_brand: string;
  last_four_digits: string;
  created_at: string;
};