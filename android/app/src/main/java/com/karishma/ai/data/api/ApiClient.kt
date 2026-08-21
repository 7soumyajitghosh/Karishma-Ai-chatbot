package com.karishma.ai.data.api

import android.util.Log
import com.google.gson.Gson
import com.google.gson.JsonObject
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.ResponseBody.Companion.toResponseBody
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.io.IOException
import java.util.concurrent.TimeUnit

object ApiClient {
    private const val TAG = "KarishmaApiClient"

    // Default server deployment URL (Can be customized dynamically by user in settings)
    const val DEFAULT_BASE_URL = "https://ais-dev-wkabnda3ryphd3z3bmcemh-552976227454.asia-southeast1.run.app/"
    const val EMULATOR_LOCAL_URL = "http://10.0.2.2:3000/"

    private var currentBaseUrl: String = DEFAULT_BASE_URL
    private var apiService: KarishmaApiService? = null
    private val gson = Gson()

    /**
     * Interceptor to ensure proper headers (Accept: application/json)
     * and validate that server responses are JSON rather than HTML error pages.
     */
    private val headersAndResponseInterceptor = Interceptor { chain ->
        val originalRequest = chain.request()
        val requestWithHeaders = originalRequest.newBuilder()
            .header("Accept", "application/json")
            .header("Content-Type", "application/json")
            .build()

        val response = chain.proceed(requestWithHeaders)
        val responseBody = response.body

        if (responseBody != null) {
            val contentType = responseBody.contentType()?.toString()?.lowercase() ?: ""
            val rawBodyString = responseBody.string()

            Log.d(TAG, "HTTP ${response.code} [${requestWithHeaders.method}] ${requestWithHeaders.url}")
            Log.d(TAG, "Content-Type: $contentType | Raw Body Length: ${rawBodyString.length}")

            val trimmedBody = rawBodyString.trim()
            val isHtml = contentType.contains("text/html") ||
                    trimmedBody.startsWith("<!DOCTYPE", ignoreCase = true) ||
                    trimmedBody.startsWith("<html", ignoreCase = true) ||
                    trimmedBody.startsWith("<head", ignoreCase = true)

            if (isHtml) {
                val preview = if (trimmedBody.length > 150) trimmedBody.take(150) + "..." else trimmedBody
                Log.e(TAG, "Server returned HTML instead of JSON: $preview")
                
                val userFriendlyMessage = when (response.code) {
                    302, 301, 307 -> "Authentication sandbox redirect detected. In Android Emulator, set Server URL to $EMULATOR_LOCAL_URL in Settings."
                    404 -> "API endpoint not found (HTTP 404). Please verify backend server URL."
                    502, 503, 504 -> "Backend server temporarily unavailable (HTTP ${response.code})."
                    else -> "Server returned an unexpected HTML response (HTTP ${response.code})."
                }

                throw IOException(userFriendlyMessage)
            }

            // Recreate response with read body so downstream Retrofit/Gson receives it intact
            val newBody = rawBodyString.toResponseBody(responseBody.contentType())
            return@Interceptor response.newBuilder().body(newBody).build()
        }

        response
    }

    private val okHttpClient by lazy {
        val logging = HttpLoggingInterceptor { message ->
            Log.d(TAG, message)
        }.apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        OkHttpClient.Builder()
            .addInterceptor(headersAndResponseInterceptor)
            .addInterceptor(logging)
            .connectTimeout(60, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .build()
    }

    /**
     * Helper to safely extract error messages from Retrofit response bodies or exceptions.
     */
    fun parseErrorMessage(errorBodyString: String?, defaultMessage: String = "Operation failed. Please try again."): String {
        if (errorBodyString.isNullOrBlank()) return defaultMessage
        val trimmed = errorBodyString.trim()
        
        // If it starts with JSON bracket/brace, try to extract "error" or "message"
        if (trimmed.startsWith("{")) {
            return try {
                val jsonObject = gson.fromJson(trimmed, JsonObject::class.java)
                if (jsonObject.has("error") && !jsonObject.get("error").isJsonNull) {
                    jsonObject.get("error").asString
                } else if (jsonObject.has("message") && !jsonObject.get("message").isJsonNull) {
                    jsonObject.get("message").asString
                } else {
                    defaultMessage
                }
            } catch (e: Exception) {
                trimmed
            }
        }
        
        // If it's HTML, provide a clean friendly message instead of raw HTML
        if (trimmed.startsWith("<") || trimmed.contains("<!DOCTYPE", ignoreCase = true)) {
            return "Unable to connect to authentication server. Please check connection or Server URL in settings."
        }

        return trimmed
    }

    fun getService(customUrl: String? = null): KarishmaApiService {
        val targetUrl = if (!customUrl.isNullOrBlank()) {
            if (customUrl.endsWith("/")) customUrl else "$customUrl/"
        } else {
            currentBaseUrl
        }

        if (apiService == null || currentBaseUrl != targetUrl) {
            currentBaseUrl = targetUrl
            val retrofit = Retrofit.Builder()
                .baseUrl(currentBaseUrl)
                .client(okHttpClient)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
            apiService = retrofit.create(KarishmaApiService::class.java)
        }
        return apiService!!
    }

    fun setBaseUrl(url: String) {
        val formatted = if (url.endsWith("/")) url else "$url/"
        if (currentBaseUrl != formatted) {
            currentBaseUrl = formatted
            apiService = null // force recreate
        }
    }
}
