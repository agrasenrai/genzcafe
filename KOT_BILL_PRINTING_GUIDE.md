# KOT & Bill Printing System

## Overview
The KOT (Kitchen Order Ticket) and Bill printing system has been integrated into the restaurant order management system. This system automatically prints KOTs when orders are confirmed and provides manual print options for both KOTs and Bills.

## Features

### 1. **Automatic KOT Printing**
- When an order status is changed to **"Confirmed"** by the admin, **2 KOTs are automatically printed**
- KOTs are formatted for 80mm thermal receipt printers (typical restaurant KOT printers)
- Works with Epson and compatible thermal printers

### 2. **Manual Print Options**
- **Print KOT Button**: Print 2 copies of the KOT for the current order
- **Print Bill Button**: Print the customer bill for the current order
- Both buttons are available in the order detail modal

### 3. **KOT Format (80mm Receipt Paper)**
The KOT includes:
- Order number (OTP)
- Customer name
- Order time
- Printed time
- Pickup time (if scheduled)
- List of items with quantities
- Pickup point/delivery address
- Order ID for reference

### 4. **Bill Format (80mm Receipt Paper)**
The Bill includes:
- Bill number
- Date and time
- Customer name and phone
- Items with quantities and prices
- Itemized charges:
  - Subtotal
  - GST (5%)
  - Platform fee
  - Delivery charge (if applicable)
- Final total amount
- Payment method and status
- Customer pickup point
- Thank you message

## How It Works

### Order Confirmation Flow
1. Admin clicks the **quick status button** (→ confirmed) or selects **"Confirmed"** status in the modal
2. Order status updates in the database
3. System fetches full order details
4. **2 KOTs are automatically printed** to the default printer
5. Modal shows print buttons for manual reprints

### Manual Printing
1. Open an order detail modal
2. Click **"Print KOT (x2)"** to print 2 copies of the KOT
3. Click **"Print Bill"** to print the customer bill
4. Select the printer in the print dialog that appears

## Printer Setup (Epson)

### For Epson TM-M30 or Similar:
1. Connect the printer to your network or via USB
2. Install Epson printer drivers on your system
3. In Windows Print Settings, set the printer as default for receipt printing
4. The system will use the default printer automatically

### Print Dialog Selection
- When you click "Print KOT" or "Print Bill", a print dialog opens
- Select your Epson printer from the list
- Choose appropriate settings (80mm width, receipt mode)
- Click "Print"

## File Structure

### New Files Created:

1. **`src/lib/utils/kotGenerator.ts`**
   - `generateKOTHTML()` - Generates KOT HTML
   - `printKOT()` - Opens KOT in print window
   - `printMultipleKOTs()` - Prints multiple KOT copies
   - `sendToEpsonPrinter()` - Direct Epson printer support

2. **`src/lib/utils/billGenerator.ts`**
   - `generateBillHTML()` - Generates Bill HTML
   - `printBill()` - Opens Bill in print window
   - `sendBillToEpsonPrinter()` - Direct Epson printer support

3. **`src/lib/supabase/kotService.ts`**
   - `getOrderForKOT()` - Fetches order details from database
   - `formatOrderForKOT()` - Formats order data for KOT display
   - `formatOrderForBill()` - Formats order data for Bill display

### Modified Files:

1. **`src/app/admin/orders/page.tsx`**
   - Added imports for KOT and Bill utilities
   - Updated `handleStatusUpdate()` to trigger KOT printing when status = "confirmed"
   - Added "Print KOT (x2)" button in modal footer
   - Added "Print Bill" button in modal footer

## Usage Examples

### Print KOT for an Order
```typescript
const kotData = formatOrderForKOT(order);
printMultipleKOTs(kotData, 2); // Prints 2 copies
```

### Print Bill for an Order
```typescript
const billData = formatOrderForBill(order);
printBillDocument(billData);
```

## Configuration

### Customize KOT Layout
Edit `src/lib/utils/kotGenerator.ts` to:
- Change paper width (currently 80mm)
- Modify fonts and spacing
- Add restaurant logo or name
- Change order information display

### Customize Bill Layout
Edit `src/lib/utils/billGenerator.ts` to:
- Add restaurant branding
- Modify tax calculations
- Change item display format
- Add payment instructions

## Troubleshooting

### "Please allow popups to print KOT"
- Your browser is blocking popups
- Allow popups for this website in browser settings
- Chrome: Settings → Privacy and Security → Site Settings → Pop-ups and redirects

### Printer Not Printing
1. Ensure printer is turned on and connected
2. Check printer is set as default in Windows Print Settings
3. Verify printer drivers are installed
4. Try printing from Notepad to test printer functionality

### Wrong Printer Selected
- The print dialog will appear when clicking Print buttons
- You can select a different printer from the dropdown
- Set your Epson printer as the default for best results

### Paper Size Issues
- Ensure 80mm receipt paper is loaded in the printer
- In printer driver settings, set paper size to "80x150mm" or "Receipt"
- Some printers auto-detect paper size

## Future Enhancements

Possible improvements:
1. Add configuration page for:
   - Auto-print after X seconds
   - Number of KOT copies (currently fixed at 2)
   - Restaurant name and details
   - Tax rates

2. Add printer selection UI:
   - Choose printer before printing
   - Save printer preferences

3. Add preview before printing:
   - View KOT/Bill before printing
   - Edit details if needed

4. Barcode/QR code:
   - Add order ID as barcode
   - Customer tracking QR code

5. Multiple language support:
   - Print in Hindi/Regional languages
   - Bilingual KOTs

## API Integration Points

If you need to integrate with a direct printer API (e.g., for network printers):

1. Update `sendToEpsonPrinter()` in `kotGenerator.ts`
2. Use printer vendor's SDK or REST API
3. Send ESC/POS commands directly to printer IP:9100

Example (for future implementation):
```typescript
export async function sendESCPOSToNetworkPrinter(
  printerIP: string,
  escposCommands: string
) {
  // Implementation here
}
```

## Support

For issues or customization requests:
1. Check browser console for error messages
2. Verify printer connection and drivers
3. Test with different browsers
4. Check printer logs on the printer itself
