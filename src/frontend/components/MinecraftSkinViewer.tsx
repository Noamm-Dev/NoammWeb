import { useEffect, useRef } from "react"
import { IdleAnimation, SkinViewer as SkinViewer3D } from "skinview3d"
import panoramaUrl from "../assets/panorama.webp"
import fallbackSkinUrl from "../assets/steve.png"
import { MinecraftNameTagObject } from "../lib/MinecraftNameTagObject"
import type { Scale } from "../types/profile"
import { DEFAULT_SCALE } from '../content/database'

export interface MinecraftSkinViewerProps {
  capeUrl?: string
  height?: number
  nameTag?: string | null
  scale?: Scale | null
  skinUrl: string
  width?: number
}

function applyViewerState(viewer: SkinViewer3D, scale: Scale | null | undefined) {
  const safeScale = scale ?? DEFAULT_SCALE
  const absoluteHeightScale = Math.abs(safeScale.y)

  viewer.playerObject.scale.set(safeScale.x, safeScale.y, safeScale.z)
  viewer.playerObject.position.y = (1 - absoluteHeightScale) * 8
  viewer.nameTag = null
}

function syncNameTag(viewer: SkinViewer3D, currentNameTag: MinecraftNameTagObject | null, nameTag: string | null | undefined, scale: Scale | null | undefined) {
  if (currentNameTag) {
    viewer.playerWrapper.remove(currentNameTag)
    currentNameTag.disposeTag()
  }

  const normalizedNameTag = nameTag?.trim() ?? "";
  if (! normalizedNameTag) return null

  const nextNameTag = new MinecraftNameTagObject(normalizedNameTag, {
    fontFamily: "Minecraft",
    fontSize: 48,
    repaintAfterLoaded: true,
    height: 4
  })

  nextNameTag.position.y = 20 * Math.max(0.9, Math.abs((scale ?? DEFAULT_SCALE).y))
  viewer.playerWrapper.add(nextNameTag)
  return nextNameTag
}

async function loadViewerTextures(viewer: SkinViewer3D, skinUrl: string, capeUrl?: string) {
  try {
    await viewer.loadSkin(skinUrl)
  }
  catch {
    await viewer.loadSkin(fallbackSkinUrl)
  }

  if (! capeUrl) return viewer.loadCape(null)

  try {
    await viewer.loadCape(capeUrl)
  }
  catch {
    viewer.loadCape(null)
  }
}

export function MinecraftSkinViewer({ capeUrl, height = 400, nameTag = null, scale = null, skinUrl, width = 300 }: MinecraftSkinViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const viewerRef = useRef<SkinViewer3D | null>(null)
  const nameTagRef = useRef<MinecraftNameTagObject | null>(null)
  const scaleX = scale?.x
  const scaleY = scale?.y
  const scaleZ = scale?.z

  useEffect(() => {
    const canvas = canvasRef.current
    if (! canvas) return

    const viewer = new SkinViewer3D({ canvas, height, width })

    viewerRef.current = viewer
    viewer.controls.enableRotate = true
    viewer.controls.enableZoom = true
    viewer.controls.enablePan = false
    viewer.controls.enableDamping = true
    viewer.controls.dampingFactor = 0.08
    viewer.controls.rotateSpeed = 0.8
    viewer.controls.zoomSpeed = 0.8
    viewer.controls.target.set(0, 8, 0)
    viewer.zoom = 0.72
    viewer.fov = 42
    viewer.globalLight.intensity = 3
    viewer.cameraLight.intensity = 0.6

    const idleAnimation = new IdleAnimation()
    idleAnimation.speed = 1
    viewer.animation = idleAnimation

    applyViewerState(viewer, null)
    void viewer.loadPanorama(panoramaUrl)
    void loadViewerTextures(viewer, skinUrl, capeUrl)

    return () => {
      if (nameTagRef.current) {
        viewer.playerWrapper.remove(nameTagRef.current)
        nameTagRef.current.disposeTag()
        nameTagRef.current = null
      }

      if (viewerRef.current === viewer) viewerRef.current = null

      viewer.dispose()
    }
  }, [ capeUrl, height, skinUrl, width ])

  useEffect(() => {
    const viewer = viewerRef.current
    if (! viewer) return

    const nextScale = scaleX === undefined || scaleY === undefined || scaleZ === undefined ? null : {
      x: scaleX, y: scaleY, z: scaleZ
    }

    applyViewerState(viewer, nextScale)
    nameTagRef.current = syncNameTag(viewer, nameTagRef.current, nameTag, nextScale)
  }, [ nameTag, scaleX, scaleY, scaleZ ])

  return (
    <div
      className="mx-auto w-full overflow-hidden rounded-[1.75rem]"
      style={ { maxWidth: `${ width }px` } }
    >
      <canvas
        className="mx-auto block h-auto w-full max-w-full cursor-grab active:cursor-grabbing"
        ref={ canvasRef }
      />
    </div>
  )
}