import { useCallback, useRef, useState } from "react"
import Cropper, { type Area } from "react-easy-crop"
import { Camera, Check, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./Dialog"
import { Button } from "./Button"
import { UserAvatar } from "./Avatar"
import { AVATAR_PRESETS } from "../../../lib/avatarPresets"
import { uploadAvatar, selectPresetAvatar, removeAvatar, type AvatarUpdateResponse } from "../../../lib/api"
import { cn } from "../../../lib/utils"

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

type AvatarPickerProps = {
  name: string
  avatarUrl?: string | null
  avatarThumbUrl?: string | null
  onChange: (result: AvatarUpdateResponse) => void
}

export function AvatarPicker({ name, avatarUrl, avatarThumbUrl, onChange }: AvatarPickerProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<"presets" | "upload">("presets")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [rawImage, setRawImage] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasAvatar = Boolean(avatarUrl || avatarThumbUrl)
  const previewImage = avatarUrl ?? avatarThumbUrl ?? undefined
  const selectedPresetKey = AVATAR_PRESETS.find((p) => p.url === avatarUrl)?.key ?? null

  function resetAndClose(next: boolean) {
    setOpen(next)
    if (!next) {
      setRawImage(null)
      setError(null)
      setTab("presets")
      setZoom(1)
      setCrop({ x: 0, y: 0 })
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError("Please choose a JPEG, PNG, or WebP image.")
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Image must be smaller than 5MB.")
      return
    }

    setError(null)
    const reader = new FileReader()
    reader.onload = () => setRawImage(reader.result as string)
    reader.readAsDataURL(file)
  }

  const onCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  async function handleSelectPreset(key: string) {
    setBusy(true)
    setError(null)
    try {
      const result = await selectPresetAvatar(key)
      onChange(result)
    } catch {
      setError("Could not set avatar. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  async function handleUploadCropped() {
    if (!rawImage || !croppedAreaPixels) return
    setBusy(true)
    setError(null)
    try {
      const blob = await getCroppedBlob(rawImage, croppedAreaPixels)
      const result = await uploadAvatar(blob)
      onChange(result)
      setRawImage(null)
      setZoom(1)
      setCrop({ x: 0, y: 0 })
    } catch {
      setError("Could not upload image. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    setBusy(true)
    setError(null)
    try {
      await removeAvatar()
      onChange({ avatar_type: null, avatar_url: null, avatar_thumb_url: null })
    } catch {
      setError("Could not remove avatar. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="relative inline-block">
        <UserAvatar name={name} image={avatarThumbUrl ?? avatarUrl ?? undefined} size="lg" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface-card bg-brand-orange-accessible text-white shadow-warm-sm transition-transform hover:scale-105"
          aria-label="Change avatar"
        >
          <Camera className="h-3.5 w-3.5" />
        </button>
      </div>

      <Dialog open={open} onOpenChange={resetAndClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Update your avatar</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center gap-2 pb-1">
            <UserAvatar
              name={name}
              image={previewImage}
              size="lg"
              className="h-32 w-32 border-4 border-surface-warm text-4xl shadow-warm-md"
            />
            <p className="text-xs font-medium text-muted-foreground">
              {hasAvatar ? "Your current avatar" : "No avatar set yet"}
            </p>
          </div>

          <div className="flex gap-2 border-b border-border-warm pb-3">
            <button
              type="button"
              onClick={() => setTab("presets")}
              className={cn(
                "rounded-button px-3 py-1.5 text-sm font-semibold transition-colors",
                tab === "presets"
                  ? "bg-brand-orange-accessible/10 text-brand-orange-accessible"
                  : "text-muted-foreground hover:text-brand-navy"
              )}
            >
              Choose avatar
            </button>
            <button
              type="button"
              onClick={() => setTab("upload")}
              className={cn(
                "rounded-button px-3 py-1.5 text-sm font-semibold transition-colors",
                tab === "upload"
                  ? "bg-brand-orange-accessible/10 text-brand-orange-accessible"
                  : "text-muted-foreground hover:text-brand-navy"
              )}
            >
              Upload photo
            </button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {tab === "presets" && (
            <div className="grid max-h-80 grid-cols-5 gap-3 overflow-y-auto py-2">
              {AVATAR_PRESETS.map((preset) => {
                const isSelected = preset.key === selectedPresetKey
                return (
                  <button
                    key={preset.key}
                    type="button"
                    disabled={busy}
                    onClick={() => handleSelectPreset(preset.key)}
                    aria-pressed={isSelected}
                    className={cn(
                      "group relative aspect-square overflow-hidden rounded-full border-2 transition-all hover:scale-105 hover:border-brand-orange-accessible focus:outline-none focus:ring-2 focus:ring-brand-orange-accessible focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                      isSelected ? "border-brand-orange-accessible ring-2 ring-brand-orange-accessible/30 ring-offset-2" : "border-transparent"
                    )}
                  >
                    <img src={preset.thumbUrl} alt={preset.label} className="h-full w-full object-cover" loading="lazy" />
                    <span
                      className={cn(
                        "absolute inset-0 flex items-center justify-center bg-black/35 transition-opacity",
                        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      )}
                    >
                      {isSelected && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-orange-accessible text-white shadow-warm-sm">
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {tab === "upload" && !rawImage && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-card border-2 border-dashed border-border-warm py-10">
              <Camera className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">JPEG, PNG, or WebP — up to 5MB</p>
              <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                Choose a photo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {tab === "upload" && rawImage && (
            <div className="flex flex-col gap-3">
              <div className="relative h-64 w-full overflow-hidden rounded-card bg-surface-warm">
                <Cropper
                  image={rawImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-brand-orange-accessible"
                aria-label="Zoom"
              />
              <div className="flex justify-between gap-2">
                <Button variant="ghost" size="sm" onClick={() => setRawImage(null)} disabled={busy}>
                  Choose different photo
                </Button>
                <Button size="sm" onClick={handleUploadCropped} isLoading={busy}>
                  Save photo
                </Button>
              </div>
            </div>
          )}

          {hasAvatar && tab === "presets" && (
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={handleRemove} disabled={busy}>
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Remove avatar
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

async function getCroppedBlob(imageSrc: string, area: Area): Promise<Blob> {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement("canvas")
  const size = 512
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas not supported")

  ctx.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, size, size)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to export cropped image"))),
      "image/jpeg",
      0.92
    )
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
