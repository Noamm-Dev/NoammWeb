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

The backend lives in the private [Velox](https://github.com/Noamm-Dev/Velox) repository, which builds and deploys it on its own.

## Project Structure
- `src/frontend/`: Contains the React application (TypeScript, Vite, Tailwind CSS).
- `build.gradle.kts`: Configures the `buildReact` task which handles the Vite build process.
- `package.json`: Manages the frontend dependencies and Vite scripts.