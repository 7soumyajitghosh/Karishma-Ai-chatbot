package com.karishma.ai

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Base64
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.karishma.ai.data.model.Attachment
import com.karishma.ai.ui.components.*
import com.karishma.ai.ui.theme.*
import com.karishma.ai.viewmodel.AuthViewModel
import com.karishma.ai.viewmodel.ChatViewModel
import com.karishma.ai.viewmodel.SettingsViewModel
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream
import java.util.*

class MainActivity : ComponentActivity() {

    private val chatViewModel: ChatViewModel by viewModels()
    private val authViewModel: AuthViewModel by viewModels()
    private val settingsViewModel: SettingsViewModel by viewModels()

    private var speechRecognizer: SpeechRecognizer? = null
    private var isSpeechListening = mutableStateOf(false)
    private var voiceInputText = mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        initSpeechRecognizer()

        setContent {
            val themeMode by settingsViewModel.themeMode.collectAsState()
            val currentUser by authViewModel.currentUser.collectAsState()
            val isGuest by authViewModel.isGuest.collectAsState()

            KarishmaAITheme(themeMode = themeMode) {
                if (currentUser == null && !isGuest) {
                    AuthScreen(
                        viewModel = authViewModel,
                        onAuthSuccess = {
                            chatViewModel.loadSessions()
                        }
                    )
                } else {
                    MainScreen(
                        chatViewModel = chatViewModel,
                        authViewModel = authViewModel,
                        settingsViewModel = settingsViewModel,
                        isListening = isSpeechListening.value,
                        recognizedVoiceText = voiceInputText.value,
                        onVoiceTextConsumed = { voiceInputText.value = null },
                        onToggleVoiceInput = { toggleSpeechRecognition() }
                    )
                }
            }
        }
    }

    private fun initSpeechRecognizer() {
        if (SpeechRecognizer.isRecognitionAvailable(this)) {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this).apply {
                setRecognitionListener(object : RecognitionListener {
                    override fun onReadyForSpeech(params: Bundle?) {
                        isSpeechListening.value = true
                    }
                    override fun onBeginningOfSpeech() {}
                    override fun onRmsChanged(rmsdB: Float) {}
                    override fun onBufferReceived(buffer: ByteArray?) {}
                    override fun onEndOfSpeech() {
                        isSpeechListening.value = false
                    }
                    override fun onError(error: Int) {
                        isSpeechListening.value = false
                    }
                    override fun onResults(results: Bundle?) {
                        isSpeechListening.value = false
                        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        if (!matches.isNullOrEmpty()) {
                            voiceInputText.value = matches[0]
                        }
                    }
                    override fun onPartialResults(partialResults: Bundle?) {
                        val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        if (!matches.isNullOrEmpty()) {
                            voiceInputText.value = matches[0]
                        }
                    }
                    override fun onEvent(eventType: Int, params: Bundle?) {}
                })
            }
        }
    }

    private fun toggleSpeechRecognition() {
        if (isSpeechListening.value) {
            speechRecognizer?.stopListening()
            isSpeechListening.value = false
            return
        }

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
                putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak to Karishma...")
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            }
            try {
                speechRecognizer?.startListening(intent)
                isSpeechListening.value = true
            } catch (e: Exception) {
                isSpeechListening.value = false
                Toast.makeText(this, "Speech recognition unavailable", Toast.LENGTH_SHORT).show()
            }
        } else {
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), 101)
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 101) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                toggleSpeechRecognition()
            } else {
                Toast.makeText(this, "Microphone permission is required for voice input", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        speechRecognizer?.destroy()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    chatViewModel: ChatViewModel,
    authViewModel: AuthViewModel,
    settingsViewModel: SettingsViewModel,
    isListening: Boolean,
    recognizedVoiceText: String?,
    onVoiceTextConsumed: () -> Unit,
    onToggleVoiceInput: () -> Unit
) {
    val context = LocalContext.current
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val coroutineScope = rememberCoroutineScope()
    val listState = rememberLazyListState()

    val currentSession by chatViewModel.currentSession.collectAsState()
    val sessions by chatViewModel.sessions.collectAsState()
    val selectedModel by chatViewModel.selectedModel.collectAsState()
    val responseMode by chatViewModel.responseMode.collectAsState()
    val isLoading by chatViewModel.isLoading.collectAsState()
    val syncStatus by chatViewModel.syncStatus.collectAsState()
    val speakingMessageId by chatViewModel.speakingMessageId.collectAsState()
    val attachments by chatViewModel.attachments.collectAsState()
    val showCiphertext by chatViewModel.showCiphertext.collectAsState()

    val currentUser by authViewModel.currentUser.collectAsState()
    val isGuest by authViewModel.isGuest.collectAsState()

    var inputText by remember { mutableStateOf("") }
    var showModelSheet by remember { mutableStateOf(false) }
    var showAuthModal by remember { mutableStateOf(false) }
    var showSettingsModal by remember { mutableStateOf(false) }
    var showSelfHealingModal by remember { mutableStateOf(false) }
    var showProfileModal by remember { mutableStateOf(false) }
    var showChatHistoryScreen by remember { mutableStateOf(false) }

    // Update input text in real-time when voice recognition provides speech results
    LaunchedEffect(recognizedVoiceText) {
        recognizedVoiceText?.let { spoken ->
            if (spoken.isNotBlank()) {
                inputText = if (inputText.isBlank()) spoken else "$inputText $spoken"
                onVoiceTextConsumed()
            }
        }
    }

    // Scroll to bottom when new messages arrive
    LaunchedEffect(currentSession?.messages?.size) {
        currentSession?.messages?.let {
            if (it.isNotEmpty()) {
                listState.animateScrollToItem(it.size - 1)
            }
        }
    }

    // Image Picker Launcher
    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        uri?.let {
            try {
                val inputStream = context.contentResolver.openInputStream(it)
                val bitmap = BitmapFactory.decodeStream(inputStream)
                val outputStream = ByteArrayOutputStream()
                bitmap.compress(Bitmap.CompressFormat.JPEG, 70, outputStream)
                val base64 = Base64.encodeToString(outputStream.toByteArray(), Base64.NO_WRAP)
                val dataUri = "data:image/jpeg;base64,$base64"
                chatViewModel.addAttachment(
                    Attachment(
                        type = "image",
                        name = "Photo_${System.currentTimeMillis()}.jpg",
                        url = dataUri
                    )
                )
            } catch (e: Exception) {
                Toast.makeText(context, "Failed to load image", Toast.LENGTH_SHORT).show()
            }
        }
    }

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            HistoryDrawerContent(
                sessions = sessions,
                currentSessionId = currentSession?.id,
                currentUser = currentUser,
                isGuest = isGuest,
                onSelectSession = { session ->
                    chatViewModel.selectSession(session)
                    coroutineScope.launch { drawerState.close() }
                },
                onNewChat = {
                    chatViewModel.createNewChat(autoSelect = true)
                    coroutineScope.launch { drawerState.close() }
                },
                onDeleteSession = { sessionId ->
                    chatViewModel.deleteSession(sessionId)
                },
                onOpenSettings = {
                    coroutineScope.launch { drawerState.close() }
                    showSettingsModal = true
                },
                onOpenAccount = {
                    coroutineScope.launch { drawerState.close() }
                    if (currentUser != null) showProfileModal = true else showAuthModal = true
                },
                onOpenSelfHealing = {
                    coroutineScope.launch { drawerState.close() }
                    showSelfHealingModal = true
                }
            )
        }
    ) {
        Scaffold(
            topBar = {
                // Top Header matching Web App (Screenshot 2)
                TopAppBar(
                    title = {
                        Row(
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Karishma",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = KarishmaTextPrimaryWarm
                            )
                        }
                    },
                    navigationIcon = {
                        // Orange Hamburger Menu Icon
                        IconButton(onClick = { coroutineScope.launch { drawerState.open() } }) {
                            Icon(
                                imageVector = Icons.Default.Menu,
                                contentDescription = "Menu",
                                tint = KarishmaAccentWarm,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    },
                    actions = {
                        // Quick vs Detailed Mode Toggle Pill
                        Surface(
                            shape = RoundedCornerShape(50),
                            color = Color.White,
                            border = BorderStroke(1.dp, KarishmaBorderWarm),
                            modifier = Modifier.padding(end = 8.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(2.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                // "Quick" Pill
                                val isQuick = responseMode == "quick"
                                Surface(
                                    shape = RoundedCornerShape(50),
                                    color = if (isQuick) KarishmaAccentWarm else Color.Transparent,
                                    modifier = Modifier.clickable { chatViewModel.setResponseMode("quick") }
                                ) {
                                    Text(
                                        text = "Quick",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isQuick) Color.White else KarishmaTextSecondaryWarm,
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                    )
                                }

                                // "Detailed" Pill
                                val isDetailed = responseMode == "detailed"
                                Surface(
                                    shape = RoundedCornerShape(50),
                                    color = if (isDetailed) KarishmaAccentWarm else Color.Transparent,
                                    modifier = Modifier.clickable { chatViewModel.setResponseMode("detailed") }
                                ) {
                                    Text(
                                        text = "Detailed",
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isDetailed) Color.White else KarishmaTextSecondaryWarm,
                                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                    )
                                }
                            }
                        }

                        // Orange Circular History / Recents Button (Opens Chat History Screen - Screenshot 2)
                        Box(
                            modifier = Modifier
                                .padding(end = 12.dp)
                                .size(34.dp)
                                .clip(CircleShape)
                                .background(KarishmaAccentWarm)
                                .clickable { showChatHistoryScreen = true },
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.History,
                                contentDescription = "History",
                                tint = Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = Color.White
                    )
                )
            },
            bottomBar = {
                ChatInputBar(
                    text = inputText,
                    onTextChange = { inputText = it },
                    attachments = attachments,
                    onRemoveAttachment = { chatViewModel.removeAttachment(it) },
                    onPickAttachment = { imagePickerLauncher.launch("image/*") },
                    onModelClick = { showModelSheet = true },
                    onMicClick = onToggleVoiceInput,
                    isListening = isListening,
                    isLoading = isLoading,
                    onSend = {
                        chatViewModel.sendMessage(inputText)
                        inputText = ""
                    }
                )
            }
        ) { paddingValues ->
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .background(KarishmaBgWarm)
            ) {
                val messages = currentSession?.messages ?: emptyList()

                Column(
                    modifier = Modifier.fillMaxSize()
                ) {
                    // Subheader: "End-to-End Encrypted" Pill Badge (Centered)
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp, bottom = 4.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Surface(
                            shape = RoundedCornerShape(50),
                            color = Color(0xFFEBE6DD)
                        ) {
                            Text(
                                text = "End-to-End Encrypted",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Medium,
                                color = Color(0xFF5C5753),
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 3.dp)
                            )
                        }
                    }

                    if (messages.isEmpty()) {
                        // Empty State matching Web App (Screenshot 2)
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 20.dp, vertical = 12.dp),
                            verticalArrangement = Arrangement.SpaceBetween,
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            // Centered Greeting Section
                            Column(
                                modifier = Modifier
                                    .weight(1f)
                                    .fillMaxWidth(),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                // Yellow Shooting Star Emoji
                                Text(
                                    text = "💫",
                                    fontSize = 36.sp
                                )

                                Spacer(modifier = Modifier.height(18.dp))

                                val userDisplayName = currentUser?.nickname?.takeIf { it.isNotBlank() }
                                    ?: currentUser?.fullName?.takeIf { it.isNotBlank() }
                                    ?: "Soumyajit"

                                Text(
                                    text = "Hey, $userDisplayName! 😊 It's really nice to meet you. What's on your mind today?",
                                    style = MaterialTheme.typography.titleLarge.copy(
                                        fontSize = 19.sp,
                                        fontWeight = FontWeight.Medium,
                                        lineHeight = 28.sp
                                    ),
                                    color = KarishmaTextPrimaryWarm,
                                    textAlign = TextAlign.Center,
                                    modifier = Modifier.padding(horizontal = 12.dp)
                                )
                            }

                            // Expert Topic Suggestions Section (Right above bottom composer)
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(bottom = 8.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(bottom = 8.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.AutoAwesome,
                                        contentDescription = null,
                                        tint = KarishmaAccentWarm,
                                        modifier = Modifier.size(13.dp)
                                    )
                                    Spacer(modifier = Modifier.width(5.dp))
                                    Text(
                                        text = "Tap an expert topic to ask your friend:",
                                        fontSize = 11.5.sp,
                                        fontWeight = FontWeight.SemiBold,
                                        color = KarishmaTextSecondaryWarm
                                    )
                                }

                                // Topic Chips formatted as neat horizontal rows matching Web App
                                val topics = listOf(
                                    "💰 Personal Finance Advice" to "Can you give me actionable personal finance and budgeting advice?",
                                    "📈 Tax Deductions Explained" to "Explain standard vs itemized tax deductions and smart ways to save on taxes.",
                                    "💻 Tech: PC Build vs M-Mac" to "Compare building a custom PC vs buying an Apple M-series Mac for work and productivity.",
                                    "🗺️ Geography & Travel Vibe" to "Recommend top travel destinations and hidden gems with great cultural vibes.",
                                    "🌱 Stress/Emotional Support" to "I've been feeling a bit stressed lately, can we talk about work-life balance and emotional wellbeing?"
                                )

                                // Row 1
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 6.dp),
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Surface(
                                        shape = RoundedCornerShape(50),
                                        color = Color.White,
                                        border = BorderStroke(1.dp, KarishmaBorderWarm),
                                        modifier = Modifier.clickable { chatViewModel.sendMessage(topics[0].second) }
                                    ) {
                                        Text(
                                            text = topics[0].first,
                                            fontSize = 11.5.sp,
                                            color = KarishmaTextPrimaryWarm,
                                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                        )
                                    }

                                    Surface(
                                        shape = RoundedCornerShape(50),
                                        color = Color.White,
                                        border = BorderStroke(1.dp, KarishmaBorderWarm),
                                        modifier = Modifier.clickable { chatViewModel.sendMessage(topics[1].second) }
                                    ) {
                                        Text(
                                            text = topics[1].first,
                                            fontSize = 11.5.sp,
                                            color = KarishmaTextPrimaryWarm,
                                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                        )
                                    }
                                }

                                // Row 2
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(bottom = 6.dp),
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Surface(
                                        shape = RoundedCornerShape(50),
                                        color = Color.White,
                                        border = BorderStroke(1.dp, KarishmaBorderWarm),
                                        modifier = Modifier.clickable { chatViewModel.sendMessage(topics[2].second) }
                                    ) {
                                        Text(
                                            text = topics[2].first,
                                            fontSize = 11.5.sp,
                                            color = KarishmaTextPrimaryWarm,
                                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                        )
                                    }

                                    Surface(
                                        shape = RoundedCornerShape(50),
                                        color = Color.White,
                                        border = BorderStroke(1.dp, KarishmaBorderWarm),
                                        modifier = Modifier.clickable { chatViewModel.sendMessage(topics[3].second) }
                                    ) {
                                        Text(
                                            text = topics[3].first,
                                            fontSize = 11.5.sp,
                                            color = KarishmaTextPrimaryWarm,
                                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                        )
                                    }
                                }

                                // Row 3
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Surface(
                                        shape = RoundedCornerShape(50),
                                        color = Color.White,
                                        border = BorderStroke(1.dp, KarishmaBorderWarm),
                                        modifier = Modifier.clickable { chatViewModel.sendMessage(topics[4].second) }
                                    ) {
                                        Text(
                                            text = topics[4].first,
                                            fontSize = 11.5.sp,
                                            color = KarishmaTextPrimaryWarm,
                                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp)
                                        )
                                    }
                                }
                            }
                        }
                    } else {
                        LazyColumn(
                            state = listState,
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(vertical = 12.dp)
                        ) {
                            items(messages, key = { it.id }) { msg ->
                                MessageBubble(
                                    message = msg,
                                    isSpeaking = speakingMessageId == msg.id,
                                    showCiphertext = showCiphertext,
                                    onSpeakClick = { chatViewModel.speakMessage(msg) }
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // Bottom Sheets & Dialog Modals
    if (showModelSheet) {
        ModelSelectorSheet(
            selectedModel = selectedModel,
            responseMode = responseMode,
            onSelectModel = { chatViewModel.setModel(it) },
            onSelectResponseMode = { chatViewModel.setResponseMode(it) },
            onDismiss = { showModelSheet = false }
        )
    }

    if (showAuthModal) {
        AuthModal(
            viewModel = authViewModel,
            onDismiss = {
                showAuthModal = false
                authViewModel.setAuthView("menu")
                chatViewModel.loadSessions()
            }
        )
    }

    if (showSettingsModal) {
        SettingsModal(
            viewModel = settingsViewModel,
            onLogout = {
                authViewModel.logout {
                    chatViewModel.loadSessions()
                }
            },
            onDismiss = { showSettingsModal = false }
        )
    }

    if (showSelfHealingModal) {
        SelfHealingModal(
            viewModel = settingsViewModel,
            onDismiss = { showSelfHealingModal = false }
        )
    }

    if (showProfileModal && currentUser != null) {
        ProfileModal(
            user = currentUser!!,
            viewModel = authViewModel,
            onLogout = {
                authViewModel.logout {
                    chatViewModel.loadSessions()
                }
            },
            onDismiss = { showProfileModal = false }
        )
    }

    if (showChatHistoryScreen) {
        androidx.compose.ui.window.Dialog(
            onDismissRequest = { showChatHistoryScreen = false },
            properties = androidx.compose.ui.window.DialogProperties(
                usePlatformDefaultWidth = false,
                dismissOnBackPress = true
            )
        ) {
            ChatHistoryScreen(
                sessions = sessions,
                currentUser = currentUser,
                isGuest = isGuest,
                onSelectSession = { session ->
                    chatViewModel.selectSession(session)
                    showChatHistoryScreen = false
                },
                onNewChat = {
                    chatViewModel.createNewChat(autoSelect = true)
                    showChatHistoryScreen = false
                },
                onDeleteSession = { sessionId ->
                    chatViewModel.deleteSession(sessionId)
                },
                onClose = { showChatHistoryScreen = false },
                onOpenSettings = {
                    showChatHistoryScreen = false
                    showSettingsModal = true
                },
                onOpenAccount = {
                    showChatHistoryScreen = false
                    if (currentUser != null) showProfileModal = true else showAuthModal = true
                }
            )
        }
    }
}
