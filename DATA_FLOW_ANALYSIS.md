# Data Flow Analysis - DubDubSuppressor

## Database Schema Summary

### `dealers` table (canonical dealer profiles):
- `id` (UUID)
- **Business Info**: `business_name`, `ein`, `ein_type`
- **Contact**: `contact_name`, `email`, `phone`
- **Address**: `business_address`, `city`, `state`, `zip`
- **FFL**: `ffl_license_number`, `ffl_license_type`, `ffl_expiry_date`, `ffl_on_file`
- **SOT**: `sot_license_type`, `sot_tax_year`, `sot_period_start/end`, `sot_control_number`, `sot_receipt_date`, `sot_expiry_date`, `sot_on_file`
- **Tax**: `tax_exempt`, `tax_exempt_notes`, `sales_tax_id`, `sales_tax_form_data/name`, `tax_form_on_file`
- **Flags**: `has_demo_unit_shipped`, `ffl_reviewed`, `source`, `notes`

### `submissions` table:
- Links to dealer via `dealer_submissions` junction table
- Stores: `type`, `contact_name`, `business_name`, `email`, `phone`
- **Shipping**: `customer_address`, `customer_city`, `customer_state`, `customer_zip`
- **FFL/SOT/Tax**: `ffl_file_name/data`, `sot_file_name/data`, `tax_form_name/data`
- **NFA**: `serial_number`, `ffl_license_number`
- **Shipping**: `tracking_number`, `shipped_at`, `paid_at`

### `dealer_orders` table:
- `dealer_id` → links to dealers
- `quantity`, `unit_price`, `subtotal`, `shipping_cost`, `total_amount`
- `status`: pending/confirmed/shipped/delivered
- `tracking_number`, `shipped_at`

### `invoices` table:
- `dealer_id`, `order_id`, `invoice_number`
- `subtotal`, `shipping_cost`, `total_amount`, `tax_rate`, `tax_amount`
- `pdf_path`, `email_sent`, `paid_at`

---

## Issues Found & Fixes Applied

### ✅ Fixed:
1. **Tax Form Page (`tax-form.tsx`)**
   - ✅ Now uses `/api/dealer/profile` API to auto-fill ALL fields
   - ✅ Removed redundant URL params for dealer info
   - ✅ Auto-fills: `business_name`, `contact_name`, `email`, `phone`, `address`, `city`, `state`, `zip`, `state_tax_id`
   - ✅ Skips page if `tax_form_on_file=true` (redirects to order-confirmation)

2. **API Endpoint (`/api/dealer/profile`)**
   - ✅ Added `state_tax_id` to SELECT query
   - ✅ Added `stateTaxId` to JSON response

3. **Order Flow**
   - ✅ `order.tsx` now redirects to `/tax-form` for orders (not directly to order-confirmation)
   - ✅ `tax-form.tsx` redirects to `/order-confirmation` after submission

---

## Remaining Improvements Needed

### 🔧 Phase 1: Auto-populate Order Confirmation (`order-confirmation.tsx`)
**Issue**: Currently uses URL params, should use dealer profile API
**Fix**: 
```typescript
// In order-confirmation.tsx, instead of URL params:
const { data } = await fetch(`/api/dealer/profile?ffl=${ffl}`);
// Auto-fill: dealerName, contactName, email, phone, address, city, state, zip
```

### 🔧 Phase 2: Auto-populate Apply Page (`apply.tsx`)
**Issue**: After FFL verification, doesn't auto-fill from existing dealer record
**Fix**:
```typescript
// In apply.tsx, after FFL validation succeeds:
if (data.valid && data.dealerId) {
  const profile = await fetch(`/api/dealer/profile?ffl=${ffl}`);
  // Auto-fill ALL form fields from profile.data
}
```

### 🔧 Phase 3: Reduce URL Param Usage
**Files to update**:
- `order-confirmation.tsx` → Use API instead of URL params
- `apply.tsx` → Use API instead of URL params
- `dealers.tsx` → Pass FFL only, let apply page fetch profile

### 🔧 Phase 4: Database Consistency
**Issue**: Same data stored in both `dealers` and `submissions` tables
**Recommendation**: 
- Keep `submissions` as a log/audit trail
- Always reference `dealer_id` for canonical data
- Use `dealer_submissions` junction table properly

---

## Quick Wins (Auto-population)

### 1. Dealer Portal Flow (dealers.tsx → apply.tsx)
```
1. Dealer enters FFL on dealers.tsx
2. Click "Verify FFL"
3. If FFL in DB: Redirect to apply.tsx?ffl=XX-XXX-XX-XX-XXXXX
4. apply.tsx fetches /api/dealer/profile?ffl=XX-XXX-XX-XX-XXXXX
5. Auto-fills ALL fields (read-only or editable)
6. Dealer reviews, uploads missing docs
7. Submits → Updates dealer record
```

### 2. Order Flow (order.tsx → tax-form.tsx → order-confirmation.tsx)
```
1. Dealer submits order on order.tsx
2. Redirects to tax-form.tsx?type=stocking&qty=5&ffl=XX-XXX-XX-XX-XXXXX
3. tax-form.tsx fetches /api/dealer/profile?ffl=XX-XXX-XX-XX-XXXXX
4. Auto-fills ALL fields, checks tax_form_on_file
5. If tax form on file: Skip to order-confirmation
6. If not: Collect signature + State Tax ID + resale cert
7. Submit → Upload to FastBound → Redirect to order-confirmation
```

### 3. Admin Flow (admin.tsx)
```
1. Admin sees submission with FFL number
2. Clicks "View Dealer" → Opens dealer profile
3. Dealer profile shows ALL data from dealers table
4. Admin can edit ANY field
5. Admin clicks "FB Pending" → Auto-loads serials
6. Admin clicks "Form 3 ✓ (Full)" → Auto-does EVERYTHING
```

---

## Environment Variables Check

Make sure these are set in `.env`:
```bash
# FastBound
FASTBOUND_API_KEY=...
FASTBOUND_API_SECRET=...
FASTBOUND_CONTACT_ID=... # Default contact ID

# ShipStation
SHIPSTATION_API_KEY=...
SHIPSTATION_API_SECRET=...
SHIPSTATION_CARRIER_CODE=usps
SHIPSTATION_SERVICE_CODE=usps_priority_mail

# Gmail (for emails)
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dubdub22
```

---

## Next Steps (Priority Order)

1. **✅ DONE**: Tax form page auto-fill from API
2. **TODO**: Update `order-confirmation.tsx` to use API instead of URL params
3. **TODO**: Update `apply.tsx` to auto-fill from dealer profile
4. **TODO**: Test entire flow end-to-end
5. **TODO**: Add error handling for API failures (fallback to URL params if API fails)
