import React, { useState } from 'react'
import { usePharmacy } from '@/providers/PharmacyProvider'
import { formatCurrency } from '@/lib/utils'
import {
  DEFAULT_LABEL_FORMAT,
  LabelBarcode,
  LabelPrintSheet,
} from '@/components/delivery/LabelPrintSheet'

const MAX_LABELS = 200

const formatLabelDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fr-FR')
}

/**
 * BulkLabelSheet
 * Aperçu et impression des étiquettes de vrac obtenues lors d'un
 * reconditionnement. Une étiquette par unité de vrac.
 *
 * Le code-barres est celui du lot (code racine + numéro de lot) : il permet
 * de retrouver le lot exact lors du scan.
 */
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
  const { pharmacy } = usePharmacy()
  const [formatId, setFormatId] = useState(DEFAULT_LABEL_FORMAT)
  const items = expandLabels(labels)

  if (items.length === 0) return null

  const renderLabel = (item, preview = false) => (
    <div
      key={`${preview ? 'preview' : 'print'}-${item.key}`}
      className={
        preview
          ? 'delivery-label bulk-label delivery-label-preview'
          : 'delivery-label bulk-label'
      }
    >
      <p className="delivery-label-pharmacy">{pharmacy.name}</p>
      <p className="delivery-label-product">
        {item.product_name || 'Produit'}
        <span className="delivery-label-bulk-tag"> · VRAC</span>
      </p>
      <p className="delivery-label-price">{formatCurrency(item.price || 0)}</p>

      <LabelBarcode value={item.barcode} height={preview ? 30 : 32} />

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
  )

  return (
    <LabelPrintSheet
      rootId="bulk-labels-print"
      title="Étiquettes de vrac"
      count={items.length}
      formatId={formatId}
      onFormatChange={setFormatId}
      onClose={onDone}
      renderPreview={() => items.map((item) => renderLabel(item, true))}
      renderPrint={() => items.map((item) => renderLabel(item, false))}
    />
  )
}

export default BulkLabelSheet
