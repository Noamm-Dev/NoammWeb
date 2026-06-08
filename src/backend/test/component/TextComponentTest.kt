package component

import kotlin.test.Test
import kotlin.test.assertEquals

class TextComponentTest {
    private val expectedPlainText = "ffuchsia🌺"

    @Test
    fun testDecodeJson() {
        val input =
            """{"text":"","extra":[{"text":"f","color":"#FFFFFF","bold":true,"italic":true,"underlined":true,"strikethrough":true,"obfuscated":true,"shadow_color":[1.0,0.0,0.0,1.0]},{"text":"f","color":"#A6F2C4","bold":true,"italic":true,"underlined":true,"strikethrough":true,"obfuscated":true,"shadow_color":[0.6,0.39,0.91,1.0]},{"text":"u","color":"#AEF5CF","bold":true,"italic":true,"underlined":true,"strikethrough":true,"obfuscated":true,"shadow_color":[0.54,0.51,0.87,1.0]},{"text":"c","color":"#B5F9DA","bold":true,"italic":true,"underlined":true,"strikethrough":true,"obfuscated":true,"shadow_color":[0.49,0.64,0.84,1.0]},{"text":"h","color":"#BDFCE5","bold":true,"italic":true,"underlined":true,"strikethrough":true,"obfuscated":true,"shadow_color":[0.43,0.76,0.81,1.0]},{"text":"s","color":"#C4FFF0","bold":true,"italic":true,"underlined":true,"strikethrough":true,"obfuscated":true,"shadow_color":[0.37,0.89,0.77,1.0]},{"text":"i","color":"#C2FFEC","bold":true,"italic":true,"underlined":true,"strikethrough":true,"obfuscated":true,"shadow_color":[0.52,0.86,0.8,1.0]},{"text":"a","color":"#C0FFE9","bold":true,"italic":true,"underlined":true,"strikethrough":true,"obfuscated":true,"shadow_color":[0.66,0.83,0.82,1.0]},{"text":"🌺","color":"#BEFFE5","bold":true,"italic":true,"underlined":true,"strikethrough":true,"obfuscated":true,"shadow_color":[0.8,0.8,0.85,1.0]}]}"""
        val component = TextComponent.decode(input)
        assertEquals(expectedPlainText, component.plainText)
    }

    @Test
    fun testDecodeBirdflopJson() {
        val input = """{"version":4,"colors":[{"hex":"#FFFFFF","pos":0},{"hex":"#A6F2C4","pos":14.285714285714286},{"hex":"#C4FFF0","pos":57.142857142857146},{"hex":"#BCFFE1","pos":100}],"shadowcolors":[{"hex":"#FF0000","pos":0},{"hex":"#9863E7","pos":14.285714285714286},{"hex":"#5FE2C5","pos":57.142857142857146},{"hex":"#F2C6DE","pos":100}],"text":"ffuchsia🌺","format":{"color":"JSON"},"bold":true,"italic":true,"underline":true,"strikethrough":true,"obfuscate":true}"""
        val component = TextComponent.decode(input)
        assertEquals(expectedPlainText, component.plainText)
    }

    @Test
    fun testDecodeMiniMessage() {
        val input = """<obf><st><u><i><b><gradient:#FFFFFF:#A6F2C4><shadow:#FF0000:1>f</shadow></gradient><gradient:#A6F2C4:#C4FFF0><shadow:#9863E7:1>f</shadow><shadow:#8A83DF:1>u</shadow><shadow:#7CA3D6:1>c</shadow><shadow:#6DC2CE:1>h</shadow><shadow:#5FE2C5:1>s</shadow></gradient><gradient:#C4FFF0:#BCFFE1><shadow:#90D9CD:1>i</shadow><shadow:#C1CFD6:1>a</shadow><shadow:#F2C6DE:1>🌺</shadow></gradient></b></i></u></st></obf>"""
        val component = TextComponent.decode(input)
        assertEquals(expectedPlainText, component.plainText)
    }

    @Test
    fun testDecodeAmpersandHex() {
        val input = "&#FFFFFF&l&o&n&m&kf&#A6F2C4&l&o&n&m&kf&#AEF5CF&l&o&n&m&ku&#B5F9DA&l&o&n&m&kc&#BDFCE5&l&o&n&m&kh&#C4FFF0&l&o&n&m&ks&#C2FFEC&l&o&n&m&ki&#C0FFE9&l&o&n&m&ka&#BEFFE5&l&o&n&m&k🌺"
        val component = TextComponent.decode(input)
        assertEquals(expectedPlainText, component.plainText)
    }

    @Test
    fun testDecodeLegacySectionHex() {
        val input = "§x§F§F§F§F§F§F§l§o§n§m§kf§x§A§6§F§2§C§4§l§o§n§m§kf§x§A§E§F§5§C§F§l§o§n§m§ku§x§B§5§F§9§D§A§l§o§n§m§kc§x§B§D§F§C§E§5§l§o§n§m§kh§x§C§4§F§F§F§0§l§o§n§m§ks§x§C§2§F§F§E§C§l§o§n§m§ki§x§C§0§F§F§E§9§l§o§n§m§ka§x§B§E§F§F§E§5§l§o§n§m§k🌺"
        val component = TextComponent.decode(input)
        assertEquals(expectedPlainText, component.plainText)
    }

    @Test
    fun testDecodeLegacyAmpersandHex() {
        val input = "&x&F&F&F&F&F&F&l&o&n&m&kf&x&A&6&F&2&C&4&l&o&n&m&kf&x&A&E&F&5&C&F&l&o&n&m&ku&x&B&5&F&9&D&A&l&o&n&m&kc&x&B&D&F&C&E&5&l&o&n&m&kh&x&C&4&F&F&F&0&l&o&n&m&ks&x&C&2&F&F&E&C&l&o&n&m&ki&x&C&0&F&F&E&9&l&o&n&m&ka&x&B&E&F&F&E&5&l&o&n&m&k🌺"
        val component = TextComponent.decode(input)
        assertEquals(expectedPlainText, component.plainText)
    }

    @Test
    fun testDecodeTagHex() {
        val input = "<#FFFFFF>&l&o&n&m&kf<#A6F2C4>&l&o&n&m&kf<#AEF5CF>&l&o&n&m&ku<#B5F9DA>&l&o&n&m&kc<#BDFCE5>&l&o&n&m&kh<#C4FFF0>&l&o&n&m&ks<#C2FFEC>&l&o&n&m&ki<#C0FFE9>&l&o&n&m&ka<#BEFFE5>&l&o&n&m&k🌺"
        val component = TextComponent.decode(input)
        assertEquals(expectedPlainText, component.plainText)
    }
}