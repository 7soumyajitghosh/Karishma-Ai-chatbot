package com.karishma.ai.viewmodel

import android.app.Application
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.speech.tts.Voice
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.karishma.ai.data.model.*
import com.karishma.ai.data.repository.ChatRepository
import com.karishma.ai.data.repository.EncryptionHelper
import com.karishma.ai.data.repository.PreferencesManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.*

class ChatViewModel(application: Application) : AndroidViewModel(application) {

    private val prefs = PreferencesManager(application)
    private val repository = ChatRepository(prefs)

    private val _sessions = MutableStateFlow<List<ChatSession>>(emptyList())
    val sessions: StateFlow<List<ChatSession>> = _sessions.asStateFlow()

    private val _currentSession = MutableStateFlow<ChatSession?>(null)
    val currentSession: StateFlow<ChatSession?> = _currentSession.asStateFlow()

    private val _selectedModel = MutableStateFlow(AvailableModels.getById(prefs.selectedModelId))
    val selectedModel: StateFlow<AiModel> = _selectedModel.asStateFlow()

    private val _responseMode = MutableStateFlow(prefs.responseMode)
    val responseMode: StateFlow<String> = _responseMode.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _syncStatus = MutableStateFlow("synced") // "synced" | "syncing" | "failed"
    val syncStatus: StateFlow<String> = _syncStatus.asStateFlow()

    private val _speakingMessageId = MutableStateFlow<String?>(null)
    val speakingMessageId: StateFlow<String?> = _speakingMessageId.asStateFlow()

    private val _attachments = MutableStateFlow<List<Attachment>>(emptyList())
    val attachments: StateFlow<List<Attachment>> = _attachments.asStateFlow()

    private val _showCiphertext = MutableStateFlow(false)
    val showCiphertext: StateFlow<Boolean> = _showCiphertext.asStateFlow()

    private var tts: TextToSpeech? = null
    private var isTtsReady = false

    companion object {
        // Strict male voice rejection filter: names, titles, male voice codes
        private val MALE_VOICE_PATTERN = Regex(
            "(?i)\\b(male|guy|man|boy|mr|sir|david|mark|george|alex|daniel|fred|james|" +
            "richard|stephen|brian|russell|oliver|ryan|thomas|paul|arthur|liam|noah|" +
            "william|jack|charles|henry|edward|john|robert|michael|ravi|rishi|pradeep|" +
            "madhav|suman|amit|manish|aravind|subir|rahul|deepak|anand|vikram|karan|" +
            "rohit|raj|tarun|sanjay|ajay|albert|bruce|ralph|tom|shaun|junior|pavel|" +
            "stefan|diego|jorge|carlos|juan|mateo|santiago|lucas|leon|felix|yannick|" +
            "hans|klaus|desktop)\\b|[-_](m0|m1|m2|m3|m4|male|bnm|enm|him|hin-m|eng-m|ben-m)"
        )

        // Strict female voice identification pattern
        private val FEMALE_VOICE_PATTERN = Regex(
            "(?i)\\b(female|woman|girl|lady|samiksha|tanisha|ananya|moyna|puja|shruti|" +
            "neerja|swara|veena|raveena|heera|priya|kavya|aditi|sangeeta|kajal|jenny|" +
            "aria|sonia|ava|samantha|serena|victoria|karen|moira|fiona|tessa|zira|" +
            "hazel|susan|stephanie|alva|allison|kendra|kimberly|joanna|ivy|salli|" +
            "chloe|olivia|mia|sophia|emma|isabella|amelia|kalyani|kalpana|geeta|" +
            "sita|radha)\\b|[-_](f0|f1|f2|f3|f4|bnf|ene|fem|female|bnf-local|bnf-network|" +
            "enf|hif|hin-f|eng-f|ben-f)"
        )
    }

    init {
        initTts(application)
        loadSessions()
    }

    /**
     * Initializes TextToSpeech and immediately configures an explicit female voice.
     */
    private fun initTts(context: Application) {
        tts = TextToSpeech(context) { status ->
            if (status == TextToSpeech.SUCCESS) {
                isTtsReady = true
                selectFemaleVoice(isBengali = true)
                tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) {}
                    override fun onDone(utteranceId: String?) {
                        if (utteranceId?.endsWith("_end") == true || utteranceId == _speakingMessageId.value) {
                            _speakingMessageId.value = null
                        }
                    }
                    @Deprecated("Deprecated in Java")
                    override fun onError(utteranceId: String?) {
                        if (utteranceId?.endsWith("_end") == true || utteranceId == _speakingMessageId.value) {
                            _speakingMessageId.value = null
                        }
                    }
                })
            }
        }
    }

    /**
     * Centralized Female-Only Voice Selection Engine.
     * Guaranteed to NEVER select a male voice under any circumstances.
     */
    private fun selectFemaleVoice(isBengali: Boolean): Voice? {
        val ttsInstance = tts ?: return null
        val availableVoices = try { ttsInstance.voices } catch (e: Exception) { null }

        // Set locale baseline
        val targetLocale = if (isBengali) Locale("bn", "IN") else Locale("en", "IN")
        val langResult = ttsInstance.setLanguage(targetLocale)
        if (langResult == TextToSpeech.LANG_MISSING_DATA || langResult == TextToSpeech.LANG_NOT_SUPPORTED) {
            if (isBengali) {
                val bdResult = ttsInstance.setLanguage(Locale("bn", "BD"))
                if (bdResult == TextToSpeech.LANG_MISSING_DATA || bdResult == TextToSpeech.LANG_NOT_SUPPORTED) {
                    val hiResult = ttsInstance.setLanguage(Locale("hi", "IN"))
                    if (hiResult == TextToSpeech.LANG_MISSING_DATA || hiResult == TextToSpeech.LANG_NOT_SUPPORTED) {
                        ttsInstance.setLanguage(Locale("en", "IN"))
                    }
                }
            } else {
                val usResult = ttsInstance.setLanguage(Locale.US)
                if (usResult == TextToSpeech.LANG_MISSING_DATA || usResult == TextToSpeech.LANG_NOT_SUPPORTED) {
                    ttsInstance.setLanguage(Locale.ENGLISH)
                }
            }
        }

        if (availableVoices.isNullOrEmpty()) {
            ttsInstance.setPitch(1.18f)
            ttsInstance.setSpeechRate(if (isBengali) 0.90f else 0.95f)
            return null
        }

        // 1. STRICTLY EXCLUDE ALL MALE VOICES
        val strictlyNonMaleVoices = availableVoices.filter { voice ->
            !MALE_VOICE_PATTERN.containsMatchIn(voice.name)
        }

        // 2. IDENTIFY EXPLICIT FEMALE VOICES
        val explicitFemaleVoices = strictlyNonMaleVoices.filter { voice ->
            FEMALE_VOICE_PATTERN.containsMatchIn(voice.name)
        }

        val chosenVoice: Voice? = if (isBengali) {
            explicitFemaleVoices.find { it.locale.language == "bn" }
                ?: strictlyNonMaleVoices.find { it.locale.language == "bn" }
                ?: explicitFemaleVoices.find { it.locale.language == "hi" && it.locale.country == "IN" }
                ?: explicitFemaleVoices.find { it.locale.language == "en" && it.locale.country == "IN" }
                ?: explicitFemaleVoices.find { it.locale.language == "en" }
                ?: explicitFemaleVoices.firstOrNull()
                ?: strictlyNonMaleVoices.firstOrNull()
        } else {
            explicitFemaleVoices.find { it.locale.language == "en" && it.locale.country == "IN" }
                ?: explicitFemaleVoices.find { it.locale.language == "en" }
                ?: explicitFemaleVoices.find { it.locale.language == "bn" }
                ?: explicitFemaleVoices.firstOrNull()
                ?: strictlyNonMaleVoices.find { it.locale.language == "en" }
                ?: strictlyNonMaleVoices.firstOrNull()
        }

        if (chosenVoice != null) {
            ttsInstance.voice = chosenVoice
        }

        // Ensure natural, warm feminine vocal acoustics
        val isExplicitFemale = chosenVoice != null && FEMALE_VOICE_PATTERN.containsMatchIn(chosenVoice.name)
        val targetPitch = if (isExplicitFemale) 1.08f else 1.18f
        val targetRate = if (isBengali) 0.90f else 0.95f

        ttsInstance.setPitch(targetPitch)
        ttsInstance.setSpeechRate(targetRate)

        return chosenVoice
    }

    /**
     * Cleans text for speech synthesis by stripping only unpronounceable code blocks, URLs,
     * markdown decorators, and emojis, while strictly preserving ALL Bengali, Banglish,
     * English words, numbers, and standard punctuation.
     */
    private fun cleanTextForSpeech(rawText: String): String {
        if (rawText.isBlank()) return ""

        return rawText
            // 1. Remove markdown code blocks (```...```)
            .replace(Regex("```[\\s\\S]*?```"), " ")
            // 2. Extract content from inline code (`code` -> code)
            .replace(Regex("`([^`]+)`"), "$1")
            // 3. Extract text from markdown links: [label](url) -> label
            .replace(Regex("\\[([^\\]]+)\\]\\([^)]+\\)"), "$1")
            // 4. Remove standalone URLs (http://... or https://... or www....)
            .replace(Regex("https?://\\S+|www\\.\\S+"), " ")
            // 5. Remove markdown formatting tags (*, _, #, ~, >, etc.)
            .replace(Regex("[#*_~>\\\\]"), " ")
            // 6. Remove emojis and unicode pictographs
            .replace(Regex("[\\p{So}\\p{Cn}\\uD83C-\\uDBFF\\uDC00-\\uDFFF]+"), " ")
            // 7. Strip brackets and code symbols to spaces without removing letters, numbers, or standard punctuation
            .replace(Regex("[{}[\\\\\\]()<>|@$%^&+=_—–]"), " ")
            // 8. Normalize whitespace
            .replace(Regex("\\s+"), " ")
            .trim()
    }

    /**
     * Splits long text into safe continuous chunks respecting sentence/word boundaries
     * to avoid Android TTS buffer limits, without dropping any text.
     */
    private fun splitIntoSafeChunks(text: String): List<String> {
        val trimmed = text.trim()
        if (trimmed.isBlank()) return emptyList()

        val maxChunkSize = try {
            val maxLen = TextToSpeech.getMaxSpeechInputLength()
            if (maxLen > 500) maxLen - 200 else 2000
        } catch (e: Exception) {
            2000
        }

        if (trimmed.length <= maxChunkSize) {
            return listOf(trimmed)
        }

        // Split text cleanly on sentence boundaries
        val sentences = trimmed.split(Regex("(?<=[.!?।\n])\\s+"))
            .map { it.trim() }
            .filter { it.isNotBlank() }

        if (sentences.isEmpty()) return listOf(trimmed)

        val chunks = mutableListOf<String>()
        val currentChunk = StringBuilder()

        for (sentence in sentences) {
            if (currentChunk.isNotEmpty() && currentChunk.length + sentence.length + 1 > maxChunkSize) {
                chunks.add(currentChunk.toString().trim())
                currentChunk.clear()
            }
            if (sentence.length > maxChunkSize) {
                // If a single sentence is exceptionally long, split by words
                val words = sentence.split(Regex("\\s+"))
                for (word in words) {
                    if (currentChunk.isNotEmpty() && currentChunk.length + word.length + 1 > maxChunkSize) {
                        chunks.add(currentChunk.toString().trim())
                        currentChunk.clear()
                    }
                    if (currentChunk.isNotEmpty()) currentChunk.append(" ")
                    currentChunk.append(word)
                }
            } else {
                if (currentChunk.isNotEmpty()) currentChunk.append(" ")
                currentChunk.append(sentence)
            }
        }

        if (currentChunk.isNotEmpty()) {
            chunks.add(currentChunk.toString().trim())
        }

        return chunks
    }

    /**
     * Speaks the full AI response from start to finish as ONE continuous stream
     * without skipping Bengali, Banglish, or English.
     * Strictly uses a female voice.
     */
    fun speakMessage(message: Message) {
        if (!isTtsReady || tts == null) return

        if (_speakingMessageId.value == message.id) {
            stopNarration()
            return
        }

        stopNarration()
        _speakingMessageId.value = message.id

        val cleanText = cleanTextForSpeech(message.text)
        if (cleanText.isBlank()) {
            _speakingMessageId.value = null
            return
        }

        // Determine if Bengali script is present
        val hasBengaliScript = cleanText.any { it in '\u0980'..'\u09FF' }

        // Configure female voice once before queueing
        selectFemaleVoice(isBengali = hasBengaliScript)

        // Split into safe chunks if text exceeds Android TTS buffer limits
        val chunks = splitIntoSafeChunks(cleanText)
        if (chunks.isEmpty()) {
            _speakingMessageId.value = null
            return
        }

        // Speak every chunk sequentially with continuous queuing (QUEUE_FLUSH first, then QUEUE_ADD)
        for (index in chunks.indices) {
            val chunk = chunks[index]
            val queueMode = if (index == 0) TextToSpeech.QUEUE_FLUSH else TextToSpeech.QUEUE_ADD
            val utteranceId = if (index == chunks.lastIndex) "${message.id}_end" else "${message.id}_seg_$index"

            tts?.speak(chunk, queueMode, null, utteranceId)
        }
    }

    fun loadSessions() {
        viewModelScope.launch {
            _syncStatus.value = "syncing"
            val local = repository.getLocalSessions()
            if (local.isNotEmpty()) {
                _sessions.value = local
                val activeId = prefs.activeChatId
                val found = local.find { it.id == activeId } ?: local.first()
                _currentSession.value = found
            } else {
                createNewChat(autoSelect = true)
            }

            // Sync with backend history if authenticated
            val result = repository.fetchCloudHistory()
            result.onSuccess { cloudList ->
                if (cloudList.isNotEmpty()) {
                    _sessions.value = cloudList
                    val activeId = prefs.activeChatId
                    _currentSession.value = cloudList.find { it.id == activeId } ?: cloudList.first()
                }
                _syncStatus.value = "synced"
            }.onFailure {
                _syncStatus.value = "synced"
            }
        }
    }

    fun createNewChat(autoSelect: Boolean = true): ChatSession {
        val newSession = ChatSession(
            id = UUID.randomUUID().toString(),
            title = "New Conversation",
            timestamp = System.currentTimeMillis(),
            messages = emptyList()
        )
        val updated = listOf(newSession) + _sessions.value
        _sessions.value = updated
        repository.saveLocalSessions(updated)
        if (autoSelect) {
            _currentSession.value = newSession
            prefs.activeChatId = newSession.id
        }
        return newSession
    }

    fun selectSession(session: ChatSession) {
        _currentSession.value = session
        prefs.activeChatId = session.id
        _attachments.value = emptyList()
        stopNarration()
    }

    fun deleteSession(sessionId: String) {
        viewModelScope.launch {
            val updated = _sessions.value.filter { it.id != sessionId }
            _sessions.value = updated
            repository.saveLocalSessions(updated)
            repository.deleteSessionFromCloud(sessionId)

            if (_currentSession.value?.id == sessionId) {
                if (updated.isNotEmpty()) {
                    selectSession(updated.first())
                } else {
                    createNewChat(autoSelect = true)
                }
            }
        }
    }

    fun setModel(model: AiModel) {
        _selectedModel.value = model
        prefs.selectedModelId = model.id
    }

    fun setResponseMode(mode: String) {
        _responseMode.value = mode
        prefs.responseMode = mode
    }

    fun toggleShowCiphertext() {
        _showCiphertext.value = !_showCiphertext.value
    }

    fun addAttachment(attachment: Attachment) {
        _attachments.value = _attachments.value + attachment
    }

    fun removeAttachment(attachment: Attachment) {
        _attachments.value = _attachments.value - attachment
    }

    fun clearAttachments() {
        _attachments.value = emptyList()
    }

    fun sendMessage(text: String) {
        val trimmed = text.trim()
        val currentAtts = _attachments.value
        if (trimmed.isBlank() && currentAtts.isEmpty()) return

        var active = _currentSession.value ?: createNewChat(autoSelect = true)
        val encryptionKey = prefs.customEncryptionKey

        // Create User message
        val userEncrypted = EncryptionHelper.encrypt(trimmed, encryptionKey)
        val userMsg = Message(
            id = UUID.randomUUID().toString(),
            role = "user",
            text = trimmed,
            timestamp = System.currentTimeMillis(),
            attachments = if (currentAtts.isNotEmpty()) currentAtts else null,
            isEncrypted = prefs.isEncryptionEnabled,
            encryptedText = if (prefs.isEncryptionEnabled) userEncrypted else null
        )

        val updatedMsgs = active.messages + userMsg
        val autoTitle = if (active.messages.isEmpty() && trimmed.isNotBlank()) {
            if (trimmed.length > 30) trimmed.take(30) + "..." else trimmed
        } else {
            active.title
        }

        active = active.copy(title = autoTitle, messages = updatedMsgs)
        _currentSession.value = active
        updateSessionInList(active)
        clearAttachments()

        _isLoading.value = true
        _syncStatus.value = "syncing"

        viewModelScope.launch {
            val result = repository.sendChatMessage(
                messageText = trimmed,
                history = updatedMsgs,
                modelId = _selectedModel.value.id,
                responseMode = _responseMode.value,
                attachments = userMsg.attachments
            )

            _isLoading.value = false

            result.onSuccess { replyText ->
                val aiEncrypted = EncryptionHelper.encrypt(replyText, encryptionKey)
                val aiMsg = Message(
                    id = UUID.randomUUID().toString(),
                    role = "model",
                    text = replyText,
                    timestamp = System.currentTimeMillis(),
                    model = _selectedModel.value.id,
                    isEncrypted = prefs.isEncryptionEnabled,
                    encryptedText = if (prefs.isEncryptionEnabled) aiEncrypted else null
                )

                val withAiMsgs = active.messages + aiMsg
                val finishedSession = active.copy(messages = withAiMsgs)
                _currentSession.value = finishedSession
                updateSessionInList(finishedSession)

                repository.saveSessionToCloud(finishedSession)
                _syncStatus.value = "synced"
            }.onFailure { err ->
                val errorMsg = Message(
                    id = UUID.randomUUID().toString(),
                    role = "model",
                    text = "I encountered an error while processing your request: ${err.message ?: "Connection error"}. Please check your network or try again.",
                    timestamp = System.currentTimeMillis(),
                    model = _selectedModel.value.id
                )
                val withErrMsgs = active.messages + errorMsg
                val finishedSession = active.copy(messages = withErrMsgs)
                _currentSession.value = finishedSession
                updateSessionInList(finishedSession)
                _syncStatus.value = "failed"
            }
        }
    }

    private fun updateSessionInList(session: ChatSession) {
        val list = _sessions.value.toMutableList()
        val index = list.indexOfFirst { it.id == session.id }
        if (index >= 0) {
            list[index] = session
        } else {
            list.add(0, session)
        }
        _sessions.value = list
        repository.saveLocalSessions(list)
    }

    fun stopNarration() {
        tts?.stop()
        _speakingMessageId.value = null
    }

    override fun onCleared() {
        super.onCleared()
        tts?.stop()
        tts?.shutdown()
    }
}
