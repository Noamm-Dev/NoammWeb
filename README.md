# NoammWeb

A full-stack web application with a Kotlin backend and a React frontend.

## Tech Stack

### Frontend
- React 19 & React Router
- TypeScript & Vite
- Tailwind CSS 4
- Three.js & Skinview3d (for 3D rendering)

### Backend
- Kotlin 2.4
- Ktor 3.6 (CIO engine) for the cosmetics API
- SQLite (Exposed, HikariCP, Flyway migrations)
- Gradle (with ShadowJar for fat JAR generation)

## Setup and Building

### Requirements
- Node.js & npm
- JDK 21 or newer

### Build Process
The frontend is hosted on Cloudflare Pages and built with `npm run build`.

The backend lives in a private repository, linked as a git submodule at `src/backend`. It's skipped by a plain `git submodule update`, so fetch it explicitly (requires access):
```bash
git submodule update --init --checkout src/backend
```
It's a standalone Gradle project: run `./gradlew build` inside `src/backend` to get `src/backend/build/libs/Velox.jar`.

## Project Structure
- `src/frontend/`: Contains the React application (TypeScript, Vite, Tailwind CSS).
- `src/backend/`: Ktor backend (private submodule). Serves the cosmetics API.
- `build.gradle.kts`: Configures the `buildReact` task which handles the Vite build process.
- `package.json`: Manages the frontend dependencies and Vite scripts.