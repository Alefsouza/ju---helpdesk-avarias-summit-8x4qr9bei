import { useRef, useState, useEffect } from 'react'
import { Button } from './ui/button'

interface SignaturePadProps {
  onChange: (signature: string) => void
  error?: string
}

export function SignaturePad({ onChange, error }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      const resizeCanvas = () => {
        const parent = canvas.parentElement
        if (parent) {
          const newWidth = parent.clientWidth
          const newHeight = 200

          const ctx = canvas.getContext('2d')
          let data = ''
          if (canvas.width > 0 && canvas.height > 0) {
            data = canvas.toDataURL()
          }

          canvas.width = newWidth
          canvas.height = newHeight

          if (ctx) {
            ctx.lineWidth = 2
            ctx.lineCap = 'round'
            ctx.strokeStyle = '#000'

            if (data && hasDrawn) {
              const img = new Image()
              img.src = data
              img.onload = () => {
                ctx.drawImage(img, 0, 0)
              }
            }
          }
        }
      }

      setTimeout(resizeCanvas, 50)
      window.addEventListener('resize', resizeCanvas)
      return () => window.removeEventListener('resize', resizeCanvas)
    }
  }, [hasDrawn])

  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    let clientX, clientY

    if ('touches' in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = (e as React.MouseEvent).clientX
      clientY = (e as React.MouseEvent).clientY
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }

  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    if (e.cancelable) e.preventDefault()
    setIsDrawing(true)
    setHasDrawn(true)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)

    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (e.cancelable) e.preventDefault()
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false)
      const canvas = canvasRef.current
      if (canvas && hasDrawn) {
        onChange(canvas.toDataURL('image/png'))
      }
    }
  }

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.beginPath()
    setHasDrawn(false)
    onChange('')
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className={`border rounded-md overflow-hidden bg-white touch-none ${error ? 'border-destructive' : 'border-input'}`}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-[200px] cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <div className="flex justify-between items-center">
        {error ? (
          <span className="text-sm text-destructive font-medium">{error}</span>
        ) : (
          <div></div>
        )}
        <Button type="button" variant="outline" size="sm" onClick={clear}>
          Limpar assinatura
        </Button>
      </div>
    </div>
  )
}
