/**
 * Bill Generator
 * Generates printable bills for orders
 */

interface BillItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface BillData {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  orderDate: string;
  orderTime: string;
  deliveryAddress?: string;
  items: BillItem[];
  itemTotal: number;
  gst: number;
  platformFee: number;
  deliveryCharge: number;
  finalTotal: number;
  paymentMethod: string;
  paymentStatus?: string;
}

/**
 * Generate Bill HTML for printing (80mm thermal printer)
 */
export function generateBillHTML(data: BillData): string {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Bill - Order ${data.orderNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Courier New', Courier, monospace;
          width: 80mm;
          padding: 5mm;
          background: white;
        }
        
        .bill-container {
          width: 100%;
          border: 1px solid #000;
          padding: 8mm;
        }
        
        .header {
          text-align: center;
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 3mm;
          padding-bottom: 2mm;
          border-bottom: 1px solid #000;
        }
        
        .store-name {
          font-size: 12px;
          margin-bottom: 1mm;
        }
        
        .bill-info {
          font-size: 10px;
          margin-bottom: 5mm;
          text-align: left;
        }
        
        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1mm;
        }
        
        .info-label {
          font-weight: bold;
        }
        
        .items-table {
          width: 100%;
          margin-bottom: 5mm;
          border-top: 1px dashed #000;
          border-bottom: 1px dashed #000;
        }
        
        .table-header {
          display: flex;
          font-weight: bold;
          font-size: 10px;
          padding: 2mm 0;
          border-bottom: 1px dashed #000;
        }
        
        .col-item {
          flex: 1;
        }
        
        .col-qty {
          width: 20mm;
          text-align: center;
        }
        
        .col-price {
          width: 25mm;
          text-align: right;
        }
        
        .item-row {
          display: flex;
          font-size: 10px;
          padding: 1.5mm 0;
          border-bottom: 1px dotted #ddd;
          align-items: flex-start;
        }
        
        .item-name {
          flex: 1;
          word-wrap: break-word;
          font-weight: normal;
        }
        
        .item-qty {
          width: 20mm;
          text-align: center;
        }
        
        .item-total {
          width: 25mm;
          text-align: right;
          font-weight: bold;
        }
        
        .totals-section {
          margin-top: 3mm;
          margin-bottom: 5mm;
          font-size: 10px;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 1mm 0;
        }
        
        .total-label {
          text-align: right;
          flex: 1;
        }
        
        .total-amount {
          width: 25mm;
          text-align: right;
          font-weight: normal;
        }
        
        .final-total {
          display: flex;
          justify-content: space-between;
          padding: 2mm 0;
          font-size: 12px;
          font-weight: bold;
          border-top: 1px solid #000;
          border-bottom: 1px solid #000;
          margin-top: 2mm;
        }
        
        .final-amount {
          width: 25mm;
          text-align: right;
        }
        
        .payment-info {
          font-size: 10px;
          text-align: center;
          margin-top: 3mm;
          padding: 2mm 0;
          border-top: 1px dashed #000;
        }
        
        .customer-info {
          font-size: 9px;
          margin-top: 2mm;
          text-align: left;
          background: #f9f9f9;
          padding: 2mm;
        }
        
        .footer {
          font-size: 9px;
          text-align: center;
          margin-top: 3mm;
          padding-top: 2mm;
          border-top: 1px dashed #000;
        }
        
        .thank-you {
          font-weight: bold;
          margin-top: 2mm;
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
      <div class="bill-container">
        <div class="header">
          <div class="store-name">🍽️ RESTAURANT</div>
          <div>BILL</div>
        </div>
        
        <div class="bill-info">
          <div class="info-row">
            <span class="info-label">Bill #:</span>
            <span>${data.orderNumber}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Date:</span>
            <span>${data.orderDate}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Time:</span>
            <span>${data.orderTime}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Customer:</span>
            <span>${data.customerName}</span>
          </div>
        </div>
        
        <div class="items-table">
          <div class="table-header">
            <div class="col-item">ITEM</div>
            <div class="col-qty">QTY</div>
            <div class="col-price">TOTAL</div>
          </div>
          
          ${data.items.map(item => `
            <div class="item-row">
              <div class="item-name">${item.name}</div>
              <div class="item-qty">x${item.quantity}</div>
              <div class="item-total">₹${item.total.toFixed(2)}</div>
            </div>
          `).join('')}
        </div>
        
        <div class="totals-section">
          <div class="total-row">
            <span class="total-label">Subtotal:</span>
            <span class="total-amount">₹${data.itemTotal.toFixed(2)}</span>
          </div>
          <div class="total-row">
            <span class="total-label">GST (5%):</span>
            <span class="total-amount">₹${data.gst.toFixed(2)}</span>
          </div>
          ${data.platformFee > 0 ? `
          <div class="total-row">
            <span class="total-label">Platform Fee:</span>
            <span class="total-amount">₹${data.platformFee.toFixed(2)}</span>
          </div>
          ` : ''}
          ${data.deliveryCharge > 0 ? `
          <div class="total-row">
            <span class="total-label">Delivery:</span>
            <span class="total-amount">₹${data.deliveryCharge.toFixed(2)}</span>
          </div>
          ` : ''}
        </div>
        
        <div class="final-total">
          <span>TOTAL AMOUNT</span>
          <span class="final-amount">₹${data.finalTotal.toFixed(2)}</span>
        </div>
        
        <div class="payment-info">
          <div>Payment: ${data.paymentMethod}</div>
          ${data.paymentStatus ? `<div>Status: ${data.paymentStatus}</div>` : ''}
        </div>
        
        <div class="customer-info">
          <div><strong>Customer:</strong> ${data.customerName}</div>
          <div><strong>Phone:</strong> ${data.customerPhone}</div>
          ${data.deliveryAddress ? `
          <div><strong>Pickup:</strong> ${data.deliveryAddress}</div>
          ` : ''}
        </div>
        
        <div class="footer">
          <div class="thank-you">
            Thank You! 🙏
          </div>
          <div style="margin-top: 2mm;">
            Order ID: ${data.orderId}
          </div>
          <div style="margin-top: 1mm;">
            Visit Us Again!
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return html;
}

/**
 * Print Bill
 */
export function printBill(data: BillData): void {
  const billHTML = generateBillHTML(data);
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  
  if (printWindow) {
    printWindow.document.write(billHTML);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.print();
    };
  } else {
    alert('Please allow popups to print bill');
  }
}

/**
 * Send Bill to Epson printer
 */
export async function sendBillToEpsonPrinter(data: BillData, printerName?: string): Promise<void> {
  try {
    const billHTML = generateBillHTML(data);
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      throw new Error('Unable to open print window');
    }
    
    printWindow.document.write(billHTML);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.print();
    };
  } catch (error) {
    console.error('Error sending bill to printer:', error);
    throw error;
  }
}
