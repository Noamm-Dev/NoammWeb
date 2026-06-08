package component

import kotlinx.serialization.json.Json
import utils.hexToRgb
import utils.lerp
import utils.rgbToHex

object Decoders {
    fun birdflopGradient(input: String): TextComponent {
        val gradient = Json.decodeFromString<BirdflopGradient>(input)
        val chars = gradient.text.codePoints().toArray().map { String(Character.toChars(it)) }

        val extras = chars.mapIndexed { index, char ->
            val position =
                if (chars.size <= 1) 0.0
                else index.toDouble() / (chars.size - 1) * 100.0

            ExtraComponent(
                text = char,
                color = interpolateColor(gradient.colors, position),
                bold = gradient.bold,
                italic = gradient.italic,
                underlined = gradient.underline,
                strikethrough = gradient.strikethrough,
                obfuscated = gradient.obfuscate,
                shadow_color = gradient.shadowcolors?.let { interpolateShadowColor(it, position) }
            )
        }
        return TextComponent(extra = extras)
    }

    fun miniMessage(input: String): TextComponent {
        val extras = mutableListOf<ExtraComponent>()
        var i = 0
        var currentHex: String? = null
        var bold = false
        var italic = false
        var underlined = false
        var strikethrough = false
        var obfuscated = false

        while (i < input.length) {
            if (input[i] == '<') {
                val closeBracket = input.indexOf('>', i)
                if (closeBracket != -1) {
                    val tag = input.substring(i + 1, closeBracket).lowercase()
                    when {
                        tag.startsWith("#") -> currentHex = tag.uppercase()
                        tag.startsWith("/") -> {
                            val inner = tag.substring(1)
                            when (inner) {
                                "b" -> bold = false
                                "i" -> italic = false
                                "u" -> underlined = false
                                "st" -> strikethrough = false
                                "obf" -> obfuscated = false
                                "gradient" -> {}
                                else -> if (inner.startsWith("#")) currentHex = null
                            }
                        }
                        tag == "b" -> bold = true
                        tag == "i" -> italic = true
                        tag == "u" -> underlined = true
                        tag == "st" -> strikethrough = true
                        tag == "obf" -> obfuscated = true
                        tag.startsWith("gradient:") -> {
                            val parts = tag.substring(9).split(":")
                            if (parts.isNotEmpty()) currentHex = parts[0].uppercase()
                        }
                        tag.startsWith("shadow:") -> {
                            val parts = tag.substring(7).split(":")
                            if (parts.isNotEmpty()) currentHex = parts[0].uppercase()
                        }
                    }
                    i = closeBracket + 1
                    continue
                }
            }

            if (input[i] == '&' || input[i] == '§') {
                val (fmt, nextI) = readFormatting(input, i)
                if (nextI > i) {
                    if (fmt.bold) bold = true
                    if (fmt.italic) italic = true
                    if (fmt.underlined) underlined = true
                    if (fmt.strikethrough) strikethrough = true
                    if (fmt.obfuscated) obfuscated = true
                    i = nextI
                    continue
                }
            }

            val (char, nextI) = readChar(input, i)
            if (char.isNotEmpty()) {
                extras += ExtraComponent(
                    text = char,
                    color = currentHex,
                    bold = if (bold) true else null,
                    italic = if (italic) true else null,
                    underlined = if (underlined) true else null,
                    strikethrough = if (strikethrough) true else null,
                    obfuscated = if (obfuscated) true else null
                )
            }
            i = nextI
        }
        return TextComponent(extra = extras)
    }

    fun ampersandHex(input: String): TextComponent {
        val extras = mutableListOf<ExtraComponent>()
        var i = 0
        while (i < input.length) {
            if (input[i] == '&' && i + 7 < input.length && input[i + 1] == '#') {
                val hex = input.substring(i + 2, i + 8)
                if (hex.matches(Regex("[0-9A-Fa-f]{6}"))) {
                    i += 8
                    val (fmt, i2) = readFormatting(input, i); i = i2
                    val (char, i3) = readChar(input, i); i = i3
                    if (char.isNotEmpty()) extras += fmt.toExtra(char, "#${hex.uppercase()}")
                }
                else i ++
            }
            else i ++
        }
        return TextComponent(extra = extras)
    }

    fun legacyHex(input: String): TextComponent {
        val extras = mutableListOf<ExtraComponent>()
        var i = 0
        while (i < input.length) {
            val c = input[i]
            if ((c == '&' || c == '§') && i + 13 < input.length && input[i + 1].lowercaseChar() == 'x') {
                val validSeps = (0 until 6).all { j ->
                    val sep = input[i + 2 + j * 2]
                    sep == '&' || sep == '§'
                }
                val hex = buildString { for (j in 0 until 6) append(input[i + 3 + j * 2]) }
                if (validSeps && hex.matches(Regex("[0-9A-Fa-f]{6}"))) {
                    i += 14
                    val (fmt, i2) = readFormatting(input, i); i = i2
                    val (char, i3) = readChar(input, i); i = i3
                    if (char.isNotEmpty()) extras += fmt.toExtra(char, "#${hex.uppercase()}")
                }
                else i ++
            }
            else i ++
        }
        return TextComponent(extra = extras)
    }


    private fun readFormatting(input: String, start: Int): Pair<Formatting, Int> {
        var i = start
        var bold = false
        var italic = false
        var underlined = false
        var strikethrough = false
        var obfuscated = false
        while (i + 1 < input.length && (input[i] == '&' || input[i] == '§')) {
            when (input[i + 1].lowercaseChar()) {
                'l' -> bold = true
                'o' -> italic = true
                'n' -> underlined = true
                'm' -> strikethrough = true
                'k' -> obfuscated = true
                else -> break
            }
            i += 2
        }
        return Pair(Formatting(bold, italic, underlined, strikethrough, obfuscated), i)
    }

    private fun readChar(input: String, index: Int) = when {
        index >= input.length -> Pair("", index)
        index + 1 < input.length && Character.isHighSurrogate(input[index]) && Character.isLowSurrogate(input[index + 1]) ->
            Pair(input.substring(index, index + 2), index + 2)

        else -> Pair(input[index].toString(), index + 1)
    }

    private data class Formatting(
        val bold: Boolean = false,
        val italic: Boolean = false,
        val underlined: Boolean = false,
        val strikethrough: Boolean = false,
        val obfuscated: Boolean = false,
    ) {
        fun toExtra(char: String, color: String) = ExtraComponent(
            text = char,
            color = color,
            bold = if (bold) true else null,
            italic = if (italic) true else null,
            underlined = if (underlined) true else null,
            strikethrough = if (strikethrough) true else null,
            obfuscated = if (obfuscated) true else null,
        )
    }

    private fun interpolateColor(stops: List<BirdflopGradient.GradientStop>, position: Double): String {
        if (stops.isEmpty()) return "#FFFFFF"
        if (position <= stops.first().pos) return stops.first().hex.uppercase()
        if (position >= stops.last().pos) return stops.last().hex.uppercase()
        val right = stops.first { it.pos >= position }
        val left = stops.last { it.pos <= position }
        if (left == right) return left.hex.uppercase()
        val t = (position - left.pos) / (right.pos - left.pos)
        val l = hexToRgb(left.hex)
        val r = hexToRgb(right.hex)
        return rgbToHex(lerp(l.first, r.first, t), lerp(l.second, r.second, t), lerp(l.third, r.third, t))
    }

    private fun interpolateShadowColor(stops: List<BirdflopGradient.GradientStop>, position: Double): List<Float> {
        val (r, g, b) = hexToRgb(interpolateColor(stops, position))
        return listOf(r / 255f, g / 255f, b / 255f, 1f)
    }
}