package io.atlas.servidor.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import io.atlas.servidor.core.ServiceLocator
import io.atlas.servidor.core.SessionWatcher
import io.atlas.servidor.ui.auth.EsqueciSenhaScreen
import io.atlas.servidor.ui.auth.LoginScreen
import io.atlas.servidor.ui.auth.PrimeiroAcessoScreen
import io.atlas.servidor.ui.matricula.SelecionarMatriculaScreen
import io.atlas.servidor.ui.portabilidade.PortabilidadeScreen
import io.atlas.servidor.ui.shell.MainShell

@Composable
fun AtlasNavHost(startDestination: String) {
    val nav = rememberNavController()

    // Inatividade (10 min): quando a sessão expira, faz logout e volta pro login. O flag
    // SessionWatcher.expired permanece true até a tela de login exibir o aviso e consumi-lo.
    LaunchedEffect(SessionWatcher.expired) {
        if (SessionWatcher.expired) {
            SessionWatcher.disarm()
            ServiceLocator.authRepository.logout()
            nav.navigate(Routes.LOGIN) {
                popUpTo(0) { inclusive = true } // limpa toda a backstack autenticada
            }
        }
    }

    NavHost(navController = nav, startDestination = startDestination) {

        composable(Routes.LOGIN) {
            LoginScreen(
                onLoggedIn = {
                    SessionWatcher.arm() // liga o vigia ao entrar na área autenticada
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
                    SessionWatcher.disarm() // logout manual — desliga o vigia de inatividade
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
