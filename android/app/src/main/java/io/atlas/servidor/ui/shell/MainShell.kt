package io.atlas.servidor.ui.shell

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ReceiptLong
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MedicalServices
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material3.Icon
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import io.atlas.servidor.ui.conta.ContaScreen
import io.atlas.servidor.ui.contratos.ContratosScreen
import io.atlas.servidor.ui.portabilidade.PortabilidadeScreen
import io.atlas.servidor.ui.inicio.InicioScreen
import io.atlas.servidor.ui.navigation.Produtos
import io.atlas.servidor.ui.navigation.Routes
import io.atlas.servidor.ui.telemedicina.TelemedicinaScreen
import io.atlas.servidor.ui.simular.SimularScreen
import io.atlas.servidor.ui.theme.Divider
import io.atlas.servidor.ui.theme.Fundo
import io.atlas.servidor.ui.theme.Ink
import io.atlas.servidor.ui.theme.InkMuted
import io.atlas.servidor.ui.theme.Superficie
import io.atlas.servidor.ui.theme.Verde

/** `destaque` = item central (Portabilidade), desenhado como botão circular verde. */
private data class Tab(
    val route: String,
    val label: String,
    val icon: ImageVector,
    val destaque: Boolean = false,
)

private val tabs = listOf(
    Tab(Routes.TAB_INICIO, "Início", Icons.Filled.Home),
    Tab(Routes.TAB_CONTRATOS, "Contratos", Icons.AutoMirrored.Filled.ReceiptLong),
    Tab(Routes.TAB_PORTABILIDADE, "Portabilidade", Icons.Filled.SwapHoriz, destaque = true),
    Tab(Routes.TAB_TELEMEDICINA, "Benefícios", Icons.Filled.MedicalServices),
    Tab(Routes.TAB_CONTA, "Conta", Icons.Filled.Person),
)

@Composable
fun MainShell(
    onSwitchMatricula: () -> Unit,
    onOpenPortabilidade: () -> Unit,
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

    /** Abre Contratos já na aba "Em análise". */
    fun goAnalise() {
        vm.pedirAbaContratos(1)
        goTab(Routes.TAB_CONTRATOS)
    }

    Scaffold(
        containerColor = Fundo,
        bottomBar = {
            val backStack by innerNav.currentBackStackEntryAsState()
            val current = backStack?.destination
            BottomBar(
                isSelected = { route -> current?.hierarchy?.any { it.route == route } == true },
                onTab = { goTab(it) },
            )
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
                    onSimularProduto = { produto -> innerNav.navigate(Routes.simular(produto)) },
                    onOpenMarketplace = { goTab(Routes.TAB_PORTABILIDADE) },
                    onOpenAnalise = { goAnalise() },
                    onOpenPortabilidade = { goTab(Routes.TAB_PORTABILIDADE) },
                )
            }
            composable(
                route = Routes.SIMULAR_PRODUTO,
                arguments = listOf(navArgument(Routes.ARG_PRODUTO) { type = NavType.StringType }),
            ) { entry ->
                val produto = entry.arguments?.getString(Routes.ARG_PRODUTO) ?: Produtos.EMPRESTIMO
                SimularScreen(
                    produto = produto,
                    onSolicitado = { goAnalise() },
                    onVoltar = { innerNav.popBackStack() },
                )
            }
            composable(Routes.TAB_CONTRATOS) {
                ContratosScreen(vm = vm)
            }
            composable(Routes.TAB_PORTABILIDADE) {
                PortabilidadeScreen(
                    onBack = { goTab(Routes.TAB_INICIO) },
                    onSolicitado = { goAnalise() },
                )
            }
            composable(Routes.TAB_TELEMEDICINA) {
                TelemedicinaScreen(home = vm)
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

@Composable
private fun BottomBar(isSelected: (String) -> Boolean, onTab: (String) -> Unit) {
    Surface(color = Superficie, shadowElevation = 12.dp) {
        Column {
            Box(Modifier.fillMaxWidth().height(1.dp).background(Divider))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .height(76.dp)
                    .padding(horizontal = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceEvenly,
            ) {
                tabs.forEach { tab ->
                    if (tab.destaque) {
                        DestaqueItem(tab, onClick = { onTab(tab.route) }, modifier = Modifier.weight(1f))
                    } else {
                        NavItem(tab, selected = isSelected(tab.route), onClick = { onTab(tab.route) }, modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

@Composable
private fun NavItem(tab: Tab, selected: Boolean, onClick: () -> Unit, modifier: Modifier) {
    val tint = if (selected) Ink else InkMuted
    Column(
        modifier = modifier.clickableSemRipple(onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Icon(tab.icon, contentDescription = tab.label, tint = tint, modifier = Modifier.size(24.dp))
        Spacer(Modifier.height(4.dp))
        Text(
            tab.label,
            color = tint,
            fontSize = 10.sp,
            fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
            maxLines = 1,
            textAlign = TextAlign.Center,
        )
    }
}

/** Marketplace: círculo verde no centro — o item mais visível da barra. */
@Composable
private fun DestaqueItem(tab: Tab, onClick: () -> Unit, modifier: Modifier) {
    Column(
        modifier = modifier.clickableSemRipple(onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            modifier = Modifier.size(50.dp).clip(CircleShape).background(Verde),
            contentAlignment = Alignment.Center,
        ) {
            Icon(tab.icon, contentDescription = tab.label, tint = Superficie, modifier = Modifier.size(26.dp))
        }
        Spacer(Modifier.height(4.dp))
        Text(
            tab.label,
            color = Verde,
            fontSize = 10.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
            textAlign = TextAlign.Center,
        )
    }
}

/** Toque sem o ripple retangular, que ficaria feio sobre os itens da barra. */
@Composable
private fun Modifier.clickableSemRipple(onClick: () -> Unit): Modifier {
    val interaction = remember { MutableInteractionSource() }
    return this.clickable(interactionSource = interaction, indication = null, onClick = onClick)
}
