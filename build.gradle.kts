import com.github.gradle.node.NodeExtension
import com.github.gradle.node.npm.task.NpmTask
import com.github.jengelman.gradle.plugins.shadow.tasks.ShadowJar
import org.gradle.jvm.tasks.Jar

plugins {
    kotlin("jvm") version "2.2.0" apply false
    kotlin("plugin.serialization") version "2.2.0" apply false
    id("com.github.johnrengelman.shadow") version "8.1.1" apply false
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

val reactConfiguration: Configuration by configurations.creating {
    isCanBeConsumed = true
    isCanBeResolved = false
}

artifacts {
    add(reactConfiguration.name, file("dist")) {
        builtBy(buildReact)
    }
}

project(":backend") {
    layout.buildDirectory.set(rootProject.layout.buildDirectory)

    plugins.apply("org.jetbrains.kotlin.jvm")
    plugins.apply("org.jetbrains.kotlin.plugin.serialization")
    plugins.apply("com.github.johnrengelman.shadow")

    configure<SourceSetContainer> {
        named("main") {
            java.srcDirs("src")
            resources.srcDirs("resources")
        }
        named("test") {
            java.srcDirs("test")
        }
    }

    repositories {
        mavenCentral()
    }

    val ktorVersion = "2.3.10"
    dependencies {
        add("implementation", "ch.qos.logback:logback-classic:1.4.11")
        add("implementation", "io.ktor:ktor-server-core-jvm:$ktorVersion")
        add("implementation", "io.ktor:ktor-server-cio:$ktorVersion")
        add("implementation", "io.ktor:ktor-server-default-headers:$ktorVersion")
    }

    val reactClient by configurations.creating {
        isCanBeConsumed = false
        isCanBeResolved = true
    }

    dependencies {
        add("reactClient", project(":", configuration = "reactConfiguration"))
    }

    tasks.withType<ProcessResources> {
        dependsOn(reactClient)
        from(reactClient) {
            into("static")
        }
    }

    tasks.withType<Test> {
        useJUnit()
    }

    tasks.named<Jar>("jar") { enabled = false }

    tasks.withType<ShadowJar> {
        manifest { attributes["Main-Class"] = rootProject.name }
        archiveBaseName.set(rootProject.name)
        archiveClassifier.set("")
        archiveVersion.set("")
        isPreserveFileTimestamps = false
        isReproducibleFileOrder = true
    }

    tasks.named("build").get().dependsOn(tasks.named("shadowJar"))
}