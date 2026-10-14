import { useLocation } from "react-router-dom"
import { MinecraftTextPreview } from "../components/MinecraftTextPreview"

export function NotFoundPage() {
  const { pathname } = useLocation()
  const chatMessage = JSON.stringify([
    { text: "Unknown or incomplete command, see below for error\n", color: "red" },
    { text: decodePath(pathname), color: "gray" },
    { text: "<--[HERE]", color: "red", italic: true }
  ])

  return (
    <main className="grid min-h-[calc(100vh-6rem)] place-items-center px-4 pt-10 pb-[20vh]">
      <div className="w-fit max-w-2xl font-['Minecraft'] [-webkit-font-smoothing:none]">
        <h1 className="text-4xl leading-tight text-white [text-shadow:0.1em_0.1em_0_#3f3f3f] sm:text-5xl">
          This page doesn't exist
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[#aaaaaa] [text-shadow:0.1em_0.1em_0_#2a2a2a]">
          The link might be broken or the page was moved. Check the address, or use the menu above.
        </p>

        <MinecraftTextPreview
          className="mt-7 rounded-none! border-0!"
          value={ chatMessage }
        />
        <p className="mt-2 text-sm text-[#555555] [text-shadow:0.1em_0.1em_0_#151515]">
          Error 404: Not Found
        </p>
      </div>
    </main>
  )
}

function decodePath(pathname: string) {
  try {
    return decodeURIComponent(pathname)
  }
  catch {
    return pathname
  }
}