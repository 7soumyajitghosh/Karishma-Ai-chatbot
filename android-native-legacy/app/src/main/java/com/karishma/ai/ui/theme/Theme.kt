package com.karishma.ai.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val DarkColorScheme = darkColorScheme(
    primary = KarishmaAccentDark,
    onPrimary = Color.White,
    background = KarishmaBgDark,
    surface = KarishmaSurfaceDark,
    surfaceVariant = KarishmaCardBgDark,
    onBackground = KarishmaTextPrimaryDark,
    onSurface = KarishmaTextPrimaryDark,
    outline = KarishmaBorderDark
)

private val LightColorScheme = lightColorScheme(
    primary = KarishmaAccentWarm,
    onPrimary = Color.White,
    background = KarishmaBgWarm,
    surface = KarishmaSurfaceWarm,
    surfaceVariant = KarishmaCardBgWarm,
    onBackground = KarishmaTextPrimaryWarm,
    onSurface = KarishmaTextPrimaryWarm,
    outline = KarishmaBorderWarm
)

@Composable
fun KarishmaAITheme(
    themeMode: String = "normal", // "normal" | "light" | "dark"
    content: @Composable () -> Unit
) {
    val isDark = when (themeMode) {
        "dark" -> true
        "light" -> false
        else -> isSystemInDarkTheme()
    }

    val colorScheme = if (isDark) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
