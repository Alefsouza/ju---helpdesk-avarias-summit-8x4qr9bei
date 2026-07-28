export async function compressImage(file: File, maxMB: number = 2): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file

  // Se for menor que 1MB, não comprime para não perder tempo/qualidade desnecessariamente
  if (file.size < 1 * 1024 * 1024) return file

  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.src = objectUrl

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      let width = img.width
      let height = img.height
      const maxDim = 1920 // 1080p equivalente (HD)

      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(file)

      ctx.drawImage(img, 0, 0, width, height)

      const targetType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
      const quality = 0.8

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: targetType,
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          } else {
            resolve(file)
          }
        },
        targetType,
        quality,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file)
    }
  })
}
