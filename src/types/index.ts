export type Transaction = {
  id: string;
  user_id: string;
  tipo: string; // Alterado para string
  categoria: string;
  valor: string;
  descricao: string;
  data: string;
  recorrencia: string | null; // Alterado para string | null
  criado_em: string;
};