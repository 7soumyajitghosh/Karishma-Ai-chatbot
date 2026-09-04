package com.karishma.ai.data.model

import com.google.gson.annotations.SerializedName
import java.util.UUID

data class ChatSession(
    @SerializedName("id") val id: String = UUID.randomUUID().toString(),
    @SerializedName("title") val title: String = "New Conversation",
    @SerializedName("timestamp") val timestamp: Long = System.currentTimeMillis(),
    @SerializedName("messages") val messages: List<Message> = emptyList(),
    @SerializedName("isPinned") val isPinned: Boolean = false,
    @SerializedName("tags") val tags: List<String> = emptyList()
)
