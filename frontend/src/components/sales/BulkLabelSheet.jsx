import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import JsBarcode from 'jsbarcode'
import { APP_NAME } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'

const MAX_LABELS = 200

const formatLabelDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR')
}

/**
 * BulkLabelSheet
 * Étiquettes imprimées automatiquement quand une vente en vrac déclenche le
 * reconditionnement de boîtes. Une étiquette par unité de vrac obtenue.
 *
 * Le code-barres est celui du produit : il ne change pas lors du
 * reconditionnement. Seul le prix affiché est le prix de l'unité (vrac).
 */
function LabelBarcode({ value }) {
  const svgRef = useRef(null)

  useEffect(() => {
    const node = svgRef.current
    const code = (value || '').trim()
    if (!node || !code) return

    try {
      JsBarcode(node, code, {
        format: 'CODE128',
        width: 1.5,
        height: 44,
        displayValue: true,
        fontSize: 12,
        margin: 0,
        background: '#ffffff',
        lineColor: '#000000',
      })
    } catch (error) {
      // Code non encodable : le texte reste affiché sous les barres.
      console.error('Barcode generation failed:', error)
    }
  }, [value])

  return (
    <div className="delivery-label-barcode">
      <svg ref={svgRef} />
      {!value && <p className="delivery-label-barcode-text">—</p>}
    </div>
  )
}

const expandLabels = (labels) => {
  const expanded = []
  ;(labels || []).forEach((label, labelIndex) => {
    const quantity = Math.min(Number(label.quantity) || 0, MAX_LABELS)
    for (let index = 0; index < quantity; index += 1) {
      expanded.push({ ...label, key: `${labelIndex}-${index}` })
    }
  })
  return expanded
}

function BulkLabelSheet({ labels, onDone }) {
  const printedRef = useRef(null)
  const onDoneRef = useRef(onDone)
  const items = expandLabels(labels)
  const signature = items.length
    ? `${items.length}-${items[0]?.product_id}-${items[0]?.batch_number}-${items[0]?.quantity}`
    : ''

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    if (!signature || items.length === 0) return undefined
    // Impression unique pour un même lot d'étiquettes.
    if (printedRef.current === signature) return undefined
    printedRef.current = signature

    const body = document.body
    body.classList.add('printing-labels')

    // Laisse le temps aux codes-barres de se dessiner avant l'impression.
    const timer = window.setTimeout(() => {
      window.print()
      body.classList.remove('printing-labels')
      if (onDoneRef.current) onDoneRef.current()
    }, 500)

    const cleanup = () => body.classList.remove('printing-labels')
    window.addEventListener('afterprint', cleanup)

    return () => {
      window.clearTimeout(timer)
      cleanup()
      window.removeEventListener('afterprint', cleanup)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  if (items.length === 0) return null

  return createPortal(
    <div id="bulk-labels-print" className="delivery-labels-print bulk-labels-print">
      {items.map((item) => (
        <div key={item.key} className="delivery-label bulk-label">
          <p className="delivery-label-pharmacy">{APP_NAME}</p>
          <p className="delivery-label-product">
            {item.product_name || 'Produit'}
            <span className="delivery-label-bulk-tag"> · VRAC</span>
          </p>
          <p className="delivery-label-price">{formatCurrency(item.price || 0)}</p>

          <LabelBarcode value={item.barcode} />

          <div className="delivery-label-dates">
            <span>
              Reconditionné le{' '}
              {item.sale_date ? formatLabelDate(item.sale_date) : '—'}
            </span>
            <span>
              Péremption{' '}
              {item.expiry_date ? formatLabelDate(item.expiry_date) : '—'}
            </span>
            {item.batch_number && <span>Lot {item.batch_number}</span>}
          </div>
        </div>
      ))}
    </div>,
    document.body
  )
}

export default BulkLabelSheet
