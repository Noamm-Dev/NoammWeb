package interfaces

import kotlinx.html.HTML

abstract class WebPage {
    fun get(html: HTML) = with(html) { page() }
    abstract fun HTML.page()
}