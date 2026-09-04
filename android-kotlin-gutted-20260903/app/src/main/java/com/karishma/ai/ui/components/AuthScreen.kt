package com.karishma.ai.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.karishma.ai.viewmodel.AuthViewModel

// Web App Exact Color Constants
val WebBgWarm = Color(0xFFFAF8F5)
val WebCardBg = Color(0xFFFFFFFF)
val WebBorderWarm = Color(0xFFEBE6DD)
val WebBorderSubtle = Color(0xFFDFD9D0)
val WebTextPrimary = Color(0xFF2C2A29)
val WebTextSecondary = Color(0xFF8C857E)
val WebTextMuted = Color(0xFF5C5753)
val WebAccentOrange = Color(0xFFD96B43)
val WebIconBoxBg = Color(0xFFF9F0EB)
val WebGuestIconBg = Color(0xFFFAF0E6)
val WebLockBg = Color(0xFFF3D9C9)

val WebErrorBg = Color(0xFFFFF1F2)
val WebErrorBorder = Color(0xFFFFE4E6)
val WebErrorText = Color(0xFFE11D48)

val WebSuccessBg = Color(0xFFECFDF5)
val WebSuccessBorder = Color(0xFFD1FAE5)
val WebSuccessText = Color(0xFF047857)

/**
 * Full-screen Auth/Login page matching the Web App's initial authentication interface.
 */
@Composable
fun AuthScreen(
    viewModel: AuthViewModel,
    onAuthSuccess: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(WebBgWarm)
            .statusBarsPadding()
            .navigationBarsPadding()
            .imePadding(),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            AuthCard(
                viewModel = viewModel,
                onDismiss = null,
                onAuthSuccess = onAuthSuccess
            )
        }
    }
}

/**
 * The unified authentication card matching the exact visual design of the Web App.
 */
@Composable
fun AuthCard(
    viewModel: AuthViewModel,
    onDismiss: (() -> Unit)? = null,
    onAuthSuccess: () -> Unit
) {
    val authView by viewModel.authView.collectAsState()
    val isLoading by viewModel.isLoading.collectAsState()
    val errorMessage by viewModel.errorMessage.collectAsState()
    val successMessage by viewModel.successMessage.collectAsState()
    val resendCooldown by viewModel.resendCooldown.collectAsState()
    val focusManager = LocalFocusManager.current

    // Local form states
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var fullName by remember { mutableStateOf("") }
    var nickname by remember { mutableStateOf("") }
    var otpInput by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var confirmVisible by remember { mutableStateOf(false) }

    var resetNewPass by remember { mutableStateOf("") }
    var resetConfirmPass by remember { mutableStateOf("") }
    var resetNewVisible by remember { mutableStateOf(false) }
    var resetConfirmVisible by remember { mutableStateOf(false) }

    Surface(
        shape = RoundedCornerShape(24.dp),
        color = WebCardBg,
        border = androidx.compose.foundation.BorderStroke(1.dp, WebBorderWarm),
        shadowElevation = 2.dp,
        modifier = Modifier
            .fillMaxWidth()
            .widthIn(max = 440.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp, vertical = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Optional top close button when shown inside a modal dialog
            if (onDismiss != null) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    IconButton(
                        onClick = onDismiss,
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close",
                            tint = WebTextSecondary,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }

            // Top Shield Logo (matches Web App: w-16 h-16 bg-[#F9F0EB] rounded-2xl with Shield icon)
            if (authView == "menu" || authView == "login" || authView == "create") {
                Box(
                    modifier = Modifier
                        .size(64.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .background(WebIconBoxBg),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Security,
                        contentDescription = "Security Shield",
                        tint = WebAccentOrange,
                        modifier = Modifier.size(32.dp)
                    )
                }

                Spacer(modifier = Modifier.height(18.dp))

                // Heading matching Web App: "Welcome, Friend! ✨"
                Text(
                    text = "Welcome, ${viewModel.userName.ifBlank { "Friend" }}! ✨",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    color = WebTextPrimary,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(4.dp))

                Text(
                    text = if (authView == "menu") "Choose how you'd like to continue" else "Sign in to access saved chats & synced profile",
                    fontSize = 13.sp,
                    color = WebTextSecondary,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(22.dp))
            }

            // Error Banner (matches Web App: bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold p-3 rounded-xl)
            errorMessage?.let { err ->
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = WebErrorBg,
                    border = androidx.compose.foundation.BorderStroke(1.dp, WebErrorBorder),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp)
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = err,
                            color = WebErrorText,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                        if (err.contains("no account found", ignoreCase = true) || err.contains("user not found", ignoreCase = true)) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = "Click here to Create an Account →",
                                color = WebAccentOrange,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.clickable {
                                    viewModel.setAuthView("create")
                                }
                            )
                        }
                    }
                }
            }

            // Success Banner (matches Web App: bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold p-3 rounded-xl)
            successMessage?.let { msg ->
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = WebSuccessBg,
                    border = androidx.compose.foundation.BorderStroke(1.dp, WebSuccessBorder),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = WebSuccessText,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = msg,
                            color = WebSuccessText,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // =========================================================================
            // VIEW: MENU
            // =========================================================================
            if (authView == "menu") {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // Option 1: Log In Card
                    MenuOptionCard(
                        icon = Icons.Default.ExitToApp,
                        iconBg = WebAccentOrange,
                        iconTint = Color.White,
                        title = "Log In",
                        subtitle = "Access your saved chats & synced profile",
                        bg = WebBgWarm,
                        border = WebBorderWarm,
                        onClick = { viewModel.setAuthView("login") }
                    )

                    // Option 2: Create Account Card
                    MenuOptionCard(
                        icon = Icons.Default.PersonAdd,
                        iconBg = WebTextPrimary,
                        iconTint = Color.White,
                        title = "Create Account",
                        subtitle = "Save history securely across devices",
                        bg = WebBgWarm,
                        border = WebBorderWarm,
                        onClick = { viewModel.setAuthView("create") }
                    )

                    // Option 3: Continue as Guest Card
                    MenuOptionCard(
                        icon = Icons.Default.Check,
                        iconBg = WebGuestIconBg,
                        iconTint = WebAccentOrange,
                        title = "Continue as Guest",
                        subtitle = "Start chatting now without an account",
                        bg = WebCardBg,
                        border = WebBorderSubtle,
                        onClick = {
                            viewModel.continueAsGuest {
                                onAuthSuccess()
                                onDismiss?.invoke()
                            }
                        }
                    )
                }
            }

            // =========================================================================
            // VIEW: LOGIN
            // =========================================================================
            if (authView == "login") {
                Column(modifier = Modifier.fillMaxWidth()) {
                    // Back to options
                    BackNavButton(label = "Back to Options") {
                        viewModel.setAuthView("menu")
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Email Field
                    FieldLabel(text = "EMAIL ADDRESS")
                    WebStyledTextField(
                        value = email,
                        onValueChange = { email = it },
                        placeholder = "you@example.com",
                        keyboardType = KeyboardType.Email,
                        imeAction = ImeAction.Next
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Password Field
                    FieldLabel(text = "PASSWORD")
                    WebStyledTextField(
                        value = password,
                        onValueChange = { password = it },
                        placeholder = "••••••••",
                        isPassword = true,
                        passwordVisible = passwordVisible,
                        onTogglePasswordVisibility = { passwordVisible = !passwordVisible },
                        imeAction = ImeAction.Done,
                        onImeAction = {
                            focusManager.clearFocus()
                            viewModel.login(email, password) {
                                onAuthSuccess()
                                onDismiss?.invoke()
                            }
                        }
                    )

                    // Forgot Password link
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 6.dp, bottom = 18.dp),
                        horizontalArrangement = Arrangement.End
                    ) {
                        Text(
                            text = "Forgot Password?",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = WebAccentOrange,
                            modifier = Modifier
                                .clickable {
                                    viewModel.resetEmail = email.trim()
                                    viewModel.setAuthView("forgot")
                                }
                                .padding(vertical = 2.dp)
                        )
                    }

                    // Log In Button
                    WebPrimaryButton(
                        text = if (isLoading) "Logging in..." else "Log In",
                        isLoading = isLoading,
                        onClick = {
                            focusManager.clearFocus()
                            viewModel.login(email, password) {
                                onAuthSuccess()
                                onDismiss?.invoke()
                            }
                        }
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Switch to Create Account footer
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Don't have an account? ",
                            fontSize = 12.sp,
                            color = WebTextSecondary
                        )
                        Text(
                            text = "Create Account",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = WebAccentOrange,
                            modifier = Modifier
                                .clickable { viewModel.setAuthView("create") }
                                .padding(vertical = 4.dp)
                        )
                    }
                }
            }

            // =========================================================================
            // VIEW: CREATE ACCOUNT
            // =========================================================================
            if (authView == "create") {
                Column(modifier = Modifier.fillMaxWidth()) {
                    BackNavButton(label = "Back to Options") {
                        viewModel.setAuthView("menu")
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Full Name
                    FieldLabel(text = "FULL NAME")
                    WebStyledTextField(
                        value = fullName,
                        onValueChange = { fullName = it },
                        placeholder = "e.g. John Doe",
                        imeAction = ImeAction.Next
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Nickname
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        FieldLabel(text = "NICKNAME ")
                        Text(
                            text = "(What Karishma calls you)",
                            fontSize = 11.sp,
                            color = WebTextSecondary
                        )
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    WebStyledTextField(
                        value = nickname,
                        onValueChange = { nickname = it },
                        placeholder = "e.g. Johnny",
                        imeAction = ImeAction.Next
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Email Address
                    FieldLabel(text = "EMAIL ADDRESS")
                    WebStyledTextField(
                        value = email,
                        onValueChange = { email = it },
                        placeholder = "you@example.com",
                        keyboardType = KeyboardType.Email,
                        imeAction = ImeAction.Next
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Password
                    FieldLabel(text = "PASSWORD")
                    WebStyledTextField(
                        value = password,
                        onValueChange = { password = it },
                        placeholder = "Min. 8 characters",
                        isPassword = true,
                        passwordVisible = passwordVisible,
                        onTogglePasswordVisibility = { passwordVisible = !passwordVisible },
                        imeAction = ImeAction.Next
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    // Confirm Password
                    FieldLabel(text = "CONFIRM PASSWORD")
                    WebStyledTextField(
                        value = confirmPassword,
                        onValueChange = { confirmPassword = it },
                        placeholder = "Min. 8 characters",
                        isPassword = true,
                        passwordVisible = confirmVisible,
                        onTogglePasswordVisibility = { confirmVisible = !confirmVisible },
                        imeAction = ImeAction.Done,
                        onImeAction = {
                            focusManager.clearFocus()
                            viewModel.sendRegistrationOtp(fullName, nickname, email, password, confirmPassword)
                        }
                    )

                    Spacer(modifier = Modifier.height(20.dp))

                    WebPrimaryButton(
                        text = if (isLoading) "Sending Code..." else "Create Account",
                        isLoading = isLoading,
                        onClick = {
                            focusManager.clearFocus()
                            viewModel.sendRegistrationOtp(fullName, nickname, email, password, confirmPassword)
                        }
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Switch to Log In footer
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Already have an account? ",
                            fontSize = 12.sp,
                            color = WebTextSecondary
                        )
                        Text(
                            text = "Sign In",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = WebAccentOrange,
                            modifier = Modifier
                                .clickable { viewModel.setAuthView("login") }
                                .padding(vertical = 4.dp)
                        )
                    }
                }
            }

            // =========================================================================
            // VIEW: VERIFY OTP (REGISTRATION)
            // =========================================================================
            if (authView == "verify") {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Start
                    ) {
                        BackNavButton(label = "Back to Registration") {
                            viewModel.setAuthView("create")
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = "Verify your email",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = WebTextPrimary,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = "Enter the 6-digit verification code sent to",
                        fontSize = 12.sp,
                        color = WebTextSecondary,
                        textAlign = TextAlign.Center
                    )
                    Text(
                        text = viewModel.pendingEmail,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = WebTextMuted,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(18.dp))

                    // Monospace OTP input
                    WebOtpInput(
                        value = otpInput,
                        onValueChange = { if (it.length <= 6) otpInput = it }
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // Resend Button
                    if (resendCooldown > 0) {
                        Text(
                            text = "Resend OTP in ${resendCooldown}s",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = WebTextSecondary
                        )
                    } else {
                        Text(
                            text = "Resend OTP",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = WebAccentOrange,
                            modifier = Modifier
                                .clickable {
                                    viewModel.sendRegistrationOtp(
                                        viewModel.pendingFullName,
                                        viewModel.pendingNickname,
                                        viewModel.pendingEmail,
                                        viewModel.pendingPassword,
                                        viewModel.pendingPassword
                                    )
                                }
                                .padding(vertical = 4.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    WebPrimaryButton(
                        text = if (isLoading) "Verifying..." else "Verify & Complete",
                        isLoading = isLoading,
                        enabled = otpInput.length == 6,
                        onClick = {
                            focusManager.clearFocus()
                            viewModel.verifyRegistrationOtp(otpInput) {
                                onAuthSuccess()
                                onDismiss?.invoke()
                            }
                        }
                    )
                }
            }

            // =========================================================================
            // VIEW: FORGOT PASSWORD
            // =========================================================================
            if (authView == "forgot") {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Start
                    ) {
                        BackNavButton(label = "Back to Login") {
                            viewModel.setAuthView("login")
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Lock Icon Box (matching Web App: w-12 h-12 bg-[#F3D9C9] rounded-xl with Lock icon in [#D96B43])
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(WebLockBg),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Lock,
                            contentDescription = "Lock",
                            tint = WebAccentOrange,
                            modifier = Modifier.size(24.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = "Reset Password",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = WebTextPrimary,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = "Enter your registered email address to receive a verification code.",
                        fontSize = 12.sp,
                        color = WebTextSecondary,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(18.dp))

                    Column(modifier = Modifier.fillMaxWidth()) {
                        FieldLabel(text = "REGISTERED EMAIL ADDRESS")
                        WebStyledTextField(
                            value = email,
                            onValueChange = { email = it },
                            placeholder = "you@example.com",
                            keyboardType = KeyboardType.Email,
                            imeAction = ImeAction.Done,
                            onImeAction = {
                                focusManager.clearFocus()
                                viewModel.forgotPassword(email)
                            }
                        )
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    WebPrimaryButton(
                        text = if (isLoading) "Sending Code..." else "Send OTP",
                        isLoading = isLoading,
                        onClick = {
                            focusManager.clearFocus()
                            viewModel.forgotPassword(email)
                        }
                    )
                }
            }

            // =========================================================================
            // VIEW: RESET OTP
            // =========================================================================
            if (authView == "reset_otp") {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.Start
                    ) {
                        BackNavButton(label = "Back") {
                            viewModel.setAuthView("forgot")
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = "Enter Verification Code",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = WebTextPrimary,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = "We've sent a 6-digit OTP to",
                        fontSize = 12.sp,
                        color = WebTextSecondary,
                        textAlign = TextAlign.Center
                    )
                    Text(
                        text = viewModel.resetEmail,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = WebTextMuted,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(18.dp))

                    FieldLabel(text = "ENTER 6-DIGIT OTP")
                    Spacer(modifier = Modifier.height(4.dp))

                    WebOtpInput(
                        value = otpInput,
                        onValueChange = { if (it.length <= 6) otpInput = it }
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        if (resendCooldown > 0) {
                            Text(
                                text = "Resend OTP in ${resendCooldown}s",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = WebTextSecondary
                            )
                        } else {
                            Text(
                                text = "Resend OTP",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = WebAccentOrange,
                                modifier = Modifier
                                    .clickable { viewModel.forgotPassword(viewModel.resetEmail) }
                                    .padding(vertical = 4.dp)
                            )
                        }

                        Text(
                            text = "  |  ",
                            color = WebTextSecondary,
                            fontSize = 12.sp
                        )

                        Text(
                            text = "Change Email",
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = WebTextSecondary,
                            modifier = Modifier
                                .clickable { viewModel.setAuthView("forgot") }
                                .padding(vertical = 4.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    WebPrimaryButton(
                        text = if (isLoading) "Verifying..." else "Verify OTP",
                        isLoading = isLoading,
                        enabled = otpInput.length == 6,
                        onClick = {
                            focusManager.clearFocus()
                            viewModel.verifyResetOtp(otpInput)
                        }
                    )
                }
            }

            // =========================================================================
            // VIEW: RESET PASS
            // =========================================================================
            if (authView == "reset_pass") {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "Create New Password",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = WebTextPrimary,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = "Set a new strong password for your account.",
                        fontSize = 12.sp,
                        color = WebTextSecondary,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(18.dp))

                    Column(modifier = Modifier.fillMaxWidth()) {
                        FieldLabel(text = "NEW PASSWORD")
                        WebStyledTextField(
                            value = resetNewPass,
                            onValueChange = { resetNewPass = it },
                            placeholder = "Min. 8 characters",
                            isPassword = true,
                            passwordVisible = resetNewVisible,
                            onTogglePasswordVisibility = { resetNewVisible = !resetNewVisible },
                            imeAction = ImeAction.Next
                        )

                        Spacer(modifier = Modifier.height(12.dp))

                        FieldLabel(text = "CONFIRM NEW PASSWORD")
                        WebStyledTextField(
                            value = resetConfirmPass,
                            onValueChange = { resetConfirmPass = it },
                            placeholder = "Confirm new password",
                            isPassword = true,
                            passwordVisible = resetConfirmVisible,
                            onTogglePasswordVisibility = { resetConfirmVisible = !resetConfirmVisible },
                            imeAction = ImeAction.Done,
                            onImeAction = {
                                focusManager.clearFocus()
                                viewModel.resetPassword(resetNewPass, resetConfirmPass)
                            }
                        )
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    WebPrimaryButton(
                        text = if (isLoading) "Resetting Password..." else "Set New Password",
                        isLoading = isLoading,
                        onClick = {
                            focusManager.clearFocus()
                            viewModel.resetPassword(resetNewPass, resetConfirmPass)
                        }
                    )
                }
            }

            // =========================================================================
            // VIEW: RESET SUCCESS
            // =========================================================================
            if (authView == "reset_success") {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Green Checkmark container matching Web App
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(WebSuccessBg)
                            .border(1.dp, WebSuccessBorder, RoundedCornerShape(16.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = "Success",
                            tint = WebSuccessText,
                            modifier = Modifier.size(32.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = "Password Reset Successful!",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = WebTextPrimary,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(6.dp))

                    Text(
                        text = "Your password has been changed successfully. You can now log in using your new password.",
                        fontSize = 12.sp,
                        color = WebTextSecondary,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 8.dp)
                    )

                    Spacer(modifier = Modifier.height(22.dp))

                    WebPrimaryButton(
                        text = "Return to Login",
                        onClick = {
                            viewModel.setAuthView("login")
                        }
                    )
                }
            }
        }
    }
}

/**
 * Option card in Menu View (Log In, Create Account, Continue as Guest).
 */
@Composable
private fun MenuOptionCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    iconBg: Color,
    iconTint: Color,
    title: String,
    subtitle: String,
    bg: Color,
    border: Color,
    onClick: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(16.dp),
        color = bg,
        border = androidx.compose.foundation.BorderStroke(1.dp, border),
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Icon container: 44.dp x 44.dp rounded-xl
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(iconBg),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = iconTint,
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.width(14.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = WebTextPrimary
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = subtitle,
                    fontSize = 11.sp,
                    color = WebTextSecondary,
                    lineHeight = 15.sp
                )
            }

            Icon(
                imageVector = Icons.Default.ChevronRight,
                contentDescription = null,
                tint = WebTextSecondary,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

/**
 * Back navigation button (← Back to Options / Back to Login).
 */
@Composable
private fun BackNavButton(
    label: String,
    onClick: () -> Unit
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .clickable { onClick() }
            .padding(vertical = 4.dp, horizontal = 2.dp)
    ) {
        Icon(
            imageVector = Icons.Default.ArrowBack,
            contentDescription = "Back",
            tint = WebTextSecondary,
            modifier = Modifier.size(14.dp)
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            text = label,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = WebTextSecondary
        )
    }
}

/**
 * Text field label (11px, bold, uppercase tracking wider).
 */
@Composable
private fun FieldLabel(text: String) {
    Text(
        text = text,
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        letterSpacing = 0.5.sp,
        color = WebTextSecondary,
        modifier = Modifier.padding(bottom = 6.dp)
    )
}

/**
 * Input field matching Web App: bg-[#FAF8F5], border-[#EBE6DD], rounded-xl.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WebStyledTextField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    isPassword: Boolean = false,
    passwordVisible: Boolean = false,
    onTogglePasswordVisibility: (() -> Unit)? = null,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Default,
    onImeAction: (() -> Unit)? = null
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        placeholder = {
            Text(
                text = placeholder,
                fontSize = 13.sp,
                color = WebTextSecondary.copy(alpha = 0.6f)
            )
        },
        visualTransformation = if (isPassword && !passwordVisible) PasswordVisualTransformation() else VisualTransformation.None,
        trailingIcon = if (isPassword && onTogglePasswordVisibility != null) {
            {
                IconButton(onClick = onTogglePasswordVisibility) {
                    Icon(
                        imageVector = if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                        contentDescription = "Toggle password visibility",
                        tint = WebTextSecondary,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        } else null,
        singleLine = true,
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = WebBgWarm,
            unfocusedContainerColor = WebBgWarm,
            disabledContainerColor = WebBgWarm,
            focusedBorderColor = WebAccentOrange,
            unfocusedBorderColor = WebBorderWarm,
            cursorColor = WebAccentOrange,
            focusedTextColor = WebTextPrimary,
            unfocusedTextColor = WebTextPrimary
        ),
        keyboardOptions = KeyboardOptions(
            keyboardType = keyboardType,
            imeAction = imeAction
        ),
        keyboardActions = KeyboardActions(
            onDone = { onImeAction?.invoke() },
            onNext = { onImeAction?.invoke() }
        ),
        modifier = Modifier.fillMaxWidth()
    )
}

/**
 * Monospace centered 6-digit OTP field.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun WebOtpInput(
    value: String,
    onValueChange: (String) -> Unit
) {
    OutlinedTextField(
        value = value,
        onValueChange = { input ->
            val digits = input.filter { it.isDigit() }
            if (digits.length <= 6) {
                onValueChange(digits)
            }
        },
        placeholder = {
            Text(
                text = "••••••",
                fontSize = 22.sp,
                letterSpacing = 8.sp,
                color = WebTextSecondary.copy(alpha = 0.4f),
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )
        },
        singleLine = true,
        textStyle = LocalTextStyle.current.copy(
            textAlign = TextAlign.Center,
            fontSize = 22.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 8.sp,
            fontFamily = FontFamily.Monospace,
            color = WebTextPrimary
        ),
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
            focusedContainerColor = WebBgWarm,
            unfocusedContainerColor = WebBgWarm,
            focusedBorderColor = WebAccentOrange,
            unfocusedBorderColor = WebBorderWarm,
            cursorColor = WebAccentOrange
        ),
        keyboardOptions = KeyboardOptions(
            keyboardType = KeyboardType.Number,
            imeAction = ImeAction.Done
        ),
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp)
    )
}

/**
 * Primary call-to-action button matching Web App: bg-[#D96B43], text-white, rounded-xl, py-3.5.
 */
@Composable
private fun WebPrimaryButton(
    text: String,
    isLoading: Boolean = false,
    enabled: Boolean = true,
    onClick: () -> Unit
) {
    Button(
        onClick = onClick,
        enabled = enabled && !isLoading,
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = WebAccentOrange,
            contentColor = Color.White,
            disabledContainerColor = WebAccentOrange.copy(alpha = 0.5f),
            disabledContentColor = Color.White.copy(alpha = 0.8f)
        ),
        elevation = ButtonDefaults.buttonElevation(
            defaultElevation = 1.dp,
            pressedElevation = 0.dp
        ),
        modifier = Modifier
            .fillMaxWidth()
            .height(48.dp)
    ) {
        if (isLoading) {
            CircularProgressIndicator(
                color = Color.White,
                strokeWidth = 2.5.dp,
                modifier = Modifier.size(20.dp)
            )
        } else {
            Text(
                text = text,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}
