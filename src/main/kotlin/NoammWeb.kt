import bio.BioPage
import database.DatabasePage
import io.ktor.http.HttpStatusCode
import io.ktor.server.application.call
import io.ktor.server.application.createApplicationPlugin
import io.ktor.server.application.install
import io.ktor.server.engine.embeddedServer
import io.ktor.server.html.respondHtml
import io.ktor.server.netty.Netty
import io.ktor.server.response.header
import io.ktor.server.routing.get
import io.ktor.server.routing.routing
import java.util.concurrent.*

object NoammWeb {
    private val cacheTime = TimeUnit.HOURS.toMillis(24)

    @JvmStatic
    fun main(args: Array<String>) {
        val port = System.getenv("PORT")?.toInt() ?: 3000

        embeddedServer(Netty, port) {
            install(createApplicationPlugin("CORS") {
                onCallRespond { call ->
                    call.response.header("Access-Control-Allow-Origin", "*")
                    call.response.header("Access-Control-Allow-Headers", "*")
                    call.response.header("Access-Control-Allow-Methods", "*")
                }
            })

            routing {
                get("/") {
                    call.response.header("Cache-Control", "public, s-maxage=${cacheTime}")
                    call.respondHtml(HttpStatusCode.OK, BioPage::get)
                }

                get("/database") {
                    call.response.header("Cache-Control", "public, s-maxage=${cacheTime}")
                    call.respondHtml(HttpStatusCode.OK, DatabasePage::get)
                }
            }
        }.start(wait = true)
    }

    fun readFile(filePath: String): String {
        return this::class.java.getResource(filePath)?.readText()
            ?: throw Exception("could not find file: $filePath")
    }
}