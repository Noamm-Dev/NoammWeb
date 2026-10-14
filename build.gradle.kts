import com.github.gradle.node.NodeExtension
import com.github.gradle.node.npm.task.NpmTask

plugins {
    id("com.github.node-gradle.node") version "7.1.0" apply false
}

plugins.apply("com.github.node-gradle.node")

configure<NodeExtension> {
    download.set(false)
    nodeProjectDir.set(file(projectDir))
}

val buildReact = tasks.register<NpmTask>("buildReact") {
    dependsOn(tasks.named("npmInstall"))
    args.set(listOf("run", "build"))
    inputs.dir(file("src/frontend"))
    inputs.file(file("package.json"))
    outputs.dir(file("dist"))
}