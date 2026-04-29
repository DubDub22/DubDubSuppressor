# Admin Dashboard - Demo & Dealer Order Flow

## Overview: What Admin Sees

**Tabs in Admin Dashboard:**
1. **"Dealer Inquiries"** — Pending dealers (FFL NOT in DB need verification)
2. **"Dealer Orders"** — Verified dealers (FFL in DB, can create orders)
3. **"Shipped"** — Orders that have tracking numbers

---

## Step 1: Admin Sees Submission (Dealer Orders Tab)

**Data Shown (from `client/src/pages/admin.tsx:611-660`):**

| Field | Source | Auto-Populated? |
|-------|--------|-------------------|
| **Type** | `submissions.type` | ✅ "demo" or "stocking" |
| **Date** | `submissions.created_at` | ✅ Auto |
| **Business Name** | `submissions.business_name` | ✅ From `dealers` table |
| **Contact Name** | `submissions.contact_name` | ✅ From `dealers` table |
| **Email** | `submissions.email` | ✅ From `dealers` table |
| **Phone** | `submissions.phone` | ✅ From `dealers` table |
| **Quantity** | `submissions.quantity` | ❌ Manual entry (dealer填写) |
| **Serial #** | `submissions.serial_number` | ❌ **Admin assigns** (from FastBound) |
| **Tracking #** | `submissions.tracking_number` | ❌ **Auto-generated** (ShipStation) |
| **Shipped At** | `submissions.shipped_at` | ❌ Auto after Form 3 |
| **Paid At** | `submissions.paid_at` | ❌ **Manual** (admin marks) |
| **Invoiced** | `submissions.has_invoice` | ❌ **Manual** (admin clicks) |

**Document Badges (FastBound Attachments):**
- ✅ **FFL** — `submissions.ffl_file_name` / `dealers.ffl_on_file`
- ✅ **SOT** — `submissions.sot_file_name` / `dealers.sot_on_file`
- ✅ **Tax Form** — `submissions.tax_form_name` / `dealers.tax_form_on_file`
- ✅ **State Tax** — `submissions.state_tax_file_name`

---

## Step 2: Admin Actions (What You Can Click)

### Button 1: "FB Pending" (FastBound Pending Disposition)
**When it appears:** Submission has NO `fastbound_disposition_id` yet
**What it does:** `POST /api/admin/submissions/:id/fastbound-pending`

**Automated Steps:**
1. **Load Serials** — Dropdown populated from FastBound inventory:
   - API: `GET /api/admin/fastbound/inventory`
   - Filters: `manufacturer="DOUBLE TACTICAL"`, `model="DubDub22 Suppressor"`
   - Only shows: `dispositionId: null` (items in inventory, NOT already disposed)
   - Returns: `{ id, serialNumber, manufacturer, model }[]`

2. **Admin Selects Serials** — Choose how many needed (matches `quantity`)

3. **Create FastBound Contact** (if not exists):
   ```javascript
   // Auto-retrieves from FFL database
   const contactId = await createOrUpdateContact({
     fflNumber: sub.ffl_license_number,
   });
   ```

4. **Create Pending NFA Disposition:**
   ```javascript
   const disp = await fbFetch("/dispositions", {
     method: "POST",
     body: JSON.stringify({
       disposeDate: today,
       disposeType: "NFA Disposition", // NOT "Sold"!
     }),
   });
   ```

5. **Attach Contact to Disposition:**
   ```javascript
   await fbFetch(`/dispositions/${disp.id}/contact`, {
     method: "POST",
     body: JSON.stringify({ contactId }),
   });
   ```

6. **Add Items (Serials) to Disposition:**
   ```javascript
   for (const serial of selectedSerials) {
     await fbFetch(`/dispositions/${disp.id}/items`, {
       method: "POST",
       body: JSON.stringify({ serialNumber: serial }),
     });
   }
   ```

7. **Save Disposition ID to Database:**
   ```sql
   UPDATE submissions SET fastbound_disposition_id = $1 WHERE id = $2;
   ```

**Result:**
- ✅ FastBound: Pending NFA Disposition created with serials
- ✅ Database: `submissions.fastbound_disposition_id` = FastBound disposition ID
- ✅ Button changes to "Form 3 ✓" (ready for next step)

---

### Button 2: "Form 3 ✓" (Form 3 Approved - FULL WORKFLOW)
**When it appears:** `fastbound_disposition_id` exists, but NO `tracking_number` yet
**What it does:** `POST /api/admin/submissions/:id/form3-approved` (FULL AUTOMATION)

**Automated Steps (All happen automatically):**

#### Part 1: Create ShipStation Label
```javascript
// Auto-generates USPS Priority Mail label
const label = await createLabel({
  shipTo: {
    name: sub.contact_name,
    companyName: sub.business_name,
    phone: sub.phone,
    addressLine1: sub.customer_address || sub.business_address,
    city: sub.customer_city || sub.city,
    state: sub.customer_state || sub.state,
    postalCode: sub.customer_zip || sub.zip,
    countryCode: "US",
  },
  pkg: {
    weightOz: 10, // ~10oz suppressor
    packageCode: "medium_flat_rate_box",
  },
});
// Returns: { labelId, trackingNumber, labelPdfUrl, shipmentId, cost }
```

#### Part 2: Commit FastBound Disposition
```javascript
// Add tracking to disposition
await fbFetch(`/dispositions/${dispositionId}`, {
  method: "PATCH",
  body: JSON.stringify({
    trackingNumber: label.trackingNumber,
    shippedDate: today,
  }),
});

// Commit (Form 3 approved)
await fbFetch(`/dispositions/${dispositionId}/commit`, {
  method: "POST",
});
```

#### Part 3: Save Tracking to Database
```sql
UPDATE submissions
SET tracking_number = $1, shipped_at = NOW()
WHERE id = $2;
```

#### Part 4: Upload Form 3 PDF to FastBound (if provided)
```javascript
if (req.body?.form3Data) {
  await uploadDealerDocumentsToFastBound(sub.ffl_license_number, {
    taxFormFileData: form3Data,
    taxFormFileName: `Form3_${date}.pdf`,
  });
}
```

#### Part 5: Email Dealer (Auto-sent)
```javascript
await sendViaGmail({
  to: sub.email,
  bcc: "tom@doubletactical.com",
  from: "DubDub22 Orders <orders@dubdub22.com>",
  subject: "Your DubDub22 Order Has Shipped",
  text: `
    Dear ${sub.contact_name},

    Your DubDub22 suppressor order has shipped!

    Tracking: ${label.trackingNumber}
    Carrier: USPS Priority Mail

    Please retain this email for your records.

    - Double T Tactical / DubDub22
  `,
});
```

**Result:**
- ✅ ShipStation: Label created, tracking number generated
- ✅ FastBound: Disposition committed (Form 3 approved)
- ✅ Database: `tracking_number` + `shipped_at` updated
- ✅ Email: Dealer notified with tracking info
- ✅ Order moves to "Shipped" tab

---

### Button 3: "Mark as Shipped" (Manual Override)
**When it appears:** `fastbound_disposition_id` exists, but NO `tracking_number`
**What it does:** `POST /api/admin/submissions/:id/shipstation-label`

**Automated Steps:**
1. Create ShipStation label (same as Part 1 above)
2. Save tracking to database (same as Part 3 above)
3. **NO FastBound commit** (assumes Form 3 already approved)
4. **NO email** (assumes dealer already notified)

**Use Case:** If Form 3 was approved outside the system, manually mark as shipped.

---

### Button 4: "Mark Paid" (Manual)
**What it does:** `PATCH /api/admin/submissions/:id/paid`
**What you enter:** Optional notes (e.g., "Paid via check #1234")
**Result:** `submissions.paid_at = NOW()`, `paid_notes = notes`

---

### Button 5: "Send Invoice" (Manual)
**What it does:** `POST /api/admin/submissions/:id/create-invoice`
**Automated Steps:**
1. Generate PDF invoice (using `pdf-lib`)
2. Save to database (`invoices` table)
3. Upload to FastBound contact (`uploadDealerDocumentsToFastBound()`)
4. Email to dealer + BCC Tom

---

## Step 3: What Happens Automatically vs. Manual

| Action | Automated? | Who Does It? | Notes |
|--------|-------------|--------------|-------|
| **Load Serials** | ✅ Auto | FastBound API | Filters: DOUBLE TACTICAL, DubDub22, in inventory |
| **Select Serials** | ❌ Manual | **Admin** | Choose from dropdown (matches quantity) |
| **Create FB Contact** | ✅ Auto | FastBound API | Retrieves from FFL database |
| **Create Pending Disposition** | ✅ Auto | FastBound API | Type: "NFA Disposition" (not "Sold") |
| **Add Items to Disposition** | ✅ Auto | FastBound API | Uses selected serials |
| **Save Disposition ID** | ✅ Auto | Database | `fastbound_disposition_id` set |
| **Create ShipStation Label** | ✅ Auto | ShipStation API | USPS Priority, 10oz, medium flat rate |
| **Commit FB Disposition** | ✅ Auto | FastBound API | Adds tracking, commits (Form 3 approved) |
| **Save Tracking #** | ✅ Auto | Database | `tracking_number` + `shipped_at` |
| **Upload Form 3 PDF** | ✅ Auto | FastBound API | If provided in request |
| **Email Dealer** | ✅ Auto | Gmail SMTP | Tracking #, carrier, BCC Tom |
| **Mark Paid** | ❌ Manual | **Admin** | Optional notes |
| **Send Invoice** | ❌ Manual | **Admin** | Generates PDF, emails dealer |

---

## Step 4: Complete Flow Diagram (Demo & Dealer Orders)

```
Dealer submits order (via /apply?ffl=XXX)
  ↓
Admin sees in "Dealer Orders" tab
  ↓
[Admin clicks "FB Pending"]
  ↓
  ├─ Load Serials from FastBound (auto)
  ├─ Admin selects serials (manual)
  ├─ Create FastBound contact (auto)
  ├─ Create Pending NFA Disposition (auto)
  ├─ Add items (serials) to disposition (auto)
  └─ Save disposition ID to DB (auto)
  ↓
Button changes to "Form 3 ✓"
  ↓
[Admin clicks "Form 3 ✓" (FULL WORKFLOW)]
  ↓
  ├─ Create ShipStation label (auto)
  ├─ Commit FastBound disposition (auto)
  ├─ Save tracking # to DB (auto)
  ├─ Upload Form 3 PDF to FastBound (auto, if provided)
  └─ Email dealer with tracking (auto)
  ↓
Order moves to "Shipped" tab
  ↓
[Optional: Admin clicks "Mark Paid"]
  ↓
Order marked as paid in DB
  ↓
[Optional: Admin clicks "Send Invoice"]
  ↓
Invoice PDF generated → emailed to dealer → uploaded to FastBound
  ↓
✅ ORDER COMPLETE!
```

---

## Step 5: Demo Orders (Special Case)

**Difference from Stocking Orders:**
- ✅ **Quantity:** Always 1 (can't order multiple demos)
- ✅ **Price:** $0 (demo unit, free)
- ✅ **Invoice:** Optional (might not send invoice for demo)
- ✅ **Flow:** Exactly the same as stocking orders (FB Pending → Form 3 → ShipStation → Email)

**Admin Notes:**
- Demo units are pre-shipped (check `dealers.demo_shipped_at`)
- If dealer already got demo, "Demo" option hidden in order form
- Dealer can still place stocking orders after receiving demo

---

## Step 6: Improvements & Fixes Needed

### Current Issues:
1. **Serial Dropdown:** Shows ALL available serials (might be too many)
   - **Fix:** Add search/filter to dropdown
   - **Fix:** Show only serials matching order quantity (e.g., order qty=5 → show 5 serials)

2. **No Validation:** Admin can select wrong number of serials
   - **Fix:** Disable "FB Pending" button if `selectedSerials.length !== quantity`
   - **Fix:** Show warning "You need to select exactly {quantity} serials"

3. **Form 3 PDF Upload:** Optional, but should be required
   - **Fix:** Make Form 3 PDF upload mandatory before "Form 3 ✓" enabled
   - **Fix:** Show "Upload Form 3 PDF" button in admin UI

4. **No Error Handling:** If ShipStation fails, no retry
   - **Fix:** Add retry logic (3 attempts)
   - **Fix:** Show error message in admin UI

5. **Manual Steps:** Too many clicks
   - **Fix:** "One-Click Form 3 Approval" (does FB Pending + Form 3 in one click)
   - **Fix:** Auto-select serials if order qty = 1

---

## Summary: What Admin Needs to Do Manually

| Step | Action | Where | Automated? |
|------|--------|-------|-----------|
| 1 | Select serials from dropdown | "FB Pending" dialog | ❌ Manual (but serials auto-loaded) |
| 2 | Click "Form 3 ✓" | Admin dashboard | ✅ FULL AUTO (label + commit + email) |
| 3 | (Optional) Mark as paid | Admin dashboard | ❌ Manual |
| 4 | (Optional) Send invoice | Admin dashboard | ❌ Manual |

**What's Fully Automated:**
- ✅ FastBound: Contact creation, pending disposition, adding items, commitment
- ✅ ShipStation: Label creation, tracking number generation
- ✅ Database: All updates (disposition ID, tracking, shipped date)
- ✅ Email: Dealer notification with tracking info
- ✅ FastBound: Form 3 PDF upload (if provided)

**Bottom Line:** Admin only needs to **select serials** and **click one button** ("Form 3 ✓") — everything else is automated! 🎉

---

**Status:** ✅ Admin flow documented — from seeing submission to order complete!
