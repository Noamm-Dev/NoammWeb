repositories { mavenCentral() }

plugins {
    kotlin("jvm") version "1.9.23"
    id("com.github.johnrengelman.shadow") version "8.1.1"
}

dependencies {
    val ktorVersion = "2.3.10"
    implementation("ch.qos.logback:logback-classic:1.4.11")
    implementation("io.ktor:ktor-server-core-jvm:$ktorVersion")
    implementation("io.ktor:ktor-server-netty-jvm:$ktorVersion")
    implementation("io.ktor:ktor-server-html-builder-jvm:$ktorVersion")
}

tasks.jar { enabled = false }
tasks.shadowJar {
    manifest { attributes["Main-Class"] = rootProject.name }
    archiveBaseName.set(rootProject.name)
    archiveClassifier.set("")
    archiveVersion.set("")
    
    isPreserveFileTimestamps = false
    isReproducibleFileOrder = true
}

tasks.build.get().dependsOn(tasks.shadowJar)