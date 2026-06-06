import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.defaultheaders.*
import io.ktor.server.routing.*
import io.ktor.server.http.content.*
import java.util.concurrent.TimeUnit

object NoammWeb {
    private val cacheTime = TimeUnit.HOURS.toMillis(24)

    @JvmStatic
    fun main(args: Array<String>) {
        val port = System.getenv("PORT")?.toInt() ?: 3000

        embeddedServer(Netty, port) {
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