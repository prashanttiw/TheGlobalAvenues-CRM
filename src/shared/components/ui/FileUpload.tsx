import * as React from "react"
import { Upload, File, FileText, Image, AlertCircle, X, Check } from "lucide-react"
import { cn } from "../../../lib/utils"
import { Button } from "./Button"

interface FileUploadProps {
  onFileSelect?: (file: File) => void
  onFileClear?: () => void
  acceptedTypes?: string[]
  maxSizeMB?: number
  className?: string
}

export function FileUpload({
  onFileSelect,
  onFileClear,
  acceptedTypes = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"],
  maxSizeMB = 10,
  className,
}: FileUploadProps) {
  const [dragActive, setDragActive] = React.useState(false)
  const [file, setFile] = React.useState<File | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = React.useState<number | null>(null)
  const [isUploaded, setIsUploaded] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const validateFile = (file: File) => {
    setError(null)
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()
    
    if (!acceptedTypes.map(t => t.toLowerCase()).includes(fileExtension)) {
      setError(`Invalid file type. Accepted types: ${acceptedTypes.join(", ")}`)
      return false
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${maxSizeMB}MB.`)
      return false
    }

    return true
  }

  const simulateUpload = (selectedFile: File) => {
    setUploadProgress(0)
    setIsUploaded(false)
    
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null) return null
        if (prev >= 100) {
          clearInterval(interval)
          setIsUploaded(true)
          onFileSelect?.(selectedFile)
          return 100
        }
        return prev + 10
      })
    }, 100)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (validateFile(droppedFile)) {
        setFile(droppedFile)
        simulateUpload(droppedFile)
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (validateFile(selectedFile)) {
        setFile(selectedFile)
        simulateUpload(selectedFile)
      }
    }
  }

  const clearFile = () => {
    setFile(null)
    setError(null)
    setUploadProgress(null)
    setIsUploaded(false)
    onFileClear?.()
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase()
    if (["jpg", "jpeg", "png"].includes(ext || "")) return <Image className="h-8 w-8 text-brand-orange-accessible" />
    if (["doc", "docx", "pdf"].includes(ext || "")) return <FileText className="h-8 w-8 text-brand-navy" />
    return <File className="h-8 w-8 text-muted-foreground" />
  }

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ["Bytes", "KB", "MB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i]
  }

  return (
    <div className={cn("w-full", className)}>
      {!file ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center cursor-pointer transition-colors",
            dragActive 
              ? "border-brand-orange-accessible bg-brand-orange-accessible/5" 
              : "border-border-warm bg-surface-card hover:bg-surface-warm/30"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={acceptedTypes.join(",")}
            onChange={handleChange}
          />
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-navy/5 text-brand-navy mb-3">
            <Upload className="h-5 w-5" />
          </div>
          <p className="text-sm font-semibold text-brand-navy mb-1">
            Drag & drop file here or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            Supports {acceptedTypes.join(", ")} (max {maxSizeMB}MB)
          </p>
          {error && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-red-600 bg-red-50 px-2.5 py-1 rounded-md">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border-warm bg-surface-card p-4">
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              {getFileIcon(file.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-brand-navy truncate">
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatBytes(file.size)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:bg-surface-warm"
              onClick={clearFile}
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {uploadProgress !== null && (
            <div className="mt-3">
              <div className="flex justify-between items-center text-xs font-semibold mb-1">
                <span className={cn(isUploaded ? "text-emerald-600 flex items-center gap-1" : "text-brand-navy")}>
                  {isUploaded ? (
                    <>
                      <Check className="h-3 w-3" />
                      Uploaded successfully
                    </>
                  ) : "Uploading..."}
                </span>
                <span className="text-muted-foreground">{uploadProgress}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-surface-warm overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-100",
                    isUploaded ? "bg-emerald-500" : "bg-brand-orange-accessible"
                  )}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
