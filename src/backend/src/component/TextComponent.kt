package component

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class TextComponent(val text: String = "", val extra: List<ExtraComponent> = emptyList()) {
    val plainText by lazy {
        buildString {
            append(text)
            extra.forEach { append(it.text) }
        }
    }

    companion object {
        private val json = Json { encodeDefaults = true }
        private val miniDetectRegex = Regex("""<[#A-Za-z0-9_:/]+>""")
        private val hexDetectRegex = Regex("""&#[0-9A-Fa-f]{6}""")
        private val legacyDetectRegex = Regex("""[&§]x(?:[&§][0-9A-Fa-f]){6}""")

        fun encode(format: Format, component: TextComponent) = when (format) {
            Format.JSON -> json.encodeToString(component)
            Format.BIRDFLOP_JSON -> Encoders.birdflopJson(component)
            Format.MINI_MESSAGE -> Encoders.miniMessage(component)
            Format.AMPERSAND_HEX -> Encoders.hexAmpersand(component)
            Format.LEGACY_HEX -> Encoders.legacySpigot(component)
            Format.LEGACY_SECTION -> Encoders.legacySection(component)
        }

        fun decode(input: String): TextComponent {
            val trimmed = input.trim()
            return when {
                trimmed.contains("\"version\"") && trimmed.contains("\"colors\"") && trimmed.contains("\"text\"") -> Decoders.birdflopGradient(trimmed)
                trimmed.startsWith("{") -> json.decodeFromString(trimmed)
                miniDetectRegex.containsMatchIn(trimmed) -> Decoders.miniMessage(trimmed)
                hexDetectRegex.containsMatchIn(trimmed) -> Decoders.ampersandHex(trimmed)
                legacyDetectRegex.containsMatchIn(trimmed) -> Decoders.legacyHex(trimmed)
                else -> TextComponent(text = trimmed)
            }
        }
    }
}