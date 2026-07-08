package io.atlas.servidor.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import io.atlas.servidor.ui.auth.EsqueciSenhaScreen
import io.atlas.servidor.ui.auth.LoginScreen
import io.atlas.servidor.ui.auth.PrimeiroAcessoScreen
import io.atlas.servidor.ui.matricula.SelecionarMatriculaScreen
import io.atlas.servidor.ui.portabilidade.PortabilidadeScreen
import io.atlas.servidor.ui.shell.MainShell

@Composable
fun AtlasNavHost(startDestination: String) {
    val nav = rememberNavController()

    NavHost(navController = nav, startDestination = startDestination) {

        composable(Routes.LOGIN) {
            LoginScreen(
                onLoggedIn = {
                    nav.navigate(Routes.SELECIONAR_MATRICULA) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                },
                onPrimeiroAcesso = { nav.navigate(Routes.PRIMEIRO_ACESSO) },
                onEsqueciSenha = { nav.navigate(Routes.ESQUECI_SENHA) },
            )
        }

        composable(Routes.PRIMEIRO_ACESSO) {
            PrimeiroAcessoScreen(onBack = { nav.popBackStack() })
        }

        composable(Routes.ESQUECI_SENHA) {
            EsqueciSenhaScreen(onBack = { nav.popBackStack() })
        }

        composable(Routes.SELECIONAR_MATRICULA) {
            SelecionarMatriculaScreen(
                onContinue = {
                    nav.navigate(Routes.MAIN) {
                        popUpTo(Routes.SELECIONAR_MATRICULA) { inclusive = true }
                    }
                },
                onBack = { nav.popBackStack() },
            )
        }

        composable(Routes.MAIN) {
            MainShell(
                onSwitchMatricula = { nav.navigate(Routes.SELECIONAR_MATRICULA) },
                onOpenPortabilidade = { nav.navigate(Routes.PORTABILIDADE) },
                onLoggedOut = {
                    nav.navigate(Routes.LOGIN) {
                        popUpTo(Routes.MAIN) { inclusive = true }
                    }
                },
            )
        }

        composable(Routes.PORTABILIDADE) {
            PortabilidadeScreen(
                onBack = { nav.popBackStack() },
                onSolicitado = { nav.popBackStack() },
            )
        }
    }
}
