package com.karishma.ai.data.repository

import com.karishma.ai.data.api.ApiClient
import com.karishma.ai.data.model.*
import java.util.UUID

class ChatRepository(private val prefs: PreferencesManager) {

    private val api get() = ApiClient.getService(prefs.customServerUrl)

    fun getLocalSessions(): List<ChatSession> {
        return prefs.getLocalChatSessions()
    }

    fun saveLocalSessions(sessions: List<ChatSession>) {
        prefs.saveLocalChatSessions(sessions)
    }

    suspend fun fetchCloudHistory(): Result<List<ChatSession>> {
        val user = prefs.loggedInUser
        if (user == null || prefs.isGuest) {
            return Result.success(getLocalSessions())
        }

        return try {
            val response = api.getHistory(mapOf("userId" to (user.id ?: user.email)))
            if (response.isSuccessful && response.body()?.sessions != null) {
                val cloudSessions = response.body()!!.sessions!!
                // Merge with local sessions
                saveLocalSessions(cloudSessions)
                Result.success(cloudSessions)
            } else {
                Result.success(getLocalSessions())
            }
        } catch (e: Exception) {
            Result.success(getLocalSessions())
        }
    }

    suspend fun saveSessionToCloud(session: ChatSession): Boolean {
        val user = prefs.loggedInUser
        if (user == null || prefs.isGuest) return true

        return try {
            val response = api.saveHistory(SaveHistoryRequest(userId = user.id ?: user.email, session = session))
            response.isSuccessful && response.body()?.success == true
        } catch (e: Exception) {
            false
        }
    }

    suspend fun deleteSessionFromCloud(sessionId: String): Boolean {
        val user = prefs.loggedInUser
        if (user == null || prefs.isGuest) return true

        return try {
            val response = api.deleteHistory(DeleteHistoryRequest(userId = user.id ?: user.email, sessionId = sessionId))
            response.isSuccessful && response.body()?.success == true
        } catch (e: Exception) {
            false
        }
    }

    suspend fun sendChatMessage(
        messageText: String,
        history: List<Message>,
        modelId: String,
        responseMode: String,
        attachments: List<Attachment>?
    ): Result<String> {
        return try {
            val user = prefs.loggedInUser
            val userName = user?.nickname?.takeIf { it.isNotBlank() }
                ?: user?.fullName?.takeIf { it.isNotBlank() }
                ?: prefs.userName.takeIf { it.isNotBlank() }

            // Map full conversational history to server API format
            val apiMessages = history.map { msg ->
                val apiRole = if (msg.role == "user") "user" else "assistant"
                ApiMessagePayload(role = apiRole, text = msg.text)
            }

            // Convert first image attachment if present
            val firstAttachment = attachments?.firstOrNull()
            val apiAttachment = firstAttachment?.let { att ->
                ApiAttachmentPayload(
                    name = att.name,
                    type = att.type,
                    dataUrl = att.url,
                    size = att.size,
                    isImage = att.type.startsWith("image/") || att.type == "image" || att.url.startsWith("data:image/")
                )
            }

            val request = ChatApiRequest(
                messages = apiMessages,
                model = modelId,
                responseMode = responseMode,
                userName = userName,
                attachment = apiAttachment
            )

            val response = api.sendMessage(request)
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val reply = body.text ?: body.response
                if (!reply.isNullOrBlank()) {
                    Result.success(reply)
                } else if (!body.error.isNullOrBlank()) {
                    Result.failure(Exception(body.error))
                } else {
                    Result.success("I am here for you! What would you like to talk about next?")
                }
            } else {
                val errorBodyStr = response.errorBody()?.string()
                val parsedError = try {
                    val gson = com.google.gson.Gson()
                    val errorJson = gson.fromJson(errorBodyStr, Map::class.java)
                    errorJson["error"]?.toString() ?: errorBodyStr
                } catch (e: Exception) {
                    errorBodyStr
                } ?: "Failed to receive response from AI."

                Result.failure(Exception(parsedError))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
