import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OrderRow } from '@/lib/supabase/reports';

interface PageOptions {
  pageWidth: number;
  pageHeight: number;
  margin: number;
}

/**
 * Generate PDF report for today's orders
 */
export async function generateDailyReportPDF(
  orders: any[],
  stats: any,
  dateString: string,
  restaurantName: string = 'GenZ Cafe'
) {
  // Create PDF document
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'A4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  let yPosition = margin;

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(restaurantName, margin, yPosition);
  
  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Daily Sales Report - ${dateString}`, margin, yPosition);

  // Daily Statistics Section
  yPosition += 12;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Daily Summary', margin, yPosition);

  yPosition += 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const statsData = [
    ['Total Orders', stats.totalOrders.toString()],
    ['Total Items', stats.totalItems.toString()],
    ['Item Total (Without GST)', `Rs. ${stats.totalItemTotal.toFixed(2)}`],
    ['Total GST', `Rs. ${stats.totalGST.toFixed(2)}`],
    ['Total Revenue', `Rs. ${stats.totalRevenue.toFixed(2)}`]
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [['Description', 'Value']],
    body: statsData,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 9,
      cellPadding: 3,
      halign: 'left'
    },
    headStyles: {
      fillColor: [75, 85, 99],
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 15;

  // Orders Table Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Order Details', margin, yPosition);

  yPosition += 8;

  // Prepare table data - show "-" for empty cells
  const tableData = orders.map((row: any) => [
    row.orderId === '-' ? '-' : row.orderId,
    row.itemName === '-' ? '-' : row.itemName,
    row.quantity === 0 ? '-' : row.quantity.toString(),
    row.itemPrice === 0 ? '-' : row.itemPrice.toFixed(2),
    row.itemTotal === 0 ? '-' : row.itemTotal.toFixed(2),
    row.gst === 0 ? '-' : row.gst.toFixed(2),
    row.finalTotal === 0 ? '-' : row.finalTotal.toFixed(2)
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Order ID', 'Item Name', 'Qty', 'Item Price', 'Item Total', 'GST', 'Total']],
    body: tableData,
    margin: { left: margin, right: margin },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      halign: 'center',
      valign: 'middle'
    },
    columnStyles: {
      0: { halign: 'center', valign: 'middle' },
      1: { halign: 'left' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center', valign: 'middle' },
      5: { halign: 'center', valign: 'middle' },
      6: { halign: 'center', valign: 'middle' }
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center'
    },
    didDrawCell: (data: any) => {
      const { row, column, cell } = data;
      
      // Skip header row
      if (row.section === 'head') return;
      
      const rowIndex = row.index;
      const orderRow = orders[rowIndex];
      
      if (!orderRow) return;
      
      // Draw thick border at the bottom of the last item of each order (summary row)
      if (orderRow.isLastItemOfOrder) {
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.5);
        doc.line(cell.x, cell.y + cell.height, cell.x + cell.width, cell.y + cell.height);
      }
    },
    didDrawPage: (data: any) => {
      // Footer on each page
      const pageCount = (doc as any).internal.getNumberOfPages();
      const pageSize = doc.internal.pageSize;
      const pageHeight = pageSize.getHeight();
      const pageWidth = pageSize.getWidth();

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
  });

  // Footer with totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  
  const rightMargin = pageWidth - margin;
  const totalLineX = rightMargin - 60;
  
  doc.text('Total:', totalLineX, finalY);
  doc.text(`Rs. ${stats.totalRevenue.toFixed(2)}`, rightMargin - 15, finalY, { align: 'right' });

  // Generate filename with date
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const filename = `DailySalesReport_${dateStr}.pdf`;

  // Save the PDF
  doc.save(filename);
}
