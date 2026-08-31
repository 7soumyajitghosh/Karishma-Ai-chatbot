package com.karishma.ai.data.model

import com.google.gson.annotations.SerializedName

data class SendOtpRequest(
    @SerializedName("email") val email: String,
    @SerializedName("fullName") val fullName: String? = null,
    @SerializedName("nickname") val nickname: String? = null,
    @SerializedName("password") val password: String? = null
)

data class VerifyOtpRequest(
    @SerializedName("email") val email: String,
    @SerializedName("otp") val otp: String,
    @SerializedName("fullName") val fullName: String? = null,
    @SerializedName("nickname") val nickname: String? = null,
    @SerializedName("password") val password: String? = null
)

data class LoginRequest(
    @SerializedName("email") val email: String,
    @SerializedName("password") val password: String
)

data class ForgotPasswordRequest(
    @SerializedName("email") val email: String
)

data class VerifyResetOtpRequest(
    @SerializedName("email") val email: String,
    @SerializedName("otp") val otp: String
)

data class ResetPasswordRequest(
    @SerializedName("email") val email: String,
    @SerializedName("otp") val otp: String,
    @SerializedName("newPassword") val newPassword: String
)

data class UpdateProfileRequest(
    @SerializedName("userId") val userId: String,
    @SerializedName("token") val token: String? = null,
    @SerializedName("fullName") val fullName: String? = null,
    @SerializedName("nickname") val nickname: String? = null
)

data class ChangePasswordRequest(
    @SerializedName("userId") val userId: String,
    @SerializedName("currentPassword") val currentPassword: String,
    @SerializedName("newPassword") val newPassword: String
)

data class AuthResponse(
    @SerializedName("success") val success: Boolean = false,
    @SerializedName("message") val message: String? = null,
    @SerializedName("error") val error: String? = null,
    @SerializedName("user") val user: User? = null,
    @SerializedName("token") val token: String? = null,
    @SerializedName("emailDelivered") val emailDelivered: Boolean = false
) {
    val displayError: String?
        get() = error ?: message
}

data class ApiMessagePayload(
    @SerializedName("role") val role: String, // "user" | "model" | "assistant"
    @SerializedName("text") val text: String
)

data class ApiAttachmentPayload(
    @SerializedName("name") val name: String = "",
    @SerializedName("type") val type: String = "image/jpeg",
    @SerializedName("dataUrl") val dataUrl: String = "",
    @SerializedName("size") val size: Long? = null,
    @SerializedName("isImage") val isImage: Boolean = true
)

data class GeneratedImagePayload(
    @SerializedName("url") val url: String = "",
    @SerializedName("prompt") val prompt: String = ""
)

data class ChatApiRequest(
    @SerializedName("messages") val messages: List<ApiMessagePayload> = emptyList(),
    @SerializedName("model") val model: String = "gemini-2.5-flash",
    @SerializedName("responseMode") val responseMode: String = "quick", // "quick" | "detailed"
    @SerializedName("userName") val userName: String? = null,
    @SerializedName("attachment") val attachment: ApiAttachmentPayload? = null
)

data class ChatApiResponse(
    @SerializedName("text") val text: String? = null,
    @SerializedName("response") val response: String? = null,
    @SerializedName("model") val model: String? = null,
    @SerializedName("error") val error: String? = null,
    @SerializedName("citations") val citations: List<Any>? = null,
    @SerializedName("generatedImage") val generatedImage: GeneratedImagePayload? = null
)

data class SaveHistoryRequest(
    @SerializedName("userId") val userId: String,
    @SerializedName("session") val session: ChatSession
)

data class DeleteHistoryRequest(
    @SerializedName("userId") val userId: String,
    @SerializedName("sessionId") val sessionId: String
)

data class HistoryResponse(
    @SerializedName("success") val success: Boolean = false,
    @SerializedName("sessions") val sessions: List<ChatSession>? = null,
    @SerializedName("message") val message: String? = null
)

data class TtsRequest(
    @SerializedName("text") val text: String,
    @SerializedName("voice") val voice: String? = "en-US-Standard-A"
)

data class TtsResponse(
    @SerializedName("audioContent") val audioContent: String? = null, // base64 MP3
    @SerializedName("error") val error: String? = null
)
