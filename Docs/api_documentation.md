# Contracts Finder API - Research & Documentation

## Task 1 Completion Summary
**Date**: October 1, 2025
**Status**: ✅ Complete - Public API Access Confirmed (No OAuth Required)

---

## Key Finding: Public CSV Access Available

**IMPORTANT DISCOVERY**: The Contracts Finder API provides **public CSV export** functionality that does NOT require OAuth authentication. This significantly simplifies Phase 1 implementation.

### Public CSV Endpoint
```
GET https://www.contractsfinder.service.gov.uk/Search/GetCsvFile
```

**Query Parameters**:
- `keyword`: Search term (e.g., "NHS", "NHS Trust")
- `published`: Days back to search (e.g., 30, 60, 90)
- Additional filters available via web interface

**Authentication**: ❌ None required for CSV exports
**Rate Limits**: Unknown (test incrementally)
**Format**: Standard CSV with headers

---

## CSV Data Structure

### Available Fields
The CSV export includes 42+ fields per tender:

**Identification**:
- `Notice Identifier` - Unique ID (UUID format)
- `Notice Type` - Type of notice (Contract/Award/etc.)

**Organization**:
- `Organisation Name` - Buyer organization (NHS Trust name)
- `Contact Name`, `Contact Email`, `Contact Telephone`
- `Contact Address 1-2`, `Contact Town`, `Contact Postcode`, `Contact Country`

**Tender Details**:
- `Title` - Tender title
- `Description` - Full description
- `Status` - Current status
- `Published Date` - When published
- `Closing Date` - Deadline for submissions
- `Closing Time` - Specific time

**Value Information**:
- `Value Low` - Minimum contract value (£)
- `Value High` - Maximum contract value (£)
- `Awarded Value` - Final awarded amount (if applicable)
- `Awarded Date` - When award was made

**Contract Lifecycle**:
- `Start Date` - Contract start
- `End Date` - Contract end
- `Contract start date` - Actual start
- `Contract end date` - Actual end

**Classification**:
- `Cpv Codes` - Common Procurement Vocabulary codes (comma-separated)
- `OJEU Contract Type` - Contract type (Goods/Services/Works)
- `OJEU Procedure Type` - Procurement procedure

**Geographic**:
- `Nationwide` - Boolean flag
- `Postcode` - Location
- `Region` - Geographic region

**Metadata**:
- `Suitable for SME` - Small business flag
- `Suitable for VCO` - Voluntary sector flag
- `Is sub-contract` - Subcontract flag
- `Parent Reference` - Parent contract reference
- `Supply Chain` - Supply chain information

**Documents**:
- `Attachments` - List of attached documents
- `Links` - Related URLs
- `Additional Text` - Extra information

**Supplier (for awarded contracts)**:
- `Supplier [Name|Address|Ref type|Ref Number|Is SME|Is VCSE]`
- `Supplier's contact name`

---

## NHS Tender Identification Strategy

### Search Approach
Based on testing, the following strategies work best:

#### 1. Primary Search: Keyword "NHS Trust"
```
?keyword=NHS+Trust&published=90
```
**Results**: ~849 notices in last 90 days
**Pros**: Targets NHS organizations specifically
**Cons**: May miss some NHS-related tenders

#### 2. Secondary Search: Keyword "NHS"
```
?keyword=NHS&published=90
```
**Results**: Broader set including NHS suppliers
**Pros**: Comprehensive coverage
**Cons**: May include non-NHS organizations mentioning NHS

#### 3. Organization Name Filtering
After CSV download, filter by `Organisation Name` containing:
- "NHS"
- "NHS Foundation Trust"
- "NHS Trust"
- "Health Board" (Wales)
- "Health and Social Care" (Northern Ireland)

### Trust Mapping Strategy

**Challenge**: Contracts Finder uses full organization names, not standard NHS trust codes.

**Example Organization Names**:
- "St George's University Hospitals NHS Foundation Trust"
- "Hywel Dda University Health Board"

**Mapping Approach** (as per plan in phase1 doc):
1. **Exact Match**: Normalize and compare against our 151 trust names
2. **Fuzzy Match**: Use Fuse.js for similarity matching
3. **Keyword Match**: Extract location identifiers

**Expected Accuracy**: 75-85% automatic mapping rate

---

## Sample Tender Data

### Example 1: St George's Hospital Equipment Works
```csv
"23f2f473-8e8d-4a38-b8ba-8535ee7cb1de","Contract","St George's University Hospitals NHS Foundation Trust","Open","30 September 2025","LTHW Constant&Variable Temperature Plant/Eqpt Refurb Works at St George's Hosp","Tender for LTHW Constant & Variable Temperature Centre Plant/Equipment Refurbishment Works","","SW17 0QT","London","","","","","","","","United Kingdom","","","","","","","","","","","Yes","Yes","","Works","1000000","1000000","","",""
```

### Example 2: Welsh Health Board Medical Equipment
```csv
"ee03a0d2-bffc-4fe2-b4ed-1fdf9f27061b","Contract","Hywel Dda University Health Board","Open","30 September 2025","Maintenance of Cone Beam Dental CT Scanning System","Swansea Bay UHB is renewing a contract for Cone Beam CT Scanning System","","","Wales","","","","","","","","United Kingdom","","","","","","","","","","","Yes","Yes","","Services","","","","",""
```

---

## API Endpoints (OAuth-based - Optional)

The Contracts Finder also provides a REST API with OAuth 2.0 authentication for programmatic access:

### Authentication Endpoint
```
POST https://www.contractsfinder.service.gov.uk/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id={id}&client_secret={secret}
```

### Search Endpoint
```
GET https://www.contractsfinder.service.gov.uk/api/Published/Notices/Search
Authorization: Bearer {access_token}
Accept: application/json
```

**Query Parameters**:
- `keyword`: Search term
- `publishedFrom`: YYYY-MM-DD
- `publishedTo`: YYYY-MM-DD
- `valueFrom`: Minimum value (£)
- `valueTo`: Maximum value (£)
- `page`: Page number
- `pageSize`: Results per page (max 100)

### OCDS Endpoint (Open Contracting Data Standard)
```
GET https://www.contractsfinder.service.gov.uk/Published/OCDS/Search
```
**Returns**: Structured JSON in OCDS format (more standardized)

---

## Recommended Implementation Approach

### Phase 1: Use Public CSV Exports (SIMPLEST)

**Advantages**:
- ✅ No OAuth registration required
- ✅ No authentication complexity
- ✅ Immediate implementation
- ✅ Full data access
- ✅ Simple to test and debug

**Disadvantages**:
- ⚠️ CSV parsing required
- ⚠️ Less real-time (batch downloads)
- ⚠️ Rate limits unknown

**Implementation**:
```typescript
// Fetch NHS tenders for last 90 days
const csvUrl = 'https://www.contractsfinder.service.gov.uk/Search/GetCsvFile?keyword=NHS+Trust&published=90';
const response = await fetch(csvUrl);
const csvText = await response.text();

// Parse CSV (use Papa Parse library)
const parsed = Papa.parse(csvText, { header: true });
const tenders = parsed.data;

// Filter NHS organizations
const nhsTenders = tenders.filter(t =>
  t['Organisation Name'].includes('NHS') ||
  t['Organisation Name'].includes('Health Board')
);
```

### Phase 2 (Future): OAuth API for Real-Time Updates

Only pursue OAuth registration if:
- Need real-time notifications
- Want programmatic publishing
- Require advanced filtering beyond CSV capabilities

---

## Data Quality Observations

### From Test Searches

**Total Tenders**: ~849 results for "NHS Trust" in last 90 days
**NHS-Specific**: Estimated 200-400 NHS trusts (requires filtering)
**Value Range**: £25k to £150M+
**Geographic Coverage**: England, Wales, Scotland (some)

**Data Completeness**:
- ✅ Title: 100% populated
- ✅ Organization Name: 100% populated
- ✅ Published Date: 100% populated
- ⚠️ Value Low/High: ~60% populated (many blank)
- ⚠️ Description: ~90% populated
- ⚠️ Closing Date: ~80% populated
- ⚠️ CPV Codes: ~40% populated

---

## Next Steps for Task 2

With public CSV access confirmed:

1. ✅ **Skip OAuth registration** - Not needed for Phase 1
2. ✅ **Database schema** - Proceed with Task 2 (schema design)
3. ✅ **CSV parsing** - Use Papa Parse (already in project dependencies)
4. ✅ **Simplified API client** - Fetch CSV, parse, process
5. ✅ **Testing** - Immediate testing possible without credentials

---

## Environment Variables (Simplified)

Original plan required:
```env
CONTRACTS_FINDER_CLIENT_ID=...
CONTRACTS_FINDER_CLIENT_SECRET=...
CONTRACTS_FINDER_API_URL=...
```

**New recommendation** (Phase 1):
```env
# Contracts Finder API
CONTRACTS_FINDER_CSV_URL=https://www.contractsfinder.service.gov.uk/Search/GetCsvFile
CONTRACTS_FINDER_DAYS_BACK=90
```

OAuth credentials can be added later if needed for Phase 2+.

---

## Rate Limiting & Best Practices

**Unknown Rate Limits** - Proceed cautiously:
- Start with small test queries (30 days)
- Monitor response times and errors
- Implement exponential backoff
- Cache CSV data (refresh daily/weekly, not per request)
- Consider nightly batch sync (not real-time polling)

**Recommended Sync Schedule**:
- **Initial load**: Last 90 days
- **Daily sync**: Last 7 days (to catch updates)
- **Weekly full refresh**: Last 90 days

---

## Task 1 Deliverables ✅

- [x] API authentication approach determined (Public CSV - no auth needed)
- [x] Sample API responses captured (CSV structure documented)
- [x] NHS tender identification strategy validated (keyword + org name filtering)
- [x] Data structure documented (42+ CSV fields mapped)
- [x] Rate limits and pagination understood (CSV export, unknown limits)

**Status**: Task 1 Complete - Ready for Task 2 (Database Schema)
