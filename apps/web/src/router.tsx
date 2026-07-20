import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { LoginPage } from "./routes/login";
import { EsqueciSenhaPage } from "./routes/esqueci-senha";
import { PrimeiroAcessoPage } from "./routes/primeiro-acesso";
import { ServidorDashboard } from "./routes/servidor/dashboard";
import { ServidorLayout } from "./routes/servidor/layout";
import { ServidorSelecionarMatricula } from "./routes/servidor/selecionar-matricula";
import { ServidorPortabilidade } from "./routes/servidor/portabilidade";
import { ServidorSolicitarCartao } from "./routes/servidor/solicitar-cartao";
import { ServidorTermo } from "./routes/servidor/termo";
import { ServidorMarketplace } from "./routes/servidor/marketplace";
import { ServidorMarketplacePortabilidade } from "./routes/servidor/marketplace-portabilidade";
import { ServidorMinhaMargem } from "./routes/servidor/minha-margem";
import { ServidorSaude } from "./routes/servidor/saude";
import { ServidorSimular } from "./routes/servidor/simular";
// Rota /servidor/propostas foi removida — propostas agora aparecem embutidas
// em /servidor/contratos (secao "Em andamento" + Historico).
// import { ServidorPropostas } from "./routes/servidor/propostas";
import { ServidorContratos } from "./routes/servidor/contratos";
import { ServidorConta } from "./routes/servidor/conta";
import { ServidorBeneficios } from "./routes/servidor/beneficios";
import { AverbadoraLayout } from "./routes/averbadora/layout";
import { AverbadoraDashboard } from "./routes/averbadora/dashboard";
import { AdminBancos } from "./routes/averbadora/bancos";
import { AdminPrefeituras } from "./routes/averbadora/prefeituras";
import { AdminConvenios } from "./routes/averbadora/convenios";
import { AdminContratos } from "./routes/averbadora/contratos";
import { AdminServidores } from "./routes/averbadora/servidores";
import { AdminFolhas } from "./routes/averbadora/folhas";
import { AdminComunicados } from "./routes/averbadora/comunicados";
import { AdminHealth } from "./routes/averbadora/health";
import { AverbadoraConfiguracoes } from "./routes/averbadora/configuracoes";
import { AdminLogs } from "./routes/averbadora/logs";
import { AdminVitrine } from "./routes/averbadora/vitrine";
import { AdminBeneficios } from "./routes/averbadora/beneficios";
import { AdminBeneficiosForm } from "./routes/averbadora/beneficios-form";
import { AdminEmails } from "./routes/averbadora/emails";
import { AverbadoraTelemedicina } from "./routes/averbadora/telemedicina";
import { AverbadoraTelemedicinaCotacao } from "./routes/averbadora/telemedicina-cotacao";
import { AverbadoraInteressados } from "./routes/averbadora/interessados";
import { AverbadoraApiDocs } from "./routes/averbadora/api/docs";
import { AverbadoraApiTokens } from "./routes/averbadora/api/tokens";
import { AverbadoraApiWebhooks } from "./routes/averbadora/api/webhooks";
import { AdminPreReservas } from "./routes/averbadora/pre-reservas";
import { AdminTombamento } from "./routes/averbadora/tombamento";
import { AdminIdUnico } from "./routes/averbadora/id-unico";
import { AdminBateCarteira } from "./routes/averbadora/bate-carteira";
import { AdminAdf } from "./routes/averbadora/adf";
import { AverbadoraPortabilidade } from "./routes/averbadora/portabilidade";
import { AverbadoraTermos } from "./routes/averbadora/termos";
import { AdminAuditoria } from "./routes/averbadora/auditoria";
import { AdminPerfis } from "./routes/averbadora/perfis";
import { AverbadoraConta } from "./routes/averbadora/conta";
import { PrefeituraLayout } from "./routes/prefeitura/layout";
import { PrefeituraDashboard } from "./routes/prefeitura/dashboard";
import { PrefeituraServidores } from "./routes/prefeitura/servidores";
import { PrefeituraContratos } from "./routes/prefeitura/contratos";
import { PrefeituraConvenios } from "./routes/prefeitura/convenios";
import { PrefeituraFolhas } from "./routes/prefeitura/folhas";
import { PrefeituraTombamento } from "./routes/prefeitura/tombamento";
import { PrefeituraAdf } from "./routes/prefeitura/adf";
import { PrefeituraRelatorios } from "./routes/prefeitura/relatorios";
import { PrefeituraAnuencia } from "./routes/prefeitura/anuencia";
import { PrefeituraPerfis } from "./routes/prefeitura/perfis";
import { PrefeituraComunicados } from "./routes/prefeitura/comunicados";
import { PrefeituraMateriais } from "./routes/prefeitura/materiais";
import { BancoLayout } from "./routes/banco/layout";
import { BancoConta } from "./routes/banco/conta";
import { PrefeituraConta } from "./routes/prefeitura/conta";
import { BancoVisaoGeral } from "./routes/banco/visao-geral";
import { BancoPropostas } from "./routes/banco/propostas/index";
import { BancoPropostaDetalhe } from "./routes/banco/propostas/detalhe";
import { BancoOfertas } from "./routes/banco/ofertas";
import { BancoCarteira } from "./routes/banco/carteira/index";
import { BancoFalhas } from "./routes/banco/falhas";
import { BancoBateCarteira } from "./routes/banco/bate-carteira";
import { BancoConvenios } from "./routes/banco/convenios";
import { BancoPortabilidade } from "./routes/banco/portabilidade";
import { BancoMargemContratacaoBusca } from "./routes/banco/margem-contratacao/index";
import { BancoMargemContratacaoFicha } from "./routes/banco/margem-contratacao/ficha";
import { OperacaoForm } from "./routes/banco/margem-contratacao/OperacaoForm";
import { BancoTabelaEmprestimosLista } from "./routes/banco/cadastros/tabela-emprestimos/index";
import { BancoTabelaEmprestimosForm } from "./routes/banco/cadastros/tabela-emprestimos/form";
import { BancoUsuariosLista } from "./routes/banco/cadastros/usuarios/index";
import { BancoUsuariosForm } from "./routes/banco/cadastros/usuarios/form";
import { BancoRelatorioConsignacoes } from "./routes/banco/relatorios/consignacoes";
import { BancoRelatorioGerador } from "./routes/banco/relatorios/gerador";
import { BancoRelatorioFaturamento } from "./routes/banco/relatorios/faturamento";
import { readStoredRole } from "./lib/sdk";

type Tipo = "EMPRESTIMO" | "REFIN" | "COMPOSTA" | "PORTABILIDADE";
function OperacaoRoute({ modo, tipoFromParam }: { modo: "averbar" | "reservar"; tipoFromParam: boolean }) {
  if (tipoFromParam) {
    const path = window.location.pathname;
    const last = path.split("/").pop()?.toUpperCase() ?? "EMPRESTIMO";
    const tipo = (["EMPRESTIMO", "REFIN", "COMPOSTA", "PORTABILIDADE"].includes(last) ? last : "EMPRESTIMO") as Tipo;
    return <OperacaoForm modo={modo} tipo={tipo} />;
  }
  return <OperacaoForm modo={modo} tipo="EMPRESTIMO" />;
}

function RequireAuth({ role }: { role: "servidor" | "banco" | "averbadora" | "prefeitura" }) {
  const stored = readStoredRole();
  if (!stored) return <Navigate to="/login" replace />;
  if (stored !== role) return <Navigate to={`/${stored}/dashboard`} replace />;
  return <Outlet />;
}

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/esqueci-senha", element: <EsqueciSenhaPage /> },
  { path: "/primeiro-acesso", element: <PrimeiroAcessoPage /> },

  // Servidor (marketplace completo)
  {
    path: "/servidor",
    element: <RequireAuth role="servidor" />,
    children: [
      // Standalone fullscreen page (no ServidorLayout): matricula selector.
      { path: "selecionar-matricula", element: <ServidorSelecionarMatricula /> },
      {
        element: <ServidorLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", element: <ServidorDashboard /> },
          { path: "marketplace", element: <ServidorMarketplace /> },
          { path: "marketplace/portabilidade", element: <ServidorMarketplacePortabilidade /> },
          { path: "minha-margem", element: <ServidorMinhaMargem /> },
          { path: "simular", element: <ServidorSimular /> },
          { path: "portabilidade", element: <ServidorPortabilidade /> },
          { path: "solicitar-cartao", element: <ServidorSolicitarCartao /> },
          { path: "termo", element: <ServidorTermo /> },
          // Rota /servidor/propostas removida — foi fundida em /servidor/contratos.
          { path: "contratos", element: <ServidorContratos /> },
          { path: "beneficios", element: <ServidorBeneficios /> },
          { path: "saude", element: <ServidorSaude /> },
          { path: "conta", element: <ServidorConta /> },
        ],
      },
    ],
  },

  // Banco (UX Consignet com design Atlas)
  {
    path: "/banco",
    element: <RequireAuth role="banco" />,
    children: [
      {
        element: <BancoLayout />,
        children: [
          { index: true, element: <Navigate to="visao-geral" replace /> },
          { path: "dashboard", element: <Navigate to="../visao-geral" replace /> },
          { path: "visao-geral", element: <BancoVisaoGeral /> },

          { path: "propostas", element: <BancoPropostas /> },
          { path: "propostas/:id", element: <BancoPropostaDetalhe /> },
          { path: "ofertas", element: <BancoOfertas /> },

          { path: "carteira", element: <BancoCarteira /> },
          { path: "falhas", element: <BancoFalhas /> },
          { path: "bate-carteira", element: <BancoBateCarteira /> },
          { path: "convenios", element: <BancoConvenios /> },
          { path: "portabilidade", element: <BancoPortabilidade /> },

          { path: "cadastros/tabela-emprestimos", element: <BancoTabelaEmprestimosLista /> },
          { path: "cadastros/tabela-emprestimos/novo", element: <BancoTabelaEmprestimosForm /> },
          { path: "cadastros/tabela-emprestimos/:id", element: <BancoTabelaEmprestimosForm /> },
          { path: "cadastros/usuarios", element: <BancoUsuariosLista /> },
          { path: "cadastros/usuarios/novo", element: <BancoUsuariosForm /> },
          { path: "cadastros/usuarios/:id", element: <BancoUsuariosForm /> },

          { path: "margem-contratacao", element: <BancoMargemContratacaoBusca /> },
          { path: "margem-contratacao/:idMatricula", element: <BancoMargemContratacaoFicha /> },
          { path: "margem-contratacao/:idMatricula/averbar/:tipo", element: <OperacaoRoute modo="averbar" tipoFromParam /> },
          { path: "margem-contratacao/:idMatricula/reservar/:tipo", element: <OperacaoRoute modo="reservar" tipoFromParam /> },

          { path: "relatorios/consignacoes", element: <BancoRelatorioConsignacoes /> },
          { path: "relatorios/gerador", element: <BancoRelatorioGerador /> },
          { path: "relatorios/faturamento", element: <BancoRelatorioFaturamento /> },
          { path: "conta", element: <BancoConta /> },
        ],
      },
    ],
  },

  // Averbadora (super-admin)
  {
    path: "/averbadora",
    element: <RequireAuth role="averbadora" />,
    children: [
      {
        element: <AverbadoraLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", element: <AverbadoraDashboard /> },
          { path: "bancos", element: <AdminBancos /> },
          { path: "prefeituras", element: <AdminPrefeituras /> },
          { path: "convenios", element: <AdminConvenios /> },
          { path: "contratos", element: <AdminContratos /> },
          { path: "servidores", element: <AdminServidores /> },
          { path: "folhas", element: <AdminFolhas /> },
          { path: "pre-reservas", element: <AdminPreReservas /> },
          { path: "tombamento", element: <AdminTombamento /> },
          { path: "id-unico", element: <AdminIdUnico /> },
          { path: "bate-carteira", element: <AdminBateCarteira /> },
          { path: "adf", element: <AdminAdf /> },
          { path: "portabilidade", element: <AverbadoraPortabilidade /> },
          { path: "termos", element: <AverbadoraTermos /> },
          { path: "auditoria", element: <AdminAuditoria /> },
          { path: "perfis", element: <AdminPerfis /> },
          { path: "comunicados", element: <Navigate to="/averbadora/comunicados/banco" replace /> },
          { path: "comunicados/banco", element: <AdminComunicados publico="banco" /> },
          { path: "comunicados/servidor", element: <AdminComunicados publico="servidor" /> },
          { path: "health", element: <AdminHealth /> },
          { path: "configuracoes", element: <AverbadoraConfiguracoes /> },
          { path: "ia", element: <AverbadoraConfiguracoes /> },
          { path: "logs", element: <AdminLogs /> },
          { path: "vitrine", element: <AdminVitrine /> },
          { path: "beneficios", element: <AdminBeneficios /> },
          { path: "beneficios/novo", element: <AdminBeneficiosForm /> },
          { path: "beneficios/:id/editar", element: <AdminBeneficiosForm /> },
          // E-mails do sistema: 5 sub-rotas, cada uma passa o evento correspondente.
          { path: "emails", element: <Navigate to="/averbadora/emails/primeiro-acesso" replace /> },
          { path: "emails/primeiro-acesso", element: <AdminEmails evento="primeiro_acesso" /> },
          { path: "emails/recuperar-senha", element: <AdminEmails evento="recuperar_senha" /> },
          { path: "emails/redefinir-senha", element: <AdminEmails evento="redefinir_senha" /> },
          { path: "emails/simulacao", element: <AdminEmails evento="simulacao" /> },
          { path: "emails/beneficios", element: <AdminEmails evento="beneficio" /> },
          { path: "telemedicina", element: <AverbadoraTelemedicina /> },
          { path: "telemedicina/:id", element: <AverbadoraTelemedicinaCotacao /> },
          { path: "interessados", element: <AverbadoraInteressados /> },
          { path: "api/docs", element: <AverbadoraApiDocs /> },
          { path: "api/tokens", element: <AverbadoraApiTokens /> },
          { path: "api/webhooks", element: <AverbadoraApiWebhooks /> },
          { path: "conta", element: <AverbadoraConta /> },
        ],
      },
    ],
  },

  // Prefeitura (portal read-only)
  {
    path: "/prefeitura",
    element: <RequireAuth role="prefeitura" />,
    children: [
      {
        element: <PrefeituraLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", element: <PrefeituraDashboard /> },
          { path: "servidores", element: <PrefeituraServidores /> },
          { path: "contratos", element: <PrefeituraContratos /> },
          { path: "convenios", element: <PrefeituraConvenios /> },
          { path: "folhas", element: <PrefeituraFolhas /> },
          { path: "tombamento", element: <PrefeituraTombamento /> },
          { path: "adf", element: <PrefeituraAdf /> },
          { path: "relatorios", element: <PrefeituraRelatorios /> },
          { path: "anuencia", element: <PrefeituraAnuencia /> },
          { path: "perfis", element: <PrefeituraPerfis /> },
          { path: "comunicados", element: <PrefeituraComunicados /> },
          { path: "materiais", element: <PrefeituraMateriais /> },
          { path: "conta", element: <PrefeituraConta /> },
        ],
      },
    ],
  },
]);
