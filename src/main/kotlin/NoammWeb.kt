import bio.BioPage
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.html.*
import io.ktor.server.netty.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import java.util.concurrent.TimeUnit

object NoammWeb {
    private val cacheTime = TimeUnit.HOURS.toMillis(24)

    @JvmStatic
    fun main(args: Array<String>) {
        val port = System.getenv("PORT")?.toInt() ?: 3000

        embeddedServer(Netty, port) {
            routing {
                get("/") {
                    call.response.header("Cache-Control", "public, s-maxage=${cacheTime}")
                    call.respondHtml(HttpStatusCode.OK, BioPage::get)
                }
            }
        }.start(wait = true)
    }

    fun readFile(filePath: String): String {
        return this::class.java.getResource(filePath)?.readText()
            ?: throw Exception("could not find file: $filePath")
    }
}