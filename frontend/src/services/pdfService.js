/**
 * PDF Service for Pharma-360
 * Handles PDF generation for invoices, receipts, and reports
 * 
 * FRNT-012: Export PDF (factures/tickets)
 */

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Format currency in XOF (West African CFA Franc)
 */
const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '';
  return new Intl.NumberFormat('fr-BJ', {
    style: 'currency',
    currency: 'XOF',
    currencyDisplay: 'narrowSymbol'
  }).format(amount);
};

/**
 * Format date for PDF
 */
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('fr-BJ', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Generate PDF for an invoice
 */
export const generateInvoicePDF = (invoice, items = []) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURE', 105, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('Pharmacie 360', 105, 30, { align: 'center' });
  doc.text(`N°: ${invoice.invoice_number || 'N/A'}`, 105, 37, { align: 'center' });
  doc.text(`Date: ${formatDate(invoice.date || invoice.created_at)}`, 105, 44, { align: 'center' });

  // Supplier and client info
  doc.setFontSize(12);
  doc.text(`Fournisseur: ${invoice.supplier_name || 'N/A'}`, 20, 55);
  doc.text(`Téléphone: ${invoice.supplier_phone || ''}`, 20, 62);
  doc.text(`Email: ${invoice.supplier_email || ''}`, 20, 69);
  
  doc.text(`Statut: ${invoice.status === 'PAID' ? 'Payé' : invoice.status === 'PENDING' ? 'En attente' : invoice.status}`, 20, 76);

  // Title for items table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Détails des Articles', 20, 90);

  // Items table
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const tableColumns = [
    { header: '#', dataKey: 'index' },
    { header: 'Produit', dataKey: 'name' },
    { header: 'Code', dataKey: 'code' },
    { header: 'Qté', dataKey: 'quantity' },
    { header: 'Prix Unitaire', dataKey: 'unit_price' },
    { header: 'Total', dataKey: 'total' }
  ];

  const tableRows = items.map((item, index) => ({
    index: index + 1,
    name: item.product_name || item.name || 'N/A',
    code: item.product_code || item.code || '',
    quantity: item.quantity || 0,
    unit_price: formatCurrency(item.unit_price || 0),
    total: formatCurrency((item.quantity || 0) * (item.unit_price || 0))
  }));

  doc.autoTable({
    head: [tableColumns.map(c => c.header)],
    body: tableRows.map(row => [
      row.index,
      row.name,
      row.code,
      row.quantity,
      row.unit_price,
      row.total
    ]),
    startY: 95,
    margin: { left: 20 },
    styles: {
      fontSize: 9,
      cellPadding: 1.5,
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [22, 78, 99],
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    }
  });

  // Summary
  const finalY = doc.lastAutoTable.finalY || 150;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  
  doc.text(`Sous-total: ${formatCurrency(invoice.subtotal || 0)}`, 20, finalY + 15);
  doc.text(`Taxes (${invoice.tax_rate || 0}%): ${formatCurrency(invoice.tax_amount || 0)}`, 20, finalY + 22);
  doc.text(`Total: ${formatCurrency(invoice.total_amount || invoice.total || 0)}`, 20, finalY + 29);
  
  if (invoice.discount) {
    doc.text(`Remise: ${formatCurrency(invoice.discount)}`, 20, finalY + 36);
    doc.text(`Net à payer: ${formatCurrency(invoice.net_amount || invoice.total_amount || 0)}`, 20, finalY + 43);
  }

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Généré par Pharmacie 360 - Tous droits réservés', 105, 280, { align: 'center' });
  doc.text(`Date d'impression: ${formatDate(new Date())}`, 105, 285, { align: 'center' });

  return doc;
};

/**
 * Generate PDF for a sales receipt (ticket de caisse)
 */
export const generateReceiptPDF = (sale, items = [], payment) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 150] // Ticket size
  });

  // Header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PHARMACIE 360', 40, 10, { align: 'center' });
  doc.text('Ticket de Caisse', 40, 17, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`N°: ${sale.sale_number || sale.id || 'N/A'}`, 40, 24, { align: 'center' });
  doc.text(`Date: ${formatDate(sale.date || sale.created_at)}`, 40, 30, { align: 'center' });
  doc.text(`Caissier: ${sale.user_name || sale.cashier || 'N/A'}`, 40, 36, { align: 'center' });

  // Items
  doc.text('--- Articles ---', 40, 42, { align: 'center' });
  
  let yPos = 48;
  items.forEach((item, index) => {
    const line = `${index + 1}. ${item.product_name || item.name || 'Article'} x ${item.quantity || 1}`;
    doc.text(line, 10, yPos);
    doc.text(formatCurrency((item.quantity || 1) * (item.unit_price || item.price || 0)), 70, yPos, { align: 'right' });
    yPos += 6;
  });

  // Totals
  doc.text('--- Totaux ---', 40, yPos + 2, { align: 'center' });
  yPos += 8;
  
  doc.setFont('helvetica', 'bold');
  doc.text(`Sous-total: ${formatCurrency(sale.subtotal || 0)}`, 10, yPos);
  doc.text(formatCurrency(sale.subtotal || 0), 70, yPos, { align: 'right' });
  yPos += 6;
  
  if (sale.tax_amount) {
    doc.text(`Taxes: ${formatCurrency(sale.tax_amount || 0)}`, 10, yPos);
    doc.text(formatCurrency(sale.tax_amount || 0), 70, yPos, { align: 'right' });
    yPos += 6;
  }
  
  if (sale.discount) {
    doc.text(`Remise: ${formatCurrency(sale.discount || 0)}`, 10, yPos);
    doc.text(formatCurrency(sale.discount || 0), 70, yPos, { align: 'right' });
    yPos += 6;
  }
  
  doc.setFontSize(12);
  doc.text(`TOTAL: ${formatCurrency(sale.total_amount || sale.total || 0)}`, 10, yPos);
  doc.text(formatCurrency(sale.total_amount || sale.total || 0), 70, yPos, { align: 'right' });
  yPos += 8;

  // Payment info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Mode: ${payment?.method || sale.payment_method || 'Espèces'}`, 40, yPos, { align: 'center' });
  yPos += 6;
  doc.text(`Montant: ${formatCurrency(payment?.amount || sale.paid_amount || sale.total_amount || 0)}`, 40, yPos, { align: 'center' });
  yPos += 6;
  doc.text(`Monnaie: ${formatCurrency(payment?.change || 0)}`, 40, yPos, { align: 'center' });

  // Footer
  doc.setFontSize(8);
  doc.text('Merci de votre visite!', 40, yPos + 10, { align: 'center' });
  doc.text('Pharmacie 360', 40, yPos + 15, { align: 'center' });

  return doc;
};

/**
 * Generate PDF for stock report
 */
export const generateStockReportPDF = (products = [], title = 'Rapport de Stock') => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 140, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Généré le: ${formatDate(new Date())}`, 140, 28, { align: 'center' });

  // Summary stats
  const totalProducts = products.length;
  const totalValue = products.reduce((sum, p) => sum + (p.current_stock || 0) * (p.unit_price || 0), 0);
  const lowStock = products.filter(p => (p.current_stock || 0) <= (p.min_stock || 0)).length;
  const expiringSoon = products.filter(p => {
    if (!p.expiry_date) return false;
    const expiry = new Date(p.expiry_date);
    const today = new Date();
    const daysDiff = (expiry - today) / (1000 * 60 * 60 * 24);
    return daysDiff <= 30 && daysDiff >= 0;
  }).length;

  doc.text(`Total Produits: ${totalProducts}`, 20, 40);
  doc.text(`Valeur Totale: ${formatCurrency(totalValue)}`, 20, 47);
  doc.text(`Stock Faible: ${lowStock}`, 20, 54);
  doc.text(`Péremption Proche: ${expiringSoon}`, 20, 61);

  // Products table
  doc.setFontSize(10);
  doc.text('Liste des Produits:', 20, 75);

  const tableColumns = [
    { header: '#', dataKey: 'index' },
    { header: 'Code', dataKey: 'code' },
    { header: 'Produit', dataKey: 'name' },
    { header: 'Catégorie', dataKey: 'category' },
    { header: 'Stock', dataKey: 'stock' },
    { header: 'Prix Unitaire', dataKey: 'price' },
    { header: 'Valeur', dataKey: 'value' },
    { header: 'Péremption', dataKey: 'expiry' }
  ];

  const tableRows = products.map((product, index) => ({
    index: index + 1,
    code: product.code || product.product_code || '',
    name: product.name || product.product_name || 'N/A',
    category: product.category_name || product.category || '',
    stock: product.current_stock || 0,
    price: formatCurrency(product.unit_price || 0),
    value: formatCurrency((product.current_stock || 0) * (product.unit_price || 0)),
    expiry: formatDate(product.expiry_date)
  }));

  doc.autoTable({
    head: [tableColumns.map(c => c.header)],
    body: tableRows.map(row => [
      row.index,
      row.code,
      row.name,
      row.category,
      row.stock,
      row.price,
      row.value,
      row.expiry
    ]),
    startY: 80,
    margin: { left: 20 },
    styles: {
      fontSize: 8,
      cellPadding: 1,
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [22, 78, 99],
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    }
  });

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  const finalY = doc.lastAutoTable.finalY || 150;
  doc.text('Généré par Pharmacie 360 - Tous droits réservés', 140, finalY + 10, { align: 'center' });

  return doc;
};

/**
 * Generate PDF for daily sales report
 */
export const generateSalesReportPDF = (sales = [], title = 'Rapport de Ventes') => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Généré le: ${formatDate(new Date())}`, 105, 28, { align: 'center' });

  // Summary stats
  const totalSales = sales.length;
  const totalRevenue = sales.reduce((sum, s) => sum + (s.total_amount || s.total || 0), 0);
  const totalItems = sales.reduce((sum, s) => sum + (s.items_count || s.items?.length || 0), 0);

  doc.text(`Total Ventes: ${totalSales}`, 20, 40);
  doc.text(`Revenu Total: ${formatCurrency(totalRevenue)}`, 20, 47);
  doc.text(`Articles Vendus: ${totalItems}`, 20, 54);

  // Sales table
  doc.setFontSize(10);
  doc.text('Détails des Ventes:', 20, 65);

  const tableColumns = [
    { header: '#', dataKey: 'index' },
    { header: 'N° Vente', dataKey: 'sale_number' },
    { header: 'Date', dataKey: 'date' },
    { header: 'Client', dataKey: 'customer' },
    { header: 'Articles', dataKey: 'items' },
    { header: 'Total', dataKey: 'total' }
  ];

  const tableRows = sales.map((sale, index) => ({
    index: index + 1,
    sale_number: sale.sale_number || sale.id || '',
    date: formatDate(sale.date || sale.created_at),
    customer: sale.customer_name || sale.customer || 'Client',
    items: sale.items_count || sale.items?.length || 0,
    total: formatCurrency(sale.total_amount || sale.total || 0)
  }));

  doc.autoTable({
    head: [tableColumns.map(c => c.header)],
    body: tableRows.map(row => [
      row.index,
      row.sale_number,
      row.date,
      row.customer,
      row.items,
      row.total
    ]),
    startY: 70,
    margin: { left: 20 },
    styles: {
      fontSize: 9,
      cellPadding: 1.5,
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [22, 78, 99],
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    }
  });

  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  const finalY = doc.lastAutoTable.finalY || 150;
  doc.text('Généré par Pharmacie 360 - Tous droits réservés', 105, finalY + 10, { align: 'center' });

  return doc;
};

/**
 * Download PDF with given name
 */
export const downloadPDF = (doc, fileName = 'document.pdf') => {
  doc.save(fileName);
};

/**
 * Open PDF in new window
 */
export const openPDFInWindow = (doc) => {
  window.open(doc.output('bloburl'), '_blank');
};

/**
 * Get PDF as blob URL
 */
export const getPDFBlobURL = (doc) => {
  return doc.output('bloburl');
};

export default {
  generateInvoicePDF,
  generateReceiptPDF,
  generateStockReportPDF,
  generateSalesReportPDF,
  downloadPDF,
  openPDFInWindow,
  getPDFBlobURL,
  formatCurrency,
  formatDate
};
