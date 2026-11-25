import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import JsBarcode from 'jsbarcode'
import { Printer, X } from 'lucide-react'
import { Button } from '@/components/ui/button.jsx'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select.jsx'

/**
 * Formats d'étiquettes pris en charge.
 *
 * Le format par défaut est la planche A4 3 × 8 (24 étiquettes par page), le
 * plus courant. Les formats rouleau (imprimante thermique) restent
 * sélectionnables pour les imprimantes d'étiquettes dédiées.
 */
export const LABEL_FORMATS = [
  {
    id: 'a4_3x8',
    label: 'Planche A4 — 3 × 8 (24 étiquettes)',
    page: 'A4',
    pageMargin: '10mm 4mm',
    columns: 3,
    gap: '3mm',
    width: '70mm',
    height: '37mm',
    fontSize: '8pt',
    breakAfter: false,
  },
  {
    id: 'a4_2x7',
    label: 'Planche A4 — 2 × 7 (14 étiquettes)',
    page: 'A4',
    pageMargin: '10mm 8mm',
    columns: 2,
    gap: '4mm',
    width: '95mm',
    height: '38mm',
    fontSize: '9pt',
    breakAfter: false,
  },
  {
    id: 'roll_50x30',
    label: 'Rouleau — 50 × 30 mm',
    page: '50mm 30mm',
    pageMargin: '0',
    columns: 1,
    gap: '0',
    width: '50mm',
    height: '30mm',
    fontSize: '7.5pt',
    breakAfter: true,
  },
  {
    id: 'roll_40x25',
    label: 'Rouleau — 40 × 25 mm',
    page: '40mm 25mm',
    pageMargin: '0',
    columns: 1,
    gap: '0',
    width: '40mm',
    height: '25mm',
    fontSize: '6.5pt',
    breakAfter: true,
  },
]

export const DEFAULT_LABEL_FORMAT = 'a4_3x8'

export function getLabelFormat(formatId) {
  return (
    LABEL_FORMATS.find((format) => format.id === formatId) ||
    LABEL_FORMATS[0]
  )
}

/**
 * CSS d'impression dynamique : la taille de chaque étiquette et de la page
 * est adaptée au format choisi (planche A4 ou rouleau).
 */
function buildPrintCss(rootId, format) {
  const breakRule = format.breakAfter
    ? `#${rootId} .delivery-label { break-after: page; page-break-after: always; }`
    : ''
  return `
    @page { size: ${format.page}; margin: ${format.pageMargin}; }
    body.printing-labels #${rootId} {
      display: grid !important;
      grid-template-columns: repeat(${format.columns}, ${format.width});
      gap: ${format.gap};
      align-content: start;
      justify-content: start;
      padding: 0;
      margin: 0;
      background: #fff;
      color: #000;
    }
    #${rootId} .delivery-label {
      width: ${format.width};
      height: ${format.height};
      font-size: ${format.fontSize};
      padding: 1.4mm;
      overflow: hidden;
    }
    ${breakRule}
  `
}

export function LabelBarcode({ value, height = 34 }) {
  const svgRef = useRef(null)

  useEffect(() => {
    const node = svgRef.current
    const code = (value || '').trim()
    if (!node || !code) return

    try {
      JsBarcode(node, code, {
        format: 'CODE128',
        width: 1.3,
        height,
        displayValue: true,
        fontSize: 10,
        margin: 0,
        background: '#ffffff',
        lineColor: '#000000',
      })
    } catch (error) {
      // Code non encodable : le texte reste affiché sous les barres.
      console.error('Barcode generation failed:', error)
    }
  }, [value, height])

  return (
    <div className="delivery-label-barcode">
      <svg ref={svgRef} />
      {!value && <p className="delivery-label-barcode-text">—</p>}
    </div>
  )
}

/**
 * Aperçu + impression des étiquettes.
 *
 * L'impression n'est plus lancée automatiquement : l'utilisateur choisit
 * d'abord le format de papier, vérifie l'aperçu, puis clique sur « Imprimer ».
 */
export function LabelPrintSheet({
  rootId,
  title,
  count,
  formatId,
  onFormatChange,
  onClose,
  renderPreview,
  renderPrint,
}) {
  const format = getLabelFormat(formatId)
  const [isPrinting, setIsPrinting] = useState(false)

  useEffect(() => {
    const cleanup = () => document.body.classList.remove('printing-labels')
    window.addEventListener('afterprint', cleanup)
    return () => {
      cleanup()
      window.removeEventListener('afterprint', cleanup)
    }
  }, [])

  const handlePrint = () => {
    setIsPrinting(true)
    document.body.classList.add('printing-labels')
    // Laisse le temps aux codes-barres du calque d'impression de se dessiner.
    window.setTimeout(() => {
      window.print()
      document.body.classList.remove('printing-labels')
      setIsPrinting(false)
    }, 300)
  }

  return createPortal(
    <>
      <style>{buildPrintCss(rootId, format)}</style>

      <div className="label-print-overlay">
        <div className="label-print-toolbar">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-secondary-900 dark:text-white">
              {title}
            </p>
            <p className="text-xs text-secondary-500 dark:text-secondary-400">
              {count} étiquette{count > 1 ? 's' : ''} — choisissez le format
              du papier avant d'imprimer
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={formatId} onValueChange={onFormatChange}>
              <SelectTrigger className="w-[260px]">
                <SelectValue placeholder="Format du papier" />
              </SelectTrigger>
              <SelectContent>
                {LABEL_FORMATS.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handlePrint} disabled={isPrinting}>
              <Printer className="mr-2 h-4 w-4" />
              {isPrinting ? 'Impression…' : 'Imprimer'}
            </Button>

            <Button variant="ghost" onClick={onClose} aria-label="Fermer">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="label-preview-grid">{renderPreview()}</div>
      </div>

      <div id={rootId} className="delivery-labels-print">
        {renderPrint()}
      </div>
    </>,
    document.body
  )
}

export default LabelPrintSheet
