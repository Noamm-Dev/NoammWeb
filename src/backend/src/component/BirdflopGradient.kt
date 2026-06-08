package component

import kotlinx.serialization.Serializable

@Serializable
data class BirdflopGradient(
    val version: Int = 4,
    val colors: List<GradientStop>,
    val shadowcolors: List<GradientStop>? = null,
    val text: String,
    val format: BirdflopFormat = BirdflopFormat(),
    val bold: Boolean? = null,
    val italic: Boolean? = null,
    val underline: Boolean? = null,
    val strikethrough: Boolean? = null,
    val obfuscate: Boolean? = null
) {
    @Serializable data class GradientStop(val hex: String, val pos: Double)
    @Serializable data class BirdflopFormat(val color: String = "JSON")
}