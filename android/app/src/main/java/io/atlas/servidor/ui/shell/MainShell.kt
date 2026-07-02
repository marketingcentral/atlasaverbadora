package io.atlas.servidor.ui.shell

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.HourglassTop
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.foundation.layout.padding
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.sp
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.lifecycle.viewmodel.compose.viewModel
import io.atlas.servidor.ui.analise.EmAnaliseScreen
import io.atlas.servidor.ui.conta.ContaScreen
import io.atlas.servidor.ui.contratos.ContratosScreen
import io.atlas.servidor.ui.inicio.InicioScreen
import io.atlas.servidor.ui.navigation.Routes
import io.atlas.servidor.ui.simular.SimularScreen
import io.atlas.servidor.ui.theme.Fundo
import io.atlas.servidor.ui.theme.InkMuted
import io.atlas.servidor.ui.theme.Superficie
import io.atlas.servidor.ui.theme.Verde

private data class Tab(val route: String, val label: String, val icon: ImageVector)

private val tabs = listOf(
    Tab(Routes.TAB_INICIO, "Início", Icons.Filled.Home),
    Tab(Routes.TAB_SIMULAR, "Simular", Icons.Filled.Tune),
    Tab(Routes.TAB_ANALISE, "Em análise", Icons.Filled.HourglassTop),
    Tab(Routes.TAB_CONTRATOS, "Contratos", Icons.AutoMirrored.Filled.ReceiptLong),
    Tab(Routes.TAB_CONTA, "Conta", Icons.Filled.Person),
)

@Composable
fun MainShell(
    onSwitchMatricula: () -> Unit,
    onLoggedOut: () -> Unit,
    vm: HomeViewModel = viewModel(),
) {
    val innerNav = rememberNavController()

    fun goTab(route: String) {
        innerNav.navigate(route) {
            popUpTo(innerNav.graph.findStartDestination().id) { saveState = true }
            launchSingleTop = true
            restoreState = true
        }
    }

    Scaffold(
        containerColor = Fundo,
        bottomBar = {
            val backStack by innerNav.currentBackStackEntryAsState()
            val current = backStack?.destination
            NavigationBar(containerColor = Superficie) {
                tabs.forEach { tab ->
                    val selected = current?.hierarchy?.any { it.route == tab.route } == true
                    NavigationBarItem(
                        selected = selected,
                        onClick = { goTab(tab.route) },
                        icon = { Icon(tab.icon, contentDescription = tab.label) },
                        label = { Text(tab.label, fontSize = 10.sp, textAlign = TextAlign.Center) },
                        alwaysShowLabel = true,
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = Verde,
                            selectedTextColor = Verde,
                            indicatorColor = Fundo,
                            unselectedIconColor = InkMuted,
                            unselectedTextColor = InkMuted,
                        ),
                    )
                }
            }
        },
    ) { padding ->
        NavHost(
            navController = innerNav,
            startDestination = Routes.TAB_INICIO,
            modifier = Modifier.padding(padding),
        ) {
            composable(Routes.TAB_INICIO) {
                InicioScreen(
                    vm = vm,
                    onOpenSimular = { goTab(Routes.TAB_SIMULAR) },
                    onOpenAnalise = { goTab(Routes.TAB_ANALISE) },
                )
            }
            composable(Routes.TAB_SIMULAR) {
                SimularScreen(onSolicitado = { goTab(Routes.TAB_ANALISE) })
            }
            composable(Routes.TAB_ANALISE) {
                EmAnaliseScreen()
            }
            composable(Routes.TAB_CONTRATOS) {
                ContratosScreen(vm = vm)
            }
            composable(Routes.TAB_CONTA) {
                ContaScreen(
                    vm = vm,
                    onSwitchMatricula = onSwitchMatricula,
                    onLoggedOut = { vm.logout(onLoggedOut) },
                )
            }
        }
    }
}
