rootProject.name = "NoammWeb"

include(":frontend", ":backend")

project(":frontend").projectDir = file("src/frontend")
project(":backend").projectDir = file("src/backend")