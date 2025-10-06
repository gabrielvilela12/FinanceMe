// supabase/functions/check-spending-limit/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend';
import CryptoJS from 'https://esm.sh/crypto-js@4.2.0';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY');

// Função para descriptografar (a mesma lógica do seu frontend)
const decrypt = (ciphertext: string): string => {
  if (!ENCRYPTION_KEY) return ciphertext;
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText || ciphertext;
  } catch {
    return ciphertext;
  }
};

Deno.serve(async (req) => {
  // 1. Inicializar clientes
  const resend = new Resend(RESEND_API_KEY);
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  // 2. Extrair o ID do usuário do corpo da requisição
  const { record } = await req.json();
  const userId = record.user_id;

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400 });
  }

  try {
    // 3. Obter o limite de gastos do usuário
    const { data: configData, error: configError } = await supabaseAdmin
      .from('config')
      .select('limite_gastos')
      .eq('user_id', userId)
      .single();

    if (configError || !configData || !configData.limite_gastos || configData.limite_gastos <= 0) {
      console.log(`User ${userId} has no spending limit set.`);
      return new Response(JSON.stringify({ message: 'No spending limit set.' }), { status: 200 });
    }
    const spendingLimit = configData.limite_gastos;

    // 4. Calcular o total de despesas no mês atual
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const monthIdentifier = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const { data: transactions, error: transError } = await supabaseAdmin
      .from('transacoes')
      .select('valor, tipo')
      .eq('user_id', userId)
      .gte('data', firstDayOfMonth);

    if (transError) throw transError;

    const totalExpenses = transactions
      .filter(t => decrypt(t.tipo) === 'despesa')
      .reduce((sum, t) => {
        const value = parseFloat(decrypt(t.valor));
        return sum + (isNaN(value) ? 0 : value);
      }, 0);

    // 5. Verificar se o limite foi atingido e se a notificação já foi enviada
    if (totalExpenses > spendingLimit) {
      const { data: notification, error: notifError } = await supabaseAdmin
        .from('monthly_spending_notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('month', monthIdentifier)
        .maybeSingle();

      if (notifError) throw notifError;

      // Se a notificação ainda não foi enviada este mês
      if (!notification) {
        // Obter e-mail do usuário
        const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (userError || !user || !user.email) throw userError || new Error('User email not found.');

        // Enviar o e-mail
        await resend.emails.send({
          from: 'alerta@yourdomain.com', // Configure um e-mail verificado no Resend
          to: user.email,
          subject: 'Alerta de Limite de Gastos - FinanceMe',
          html: `
            <h1>Alerta de Limite de Gastos</h1>
            <p>Olá,</p>
            <p>Você ultrapassou seu limite de gastos de <strong>R$ ${spendingLimit.toFixed(2)}</strong> para este mês.</p>
            <p>Seu total de despesas atual é de <strong>R$ ${totalExpenses.toFixed(2)}</strong>.</p>
            <p>Acesse o <a href="${Deno.env.get('SITE_URL') ?? ''}/dashboard">FinanceMe</a> para ver os detalhes.</p>
          `,
        });

        // Registrar que a notificação foi enviada
        await supabaseAdmin.from('monthly_spending_notifications').insert({ user_id: userId, month: monthIdentifier });

        console.log(`Notification sent to user ${userId}`);
        return new Response(JSON.stringify({ message: 'Limit exceeded, notification sent.' }), { status: 200 });
      }
    }

    return new Response(JSON.stringify({ message: 'Limit not exceeded or notification already sent.' }), { status: 200 });

  } catch (error) {
    console.error('Error in function:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});