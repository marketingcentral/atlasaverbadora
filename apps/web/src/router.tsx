import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import { LoginPage } from "./routes/login";
import { ServidorDashboard } from "./routes/servidor/dashboard";
import { ServidorLayout } from "./routes/servidor/layout";
import { ServidorMarketplace } from "./routes/servidor/marketplace";
import { ServidorSimular } from "./routes/servidor/simular";
import { ServidorPropostas } from "./routes/servidor/propostas";
import { ServidorContratos } from "./routes/servidor/contratos";
import { ServidorConta } from "./routes/servidor/conta";
import { AverbadoraLayout } from "./routes/averbadora/layout";
import { AverbadoraDashboard } from "./routes/averbadora/dashboard";
import { AdminBancos } from "./routes/averbadora/bancos";
import { AdminPrefeituras } from "./routes/averbadora/prefeituras";
import { AdminConvenios } from "./routes/averbadora/convenios";
import { AdminServidores } from "./routes/averbadora/servidores";
import { AdminFolhas } from "./routes/averbadora/folhas";
import { AdminComunicados } from "./routes/averbadora/comunicados";
import { AdminHealth } from "./routes/averbadora/health";
import { AdminLogs } from "./routes/averbadora/logs";
import { AdminVitrine } from "./routes/averbadora/vitrine";
import { AverbadoraApiDocs } from "./routes/averbadora/api/docs";
import { AverbadoraApiTokens } from "./routes/averbadora/api/tokens";
import { AverbadoraApiWebhooks } from "./routes/averbadora/api/webhooks";
import { PrefeituraLayout } from "./routes/prefeitura/layout";
import { PrefeituraDashboard } from "./routes/prefeitura/dashboard";
import { PrefeituraServidores } from "./routes/prefeitura/servidores";
import { PrefeituraContratos } from "./routes/prefeitura/contratos";
import { PrefeituraConvenios } from "./routes/prefeitura/convenios";
import { PrefeituraFolhas } from "./routes/prefeitura/folhas";
import { PrefeituraComunicados } from "./routes/prefeitura/comunicados";
import { BancoLayout } from "./routes/banco/layout";
import { BancoVisaoGeral } from "./routes/banco/visao-geral";
import { BancoMargemContratacaoBusca } from "./routes/banco/margem-contratacao/index";
import { BancoMargemContratacaoFicha } from "./routes/banco/margem-contratacao/ficha";
import { OperacaoForm } from "./routes/banco/margem-contratacao/OperacaoForm";
import { BancoGerenciadorContratos } from "./routes/banco/gerenciador-contratos/index";
import { BancoContratoDetalhe } from "./routes/banco/gerenciador-contratos/detalhe";
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

  // Servidor (marketplace completo)
  {
    path: "/servidor",
    element: <RequireAuth role="servidor" />,
    children: [
      {
        element: <ServidorLayout />,
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", element: <ServidorDashboard /> },
          { path: "marketplace", element: <ServidorMarketplace /> },
          { path: "simular", element: <ServidorSimular /> },
          { path: "propostas", element: <ServidorPropostas /> },
          { path: "contratos", element: <ServidorContratos /> },
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

          { path: "gerenciador-contratos", element: <BancoGerenciadorContratos /> },
          { path: "gerenciador-contratos/:adf", element: <BancoContratoDetalhe /> },

          { path: "relatorios/consignacoes", element: <BancoRelatorioConsignacoes /> },
          { path: "relatorios/gerador", element: <BancoRelatorioGerador /> },
          { path: "relatorios/faturamento", element: <BancoRelatorioFaturamento /> },
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
          { path: "servidores", element: <AdminServidores /> },
          { path: "folhas", element: <AdminFolhas /> },
          { path: "comunicados", element: <AdminComunicados /> },
          { path: "health", element: <AdminHealth /> },
          { path: "logs", element: <AdminLogs /> },
          { path: "vitrine", element: <AdminVitrine /> },
          { path: "api/docs", element: <AverbadoraApiDocs /> },
          { path: "api/tokens", element: <AverbadoraApiTokens /> },
          { path: "api/webhooks", element: <AverbadoraApiWebhooks /> },
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
          { path: "comunicados", element: <PrefeituraComunicados /> },
        ],
      },
    ],
  },
]);
