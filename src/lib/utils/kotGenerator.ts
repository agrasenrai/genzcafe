/**
 * KOT (Kitchen Order Ticket) Generator
 * Generates printable KOT formatted for small receipt printer (80mm)
 */

interface KOTItem {
  name: string;
  quantity: number;
  specialInstructions?: string;
}

interface KOTData {
  orderId: string;
  orderNumber: string; // OTP/Order Number
  customerName: string;
  orderTime: string;
  items: KOTItem[];
  deliveryAddress?: string;
  scheduledTime?: string;
}

/**
 * Generate KOT HTML for printing
 * Formatted for 80mm thermal printer (typical restaurant KOT printer)
 */
export function generateKOTHTML(data: KOTData): string {
  const printedDate = new Date().toLocaleString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>KOT - Order ${data.orderNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Courier New', Courier, monospace;
          width: 80mm;
          padding: 2mm;
          background: white;
        }
        
        .kot-container {
          width: 100%;
          text-align: center;
        }
        
        .header-title {
          text-align: center;
          font-weight: bold;
          font-size: 16px;
          margin-bottom: 2mm;
          letter-spacing: 2px;
        }
        
        .restaurant-name {
          text-align: center;
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 4mm;
        }
        
        .order-details {
          font-size: 11px;
          margin-bottom: 4mm;
          text-align: left;
        }
        
        .detail-row {
          display: flex;
          margin-bottom: 1mm;
        }
        
        .detail-label {
          font-weight: bold;
          width: 40mm;
        }
        
        .detail-value {
          flex: 1;
        }
        
        .items-header {
          font-size: 11px;
          font-weight: bold;
          margin-top: 4mm;
          margin-bottom: 2mm;
          padding-bottom: 2mm;
          border-bottom: 1px dashed #000;
          display: flex;
          justify-content: space-between;
        }
        
        .item-name-header {
          flex: 1;
        }
        
        .item-qty-header {
          width: 25mm;
          text-align: right;
        }
        
        .items-list {
          margin-bottom: 4mm;
        }
        
        .item-row {
          font-size: 11px;
          margin-bottom: 1.5mm;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        
        .item-name {
          flex: 1;
          word-wrap: break-word;
        }
        
        .item-qty {
          width: 25mm;
          text-align: right;
          font-weight: bold;
        }
        
        .footer {
          margin-top: 4mm;
          padding-top: 2mm;
          border-top: 1px dashed #000;
          font-size: 10px;
          text-align: center;
        }
        
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="kot-container">
        <div class="header-title">KOT</div>
        <div class="restaurant-name">GEN Z BETA CAFE</div>
        
        <div class="order-details">
          <div class="detail-row">
            <span class="detail-label">Kot No:-</span>
            <span class="detail-value">${data.orderNumber}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Name:-</span>
            <span class="detail-value">${data.customerName}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Date:-</span>
            <span class="detail-value">${printedDate}</span>
          </div>
        </div>
        
        <div class="items-header">
          <span class="item-name-header">Item</span>
          <span class="item-qty-header">QTY</span>
        </div>
        
        <div class="items-list">
          ${data.items.map(item => `
            <div class="item-row">
              <div class="item-name">${item.name}</div>
              <div class="item-qty">${item.quantity}</div>
            </div>
          `).join('')}
        </div>
        
        <div class="footer">
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
}

/**
 * Open KOT in a new window for printing
 */
export function printKOT(data: KOTData): void {
  const kotHTML = generateKOTHTML(data);
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  
  if (printWindow) {
    printWindow.document.write(kotHTML);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.print();
    };
  } else {
    alert('Please allow popups to print KOT');
  }
}

/**
 * Print multiple KOTs (for kitchen multiple copies)
 */
export function printMultipleKOTs(data: KOTData, copies: number = 2): void {
  for (let i = 0; i < copies; i++) {
    setTimeout(() => {
      printKOT(data);
    }, i * 1000); // 1 second delay between each print
  }
}

/**
 * Send KOT to Epson printer directly (requires ESC/POS compatible printer)
 * This uses the browser's print API with a specific printer selection
 */
export async function sendToEpsonPrinter(data: KOTData, printerName?: string): Promise<void> {
  try {
    const kotHTML = generateKOTHTML(data);
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      throw new Error('Unable to open print window');
    }
    
    printWindow.document.write(kotHTML);
    printWindow.document.close();
    //page rollback
    // If printer name specified, try to use it
    if (printerName) {
      printWindow.onload = () => {
        // Note: Direct printer selection via JavaScript is limited due to browser security
        // User will need to select the printer in the print dialog
        const printSettings = printWindow.document.defaultView;
        if (printSettings) {
          printWindow.print();
        }
      };
    } else {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  } catch (error) {
    console.error('Error sending to Epson printer:', error);
    throw error;
  }
}
