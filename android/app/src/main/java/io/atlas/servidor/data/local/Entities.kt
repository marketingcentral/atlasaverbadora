package io.atlas.servidor.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

/** Raw JSON snapshot of an API response, for offline read-through caching. */
@Entity(tableName = "api_cache")
data class CacheEntity(
    @PrimaryKey val cacheKey: String,
    val json: String,
    val updatedAt: Long,
)

/**
 * A loan proposal the servidor requested from the app (simular → solicitar).
 * Stored locally because it represents the user's own pending action; it surfaces
 * on the "Em análise" screen until the backend proposal endpoint is wired.
 */
@Entity(tableName = "proposal_requests")
data class ProposalRequestEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val matricula: String,
    val bancoNome: String,
    val cidade: String,
    val valor: Double,
    val parcelas: Int,
    val parcelaMensal: Double,
    val taxaAm: Double,
    val createdAt: Long,
    val status: String,
)
