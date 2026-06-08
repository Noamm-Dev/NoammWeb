package component

import kotlinx.serialization.Serializable

@Serializable
data class ExtraComponent(
    val text: String,
    val color: String? = null,
    val bold: Boolean? = null,
    val italic: Boolean? = null,
    val underlined: Boolean? = null,
    val strikethrough: Boolean? = null,
    val obfuscated: Boolean? = null,
    val shadow_color: List<Float>? = null
)