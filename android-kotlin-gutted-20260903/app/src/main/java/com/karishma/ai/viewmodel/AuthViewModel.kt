package com.karishma.ai.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.karishma.ai.data.model.User
import com.karishma.ai.data.repository.AuthRepository
import com.karishma.ai.data.repository.PreferencesManager
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class AuthViewModel(application: Application) : AndroidViewModel(application) {

    private val prefs = PreferencesManager(application)
    private val repository = AuthRepository(prefs)

    private val _currentUser = MutableStateFlow<User?>(prefs.loggedInUser)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    val userName: String
        get() = prefs.userName

    private val _isGuest = MutableStateFlow(prefs.isGuest)
    val isGuest: StateFlow<Boolean> = _isGuest.asStateFlow()

    private val _authView = MutableStateFlow("menu") // "menu" | "login" | "create" | "verify" | "forgot" | "reset_otp" | "reset_pass" | "reset_success"
    val authView: StateFlow<String> = _authView.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    private val _successMessage = MutableStateFlow<String?>(null)
    val successMessage: StateFlow<String?> = _successMessage.asStateFlow()

    private val _resendCooldown = MutableStateFlow(0)
    val resendCooldown: StateFlow<Int> = _resendCooldown.asStateFlow()

    private var countdownJob: Job? = null

    // Pending registration state for OTP verification
    var pendingFullName = ""
    var pendingNickname = ""
    var pendingEmail = ""
    var pendingPassword = ""

    // Pending password reset state
    var resetEmail = ""
    var resetOtp = ""

    fun setAuthView(view: String) {
        _authView.value = view
        _errorMessage.value = null
        _successMessage.value = null
    }

    fun startCooldown(seconds: Int = 60) {
        countdownJob?.cancel()
        _resendCooldown.value = seconds
        countdownJob = viewModelScope.launch {
            while (_resendCooldown.value > 0) {
                delay(1000)
                _resendCooldown.value -= 1
            }
        }
    }

    fun login(email: String, pass: String, onSuccess: () -> Unit) {
        if (email.isBlank() || pass.isBlank()) {
            _errorMessage.value = "Please enter email and password."
            return
        }
        _isLoading.value = true
        _errorMessage.value = null
        viewModelScope.launch {
            val result = repository.login(email.trim(), pass)
            _isLoading.value = false
            result.onSuccess { auth ->
                _currentUser.value = auth.user
                _isGuest.value = false
                onSuccess()
            }.onFailure { err ->
                _errorMessage.value = err.message ?: "Invalid email or password."
            }
        }
    }

    fun sendRegistrationOtp(fullName: String, nickname: String, email: String, pass: String, confirmPass: String) {
        if (fullName.isBlank() || email.isBlank() || pass.isBlank() || confirmPass.isBlank()) {
            _errorMessage.value = "Please fill in all required fields."
            return
        }
        if (pass != confirmPass) {
            _errorMessage.value = "Passwords do not match."
            return
        }
        if (pass.length < 8) {
            _errorMessage.value = "Password must be at least 8 characters long."
            return
        }

        val allowedDomains = listOf(
            "gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com", "proton.me", "protonmail.com"
        )
        val emailDomain = email.trim().substringAfter("@", "").lowercase()
        if (emailDomain.isEmpty() || !allowedDomains.contains(emailDomain)) {
            _errorMessage.value = "Please use a supported email provider: Gmail, Outlook, Yahoo, iCloud, or Proton Mail."
            return
        }

        pendingFullName = fullName.trim()
        pendingNickname = nickname.trim()
        pendingEmail = email.trim()
        pendingPassword = pass

        _isLoading.value = true
        _errorMessage.value = null
        viewModelScope.launch {
            val result = repository.sendOtp(pendingFullName, pendingNickname, pendingEmail, pendingPassword)
            _isLoading.value = false
            result.onSuccess {
                _authView.value = "verify"
                _successMessage.value = "Verification code sent to $pendingEmail"
                startCooldown(60)
            }.onFailure { err ->
                _errorMessage.value = err.message ?: "Failed to send verification email."
            }
        }
    }

    fun verifyRegistrationOtp(otp: String, onSuccess: () -> Unit) {
        if (otp.length != 6) {
            _errorMessage.value = "Please enter a valid 6-digit OTP code."
            return
        }
        _isLoading.value = true
        _errorMessage.value = null
        viewModelScope.launch {
            val result = repository.verifyOtp(pendingFullName, pendingNickname, pendingEmail, pendingPassword, otp)
            _isLoading.value = false
            result.onSuccess { auth ->
                _currentUser.value = auth.user
                _isGuest.value = false
                onSuccess()
            }.onFailure { err ->
                _errorMessage.value = err.message ?: "Invalid or expired OTP code."
            }
        }
    }

    fun forgotPassword(email: String) {
        if (email.isBlank()) {
            _errorMessage.value = "Please enter your registered email address."
            return
        }
        resetEmail = email.trim()
        _isLoading.value = true
        _errorMessage.value = null
        viewModelScope.launch {
            val result = repository.forgotPassword(resetEmail)
            _isLoading.value = false
            result.onSuccess {
                _authView.value = "reset_otp"
                _successMessage.value = "Password reset code sent to $resetEmail"
                startCooldown(60)
            }.onFailure { err ->
                _errorMessage.value = err.message ?: "Failed to send password reset code."
            }
        }
    }

    fun verifyResetOtp(otp: String) {
        if (otp.length != 6) {
            _errorMessage.value = "Please enter the 6-digit reset code."
            return
        }
        resetOtp = otp.trim()
        _isLoading.value = true
        _errorMessage.value = null
        viewModelScope.launch {
            val result = repository.verifyResetOtp(resetEmail, resetOtp)
            _isLoading.value = false
            result.onSuccess {
                _authView.value = "reset_pass"
            }.onFailure { err ->
                _errorMessage.value = err.message ?: "Invalid reset code."
            }
        }
    }

    fun resetPassword(newPass: String, confirmPass: String) {
        if (newPass.length < 8) {
            _errorMessage.value = "Password must be at least 8 characters long."
            return
        }
        if (newPass != confirmPass) {
            _errorMessage.value = "Passwords do not match."
            return
        }
        _isLoading.value = true
        _errorMessage.value = null
        viewModelScope.launch {
            val result = repository.resetPassword(resetEmail, resetOtp, newPass)
            _isLoading.value = false
            result.onSuccess {
                _authView.value = "reset_success"
            }.onFailure { err ->
                _errorMessage.value = err.message ?: "Failed to reset password."
            }
        }
    }

    fun updateProfile(fullName: String, nickname: String) {
        _isLoading.value = true
        _errorMessage.value = null
        viewModelScope.launch {
            val result = repository.updateProfile(fullName.trim(), nickname.trim())
            _isLoading.value = false
            result.onSuccess { updated ->
                _currentUser.value = updated
                _successMessage.value = "Profile updated successfully."
            }.onFailure { err ->
                _errorMessage.value = err.message ?: "Failed to update profile."
            }
        }
    }

    fun changePassword(currentPass: String, newPass: String, confirmPass: String, onDone: () -> Unit) {
        if (newPass.length < 8) {
            _errorMessage.value = "New password must be at least 8 characters long."
            return
        }
        if (newPass != confirmPass) {
            _errorMessage.value = "New passwords do not match."
            return
        }
        _isLoading.value = true
        _errorMessage.value = null
        viewModelScope.launch {
            val result = repository.changePassword(currentPass, newPass)
            _isLoading.value = false
            result.onSuccess { msg ->
                _successMessage.value = msg
                onDone()
            }.onFailure { err ->
                _errorMessage.value = err.message ?: "Failed to change password."
            }
        }
    }

    fun continueAsGuest(onSuccess: () -> Unit) {
        repository.continueAsGuest()
        _currentUser.value = null
        _isGuest.value = true
        onSuccess()
    }

    fun logout(onDone: () -> Unit) {
        repository.logout()
        _currentUser.value = null
        _isGuest.value = false
        onDone()
    }
}
