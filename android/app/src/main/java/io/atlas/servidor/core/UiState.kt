package io.atlas.servidor.core

/** Generic screen state for one-shot loads. */
sealed interface UiState<out T> {
    data object Loading : UiState<Nothing>
    data class Success<T>(val data: T, val stale: Boolean = false) : UiState<T>
    data class Error(val message: String) : UiState<Nothing>
}

/** Result of a cacheable read: data plus whether it came from the offline cache. */
data class CachedData<T>(
    val data: T,
    val fromCache: Boolean = false,
    val note: String? = null,
)
