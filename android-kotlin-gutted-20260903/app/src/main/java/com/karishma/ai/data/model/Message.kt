package com.karishma.ai.data.model

import com.google.gson.annotations.SerializedName
import java.util.UUID

data class Attachment(
    @SerializedName("type") val type: String = "image", // "image" | "file" | "code"
    @SerializedName("name") val name: String = "",
    @SerializedName("url") val url: String = "", // base64 or url
    @SerializedName("size") val size: Long? = null
)

data class Message(
    @SerializedName("id") val id: String = UUID.randomUUID().toString(),
    @SerializedName("role") val role: String = "user", // "user" | "model" | "assistant" | "system"
    @SerializedName("text") val text: String = "",
    @SerializedName("timestamp") val timestamp: Long = System.currentTimeMillis(),
    @SerializedName("model") val model: String? = null,
    @SerializedName("attachments") val attachments: List<Attachment>? = null,
    @SerializedName("isEncrypted") val isEncrypted: Boolean = false,
    @SerializedName("encryptedText") val encryptedText: String? = null,
    @SerializedName("feedback") val feedback: String? = null // "like" | "dislike"
)
