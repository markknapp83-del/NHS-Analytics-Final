# Quick Start: Phase 1C Tasks 5 & 6

**Status:** ✅ **COMPLETE** - Frontend built and ready to use!

**Prerequisites:** ✅ Tasks 1-4 complete, database verified with 324 opportunities

---

## Quick Context

**What's Done:**
- 324 insourcing opportunities in database
- 13 frameworks cataloged
- 4,528 discarded tenders ready for review
- Database schema enhanced with classification fields

**What Was Built:**
- ✅ Task 5: Review interface for discarded tenders (`/src/app/tenders/review/page.tsx`)
- ✅ Task 6: Enhanced tenders display with filters (`/src/app/tenders/page.tsx`)
- ✅ Navigation: Added "Tenders" menu item to dashboard sidebar
- ✅ Component: Created Textarea UI component for notes

---

## Database Tables Ready to Use

### `tenders` table (324 records)
Key columns: `classification`, `classification_reason`, `classification_confidence`, `trust_code`, `icb_code`, `matched_entity_type`, `is_framework`

### `frameworks` table (13 records)
Key columns: `framework_name`, `managing_organization`, `contracts_finder_references`

### `discarded_tenders` table (4,528 records)
Key columns: `title`, `discard_reason`, `discard_confidence`, `reviewed`, `should_include`

---

## Quick Queries

```typescript
// Existing Supabase client
import { supabaseClient } from '@/lib/supabase-client';

// Get opportunities
const { data } = await supabaseClient
  .from('tenders')
  .select('*')
  .eq('classification', 'insourcing_opportunity')
  .order('published_date', { ascending: false });

// Get discarded for review (low confidence first)
const { data } = await supabaseClient
  .from('discarded_tenders')
  .select('*')
  .eq('reviewed', false)
  .order('discard_confidence', { ascending: true })
  .limit(50);

// Update review status
await supabaseClient
  .from('discarded_tenders')
  .update({ reviewed: true, should_include: true })
  .eq('id', tenderId);
```

---

## Key Reference

**Existing UI Components:**
- `@/components/ui/card`, `@/components/ui/table`, `@/components/ui/badge`
- `@/components/ui/button`, `@/components/ui/tabs`
- Trust selector already exists in dashboard

**Styling:**
- Green badge: Insourcing opportunities
- Blue badge: Frameworks
- Solid badge: High confidence (>90)
- Outlined badge: Medium confidence (70-90)

**Currency formatting:**
```typescript
const formatCurrency = (value: number | null) => {
  if (!value) return 'N/A';
  if (value >= 1_000_000) return `£${(value / 1_000_000).toFixed(1)}M`;
  return `£${(value / 1_000).toFixed(0)}K`;
};
```

---

## Full Details

See `Docs/nhs_tenders_phase1c.md` section "KEY CONTEXT FOR TASKS 5 & 6" for:
- Complete database schema
- Example queries
- UI component patterns
- Error handling
- Review workflow

---

## How to Access

1. **Main Tenders Page**: Click "Tenders" in dashboard sidebar → Opens `/tenders`
2. **Review Page**: Click "Review Discarded Tenders" button on tenders page → Opens `/tenders/review`

## Commands

```bash
# Dev server (already running)
npm run dev

# Access pages
# Navigate to: http://localhost:3000/tenders
# Navigate to: http://localhost:3000/tenders/review

# Re-run import if needed
npm run import-tenders

# Re-classify if needed
npm run classify-tenders
```

## Key Features Implemented

### Tenders Page (`/tenders`)
- ✅ Three-tab system (Opportunities/Frameworks/All)
- ✅ Advanced filtering (Entity Type, Trust, ICB)
- ✅ Rich tender cards with all metadata
- ✅ Classification badges and confidence scores
- ✅ Currency formatting (£54M, £150K)
- ✅ External links to Contracts Finder

### Review Page (`/tenders/review`)
- ✅ Three-tab filtering (Unreviewed/All/Should Include)
- ✅ Stats cards showing counts
- ✅ Low-confidence items shown first
- ✅ Mark as "Should Include" action
- ✅ Mark as "Reviewed" action
- ✅ Add/edit notes functionality
- ✅ Collapsible search text for debugging

## What You Can Do Now

1. **View 324 opportunities** filtered by your Trust/ICB
2. **Explore frameworks** in dedicated tab
3. **Review discarded tenders** to find false negatives
4. **Flag incorrect classifications** with notes
5. **Export data** (via browser, or add export feature in Phase 2)

---

**Full documentation**: See `/Docs/PHASE1C_TASKS5-6_COMPLETE.md` for complete details! 🚀

**Phase 1C is now 100% complete!** ✅✅✅
