package com.karishma.ai.data.model

import com.google.gson.annotations.SerializedName

data class User(
    @SerializedName("id") val id: String? = null,
    @SerializedName("email") val email: String = "",
    @SerializedName("fullName") val fullName: String? = null,
    @SerializedName("nickname") val nickname: String? = null,
    @SerializedName("name") val name: String? = null,
    @SerializedName("token") val token: String? = null
) {
    fun getDisplayName(): String {
        return nickname?.takeIf { it.isNotBlank() }
            ?: fullName?.takeIf { it.isNotBlank() }
            ?: name?.takeIf { it.isNotBlank() }
            ?: email.substringBefore("@")
    }
}
