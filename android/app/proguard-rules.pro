# ProGuard configuration for Karishma AI
-keepattributes *Annotation*
-keepclassmembers class * {
    @com.google.gson.annotations.SerializedName <fields>;
}
-keep class com.karishma.ai.data.model.** { *; }
