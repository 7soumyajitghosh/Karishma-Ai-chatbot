package com.karishma.ai.data.model

data class AiModel(
    val id: String,
    val name: String,
    val provider: String,
    val description: String,
    val badge: String = "Popular",
    val speed: String = "High",
    val supportsVision: Boolean = true
)

data class ModelProvider(
    val id: String,
    val name: String,
    val tagline: String,
    val badge: String,
    val models: List<AiModel>
)

object AvailableModels {
    val DEFAULT_MODEL_ID = "gemini-2.5-flash"

    val PROVIDERS = listOf(
        ModelProvider(
            id = "nemotron",
            name = "Nemotron",
            tagline = "NVIDIA High-Performance Reasoning",
            badge = "PRIMARY",
            models = listOf(
                AiModel(
                    id = "nvidia/nemotron-3-ultra-550b-a55b",
                    name = "Nemotron 3 Ultra 550B",
                    provider = "NVIDIA",
                    description = "Flagship frontier reasoning & orchestration",
                    badge = "Ultra",
                    speed = "High"
                ),
                AiModel(
                    id = "nvidia/nemotron-3-super-120b-a12b",
                    name = "Nemotron 3 Super 120B",
                    provider = "NVIDIA",
                    description = "High-throughput complex agentic reasoning",
                    badge = "Super",
                    speed = "High"
                ),
                AiModel(
                    id = "nvidia/nemotron-3-nano-30b-a3b",
                    name = "Nemotron 3 Nano 30B",
                    provider = "NVIDIA",
                    description = "Fast efficient Mixture-of-Experts",
                    badge = "Fast",
                    speed = "Very High"
                ),
                AiModel(
                    id = "nvidia/nemotron-3-nano-4b",
                    name = "Nemotron 3 Nano 4B",
                    provider = "NVIDIA",
                    description = "Ultra-compact fast edge inference",
                    badge = "Edge",
                    speed = "Ultra"
                ),
                AiModel(
                    id = "nvidia/nemotron-nano-9b-v2",
                    name = "Nemotron Nano 9B v2",
                    provider = "NVIDIA",
                    description = "Compact reasoning & versatile intelligence",
                    badge = "Nano",
                    speed = "Very High"
                ),
                AiModel(
                    id = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
                    name = "Nemotron 3 Nano Omni 30B",
                    provider = "NVIDIA",
                    description = "Multimodal perception & omni-reasoning",
                    badge = "Omni",
                    speed = "High"
                )
            )
        ),
        ModelProvider(
            id = "gemini",
            name = "Gemini",
            tagline = "Google AI & Multimodal Models",
            badge = "GOOGLE",
            models = listOf(
                AiModel(
                    id = "gemini-3.5-flash",
                    name = "Gemini 3.5 Flash",
                    provider = "Google",
                    description = "Fast & intelligent multimodal chat",
                    badge = "Next-Gen",
                    speed = "Very High"
                ),
                AiModel(
                    id = "gemini-3.1-pro-preview",
                    name = "Gemini 3.1 Pro",
                    provider = "Google",
                    description = "Advanced reasoning & frontier intelligence",
                    badge = "Pro",
                    speed = "High"
                ),
                AiModel(
                    id = "gemini-3-flash-preview",
                    name = "Gemini 3 Flash",
                    provider = "Google",
                    description = "High-speed multimodal reasoning",
                    badge = "Preview",
                    speed = "Very High"
                ),
                AiModel(
                    id = "gemini-3.1-flash-lite",
                    name = "Gemini 3.1 Flash Lite",
                    provider = "Google",
                    description = "Ultra-fast low-latency chat",
                    badge = "Lite",
                    speed = "Ultra"
                ),
                AiModel(
                    id = "gemini-2.5-pro",
                    name = "Gemini 2.5 Pro",
                    provider = "Google",
                    description = "High precision deep reasoning",
                    badge = "Pro",
                    speed = "High"
                ),
                AiModel(
                    id = "gemini-2.5-flash",
                    name = "Gemini 2.5 Flash",
                    provider = "Google",
                    description = "Lightweight efficient default model",
                    badge = "Default",
                    speed = "Very High"
                )
            )
        ),
        ModelProvider(
            id = "gpt",
            name = "GPT",
            tagline = "OpenAI Flagship Intelligence",
            badge = "OPENAI",
            models = listOf(
                AiModel(
                    id = "openai/gpt-4o-mini",
                    name = "GPT-4o Mini",
                    provider = "OpenAI",
                    description = "Affordable & fast intelligent assistant",
                    badge = "Mini",
                    speed = "Very High"
                ),
                AiModel(
                    id = "openai/gpt-4o",
                    name = "GPT-4o",
                    provider = "OpenAI",
                    description = "State of the art reasoning & coding",
                    badge = "Flagship",
                    speed = "High"
                )
            )
        ),
        ModelProvider(
            id = "llama",
            name = "Llama",
            tagline = "Meta Open Source Models",
            badge = "META",
            models = listOf(
                AiModel(
                    id = "meta-llama/llama-3.3-70b-instruct",
                    name = "Llama 3.3 70B",
                    provider = "Meta",
                    description = "Open source powerhouse with exceptional versatility",
                    badge = "Open",
                    speed = "High"
                ),
                AiModel(
                    id = "meta-llama/llama-3.1-8b-instruct",
                    name = "Llama 3.1 8B",
                    provider = "Meta",
                    description = "Fast open source lightweight model",
                    badge = "Fast",
                    speed = "Very High"
                )
            )
        )
    )

    val LIST: List<AiModel> = PROVIDERS.flatMap { it.models }

    fun getById(id: String): AiModel {
        return LIST.find { it.id == id } ?: LIST.first()
    }
}
