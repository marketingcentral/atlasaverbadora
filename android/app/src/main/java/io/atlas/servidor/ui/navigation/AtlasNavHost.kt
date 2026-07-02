package io.atlas.servidor.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import io.atlas.servidor.ui.auth.LoginScreen
import io.atlas.servidor.ui.auth.PrimeiroAcessoScreen
import io.atlas.servidor.ui.margem.MargemTravadaScreen
import io.atlas.servidor.ui.matricula.SelecionarMatriculaScreen
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
            )
        }

        composable(Routes.PRIMEIRO_ACESSO) {
            PrimeiroAcessoScreen(onBack = { nav.popBackStack() })
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
                onOpenMargem = { nav.navigate(Routes.MARGEM_TRAVADA) },
                onSwitchMatricula = { nav.navigate(Routes.SELECIONAR_MATRICULA) },
                onLoggedOut = {
                    nav.navigate(Routes.LOGIN) {
                        popUpTo(Routes.MAIN) { inclusive = true }
                    }
                },
            )
        }

        composable(Routes.MARGEM_TRAVADA) {
            MargemTravadaScreen(onBack = { nav.popBackStack() })
        }
    }
}
