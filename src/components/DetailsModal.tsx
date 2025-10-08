// src/components/DetailsModal.tsx

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Transaction, Appointment } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { Badge } from './ui/badge';

interface DetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Transaction | Appointment | null;
}

// Função para verificar se o item é uma Transação
function isTransaction(item: any): item is Transaction {
  return item && 'valor' in item && 'categoria' in item;
}

export default function DetailsModal({ isOpen, onClose, item }: DetailsModalProps) {
  const { decrypt } = useAuth();

  if (!item) return null;

  const getDecryptedText = (text: string | null | undefined) => {
    if (!text) return 'Não informado';
    try {
      return decrypt(text);
    } catch {
      return text;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhes do Item</DialogTitle>
          <DialogDescription>
            Informações completas sobre o item selecionado.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {isTransaction(item) ? (
            // Layout para Transações
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Categoria</span>
                <Badge variant="outline">{getDecryptedText(item.categoria)}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Valor</span>
                <span className={`font-semibold ${getDecryptedText(item.tipo) === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parseFloat(decrypt(item.valor) || '0'))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Data</span>
                <span>{format(parseISO(item.data), 'dd/MM/yyyy')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tipo</span>
                <span>{getDecryptedText(item.tipo)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Método de Pagamento</span>
                <span>{getDecryptedText(item.payment_method)}</span>
              </div>
              {item.installments && (
                 <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Parcela</span>
                    <span>{item.current_installment}/{item.installments}</span>
                </div>
              )}
              {item.descricao && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Descrição</p>
                  <p className="text-sm">{getDecryptedText(item.descricao)}</p>
                </div>
              )}
            </>
          ) : (
            // Layout para Agendamentos
            <>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Título</span>
                <span className="font-semibold">{item.title}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Data</span>
                <span>{format(parseISO(item.date), 'dd/MM/yyyy')}</span>
              </div>
              {item.time && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Hora</span>
                  <span>{format(parseISO(`1970-01-01T${item.time}`), 'HH:mm')}</span>
                </div>
              )}
              {item.description && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground mb-1">Descrição</p>
                  <p className="text-sm">{item.description}</p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}