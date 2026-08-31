package com.karishma.ai.data.api

import com.karishma.ai.data.model.*
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface KarishmaApiService {

    @GET("api/health")
    suspend fun checkHealth(): Response<Map<String, String>>

    @POST("api/chat")
    suspend fun sendMessage(@Body request: ChatApiRequest): Response<ChatApiResponse>

    @POST("api/auth/send-otp")
    suspend fun sendOtp(@Body request: SendOtpRequest): Response<AuthResponse>

    @POST("api/auth/verify-otp")
    suspend fun verifyOtp(@Body request: VerifyOtpRequest): Response<AuthResponse>

    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<AuthResponse>

    @POST("api/auth/forgot-password")
    suspend fun forgotPassword(@Body request: ForgotPasswordRequest): Response<AuthResponse>

    @POST("api/auth/verify-reset-otp")
    suspend fun verifyResetOtp(@Body request: VerifyResetOtpRequest): Response<AuthResponse>

    @POST("api/auth/reset-password")
    suspend fun resetPassword(@Body request: ResetPasswordRequest): Response<AuthResponse>

    @POST("api/auth/update-profile")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): Response<AuthResponse>

    @POST("api/auth/change-password")
    suspend fun changePassword(@Body request: ChangePasswordRequest): Response<AuthResponse>

    @POST("api/history")
    suspend fun getHistory(@Body request: Map<String, String>): Response<HistoryResponse>

    @POST("api/history/save")
    suspend fun saveHistory(@Body request: SaveHistoryRequest): Response<HistoryResponse>

    @POST("api/history/delete")
    suspend fun deleteHistory(@Body request: DeleteHistoryRequest): Response<HistoryResponse>

    @POST("api/tts")
    suspend fun getTtsAudio(@Body request: TtsRequest): Response<TtsResponse>

    @GET("api/self-repair/audit-log")
    suspend fun getAuditLogs(): Response<AuditLogResponse>

    @POST("api/self-repair/diagnose-and-fix")
    suspend fun triggerDiagnosis(@Body request: DiagnoseRequest): Response<DiagnoseResponse>
}
