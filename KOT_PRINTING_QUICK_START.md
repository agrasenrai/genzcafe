# KOT & Bill Printing System - Quick Start Guide

## 🚀 What's New?

Your restaurant order management system now has **automatic KOT printing** and **manual print options** for both KOTs and Bills.

## 📋 Key Features

### ✅ Automatic KOT Printing
- When an order is marked as **"Confirmed"**, **2 KOTs automatically print**
- Works with your Epson thermal printer
- Formatted for 80mm receipt paper

### ✅ Manual Print Buttons
In the order details modal, you can:
- **Print KOT (x2)**: Print 2 kitchen order tickets
- **Print Bill**: Print the customer bill

### ✅ Print Confirmation
- Visual confirmation when print is initiated
- Status badge shows "KOTs Printed" for confirmed orders

---

## 🖨️ How to Use

### 1️⃣ Confirming an Order (Auto-Prints KOT)

**Method A: Quick Button**
1. In the orders table, find the order
2. Click the **→ confirmed** button
3. 2 KOTs automatically print to your default printer

**Method B: Modal Status Change**
1. Click on an order to open the details modal
2. In the "Status" section, click **"Confirmed"**
3. 2 KOTs automatically print

### 2️⃣ Manual Printing

**In the Order Details Modal:**

**Print KOT:**
1. Open an order detail modal
2. Click **"Print KOT (x2)"** button (orange)
3. Select your printer in the print dialog
4. Click "Print"

**Print Bill:**
1. Open an order detail modal
2. Click **"Print Bill"** button (blue)
3. Select your printer in the print dialog
4. Click "Print"

---

## 🖥️ Printer Setup

### For Epson TM-M30 or Similar Thermal Printers

#### Step 1: Install Printer Driver
1. Download Epson printer driver from [Epson Support](https://www.epson.com)
2. Install the driver on your computer
3. Connect printer via USB or Network

#### Step 2: Set as Default Printer
1. Go to **Settings** → **Devices** → **Printers & Scanners**
2. Find your Epson printer
3. Click it and select **"Set as default"**

#### Step 3: Test Print
1. Open Notepad
2. Type "TEST"
3. Print it to test if printer works

### ⚠️ Important: Allow Popups
Your browser blocks popups by default. To allow printing:

**Chrome:**
- Go to Settings → Privacy and Security → Site Settings
- Find "Pop-ups and redirects"
- Add your restaurant URL to "Allowed" list

---

## 🎯 KOT Contents

Each KOT printed includes:
- Order Number (OTP)
- Customer Name
- Order Time & Pickup Time
- Items with Quantities
- Pickup Point/Address
- Order ID

**Example KOT:**
```
================
KITCHEN ORDER TICKET
================
Order #: 1234
Customer: John Doe
Order Time: 02:30 PM
Printed: 02:31 PM
Pickup Time: 03:00 PM

ITEMS TO PREPARE
Biryani x 2
Paneer Butter x 1
Naan x 3

Pickup Point: Main Counter
Order ID: xxxxxxxx
✓ Prepare Order Carefully
================
```

---

## 💰 Bill Contents

Each bill printed includes:
- Bill Number
- Date & Time
- Customer Name & Phone
- Items with Prices
- Subtotal
- GST (5%)
- Platform Fee (if any)
- **Total Amount**
- Payment Method & Status
- Pickup Point

---

## ❓ Troubleshooting

### "Please allow popups to print"
✅ **Solution:** Enable popups in your browser for this website
- See "Printer Setup" section above

### Printer Not Printing
✅ **Solutions:**
1. Check printer is turned ON
2. Check USB/Network cable connection
3. Print a test page from Notepad to verify printer works
4. Check if printer is set as default
5. Check printer paper is loaded

### Wrong Printer Selected
✅ **Solution:**
1. When print dialog appears, select the correct Epson printer
2. Set that printer as default for future prints

### Paper Size Issues
✅ **Solutions:**
1. Load 80mm receipt paper in printer
2. In printer driver settings, set paper size to "Receipt" or "80x150mm"
3. Some thermal printers auto-detect - just use appropriate paper

---

## 📞 Support

### If Print Dialog Doesn't Appear
1. Check browser console (F12 → Console)
2. Look for any error messages
3. Try a different browser (Firefox, Edge)
4. Ensure popup blocking is disabled

### If Printer Prints Blank Pages
1. Ensure paper is loaded correctly
2. Run printer's self-test
3. Check printer driver settings
4. Restart printer

### For Network Printer Issues
1. Check printer IP address
2. Ensure printer is on same network
3. Test network connectivity
4. Update printer firmware if needed

---

## 📝 File Information

### New Files Created:
1. **`src/lib/utils/kotGenerator.ts`** - KOT printing logic
2. **`src/lib/utils/billGenerator.ts`** - Bill printing logic
3. **`src/lib/supabase/kotService.ts`** - Order data formatting

### Modified Files:
1. **`src/app/admin/orders/page.tsx`** - Added print buttons & auto-print logic

---

## 🔄 Workflow Example

1. **Customer Places Order** → Order appears in "Pending" status
2. **Admin Reviews Order** → Opens order modal
3. **Admin Clicks "Confirmed"** → 2 KOTs automatically print to kitchen
4. **Kitchen Prepares Food** → Uses KOT to know what to prepare
5. **Order Ready** → Admin clicks "Ready"
6. **Customer Pickup** → Admin can print bill if needed
7. **Order Complete** → Mark as "Delivered"

---

## ✨ Pro Tips

### Tip 1: Quick Reprints
- Easily reprint KOTs or Bill using the print buttons
- No need to manually search for receipts

### Tip 2: Multiple Kitchens
- Print to different printers using the print dialog
- Just select the appropriate kitchen printer when dialog appears

### Tip 3: Paper Setup
- Use 80mm thermal paper for best results
- Typical roll is 30m long per roll

### Tip 4: Backup Prints
- Keep physical records of printed KOTs/Bills
- Helpful for disputes or audits

---

## 🎓 Next Steps

1. ✅ Set up your Epson printer as default
2. ✅ Test a print using a sample order
3. ✅ Train staff on the new print buttons
4. ✅ Keep backup KOTs for record-keeping

---

## 📞 Questions?

Refer to **KOT_BILL_PRINTING_GUIDE.md** for detailed technical documentation.

Happy printing! 🖨️
