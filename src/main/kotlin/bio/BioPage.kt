package bio

import NoammWeb
import interfaces.WebPage
import kotlinx.html.*

object BioPage: WebPage() {
    val style by lazy { NoammWeb.readFile("bio/style.css") }
    val script by lazy { NoammWeb.readFile("bio/script.js") }

    override fun HTML.page() {
        head {
            title("Noamm | Bio")
            link(rel = "icon", href = "https://minotar.net/helm/Noamm/64.png", type = "image/png")
            link(rel = "preconnect", href = "https://fonts.googleapis.com")
            link(rel = "preconnect", href = "https://fonts.gstatic.com") { attributes["crossorigin"] = "anonymous" }
            link(href = "https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap", rel = "stylesheet")
            style { unsafe { + this@BioPage.style } }
        }
        body {
            div("background")
            div("container") {
                div("card") {
                    header {
                        img(src = "https://github.com/Noamm9.png") {
                            classes = setOf("profile-pic")
                            alt = "Profile Picture"
                        }
                        h1 { + "Noamm" }
                    }

                    nav("tabs") {
                        button(classes = "tab-btn active") {
                            attributes["data-tab"] = "links"
                            + "Links"
                        }
                        button(classes = "tab-btn") {
                            attributes["data-tab"] = "projects"
                            + "Projects"
                        }
                        button(classes = "tab-btn") {
                            attributes["data-tab"] = "extras"
                            + "Extras"
                        }
                    }

                    div("content") {
                        div("tab-content active") {
                            id = "links"
                            div("info-grid") {
                                div("info-item") {
                                    span("label") { + "Age" }
                                    span("value") { + "18" }
                                }
                                div("info-item") {
                                    span("label") { + "Pronouns" }
                                    span("value") { + "He/Him" }
                                }
                                div("info-item") {
                                    span("label") { + "Location" }
                                    span("value") { + "Israel" }
                                }
                            }
                            div("tags") {
                                span("tag") { + "Developer" }
                                span("tag") { + "Weeb" }
                                span("tag") { + "Gamer" }
                            }
                            div("buttons") {
                                a(href = "https://discord.gg/bSNngAdpQF", target = "_blank") {
                                    classes = setOf("btn", "discord")
                                    + "Discord"
                                }
                                a(href = "https://github.com/Noamm9", target = "_blank") {
                                    classes = setOf("btn", "github")
                                    + "GitHub"
                                }
                                a(href = "https://www.paypal.com/paypalme/aziz6540", target = "_blank") {
                                    classes = setOf("btn", "paypal")
                                    + "PayPal"
                                }
                            }
                        }

                        div("tab-content") {
                            id = "projects"
                            div("project-list") {
                                a(href = "https://github.com/Noamm9/NoammAddons", target = "_blank", classes = "project-card") {
                                    h3 { + "NoammAddons" }
                                }
                                a(href = "https://github.com/Noamm9/Noamm-Squared", target = "_blank", classes = "project-card") {
                                    h3 { + "Noamm-Squared" }
                                }
                                a(href = "https://github.com/Noamm9/NVGRenderer", target = "_blank", classes = "project-card") {
                                    h3 { + "NVGRenderer" }
                                }
                            }
                        }

                        div("tab-content") {
                            id = "extras"
                            div("buttons") {
                                a(href = "https://www.youtube.com/@PanddaBoyy", target = "_blank") {
                                    classes = setOf("btn", "youtube")
                                    + "YouTube"
                                }
                                a(href = "https://steamcommunity.com/id/207979311", target = "_blank") {
                                    classes = setOf("btn", "steam")
                                    + "Steam"
                                }
                            }
                        }
                    }
                }
            }

            script { unsafe { + this@BioPage.script } }
        }
    }
}
