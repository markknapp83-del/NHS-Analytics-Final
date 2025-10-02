# Quick Start Guide - Phase 1C Tasks 3 & 4

**Previous Work:** Tasks 1 & 2 complete - 6,456 tenders downloaded and classified ✅

**Your Goal:** Create database schema and import 324 insourcing opportunities

---

## 📁 What's Ready For You

**Classification Results** (all in `./data/classification-results/`):
- ✅ `insourcing-opportunities.json` - **324 tenders ready to import**
- ✅ `frameworks.json` - 1,604 frameworks (optional import)
- ✅ `discarded.json` - 4,528 discarded tenders (for review)

**Database:**
- Supabase credentials in `.env.local`
- 143 NHS Trusts already in `trust_metrics` table
- `tenders` table exists, needs classification columns added

---

## 🎯 Task 3: Database Schema (1 hour)

**Create migration file:** `supabase/migrations/YYYYMMDDHHMMSS_add_classification_tables.sql`

**Add to `tenders` table:**
```sql
ALTER TABLE tenders ADD COLUMN classification VARCHAR(50);
ALTER TABLE tenders ADD COLUMN classification_reason TEXT;
ALTER TABLE tenders ADD COLUMN classification_confidence INTEGER;
ALTER TABLE tenders ADD COLUMN is_framework BOOLEAN DEFAULT FALSE;
ALTER TABLE tenders ADD COLUMN framework_name TEXT;
ALTER TABLE tenders ADD COLUMN matched_entity_type VARCHAR(20);
```

**Create new tables:**
- `frameworks` - Store framework agreements
- `discarded_tenders` - Store discarded tenders for review

**Full schema in:** `Docs/nhs_tenders_phase1c.md` lines 541-640

---

## 🎯 Task 4: Import Script (2 hours)

**Create:** `/scripts/import-to-database.ts`

**Must do:**
1. Read `insourcing-opportunities.json` (324 tenders)
2. Transform each tender to database format
3. Upsert to `tenders` table
4. Log import statistics

**Add npm script:**
```json
"import-tenders": "tsx --env-file=.env.local scripts/import-to-database.ts"
```

**Run with:** `npm run import-tenders`

---

## 📋 Data Structure Reference

Each tender in JSON files has:
- **ParsedTender fields:** id, title, description, buyer, value, dates, etc.
- **Classification fields:** classification, reason, confidence, matched_trust_code, etc.

**Database mapping:**
- `contracts_finder_id` ← `tender.id` (OCID)
- `trust_code` ← `classification.matched_trust_code`
- `classification` ← `classification.classification`
- etc.

---

## 🚀 Commands Available

```bash
# Review what was done
npm run download-tenders-12m    # Re-download if needed
npm run classify-tenders        # Re-classify if needed

# Your tasks
npm run import-tenders          # (Create this for Task 4)
```

---

## 📖 Documentation

**Read these in order:**
1. `Docs/PHASE1C_TASKS1-2_COMPLETE.md` - Full summary of completed work
2. `Docs/nhs_tenders_phase1c.md` - Original plan (Tasks 3 & 4 sections)
3. `./data/classification-results/` - Review the actual data you'll import

**Key files to reference:**
- `/lib/contracts-finder-client.ts` - ParsedTender interface
- `/lib/tender-classifier.ts` - ClassificationResult interface
- `/lib/tender-processor.ts` - Example database insert pattern

---

## ✅ Success Criteria

**Task 3 Complete When:**
- [ ] Migration file created and applied
- [ ] `tenders` table has classification columns
- [ ] `frameworks` table created
- [ ] `discarded_tenders` table created

**Task 4 Complete When:**
- [ ] 324 insourcing opportunities imported to database
- [ ] All Trust/ICB mappings preserved
- [ ] Import statistics logged
- [ ] Can query: `SELECT * FROM tenders WHERE classification = 'insourcing_opportunity'`

---

**START HERE:** Read `Docs/PHASE1C_TASKS1-2_COMPLETE.md` for full context!
