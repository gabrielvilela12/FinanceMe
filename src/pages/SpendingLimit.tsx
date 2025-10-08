// src/pages/SpendingLimit.tsx

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export default function SpendingLimitSettings() {
  const { user } = useAuth();
  const [limiteGastos, setLimiteGastos] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, [user]);

  const fetchConfig = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('config')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setLimiteGastos(data.limite_gastos.toString());
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!user) return;

    const { error } = await supabase
      .from('config')
      .upsert({
        user_id: user.id,
        limite_gastos: parseFloat(limiteGastos)
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Configurações salvas',
        description: 'Suas preferências foram atualizadas.'
      });
    }

    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Limite de Gastos</CardTitle>
        <CardDescription>
          Configure um limite mensal de gastos. Você receberá alertas quando ultrapassar esse valor.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="limite">Limite Mensal (R$)</Label>
            <Input
              id="limite"
              type="number"
              step="0.01"
              value={limiteGastos}
              onChange={(e) => setLimiteGastos(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}