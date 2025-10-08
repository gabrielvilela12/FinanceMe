// src/pages/Help.tsx

import Layout from '@/components/Layout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Help() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Central de Ajuda</h2>
          <p className="text-muted-foreground">
            Encontre aqui todas as informações que você precisa para utilizar o FinanceMe.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Guia de Funcionalidades</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Dashboard</AccordionTrigger>
                <AccordionContent>
                  O Dashboard é sua central de visualização rápida. Aqui você encontra um resumo do seu saldo, receitas e despesas para um período selecionado, além de gráficos que mostram a distribuição de gastos por categoria e a evolução de suas finanças ao longo dos últimos 6 meses.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Transações</AccordionTrigger>
                <AccordionContent>
                  Nesta seção, você pode registrar todas as suas movimentações financeiras, sejam elas receitas ou despesas. Use os filtros para encontrar transações específicas por data, tipo, categoria ou descrição. Você também pode criar novas categorias diretamente ao adicionar uma nova transação.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Parcelamentos</AccordionTrigger>
                <AccordionContent>
                  Acompanhe todas as suas compras parceladas no cartão de crédito. Esta aba agrupa as parcelas de uma mesma compra, permitindo que você marque cada uma como paga e visualize o progresso do pagamento total.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger>Projeções</AccordionTrigger>
                <AccordionContent>
                  Planeje seu futuro financeiro. Com base em suas transações recorrentes (como salários e assinaturas), a ferramenta de projeção calcula uma estimativa do seu saldo para os próximos meses, ajudando você a tomar decisões mais informadas.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-5">
                <AccordionTrigger>Agenda</AccordionTrigger>
                <AccordionContent>
                  Organize seus compromissos financeiros. Você pode agendar pagamentos futuros, recebimentos ou qualquer evento com impacto financeiro. O calendário exibe os dias com transações (despesas em vermelho, receitas em verde) para uma visualização clara.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-6">
                <AccordionTrigger>Insights</AccordionTrigger>
                <AccordionContent>
                  Obtenha uma análise detalhada dos seus hábitos financeiros. A página de Insights mostra suas principais categorias de gastos e receitas, a média de gastos diária e mensal, e um histórico comparativo de suas finanças ao longo do tempo.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-7">
                <AccordionTrigger>Orçamentos</AccordionTrigger>
                <AccordionContent>
                  Defina limites de gastos para categorias específicas a cada mês. A página de Orçamentos permite que você crie um valor máximo para uma categoria (ex: R$500 para Alimentação) e acompanhe o quanto você já gastou em relação a esse limite.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-8">
                <AccordionTrigger>Relatórios</AccordionTrigger>
                <AccordionContent>
                  Gere relatórios financeiros detalhados para um período específico. Você pode filtrar por tipo de transação e categoria, visualizar um resumo de receitas, despesas e saldo, e exportar a lista completa de transações em um arquivo PDF.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-9">
                <AccordionTrigger>Grupos</AccordionTrigger>
                <AccordionContent>
                  Compartilhe e gerencie finanças com outras pessoas. Você pode criar grupos, convidar membros e registrar transações compartilhadas. Ao selecionar um grupo no menu superior, todas as seções do aplicativo (Dashboard, Transações, etc.) passarão a exibir apenas os dados daquele grupo.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-10">
                <AccordionTrigger>Convites</AccordionTrigger>
                <AccordionContent>
                  Aqui você pode ver e responder a todos os convites pendentes para participar de grupos financeiros.
                </AccordionContent>
              </AccordionItem>
               <AccordionItem value="item-11">
                <AccordionTrigger>Configurações</AccordionTrigger>
                <AccordionContent>
                  Personalize sua experiência no FinanceMe. Nesta área, você pode gerenciar seus cartões de crédito, criar e editar suas categorias de transações, definir e acompanhar suas metas financeiras e configurar um limite de gastos mensal para receber alertas.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-12">
                <AccordionTrigger>Perfil</AccordionTrigger>
                <AccordionContent>
                  Visualize as informações da sua conta, como o e-mail cadastrado, e solicite a redefinição de sua senha de acesso.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}