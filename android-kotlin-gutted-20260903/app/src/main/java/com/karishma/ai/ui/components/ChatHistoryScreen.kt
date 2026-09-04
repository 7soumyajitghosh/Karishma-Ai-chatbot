package com.karishma.ai.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.karishma.ai.data.model.ChatSession
import com.karishma.ai.data.model.User
import java.text.SimpleDateFormat
import java.util.*

private val OrangePrimary = Color(0xFFD96B43)
private val CardBorderColor = Color(0xFFEFEBE4)
private val BackgroundWarm = Color(0xFFFAF8F5)
private val TextMain = Color(0xFF2C2A29)
private val TextMuted = Color(0xFF8C857E)

@Composable
fun ChatHistoryScreen(
    sessions: List<ChatSession>,
    currentUser: User?,
    isGuest: Boolean,
    onSelectSession: (ChatSession) -> Unit,
    onNewChat: () -> Unit,
    onDeleteSession: (String) -> Unit,
    onClose: () -> Unit,
    onOpenSettings: () -> Unit,
    onOpenAccount: () -> Unit
) {
    val dateFormat = SimpleDateFormat("M/d/yy, h:mm a", Locale.getDefault())

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = BackgroundWarm
    ) {
        Column(
            modifier = Modifier.fillMaxSize()
        ) {
            // 1. Top Section Header matching Screenshot 2
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color.White,
                border = BorderStroke(0.5.dp, CardBorderColor)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Small circular menu/back button on the left
                    Box(
                        modifier = Modifier
                            .size(38.dp)
                            .clip(CircleShape)
                            .background(Color(0xFFEDE9E3))
                            .clickable { onClose() },
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Menu,
                            contentDescription = "Menu",
                            tint = Color(0xFF5A5550),
                            modifier = Modifier.size(20.dp)
                        )
                    }

                    // Title: "Chat History"
                    Text(
                        text = "Chat History",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextMain
                    )

                    // Close (X) button on the right
                    IconButton(
                        onClick = onClose,
                        modifier = Modifier.size(38.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Close",
                            tint = Color(0xFF7A7570),
                            modifier = Modifier.size(22.dp)
                        )
                    }
                }
            }

            // 2. Large Orange "+ New Chat" Button
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 16.dp)
            ) {
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .clickable { onNewChat() },
                    shape = RoundedCornerShape(12.dp),
                    color = OrangePrimary
                ) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "+ New Chat",
                            color = Color.White,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // 3. Conversation History Cards (Vertically Scrollable List)
            LazyColumn(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                if (sessions.isEmpty()) {
                    item {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 48.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "No conversation history yet.",
                                fontSize = 14.sp,
                                color = TextMuted
                            )
                        }
                    }
                } else {
                    items(sessions, key = { it.id }) { session ->
                        Surface(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onSelectSession(session) },
                            shape = RoundedCornerShape(16.dp),
                            color = Color.White,
                            border = BorderStroke(1.dp, CardBorderColor)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp, vertical = 14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text(
                                        text = session.title,
                                        fontSize = 15.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = TextMain,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                    val dateStr = try {
                                        dateFormat.format(Date(session.timestamp))
                                    } catch (e: Exception) {
                                        ""
                                    }
                                    Text(
                                        text = dateStr,
                                        fontSize = 12.sp,
                                        color = TextMuted
                                    )
                                }

                                IconButton(
                                    onClick = { onDeleteSession(session.id) },
                                    modifier = Modifier.size(32.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Outlined.Delete,
                                        contentDescription = "Delete",
                                        tint = TextMuted,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // 4. Fixed Bottom Account Area matching Screenshot 2
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color.White,
                border = BorderStroke(0.5.dp, CardBorderColor)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .navigationBarsPadding()
                        .padding(horizontal = 20.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Left: User icon + Name
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .weight(1f)
                            .clickable { onOpenAccount() }
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Person,
                            contentDescription = "User",
                            tint = Color(0xFF6C6660),
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        val displayName = currentUser?.getDisplayName()
                            ?: if (isGuest) "Guest Explorer" else "Sign In"
                        Text(
                            text = displayName,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextMain,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }

                    // Right: Settings gear icon
                    IconButton(
                        onClick = onOpenSettings,
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Settings,
                            contentDescription = "Settings",
                            tint = Color(0xFF6C6660),
                            modifier = Modifier.size(22.dp)
                        )
                    }
                }
            }
        }
    }
}
