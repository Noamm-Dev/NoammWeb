import { memo, useMemo } from "react"
import { renderMinecraftText } from "../lib/minecraft-text"

interface MinecraftTextPreviewProps {
  value: string
  className?: string
  emptyLabel?: string
}

export const MinecraftTextPreview = memo(({ className = "", emptyLabel = "No custom name", value }: MinecraftTextPreviewProps) => {
  const normalizedValue = value.trim()
  const renderedValue = useMemo(() => (
      normalizedValue ? renderMinecraftText(normalizedValue) : emptyLabel),
    [ emptyLabel, normalizedValue ]
  )

  return (
    <div
      className={ `minecraft-preview ${ className } ${
        normalizedValue ? "" : "minecraft-preview-empty"
      }` }
    >
      { renderedValue }
    </div>
  )
})