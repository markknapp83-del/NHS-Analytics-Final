# Claude Code Vercel CLI Deployment Plan
## NHS Analytics Dashboard - Fix TypeScript Issues & Deploy

## Project Context
- **Current Status**: Vercel CLI deployment failed due to TypeScript error in capacity page
- **Location**: `~/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master`
- **Vercel Project**: `nhs-data-analytics-tool-v6-master` (already created)
- **Error**: Type mismatch in `./src/app/dashboard/capacity/page.tsx` line 109

## Objective
Deploy NHS Analytics Dashboard via Vercel CLI, fixing TypeScript errors as they arise during the build process.

---

## Phase 1: Fix Current TypeScript Error

### Task 1.1: Resolve Capacity Page Type Error
```bash
# Claude Code Task: Fix TypeScript error in capacity page component
# Action: Update trend calculation to handle null/undefined types properly
# Output: Fixed capacity page with proper type handling
```

**Error Location**: `src/app/dashboard/capacity/page.tsx:109:13`
**Issue**: `TrendData | null | undefined` not assignable to expected trend type
**Root Cause**: `calculateTrend` function can return `null` but component expects specific object structure

**Fix Strategy**:
```typescript
// Current problematic code (line ~109):
trend={previousMonthVWData ? calculateTrend(
  latestVWData.capacity_data?.virtual_ward_capacity || 0,
  previousMonthVWData?.capacity_data?.virtual_ward_capacity || 0,
  true
) : undefined}

// Fixed version with proper null handling:
trend={
  previousMonthVWData && 
  latestVWData.capacity_data?.virtual_ward_capacity !== undefined &&
  previousMonthVWData.capacity_data?.virtual_ward_capacity !== undefined
    ? calculateTrend(
        latestVWData.capacity_data.virtual_ward_capacity,
        previousMonthVWData.capacity_data.virtual_ward_capacity,
        true
      ) ?? undefined
    : undefined
}
```

### Task 1.2: Update TrendData Type Definition
```bash
# Claude Code Task: Update type definitions to handle null returns
# Action: Modify TrendData interface or calculateTrend function return type
# Output: Consistent type definitions across components
```

**Check and update**:
- `calculateTrend` function return type
- `TrendData` interface definition
- All components using trend calculations

---

## Phase 2: Systematic TypeScript Error Resolution

### Task 2.1: Compile and Identify All TypeScript Issues
```bash
# Claude Code Task: Run TypeScript compilation to identify all type errors
# Action: Execute `npm run type-check` or `tsc --noEmit` to find all issues
# Output: Complete list of TypeScript errors to fix
```

**Expected Command**:
```bash
cd ~/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master
npm run type-check
# OR
npx tsc --noEmit
```

### Task 2.2: Fix TypeScript Errors Systematically
```bash
# Claude Code Task: Fix all identified TypeScript errors
# Action: Address type mismatches, missing properties, and undefined handling
# Output: TypeScript-clean codebase ready for deployment
```

**Common Issues to Expect**:
- Similar trend calculation type mismatches in other dashboard components
- Supabase data type mismatches
- Missing optional chaining in data access
- Prop type mismatches between components
- Environment variable type issues

**Fix Priority**:
1. **Critical build failures** (blocking deployment)
2. **Component prop type mismatches** (React rendering issues)
3. **Data access type issues** (runtime errors)
4. **Minor type annotations** (code quality)

---

## Phase 3: Vercel CLI Deployment

### Task 3.1: Test Local Build
```bash
# Claude Code Task: Verify local build passes after TypeScript fixes
# Action: Run complete Next.js build process locally
# Output: Successful local build confirmation
```

**Test Commands**:
```bash
npm run build
npm run start
# Test key functionality locally before deploying
```

### Task 3.2: Deploy via Vercel CLI
```bash
# Claude Code Task: Execute Vercel deployment with fixed codebase
# Action: Run vercel deployment from project directory
# Output: Successful live deployment with working URL
```

**Deployment Command**:
```bash
cd ~/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master
vercel --prod
```

**Expected Process**:
1. Vercel detects changes in codebase
2. Runs build process with TypeScript compilation
3. Deploys to production URL
4. Confirms deployment success

---

## Phase 4: Post-Deployment Validation

### Task 4.1: Functionality Testing
```bash
# Claude Code Task: Test deployed application functionality
# Action: Verify all dashboard features work in production environment
# Output: Deployment validation report
```

**Test Checklist**:
- [ ] Dashboard loads without JavaScript errors
- [ ] Trust selector populates with NHS trusts
- [ ] Tab navigation works (Overview, RTT, Operational, Capacity, Benchmarking)
- [ ] Charts render with real data from Supabase
- [ ] Environment variables configured correctly
- [ ] Database connections functional

### Task 4.2: Performance and Error Monitoring
```bash
# Claude Code Task: Set up monitoring for deployed application
# Action: Check Vercel analytics and error tracking
# Output: Monitoring configuration and initial performance report
```

---

## Environment Configuration

### Required Environment Variables (Already Set):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://fsopilxzaaukmcqcskqm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[configured in Vercel]
```

### Deployment Settings (Already Configured):
- **Framework**: Next.js (auto-detected)
- **Build Command**: `next build --turbopack`
- **Output Directory**: Next.js default
- **Node.js Version**: Latest stable

---

## Error Handling Strategy

### If Additional TypeScript Errors Arise:
1. **Fix systematically** - address one file at a time
2. **Test locally** after each fix
3. **Commit changes** to trigger auto-deployment
4. **Monitor build logs** for new issues

### If Runtime Errors Occur:
1. **Check browser console** for JavaScript errors
2. **Verify Supabase connection** and data access
3. **Test environment variable** configuration
4. **Review network requests** for API failures

---

## Success Criteria

### Deployment Success:
- [ ] TypeScript compilation passes without errors
- [ ] Vercel build completes successfully
- [ ] Live URL accessible and functional
- [ ] All dashboard features working in production
- [ ] No critical runtime errors in browser console

### Code Quality:
- [ ] All TypeScript errors resolved
- [ ] Proper error handling for data access
- [ ] Consistent type definitions across components
- [ ] Clean build process with no warnings

---

## Claude Code Execution Instructions

### Initial TypeScript Fix:
```bash
claude-code execute --task="fix-typescript-errors" 
--directory="~/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master"
--priority="capacity-page-error"
```

### Complete Deployment:
```bash
claude-code execute --task="vercel-cli-deploy"
--directory="~/Desktop/Projects/NHS-Data-Analytics-Tool-v6-master" 
--command="vercel --prod"
```

### Post-Deployment Testing:
```bash
claude-code execute --task="deployment-validation"
--url="https://nhs-data-analytics-tool-v6-master-bysxhs6bz.vercel.app"
--test-scenarios="dashboard-functionality"
```

This approach will systematically resolve all TypeScript issues and get your NHS Analytics Dashboard deployed successfully via Vercel CLI.