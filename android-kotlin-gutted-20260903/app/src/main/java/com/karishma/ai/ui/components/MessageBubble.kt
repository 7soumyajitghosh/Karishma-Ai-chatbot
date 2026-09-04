package com.karishma.ai.ui.components

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.karishma.ai.data.model.Message
import com.karishma.ai.ui.theme.*
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun MessageBubble(
    message: Message,
    isSpeaking: Boolean,
    showCiphertext: Boolean,
    onSpeakClick: () -> Unit
) {
    val isUser = message.role == "user"
    val context = LocalContext.current

    val displayText = if (showCiphertext && message.encryptedText != null) {
        message.encryptedText
    } else {
        message.text
    }

    val timeFormatted = remember(message.timestamp) {
        val sdf = SimpleDateFormat("h:mm a", Locale.getDefault())
        sdf.format(Date(message.timestamp))
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp),
        horizontalAlignment = if (isUser) Alignment.End else Alignment.Start
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(if (isUser) 0.85f else 0.95f),
            horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start,
            verticalAlignment = Alignment.Top
        ) {
            if (!isUser) {
                // AI Avatar Icon
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(KarishmaAccentWarm)
                        .padding(6.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.AutoAwesome,
                        contentDescription = "Karishma AI",
                        tint = Color.White,
                        modifier = Modifier.size(18.dp)
                    )
                }
                Spacer(modifier = Modifier.width(8.dp))
            }

            Column(
                modifier = Modifier.weight(1f, fill = false),
                horizontalAlignment = if (isUser) Alignment.End else Alignment.Start
            ) {
                // Attachments (Images / Files)
                message.attachments?.forEach { att ->
                    if (att.url.startsWith("http") || att.url.startsWith("data:image")) {
                        AsyncImage(
                            model = att.url,
                            contentDescription = att.name,
                            modifier = Modifier
                                .padding(bottom = 6.dp)
                                .heightIn(max = 180.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .border(1.dp, KarishmaBorderWarm, RoundedCornerShape(12.dp))
                        )
                    } else {
                        Surface(
                            shape = RoundedCornerShape(8.dp),
                            color = KarishmaCardBgWarm,
                            modifier = Modifier.padding(bottom = 6.dp)
                        ) {
                            Row(
                                modifier = Modifier.padding(8.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(Icons.Default.AttachFile, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(att.name.ifBlank { "Attached file" }, fontSize = 12.sp)
                            }
                        }
                    }
                }

                // Main Message Content Card
                Surface(
                    shape = RoundedCornerShape(
                        topStart = 16.dp,
                        topEnd = 16.dp,
                        bottomStart = if (isUser) 16.dp else 4.dp,
                        bottomEnd = if (isUser) 4.dp else 16.dp
                    ),
                    color = if (isUser) UserBubbleColor else MaterialTheme.colorScheme.surface,
                    shadowElevation = if (isUser) 0.dp else 1.dp,
                    border = if (isUser) null else androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
                    modifier = Modifier.wrapContentWidth()
                ) {
                    Column(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)
                    ) {
                        if (isUser) {
                            Text(
                                text = displayText,
                                color = UserBubbleText,
                                style = MaterialTheme.typography.bodyLarge
                            )
                        } else {
                            RenderFormattedAiContent(displayText, context)
                        }
                    }
                }

                // Bottom Action Row (Timestamp, Copy, TTS, Feedback)
                Row(
                    modifier = Modifier.padding(top = 4.dp, start = 4.dp, end = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = timeFormatted,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )

                    if (!isUser) {
                        // Copy Button
                        Icon(
                            imageVector = Icons.Default.ContentCopy,
                            contentDescription = "Copy message",
                            tint = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                            modifier = Modifier
                                .size(14.dp)
                                .clickable {
                                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                    val clip = ClipData.newPlainText("Karishma AI", message.text)
                                    clipboard.setPrimaryClip(clip)
                                    Toast.makeText(context, "Copied to clipboard", Toast.LENGTH_SHORT).show()
                                }
                        )

                        // TTS Voice Narration Button
                        Icon(
                            imageVector = if (isSpeaking) Icons.Default.VolumeOff else Icons.Default.VolumeUp,
                            contentDescription = "Listen to narration",
                            tint = if (isSpeaking) KarishmaAccentWarm else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                            modifier = Modifier
                                .size(14.dp)
                                .clickable { onSpeakClick() }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun RenderFormattedAiContent(content: String, context: Context) {
    val codeBlockRegex = Regex("```([a-zA-Z0-9]*)\n([\\s\\S]*?)```")
    var lastIndex = 0
    val matches = codeBlockRegex.findAll(content).toList()

    if (matches.isEmpty()) {
        Text(
            text = content,
            color = MaterialTheme.colorScheme.onSurface,
            style = MaterialTheme.typography.bodyLarge,
            lineHeight = 22.sp
        )
    } else {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
            for (match in matches) {
                val preText = content.substring(lastIndex, match.range.first).trim()
                if (preText.isNotBlank()) {
                    Text(
                        text = preText,
                        color = MaterialTheme.colorScheme.onSurface,
                        style = MaterialTheme.typography.bodyLarge,
                        lineHeight = 22.sp
                    )
                }

                val language = match.groupValues[1].ifBlank { "code" }
                val codeSnippet = match.groupValues[2]

                // Code Snippet Card
                Surface(
                    shape = RoundedCornerShape(8.dp),
                    color = CodeBlockBgWarm,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFF1F1D1B))
                                .padding(horizontal = 10.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = language.uppercase(),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color(0xFFA69F97)
                            )
                            IconButton(
                                onClick = {
                                    val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                    val clip = ClipData.newPlainText("Code snippet", codeSnippet)
                                    clipboard.setPrimaryClip(clip)
                                    Toast.makeText(context, "Code copied", Toast.LENGTH_SHORT).show()
                                },
                                modifier = Modifier.size(24.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.ContentCopy,
                                    contentDescription = "Copy code",
                                    tint = Color.White,
                                    modifier = Modifier.size(13.dp)
                                )
                            }
                        }
                        Text(
                            text = codeSnippet,
                            color = CodeBlockTextWarm,
                            fontFamily = FontFamily.Monospace,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(10.dp)
                        )
                    }
                }

                lastIndex = match.range.last + 1
            }

            if (lastIndex < content.length) {
                val postText = content.substring(lastIndex).trim()
                if (postText.isNotBlank()) {
                    Text(
                        text = postText,
                        color = MaterialTheme.colorScheme.onSurface,
                        style = MaterialTheme.typography.bodyLarge,
                        lineHeight = 22.sp
                    )
                }
            }
        }
    }
}
