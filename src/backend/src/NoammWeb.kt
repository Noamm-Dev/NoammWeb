import io.ktor.server.application.install
import io.ktor.server.cio.CIO
import io.ktor.server.engine.embeddedServer
import io.ktor.server.http.content.singlePageApplication
import io.ktor.server.plugins.defaultheaders.DefaultHeaders
import io.ktor.server.routing.routing
import java.util.concurrent.*

object NoammWeb {
    private val cacheTime = TimeUnit.HOURS.toMillis(24)

    @JvmStatic
    fun main(args: Array<String>) {
        val port = System.getenv("PORT")?.toInt() ?: 3000

        embeddedServer(CIO, port) {
            install(DefaultHeaders) {
                header("X-Engine", "Ktor")
                header("Cache-Control", "public, s-maxage=$cacheTime")
            }

            routing {
                singlePageApplication {
                    useResources = true
                    filesPath = "static"
                    defaultPage = "index.html"
                }
            }
        }.start(wait = true)
    }
}