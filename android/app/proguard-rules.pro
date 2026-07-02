# Retrofit / OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn retrofit2.**
-keepattributes Signature, InnerClasses, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keep,allowobfuscation,allowshrinking interface retrofit2.Call
-keep,allowobfuscation,allowshrinking class retrofit2.Response

# Gson — keep DTO field names (reflection based)
-keepclassmembers,allowobfuscation class io.atlas.servidor.data.remote.dto.** {
    <fields>;
}
-keep class io.atlas.servidor.data.remote.dto.** { *; }

# Kotlin metadata
-keep class kotlin.Metadata { *; }
