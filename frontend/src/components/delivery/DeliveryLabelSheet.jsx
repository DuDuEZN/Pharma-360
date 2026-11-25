import React, { useState } from 'react'
import { usePharmacy } from '@/providers/PharmacyProvider'
import { formatCurrency } from '@/lib/utils'
import {
  DEFAULT_LABEL_FORMAT,
  LabelBarcode,
  LabelPrintSheet,
} from './LabelPrintSheet'

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
 * Aperçu et impression des étiquettes produit après validation d'une
 * livraison. Une étiquette par unité reçue.
 *
 * Contenu : nom de la pharmacie, nom du produit, prix de vente, code-barres
 * du lot (code racine + numéro de lot), date de livraison et de péremption.
 */
function DeliveryLabelSheet({ delivery, onDone }) {
  const { pharmacy } = usePharmacy()
  const [formatId, setFormatId] = useState(DEFAULT_LABEL_FORMAT)

  if (!delivery) return null

  const items = getPrintableItems(delivery)
  if (items.length === 0) return null

  const deliveryDate =
    delivery.delivery_date || delivery.expected_date || delivery.created_at

  const renderLabel = (item, index, preview = false) => {
    // Le code-barres du lot est fourni par la validation de la livraison
    // (code racine + numéro de lot). À défaut, on retombe sur le produit.
    const barcode = item.barcode || item.product_barcode || ''
    const price = Number(item.product_price ?? item.unit_price ?? 0)

    return (
      <div
        key={`${preview ? 'preview' : 'print'}-${item.id || item.product_id || index}-${index}`}
        className={
          preview
            ? 'delivery-label delivery-label-preview'
            : 'delivery-label'
        }
      >
        <p className="delivery-label-pharmacy">{pharmacy.name}</p>
        <p className="delivery-label-product">{item.product_name || 'Produit'}</p>
        <p className="delivery-label-price">{formatCurrency(price)}</p>

        <LabelBarcode value={barcode} height={preview ? 30 : 32} />

        <div className="delivery-label-dates">
          <span>Livré le {deliveryDate ? formatLabelDate(deliveryDate) : '—'}</span>
          <span>
            Péremption{' '}
            {item.expiry_date ? formatLabelDate(item.expiry_date) : '—'}
          </span>
          {item.batch_number && <span>Lot {item.batch_number}</span>}
        </div>
      </div>
    )
  }

  return (
    <LabelPrintSheet
      rootId="delivery-labels-print"
      title="Étiquettes de livraison"
      count={items.length}
      formatId={formatId}
      onFormatChange={setFormatId}
      onClose={onDone}
      renderPreview={() => items.map((item, index) => renderLabel(item, index, true))}
      renderPrint={() => items.map((item, index) => renderLabel(item, index, false))}
    />
  )
}

export default DeliveryLabelSheet
