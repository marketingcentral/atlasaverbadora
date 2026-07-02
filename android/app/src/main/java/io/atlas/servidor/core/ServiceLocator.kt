package io.atlas.servidor.core

import android.content.Context
import androidx.room.Room
import com.google.gson.Gson
import io.atlas.servidor.BuildConfig
import io.atlas.servidor.data.local.AppDatabase
import io.atlas.servidor.data.local.TokenStore
import io.atlas.servidor.data.remote.ApiService
import io.atlas.servidor.data.remote.AuthApi
import io.atlas.servidor.data.remote.AuthInterceptor
import io.atlas.servidor.data.remote.TokenAuthenticator
import io.atlas.servidor.data.remote.dto.RefreshRequest
import io.atlas.servidor.data.repository.AuthRepository
import io.atlas.servidor.data.repository.ServidorRepository
import kotlinx.coroutines.runBlocking
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Lightweight manual dependency container. Avoids annotation-processor DI (Hilt) so the
 * project builds reliably from the command line; single source of wiring for the app graph.
 */
object ServiceLocator {

    private lateinit var appContext: Context

    fun init(context: Context) {
        appContext = context.applicationContext
    }

    val gson: Gson by lazy { Gson() }

    val tokenStore: TokenStore by lazy { TokenStore(appContext) }
    val appPrefs: AppPrefs by lazy { AppPrefs(appContext) }

    val db: AppDatabase by lazy {
        Room.databaseBuilder(appContext, AppDatabase::class.java, "atlas-servidor.db")
            .fallbackToDestructiveMigration()
            .build()
    }

    private val logging: HttpLoggingInterceptor by lazy {
        HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY
            else HttpLoggingInterceptor.Level.NONE
        }
    }

    // Bare client for login/refresh — no bearer, no auto-refresh (prevents loops).
    private val authClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .addInterceptor(logging)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    val authApi: AuthApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(authClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
            .create(AuthApi::class.java)
    }

    // Authenticated client — injects bearer + rotates the refresh token on 401.
    private val apiClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(tokenStore))
            .authenticator(
                TokenAuthenticator(tokenStore) { refreshToken ->
                    runBlocking {
                        try {
                            authApi.refresh(RefreshRequest(refreshToken))
                        } catch (e: Exception) {
                            null
                        }
                    }
                },
            )
            .addInterceptor(logging)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    val apiService: ApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(apiClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
            .create(ApiService::class.java)
    }

    val authRepository: AuthRepository by lazy {
        AuthRepository(authApi, apiService, tokenStore, db, appPrefs, gson)
    }
    val servidorRepository: ServidorRepository by lazy {
        ServidorRepository(apiService, db, gson, tokenStore)
    }
}
