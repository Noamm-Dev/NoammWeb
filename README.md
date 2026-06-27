# NoammWeb

A full-stack web application with a Kotlin backend and a React frontend.

## Tech Stack

### Frontend
- React 19 & React Router
- TypeScript & Vite
- Tailwind CSS 4
- Three.js & Skinview3d (for 3D rendering)

### Backend
- Kotlin 2.2
- Ktor 2.3 (CIO engine) for serving the application and static files
- Gradle (with ShadowJar for fat JAR generation)

## Setup and Building

### Requirements
- Node.js & npm (for frontend dependencies)
- JDK 17 or newer

### Build Process
The Gradle build is configured to automatically install npm dependencies, build the React frontend, and embed the compiled static assets into the backend JAR.

To build the project and generate the executable JAR:
```bash
./gradlew build
```
The resulting fat JAR will be located at `build/libs/NoammWeb.jar`.

### Run
The application looks for a `PORT` environment variable, defaulting to 3000 if not set.
```bash
java -jar build/libs/NoammWeb.jar
```

## Project Structure
- `src/frontend/`: Contains the React application (TypeScript, Vite, Tailwind CSS).
- `src/backend/src/NoammWeb.kt`: Server entry point. Serves the built frontend as a single-page application.
- `build.gradle.kts`: Configures the Kotlin backend, ShadowJar, and the `buildReact` task which handles the Vite build process.
- `package.json`: Manages the frontend dependencies and Vite scripts.