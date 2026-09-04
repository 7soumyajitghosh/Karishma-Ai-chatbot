package com.karishma.ai.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.karishma.ai.data.model.Attachment
import com.karishma.ai.ui.theme.KarishmaAccentWarm
import com.karishma.ai.ui.theme.KarishmaBgWarm
import com.karishma.ai.ui.theme.KarishmaBorderWarm
import com.karishma.ai.ui.theme.KarishmaCardBgWarm
import com.karishma.ai.ui.theme.KarishmaTextPrimaryWarm
import com.karishma.ai.ui.theme.KarishmaTextSecondaryWarm

@Composable
fun ChatInputBar(
    text: String,
    onTextChange: (String) -> Unit,
    attachments: List<Attachment>,
    onRemoveAttachment: (Attachment) -> Unit,
    onPickAttachment: () -> Unit,
    onModelClick: () -> Unit = {},
    onMicClick: () -> Unit,
    isListening: Boolean,
    isLoading: Boolean,
    onSend: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = Color.White,
        border = androidx.compose.foundation.BorderStroke(1.dp, KarishmaBorderWarm)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp)
        ) {
            // Attachments Preview Strip (if user selected photos or files)
            if (attachments.isNotEmpty()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    attachments.forEach { att ->
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .border(1.dp, KarishmaBorderWarm, RoundedCornerShape(10.dp))
                        ) {
                            if (att.url.isNotBlank()) {
                                AsyncImage(
                                    model = att.url,
                                    contentDescription = att.name,
                                    modifier = Modifier.fillMaxSize()
                                )
                            } else {
                                Box(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .background(KarishmaCardBgWarm),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(Icons.Default.InsertDriveFile, contentDescription = null, modifier = Modifier.size(20.dp), tint = KarishmaAccentWarm)
                                }
                            }
                            // Delete button
                            Box(
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .size(18.dp)
                                    .clip(CircleShape)
                                    .background(Color.Black.copy(alpha = 0.65f))
                                    .clickable { onRemoveAttachment(att) },
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(Icons.Default.Close, contentDescription = "Remove", tint = Color.White, modifier = Modifier.size(11.dp))
                            }
                        }
                    }
                }
            }

            // Composer Row matching Web App (Screenshot 2)
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // 1. Text Input Container with ⚡ and +
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = KarishmaBgWarm,
                    border = androidx.compose.foundation.BorderStroke(1.dp, KarishmaBorderWarm),
                    modifier = Modifier
                        .weight(1f)
                        .height(44.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // ⚡ Model Switcher Button
                        IconButton(
                            onClick = onModelClick,
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Bolt,
                                contentDescription = "AI Model",
                                tint = KarishmaAccentWarm,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        // + Attachment Button
                        IconButton(
                            onClick = onPickAttachment,
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                imageVector = Icons.Default.Add,
                                contentDescription = "Attach File",
                                tint = KarishmaTextSecondaryWarm,
                                modifier = Modifier.size(20.dp)
                            )
                        }

                        // Text Field Area
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .padding(horizontal = 4.dp),
                            contentAlignment = Alignment.CenterStart
                        ) {
                            if (text.isEmpty()) {
                                Text(
                                    text = if (isListening) "Listening..." else "Ask Karishma",
                                    color = if (isListening) KarishmaAccentWarm else KarishmaTextSecondaryWarm,
                                    fontSize = 13.5.sp,
                                    fontWeight = FontWeight.Normal
                                )
                            }
                            BasicTextField(
                                value = text,
                                onValueChange = onTextChange,
                                textStyle = MaterialTheme.typography.bodyMedium.copy(
                                    color = KarishmaTextPrimaryWarm,
                                    fontSize = 13.5.sp
                                ),
                                cursorBrush = SolidColor(KarishmaAccentWarm),
                                maxLines = 4,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }

                // 2. Microphone Button with "BN" language badge
                Box(
                    modifier = Modifier.size(44.dp)
                ) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = if (isListening) Color(0xFFE11D48) else KarishmaBgWarm,
                        border = if (isListening) null else androidx.compose.foundation.BorderStroke(1.dp, KarishmaBorderWarm),
                        modifier = Modifier
                            .fillMaxSize()
                            .clickable { onMicClick() }
                    ) {
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier.fillMaxSize()
                        ) {
                            Icon(
                                imageVector = Icons.Default.Mic,
                                contentDescription = "Voice Input",
                                tint = if (isListening) Color.White else KarishmaTextSecondaryWarm,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }

                    // "BN" Language Tag Badge in top-right corner
                    Surface(
                        shape = RoundedCornerShape(4.dp),
                        color = Color.White,
                        border = androidx.compose.foundation.BorderStroke(0.7.dp, KarishmaBorderWarm),
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .offset(x = 2.dp, y = (-2).dp)
                    ) {
                        Text(
                            text = "BN",
                            fontSize = 8.sp,
                            fontWeight = FontWeight.Bold,
                            color = KarishmaTextSecondaryWarm,
                            modifier = Modifier.padding(horizontal = 2.5.dp, vertical = 0.5.dp)
                        )
                    }
                }

                // 3. Send Button
                val canSend = (text.isNotBlank() || attachments.isNotEmpty()) && !isLoading
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = KarishmaAccentWarm,
                    modifier = Modifier
                        .size(44.dp)
                        .clickable(enabled = canSend) { onSend() }
                ) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier.fillMaxSize()
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Icon(
                                imageVector = Icons.Default.Send,
                                contentDescription = "Send",
                                tint = Color.White,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
