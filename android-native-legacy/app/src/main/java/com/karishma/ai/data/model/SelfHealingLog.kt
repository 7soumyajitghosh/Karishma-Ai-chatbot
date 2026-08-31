package com.karishma.ai.data.model

import com.google.gson.annotations.SerializedName

data class AuditLogEntry(
    @SerializedName("id") val id: String = "",
    @SerializedName("timestamp") val timestamp: String = "",
    @SerializedName("errorMessage") val errorMessage: String = "",
    @SerializedName("targetFile") val targetFile: String = "",
    @SerializedName("rootCause") val rootCause: String = "",
    @SerializedName("patchDescription") val patchDescription: String = "",
    @SerializedName("lintPassed") val lintPassed: Boolean = false,
    @SerializedName("buildPassed") val buildPassed: Boolean = false,
    @SerializedName("testPassed") val testPassed: Boolean = false,
    @SerializedName("success") val success: Boolean = false,
    @SerializedName("rolledBack") val rolledBack: Boolean = false
)

data class AuditLogResponse(
    @SerializedName("success") val success: Boolean = false,
    @SerializedName("history") val history: List<AuditLogEntry> = emptyList()
)

data class DiagnoseRequest(
    @SerializedName("errorMessage") val errorMessage: String,
    @SerializedName("failedCodeSnippet") val failedCodeSnippet: String? = null,
    @SerializedName("userApprovalForSecurityRules") val userApprovalForSecurityRules: Boolean = false
)

data class DiagnoseResponse(
    @SerializedName("success") val success: Boolean = false,
    @SerializedName("rootCause") val rootCause: String? = null,
    @SerializedName("patchDescription") val patchDescription: String? = null,
    @SerializedName("verified") val verified: Boolean = false,
    @SerializedName("auditLogId") val auditLogId: String? = null
)
