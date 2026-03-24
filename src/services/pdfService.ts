import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order } from '../types';

export const exportOrderToPDF = (order: Order) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(22);
  doc.setTextColor(5, 150, 105); // emerald-600
  doc.text('Tellus Order Invoice', 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Order ID: #${order.id.toUpperCase()}`, 14, 30);
  doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 14, 35);

  // Buyer & Farmer Info
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('Customer Details', 14, 50);
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Name: ${order.buyerName}`, 14, 56);
  doc.text(`Email: ${order.buyerEmail}`, 14, 61);
  if (order.buyerPhone) doc.text(`Phone: ${order.buyerPhone}`, 14, 66);

  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('Farmer Details', 120, 50);
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Name: ${order.farmerName}`, 120, 56);
  doc.text(`ID: #${order.farmerId.slice(-8).toUpperCase()}`, 120, 61);

  // Order Items Table
  const tableData = order.items.map(item => [
    item.name,
    item.quantity.toString(),
    `$${(item.price || 0).toFixed(2)}`,
    `$${((item.quantity || 0) * (item.price || 0)).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: 80,
    head: [['Product', 'Quantity', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [5, 150, 105] },
    margin: { top: 80 },
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const subtotal = order.items.reduce((acc, item) => acc + ((item.price || 0) * (item.quantity || 0)), 0);
  
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text('Subtotal:', 140, finalY);
  doc.text(`$${(subtotal || 0).toFixed(2)}`, 180, finalY, { align: 'right' });
  
  doc.text('Delivery Fee:', 140, finalY + 7);
  doc.text(`$${(order.deliveryFee || 0).toFixed(2)}`, 180, finalY + 7, { align: 'right' });
  
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Amount:', 140, finalY + 15);
  doc.setTextColor(5, 150, 105);
  doc.text(`$${(order.totalAmount || 0).toFixed(2)}`, 180, finalY + 15, { align: 'right' });

  // Delivery Info
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text('Delivery Information', 14, finalY + 30);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80);
  doc.text(`Method: ${order.deliveryMethod.toUpperCase()}`, 14, finalY + 37);
  if (order.deliveryAddress) {
    doc.text('Address:', 14, finalY + 42);
    doc.text(order.deliveryAddress, 14, finalY + 47, { maxWidth: 100 });
  }
  doc.text(`Status: ${order.status.toUpperCase()}`, 14, finalY + 57);

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Thank you for choosing Tellus - Connecting Farmers to You.', pageWidth / 2, 285, { align: 'center' });

  doc.save(`Order_${order.id.slice(-8).toUpperCase()}.pdf`);
};

export const exportOrdersToPDF = (orders: Order[], title: string = 'Orders Report') => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(20);
  doc.setTextColor(5, 150, 105);
  doc.text(title, 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
  doc.text(`Total Orders: ${orders.length}`, 14, 35);

  const tableData = orders.map(order => [
    order.id.slice(-8).toUpperCase(),
    new Date(order.createdAt).toLocaleDateString(),
    order.buyerName,
    order.farmerName,
    order.status.toUpperCase(),
    `$${(order.totalAmount || 0).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: 45,
    head: [['Order ID', 'Date', 'Customer', 'Farmer', 'Status', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [5, 150, 105] },
  });

  const totalRevenue = orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
  const finalY = (doc as any).lastAutoTable.finalY + 15;

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Revenue: $${(totalRevenue || 0).toFixed(2)}`, 14, finalY);

  doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};
