# NoammWeb

A website System made in Kotlin. 

## Tech Stack
- Kotlin 1.9
- Ktor (Netty engine)
- kotlinx.html for templating
- Gradle (ShadowJar for fat JAR)

## Setup and Building

### Requirements
- JDK 17 or newer

### Build
To build the project and generate the executable JAR:
```bash
./gradlew build
```
The JAR will be located at `build/libs/NoammWeb.jar`.

### Run
The application looks for a `PORT` environment variable, defaulting to 3000 if not set.
```bash
java -jar build/libs/NoammWeb.jar
```

## Project Structure
- `NoammWeb.kt`: Server entry point and routing logic.
- `bio/BioPage.kt`: The HTML template defined via DSL.
- `src/main/resources/bio/`: Static assets (CSS/JS) loaded into the template at runtime.