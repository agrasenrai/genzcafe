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
 * Generate KOT HTML for printing (Single KOT - 1 page)
 * Formatted for 80mm thermal printer (typical restaurant KOT printer)
 */
export function generateSingleKOTHTML(data: KOTData): string {
  const printedDate = new Date().toLocaleString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  // Generate single KOT content
  const kotContent = `
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
    </div>
  `;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>KOT - Order ${data.orderNumber}</title>
      <style>
        * {
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box;
        }
        
        @page {
          size: 80mm auto;
          margin: 0mm;
        }
        
        html {
          margin: 0 !important;
          padding: 0 !important;
          height: auto !important;
        }
        
        body {
          font-family: 'Courier New', Courier, monospace;
          background: white;
          margin: 0 !important;
          padding: 0 !important;
          width: 80mm;
          height: auto !important;
          min-height: auto !important;
          font-weight: bold;
          color: #000;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        .kot-container {
          width: 100%;
          text-align: center;
          display: block;
          padding: 1mm 5mm;
          page-break-after: auto;
          max-width: 80mm;
          margin-left: auto;
          margin-right: auto;
        }
        
        .header-title {
          text-align: center;
          font-weight: 900;
          font-size: 24px;
          margin-bottom: 1.5mm !important;
          letter-spacing: 2px;
          line-height: 1.1;
          color: #000;
        }
        
        .restaurant-name {
          text-align: center;
          font-weight: 900;
          font-size: 15px;
          margin-bottom: 3mm !important;
          line-height: 1.1;
          color: #000;
        }
        
        .order-details {
          font-size: 13px;
          margin-bottom: 3mm !important;
          text-align: left;
          line-height: 1.4;
          font-weight: bold;
          color: #000;
        }
        
        .detail-row {
          display: flex;
          margin-bottom: 0.8mm !important;
        }
        
        .detail-label {
          font-weight: 900;
          width: 30mm;
          color: #000;
          flex-shrink: 0;
        }
        
        .detail-value {
          flex: 1;
          font-weight: bold;
          color: #000;
          word-wrap: break-word;
          overflow: hidden;
          text-align: left;
          margin-left: 1mm;
        }
        
        .items-header {
          font-size: 13px;
          font-weight: 900;
          margin-top: 3mm !important;
          margin-bottom: 1.5mm !important;
          padding-bottom: 1.5mm !important;
          border-bottom: 2px solid #000;
          display: flex;
          justify-content: space-between;
          line-height: 1.2;
          color: #000;
        }
        
        .item-name-header {
          flex: 1;
          font-weight: 900;
          min-width: 0;
          text-align: left;
        }
        
        .item-qty-header {
          width: 18mm;
          text-align: right;
          font-weight: 900;
          flex-shrink: 0;
        }
        
        .items-list {
          margin-bottom: 2mm !important;
          padding-bottom: 2mm !important;
          border-bottom: 1px dotted #000;
        }
        
        .item-row {
          font-size: 13px;
          margin-bottom: 1.2mm !important;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          line-height: 1.4;
          font-weight: bold;
          color: #000;
        }
        
        .item-name {
          flex: 1;
          word-wrap: break-word;
          font-weight: bold;
          color: #000;
          min-width: 0;
          overflow-wrap: break-word;
          text-align: left;
        }
        
        .item-qty {
          width: 18mm;
          text-align: right;
          font-weight: 900;
          color: #000;
          flex-shrink: 0;
          margin-left: 1mm;
        }
      </style>
    </head>
    <body>
      ${kotContent}
    </body>
    </html>
  `;

  return html;
}

/**
 * Generate KOT HTML for printing (Double KOT - 2 pages)
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

  // Generate KOT content
  const kotContent = `
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
    </div>
  `;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>KOT - Order ${data.orderNumber}</title>
      <style>
        * {
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box;
        }
        
        @page {
          size: 80mm auto;
          margin: 0mm;
        }
        
        html {
          margin: 0 !important;
          padding: 0 !important;
          height: auto !important;
        }
        
        body {
          font-family: 'Courier New', Courier, monospace;
          background: white;
          margin: 0 !important;
          padding: 0 !important;
          width: 80mm;
          height: auto !important;
          min-height: auto !important;
          font-weight: bold;
          color: #000;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        .kot-container {
          width: 100%;
          text-align: center;
          display: block;
          padding: 1mm 5mm;
          page-break-after: auto;
          max-width: 80mm;
          margin-left: auto;
          margin-right: auto;
        }
        
        .header-title {
          text-align: center;
          font-weight: 900;
          font-size: 24px;
          margin-bottom: 1.5mm !important;
          letter-spacing: 2px;
          line-height: 1.1;
          color: #000;
        }
        
        .restaurant-name {
          text-align: center;
          font-weight: 900;
          font-size: 15px;
          margin-bottom: 3mm !important;
          line-height: 1.1;
          color: #000;
        }
        
        .order-details {
          font-size: 13px;
          margin-bottom: 3mm !important;
          text-align: left;
          line-height: 1.4;
          font-weight: bold;
          color: #000;
        }
        
        .detail-row {
          display: flex;
          margin-bottom: 0.8mm !important;
        }
        
        .detail-label {
          font-weight: 900;
          width: 30mm;
          color: #000;
          flex-shrink: 0;
        }
        
        .detail-value {
          flex: 1;
          font-weight: bold;
          color: #000;
          word-wrap: break-word;
          overflow: hidden;
          text-align: left;
          margin-left: 1mm;
        }
        
        .items-header {
          font-size: 13px;
          font-weight: 900;
          margin-top: 3mm !important;
          margin-bottom: 1.5mm !important;
          padding-bottom: 1.5mm !important;
          border-bottom: 2px solid #000;
          display: flex;
          justify-content: space-between;
          line-height: 1.2;
          color: #000;
        }
        
        .item-name-header {
          flex: 1;
          font-weight: 900;
          min-width: 0;
          text-align: left;
        }
        
        .item-qty-header {
          width: 18mm;
          text-align: right;
          font-weight: 900;
          flex-shrink: 0;
        }
        
        .items-list {
          margin-bottom: 2mm !important;
          padding-bottom: 2mm !important;
          border-bottom: 1px dotted #000;
        }
        
        .item-row {
          font-size: 13px;
          margin-bottom: 1.2mm !important;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          line-height: 1.4;
          font-weight: bold;
          color: #000;
        }
        
        .item-name {
          flex: 1;
          word-wrap: break-word;
          font-weight: bold;
          color: #000;
          min-width: 0;
          overflow-wrap: break-word;
          text-align: left;
        }
        
        .item-qty {
          width: 18mm;
          text-align: right;
          font-weight: 900;
          color: #000;
          flex-shrink: 0;
          margin-left: 1mm;
        }
      </style>
    </head>
    <body>
      ${kotContent}
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
    
    // Wait for content to load then print and close
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        // Close window after printing
        setTimeout(() => {
          printWindow.close();
        }, 1000);
      }, 300);
    };
  } else {
    alert('Please allow popups to print KOT');
  }
}

/**
 * Print multiple KOTs (for kitchen multiple copies)
 * Single click prints two KOTs consecutively from one window
 */
export function printMultipleKOTs(data: KOTData, copies: number = 2): void {
  const kotHTML = generateKOTHTML(data);
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  
  if (printWindow) {
    printWindow.document.write(kotHTML);
    printWindow.document.close();
    
    printWindow.onload = () => {
      setTimeout(() => {
        // First print
        printWindow.print();
        
        // Second print after first completes
        setTimeout(() => {
          printWindow.print();
          
          // Close window after both prints
          setTimeout(() => {
            printWindow.close();
          }, 1500);
        }, 1500);
      }, 300);
    };
  } else {
    alert('Please allow popups to print KOT');
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
