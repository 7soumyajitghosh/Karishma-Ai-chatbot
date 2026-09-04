package com.karishma.ai.data.repository

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.karishma.ai.data.model.ChatSession
import com.karishma.ai.data.model.User

class PreferencesManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("karishma_ai_prefs", Context.MODE_PRIVATE)
    private val gson = Gson()

    companion object {
        private const val KEY_LOGGED_IN_USER = "key_logged_in_user"
        private const val KEY_IS_GUEST = "key_is_guest"
        private const val KEY_THEME_MODE = "key_theme_mode" // "normal" | "light" | "dark"
        private const val KEY_ACTIVE_CHAT_ID = "key_active_chat_id"
        private const val KEY_SELECTED_MODEL = "key_selected_model"
        private const val KEY_RESPONSE_MODE = "key_response_mode" // "quick" | "detailed"
        private const val KEY_ENCRYPTION_ENABLED = "key_encryption_enabled"
        private const val KEY_CUSTOM_ENCRYPTION_KEY = "key_custom_encryption_key"
        private const val KEY_RETENTION_DAYS = "key_retention_days"
        private const val KEY_SAVED_CHATS_PREFIX = "saved_chats_"
        private const val KEY_CUSTOM_SERVER_URL = "key_custom_server_url"
        private const val KEY_USER_NAME = "key_user_name"
    }

    var userName: String
        get() = loggedInUser?.nickname?.takeIf { it.isNotBlank() }
            ?: loggedInUser?.fullName?.takeIf { it.isNotBlank() }
            ?: prefs.getString(KEY_USER_NAME, "Friend") ?: "Friend"
        set(value) = prefs.edit().putString(KEY_USER_NAME, value).apply()

    var loggedInUser: User?
        get() {
            val json = prefs.getString(KEY_LOGGED_IN_USER, null) ?: return null
            return try {
                gson.fromJson(json, User::class.java)
            } catch (e: Exception) {
                null
            }
        }
        set(value) {
            if (value == null) {
                prefs.edit().remove(KEY_LOGGED_IN_USER).apply()
            } else {
                prefs.edit().putString(KEY_LOGGED_IN_USER, gson.toJson(value)).apply()
            }
        }

    var isGuest: Boolean
        get() = prefs.getBoolean(KEY_IS_GUEST, false)
        set(value) = prefs.edit().putBoolean(KEY_IS_GUEST, value).apply()

    var themeMode: String
        get() = prefs.getString(KEY_THEME_MODE, "normal") ?: "normal"
        set(value) = prefs.edit().putString(KEY_THEME_MODE, value).apply()

    var activeChatId: String?
        get() = prefs.getString(KEY_ACTIVE_CHAT_ID, null)
        set(value) = prefs.edit().putString(KEY_ACTIVE_CHAT_ID, value).apply()

    var selectedModelId: String
        get() = prefs.getString(KEY_SELECTED_MODEL, "gemini-2.5-flash") ?: "gemini-2.5-flash"
        set(value) = prefs.edit().putString(KEY_SELECTED_MODEL, value).apply()

    var responseMode: String
        get() = prefs.getString(KEY_RESPONSE_MODE, "quick") ?: "quick"
        set(value) = prefs.edit().putString(KEY_RESPONSE_MODE, value).apply()

    var isEncryptionEnabled: Boolean
        get() = prefs.getBoolean(KEY_ENCRYPTION_ENABLED, true)
        set(value) = prefs.edit().putBoolean(KEY_ENCRYPTION_ENABLED, value).apply()

    var customEncryptionKey: String
        get() = prefs.getString(KEY_CUSTOM_ENCRYPTION_KEY, "karishma_default_sec_key_2026") ?: "karishma_default_sec_key_2026"
        set(value) = prefs.edit().putString(KEY_CUSTOM_ENCRYPTION_KEY, value).apply()

    var retentionDays: Int
        get() = prefs.getInt(KEY_RETENTION_DAYS, 30)
        set(value) = prefs.edit().putInt(KEY_RETENTION_DAYS, value).apply()

    var customServerUrl: String?
        get() = prefs.getString(KEY_CUSTOM_SERVER_URL, null)
        set(value) = prefs.edit().putString(KEY_CUSTOM_SERVER_URL, value).apply()

    fun getStorageKeyForUser(prefix: String = KEY_SAVED_CHATS_PREFIX): String {
        val user = loggedInUser
        return when {
            user != null -> "${prefix}user_${user.id ?: user.email}"
            isGuest -> "${prefix}guest"
            else -> "${prefix}anonymous"
        }
    }

    fun getLocalChatSessions(): List<ChatSession> {
        val key = getStorageKeyForUser()
        val json = prefs.getString(key, null) ?: return emptyList()
        return try {
            val type = object : TypeToken<List<ChatSession>>() {}.type
            gson.fromJson(json, type) ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun saveLocalChatSessions(sessions: List<ChatSession>) {
        val key = getStorageKeyForUser()
        val json = gson.toJson(sessions)
        prefs.edit().putString(key, json).apply()
    }

    fun clearUserData() {
        prefs.edit()
            .remove(KEY_LOGGED_IN_USER)
            .remove(KEY_IS_GUEST)
            .remove(KEY_ACTIVE_CHAT_ID)
            .apply()
    }
}
