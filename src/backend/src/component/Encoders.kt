package component

import kotlinx.serialization.json.Json
import utils.rgbaToHex
import utils.toLegacyHex

object Encoders {
    fun birdflopJson(comp: TextComponent): String = with(comp) {
        if (extra.isEmpty()) return Json.encodeToString(BirdflopGradient(colors = listOf(BirdflopGradient.GradientStop("#FFFFFF", 0.0)), text = text))

        val colors = extra.mapIndexedNotNull { index, part ->
            part.color?.let {
                BirdflopGradient.GradientStop(
                    hex = it.uppercase(),
                    pos = if (extra.size == 1) 0.0 else index.toDouble() / (extra.size - 1) * 100.0
                )
            }
        }

        val shadowColors = extra.takeIf { it.any { p -> p.shadow_color != null } }?.mapIndexedNotNull { index, part ->
            part.shadow_color?.let { rgba ->
                BirdflopGradient.GradientStop(
                    hex = rgbaToHex(rgba),
                    pos = if (extra.size == 1) 0.0 else index.toDouble() / (extra.size - 1) * 100.0
                )
            }
        }

        val first = extra.first()
        return Json.encodeToString(
            BirdflopGradient(
                colors = colors,
                shadowcolors = shadowColors,
                text = plainText,
                bold = first.bold,
                italic = first.italic,
                underline = first.underlined,
                strikethrough = first.strikethrough,
                obfuscate = first.obfuscated
            )
        )
    }

    fun miniMessage(comp: TextComponent) = comp.extra.joinToString("") {
        buildString {
            it.color?.let { c -> append("<$c>") }
            append(it.formattingCodes())
            append(it.text)
        }
    }

    fun hexAmpersand(comp: TextComponent) = comp.extra.joinToString("") { "${it.color?.let { c -> "&#${c.removePrefix("#")}" } ?: ""}${it.formattingCodes()}${it.text}" }
    fun legacySpigot(comp: TextComponent) = comp.extra.joinToString("") { "${it.color?.toLegacyHex() ?: ""}${it.formattingCodes()}${it.text}" }
    fun legacySection(comp: TextComponent) = comp.extra.joinToString("") { "${it.color?.toLegacyHex("§") ?: ""}${it.formattingCodes("§")}${it.text}" }

    private fun ExtraComponent.formattingCodes(prefix: String = "&") = buildString {
        if (bold == true) append("${prefix}l")
        if (italic == true) append("${prefix}o")
        if (underlined == true) append("${prefix}n")
        if (strikethrough == true) append("${prefix}m")
        if (obfuscated == true) append("${prefix}k")
    }
}