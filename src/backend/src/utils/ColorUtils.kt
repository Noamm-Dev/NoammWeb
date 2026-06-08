package utils

fun rgbaToHex(color: List<Float>): String {
    val r = (color[0] * 255).toInt()
    val g = (color[1] * 255).toInt()
    val b = (color[2] * 255).toInt()
    return "#%02X%02X%02X".format(r, g, b)
}

fun hexToRgb(hex: String): Triple<Int, Int, Int> {
    val clean = hex.removePrefix("#")
    return Triple(
        clean.substring(0, 2).toInt(16),
        clean.substring(2, 4).toInt(16),
        clean.substring(4, 6).toInt(16)
    )
}

fun lerp(start: Int, end: Int, t: Double) = (start + (end - start) * t).toInt()

fun rgbToHex(r: Int, g: Int, b: Int) = "#%02X%02X%02X".format(r.coerceIn(0, 255), g.coerceIn(0, 255), b.coerceIn(0, 255))

fun String.toLegacyHex(prefix: String = "&"): String {
    val hex = removePrefix("#")
    return buildString {
        append("${prefix}x")
        hex.forEach { append(prefix).append(it) }
    }
}