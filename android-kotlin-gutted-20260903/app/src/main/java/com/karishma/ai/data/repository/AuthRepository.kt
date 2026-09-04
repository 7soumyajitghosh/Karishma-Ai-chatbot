package com.karishma.ai.data.repository

import com.karishma.ai.data.api.ApiClient
import com.karishma.ai.data.model.*

class AuthRepository(private val prefs: PreferencesManager) {

    private val api get() = ApiClient.getService(prefs.customServerUrl)

    suspend fun sendOtp(fullName: String, nickname: String, email: String, password: String): Result<AuthResponse> {
        return try {
            val response = api.sendOtp(SendOtpRequest(email = email, fullName = fullName, nickname = nickname, password = password))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                if (body.success) {
                    Result.success(body)
                } else {
                    val errMsg = body.displayError ?: "Failed to send OTP verification code."
                    Result.failure(Exception(errMsg))
                }
            } else {
                val rawError = response.errorBody()?.string()
                val parsed = ApiClient.parseErrorMessage(rawError, "Failed to send OTP verification code.")
                Result.failure(Exception(parsed))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun verifyOtp(fullName: String, nickname: String, email: String, password: String, otp: String): Result<AuthResponse> {
        return try {
            val response = api.verifyOtp(VerifyOtpRequest(
                email = email,
                otp = otp,
                fullName = fullName,
                nickname = nickname,
                password = password
            ))
            if (response.isSuccessful && response.body()?.success == true) {
                val auth = response.body()!!
                auth.user?.let {
                    prefs.loggedInUser = it
                    prefs.isGuest = false
                }
                Result.success(auth)
            } else if (response.body() != null) {
                val errMsg = response.body()!!.displayError ?: "Invalid OTP code."
                Result.failure(Exception(errMsg))
            } else {
                val rawError = response.errorBody()?.string()
                val parsed = ApiClient.parseErrorMessage(rawError, "Invalid OTP code.")
                Result.failure(Exception(parsed))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun login(email: String, password: String): Result<AuthResponse> {
        return try {
            val response = api.login(LoginRequest(email = email, password = password))
            if (response.isSuccessful && response.body()?.success == true) {
                val auth = response.body()!!
                auth.user?.let {
                    prefs.loggedInUser = it
                    prefs.isGuest = false
                }
                Result.success(auth)
            } else if (response.body() != null) {
                val errMsg = response.body()!!.displayError ?: "Invalid email or password."
                Result.failure(Exception(errMsg))
            } else {
                val rawError = response.errorBody()?.string()
                val parsed = ApiClient.parseErrorMessage(rawError, "Invalid email or password.")
                Result.failure(Exception(parsed))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun forgotPassword(email: String): Result<AuthResponse> {
        return try {
            val response = api.forgotPassword(ForgotPasswordRequest(email = email))
            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(response.body()!!)
            } else if (response.body() != null) {
                val errMsg = response.body()!!.displayError ?: "Failed to request password reset."
                Result.failure(Exception(errMsg))
            } else {
                val rawError = response.errorBody()?.string()
                val parsed = ApiClient.parseErrorMessage(rawError, "Failed to request password reset.")
                Result.failure(Exception(parsed))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun verifyResetOtp(email: String, otp: String): Result<AuthResponse> {
        return try {
            val response = api.verifyResetOtp(VerifyResetOtpRequest(email = email, otp = otp))
            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(response.body()!!)
            } else if (response.body() != null) {
                val errMsg = response.body()!!.displayError ?: "Invalid or expired OTP code."
                Result.failure(Exception(errMsg))
            } else {
                val rawError = response.errorBody()?.string()
                val parsed = ApiClient.parseErrorMessage(rawError, "Invalid or expired OTP code.")
                Result.failure(Exception(parsed))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun resetPassword(email: String, otp: String, newPass: String): Result<AuthResponse> {
        return try {
            val response = api.resetPassword(ResetPasswordRequest(email = email, otp = otp, newPassword = newPass))
            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(response.body()!!)
            } else if (response.body() != null) {
                val errMsg = response.body()!!.displayError ?: "Failed to reset password."
                Result.failure(Exception(errMsg))
            } else {
                val rawError = response.errorBody()?.string()
                val parsed = ApiClient.parseErrorMessage(rawError, "Failed to reset password.")
                Result.failure(Exception(parsed))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun updateProfile(fullName: String, nickname: String): Result<User> {
        val user = prefs.loggedInUser ?: return Result.failure(Exception("Not logged in"))
        return try {
            val response = api.updateProfile(UpdateProfileRequest(
                userId = user.id ?: user.email,
                fullName = fullName,
                nickname = nickname
            ))
            if (response.isSuccessful && response.body()?.user != null) {
                val updated = response.body()!!.user!!
                prefs.loggedInUser = updated
                Result.success(updated)
            } else {
                val rawError = response.errorBody()?.string()
                val parsed = ApiClient.parseErrorMessage(rawError, response.body()?.displayError ?: "Failed to update profile")
                Result.failure(Exception(parsed))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun changePassword(currentPass: String, newPass: String): Result<String> {
        val user = prefs.loggedInUser ?: return Result.failure(Exception("Not logged in"))
        return try {
            val response = api.changePassword(ChangePasswordRequest(
                userId = user.id ?: user.email,
                currentPassword = currentPass,
                newPassword = newPass
            ))
            if (response.isSuccessful && response.body()?.success == true) {
                Result.success(response.body()!!.message ?: "Password updated successfully")
            } else {
                val rawError = response.errorBody()?.string()
                val parsed = ApiClient.parseErrorMessage(rawError, response.body()?.displayError ?: "Failed to update password")
                Result.failure(Exception(parsed))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    fun continueAsGuest() {
        prefs.isGuest = true
        prefs.loggedInUser = null
    }

    fun logout() {
        prefs.clearUserData()
    }
}
