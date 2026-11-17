import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import JsBarcode from 'jsbarcode'
import { usePharmacy } from '@/providers/PharmacyProvider'
import { formatCurrency } from '@/lib/utils'

const formatLabelDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR')
}

/**
 * Nombre d'étiquettes à imprimer pour une ligne de livraison : une par unité
 * réellement reçue (quantité reçue moins les unités non conformes). Une
 * livraison de 7 paracétamol + 8 vastator produit donc 15 étiquettes.
 */
const getReceivedUnits = (item) => {
  const received = item.received_quantity
  if (received === undefined || received === null) {
    // Détail non renseigné : on retombe sur la quantité commandée.
    return Math.max(0, Math.trunc(Number(item.quantity ?? 0)))
  }
  const nonConforming = Math.max(
    0,
    Math.trunc(Number(item.non_conforming_quantity ?? 0))
  )
  return Math.max(0, Math.trunc(Number(received)) - nonConforming)
}

// Sécurité : évite de saturer le navigateur sur une quantité aberrante.
const MAX_LABELS = 2000

const getPrintableItems = (delivery) => {
  const labels = []
  for (const item of delivery?.items || []) {
    const units = getReceivedUnits(item)
    const copies = Math.min(units, MAX_LABELS - labels.length)
    for (let index = 0; index < copies; index += 1) {
      labels.push(item)
    }
    if (labels.length >= MAX_LABELS) break
  }
  return labels
}

/**
 * DeliveryLabelSheet
 * Étiquettes produit imprimées automatiquement après validation d'une
 * livraison. Une étiquette par unité reçue.
 *
 * Contenu : nom de la pharmacie, nom du produit, prix de vente, code-barres
 * (texte + barres CODE128), date de livraison et date de péremption.
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
      // Code non encodable : on laisse le texte seul (affiché sous les barres).
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

function DeliveryLabelSheet({ delivery, onDone }) {
  const { pharmacy } = usePharmacy()
  const printedRef = useRef(null)
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    if (!delivery) return undefined
    // Impression unique par livraison : évite une seconde boîte d'impression
    // si le parent se re-rend (rechargement de la liste, etc.).
    if (printedRef.current === delivery.id) return undefined
    printedRef.current = delivery.id

    // Aucun article réellement reçu : pas d'étiquettes à imprimer.
    if (getPrintableItems(delivery).length === 0) {
      if (onDoneRef.current) onDoneRef.current()
      return undefined
    }

    const body = document.body
    body.classList.add('printing-labels')

    // Laisse le temps au DOM/aux codes-barres de se dessiner avant l'impression.
    const timer = window.setTimeout(() => {
      window.print()
      body.classList.remove('printing-labels')
      if (onDoneRef.current) onDoneRef.current()
    }, 600)

    const cleanup = () => body.classList.remove('printing-labels')
    window.addEventListener('afterprint', cleanup)

    return () => {
      window.clearTimeout(timer)
      cleanup()
      window.removeEventListener('afterprint', cleanup)
    }
  }, [delivery])

  if (!delivery) return null

  const items = getPrintableItems(delivery)

  const deliveryDate =
    delivery.delivery_date || delivery.expected_date || delivery.created_at

  return createPortal(
    <div id="delivery-labels-print" className="delivery-labels-print">
      {items.map((item, index) => {
        const barcode = item.barcode || item.product_barcode || ''
        const price = Number(item.product_price ?? item.unit_price ?? 0)

        return (
          <div
            key={`${item.id || item.product_id || index}-${index}`}
            className="delivery-label"
          >
            <p className="delivery-label-pharmacy">{pharmacy.name}</p>
            <p className="delivery-label-product">{item.product_name || 'Produit'}</p>
            <p className="delivery-label-price">{formatCurrency(price)}</p>

            <LabelBarcode value={barcode} />

            <div className="delivery-label-dates">
              <span>
                Livré le{' '}
                {deliveryDate ? formatLabelDate(deliveryDate) : '—'}
              </span>
              <span>
                Péremption{' '}
                {item.expiry_date
                  ? formatLabelDate(item.expiry_date)
                  : '—'}
              </span>
            </div>
          </div>
        )
      })}
    </div>,
    document.body
  )
}

export default DeliveryLabelSheet
