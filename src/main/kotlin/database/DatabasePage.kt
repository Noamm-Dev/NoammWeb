package database

import NoammWeb
import interfaces.WebPage
import kotlinx.html.*

object DatabasePage: WebPage() {
    val styleCss by lazy { NoammWeb.readFile("bio/style.css") }
    val scriptJs by lazy { NoammWeb.readFile("bio/script.js") }

    override fun HTML.page() {
        head {
            title("Noamm | Database")
            link("https://minotar.net/helm/Noamm/64.png", "icon", "image/png")
            link("https://fonts.googleapis.com", "preconnect")
            link("https://fonts.gstatic.com", "preconnect") { attributes["crossorigin"] = "anonymous" }
            link("https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap", "stylesheet")
            style { unsafe { + styleCss } }
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
                                a("https://discord.gg/bSNngAdpQF", "_blank", "project-card") {
                                    classes = setOf("btn", "discord")
                                    + "Discord"
                                }
                                a("https://github.com/Noamm9", "_blank", "project-card") {
                                    classes = setOf("btn", "github")
                                    + "GitHub"
                                }
                                a("https://www.paypal.com/paypalme/aziz6540", "_blank", "project-card") {
                                    classes = setOf("btn", "paypal")
                                    + "PayPal"
                                }
                            }
                        }

                        div("tab-content") {
                            id = "projects"
                            div("project-list") {
                                a("https://github.com/Noamm9/NoammAddons", "_blank", "project-card") {
                                    h3 { + "NoammAddons" }
                                }
                                a("https://github.com/Noamm9/Noamm-Squared", "_blank", "project-card") {
                                    h3 { + "Noamm-Squared" }
                                }
                                a("https://github.com/Noamm9/NVGRenderer", "_blank", "project-card") {
                                    h3 { + "NVGRenderer" }
                                }
                            }
                        }

                        div("tab-content") {
                            id = "extras"
                            div("buttons") {
                                a("https://www.youtube.com/@PanddaBoyy", "_blank", "project-card") {
                                    classes = setOf("btn", "youtube")
                                    + "YouTube"
                                }
                                a("https://steamcommunity.com/id/207979311", "_blank", "project-card") {
                                    classes = setOf("btn", "steam")
                                    + "Steam"
                                }
                            }
                        }
                    }
                }
            }

            script { unsafe { + scriptJs } }
        }
    }
}