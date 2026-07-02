package io.atlas.servidor.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface CacheDao {
    @Query("SELECT * FROM api_cache WHERE cacheKey = :key LIMIT 1")
    suspend fun get(key: String): CacheEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun put(entity: CacheEntity)

    @Query("DELETE FROM api_cache")
    suspend fun clear()
}

@Dao
interface ProposalDao {
    @Insert
    suspend fun insert(entity: ProposalRequestEntity): Long

    @Query("SELECT * FROM proposal_requests WHERE matricula = :matricula ORDER BY createdAt DESC")
    fun observeByMatricula(matricula: String): Flow<List<ProposalRequestEntity>>

    @Query("SELECT * FROM proposal_requests ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<ProposalRequestEntity>>

    @Query("DELETE FROM proposal_requests WHERE id = :id")
    suspend fun delete(id: Long)

    @Query("DELETE FROM proposal_requests")
    suspend fun clear()
}
