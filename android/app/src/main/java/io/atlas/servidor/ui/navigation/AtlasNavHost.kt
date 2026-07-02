package io.atlas.servidor.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import io.atlas.servidor.ui.analise.EmAnaliseScreen
import io.atlas.servidor.ui.auth.LoginScreen
import io.atlas.servidor.ui.auth.PrimeiroAcessoScreen
import io.atlas.servidor.ui.margem.MargemTravadaScreen
import io.atlas.servidor.ui.matricula.SelecionarMatriculaScreen
import io.atlas.servidor.ui.shell.MainShell
import io.atlas.servidor.ui.simular.SimularScreen

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
                onOpenSimular = { nav.navigate(Routes.SIMULAR) },
                onOpenAnalise = { nav.navigate(Routes.EM_ANALISE) },
                onOpenMargem = { nav.navigate(Routes.MARGEM_TRAVADA) },
                onSwitchMatricula = { nav.navigate(Routes.SELECIONAR_MATRICULA) },
                onLoggedOut = {
                    nav.navigate(Routes.LOGIN) {
                        popUpTo(Routes.MAIN) { inclusive = true }
                    }
                },
            )
        }

        composable(Routes.SIMULAR) {
            SimularScreen(
                onBack = { nav.popBackStack() },
                onSolicitado = {
                    nav.navigate(Routes.EM_ANALISE) {
                        popUpTo(Routes.MAIN)
                    }
                },
            )
        }

        composable(Routes.EM_ANALISE) {
            EmAnaliseScreen(onBack = { nav.popBackStack() })
        }

        composable(Routes.MARGEM_TRAVADA) {
            MargemTravadaScreen(onBack = { nav.popBackStack() })
        }
    }
}
