// components/pdf/PdfGenerator.ts

export async function generatePdfFromElement(
  elementId: string,
  filename: string,
  margins?: [number, number, number, number]
): Promise<void> {
  if (typeof window === 'undefined') return
  const html2pdf = (await import('html2pdf.js')).default
  const element = document.getElementById(elementId)
  if (!element) {
    throw new Error(`Element with id ${elementId} not found`)
  }

  // Pre-process: ensure images are loaded
  const images = element.getElementsByTagName('img')
  const imagePromises = Array.from(images).map((img) => {
    if (img.complete) return Promise.resolve()
    return new Promise((resolve) => {
      img.onload = resolve
      img.onerror = resolve // proceed even if one fails
    })
  })
  
  await Promise.all(imagePromises)

  const opt = {
    margin: (margins ?? [10, 10, 15, 10]) as [number, number, number, number], // top, left, bottom, right
    filename: `${filename}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { 
      scale: 2, 
      useCORS: true, // Crucial for Supabase Storage images
      logging: false,
      letterRendering: true,
      onclone: (clonedDoc: Document) => {
        const styles = clonedDoc.querySelectorAll('style');
        styles.forEach(style => {
          if (style.innerHTML) {
            style.innerHTML = style.innerHTML
              .replace(/oklch\([^)]+\)/g, 'transparent')
              .replace(/color-mix\([^)]+\)/g, 'transparent');
          }
        });
      }
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    pagebreak: { mode: ['css', 'legacy'] }
  }

  // Generate and download
  await html2pdf().set(opt).from(element).save()
}
