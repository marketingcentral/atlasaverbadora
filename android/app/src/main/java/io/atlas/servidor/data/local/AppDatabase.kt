package io.atlas.servidor.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [CacheEntity::class, ProposalRequestEntity::class],
    version = 1,
    exportSchema = false,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun cacheDao(): CacheDao
    abstract fun proposalDao(): ProposalDao
}
