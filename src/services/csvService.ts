import { Order } from '../types';

export const exportOrdersToCSV = (orders: Order[], filename: string = 'orders.csv') => {
  const headers = ['Order ID', 'Buyer Name', 'Farmer Name', 'Total Amount', 'Status', 'Order Date'];
  
  const rows = orders.map(order => [
    order.id,
    order.buyerName,
    order.farmerName,
    `$${order.totalAmount.toFixed(2)}`,
    order.status.toUpperCase(),
    new Date(order.createdAt).toLocaleDateString()
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
