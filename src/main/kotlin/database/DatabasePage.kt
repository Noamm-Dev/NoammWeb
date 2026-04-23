package database

import NoammWeb
import bio.BioPage.styleCss
import interfaces.WebPage
import kotlinx.html.*

object DatabasePage: WebPage() {
    private val bioStyleCss by lazy { NoammWeb.readFile("bio/style.css") }
    private val styleCss by lazy { NoammWeb.readFile("database/style.css") }
    private val scriptJs by lazy { NoammWeb.readFile("database/script.js") }

    override fun HTML.page() {
        head {
            title("Noamm | Database")
            link("https://minotar.net/helm/Noamm/64.png", "icon", "image/png")
            link("https://fonts.googleapis.com", "preconnect")
            link("https://fonts.gstatic.com", "preconnect") { attributes["crossorigin"] = "anonymous" }
            link("https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap", "stylesheet")
            style { unsafe { + bioStyleCss } }
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
                        h1 { + "Database Editor" }
                    }

                    div {
                        id = "auth-screen"
                        div("form-group") {
                            label { + "Admin Password" }
                            input(type = InputType.password, classes = "form-control") {
                                id = "password"
                                placeholder = "Enter Password"
                            }
                        }
                        div("buttons") {
                            button(classes = "btn") {
                                attributes["onclick"] = "login()"
                                + "Login"
                            }
                        }
                    }

                    // Application Screen
                    div {
                        id = "app-screen"
                        nav("tabs") {
                            button(classes = "tab tab-btn active") {
                                attributes["onclick"] = "switchTab('list')"
                                + "Entries"
                            }
                            button(classes = "tab tab-btn") {
                                attributes["onclick"] = "switchTab('edit')"
                                + "Add/Edit"
                            }
                        }

                        div("content") {
                            // List Tab
                            div("tab-content active") {
                                id = "tab-list"
                                div("database-grid") {
                                    id = "entries-grid"
                                }
                                div("buttons") {
                                    style = "margin-top: 20px"
                                    button(classes = "btn") {
                                        attributes["onclick"] = "loadData()"
                                        + "Refresh"
                                    }
                                }
                            }

                            // Edit Tab
                            div("tab-content") {
                                id = "tab-edit"
                                form {
                                    id = "edit-form"
                                    attributes["onsubmit"] = "saveEntry(event)"
                                    div("form-group") {
                                        label { + "Minecraft Player UUID" }
                                        input(type = InputType.text, classes = "form-control") {
                                            id = "entry-id"
                                            placeholder = "7ab34814-ef33-4745-9af3-dd3fde6c57cd"
                                            required = true
                                        }
                                    }
                                    div("form-group") {
                                        label { + "Name (JSON Component)" }
                                        input(type = InputType.text, classes = "form-control") {
                                            id = "entry-name"
                                            placeholder = "{\"text\": \"Noamm\", \"color\": \"red\"}"
                                        }
                                    }
                                    div("row") {
                                        div("col form-group") {
                                            label { + "Size X" }
                                            input(type = InputType.number, classes = "form-control") {
                                                id = "entry-x"
                                                step = "0.01"
                                                value = "1.0"
                                            }
                                        }
                                        div("col form-group") {
                                            label { + "Size Y" }
                                            input(type = InputType.number, classes = "form-control") {
                                                id = "entry-y"
                                                step = "0.01"
                                                value = "1.0"
                                            }
                                        }
                                        div("col form-group") {
                                            label { + "Size Z" }
                                            input(type = InputType.number, classes = "form-control") {
                                                id = "entry-z"
                                                step = "0.01"
                                                value = "1.0"
                                            }
                                        }
                                    }
                                    div("buttons") {
                                        button(classes = "btn") {
                                            type = ButtonType.submit
                                            + "Save Entry"
                                        }
                                        button(classes = "btn") {
                                            type = ButtonType.button
                                            attributes["onclick"] = "switchTab('list')"
                                            + "Cancel"
                                        }
                                    }
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