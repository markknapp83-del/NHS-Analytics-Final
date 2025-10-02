# KPI Health Insights CRM - Phase 1 Development Plan

## Project Overview

**Project Name**: KPI Health Insights CRM  
**Phase**: Phase 1 - Core CRM Foundation  
**Timeline**: 4-6 weeks  
**Technology Stack**: Next.js 14, TypeScript, Supabase PostgreSQL, ShadCN/UI, Tailwind CSS

## Executive Summary

Build a focused CRM system that leverages the existing NHS trust and ICB database to enable healthcare insourcing sales teams to manage accounts, contacts, opportunities, and activities. Phase 1 focuses on core CRM functionality with minimal analytics integration, keeping tender management separate for now.

---

## User Personas

### Persona 1: Sales Representative
**Primary Goals:**
- View assigned trust accounts with quick access to contacts
- Log activities (calls, meetings, emails) efficiently
- Manage opportunity pipeline for their territories
- Track follow-ups and tasks
- Add notes and update trust information

**Key Screens:**
- My Accounts (assigned trusts)
- Trust Profile Page (detailed view)
- My Pipeline (opportunities)
- My Tasks & Activities
- Quick activity logging

### Persona 2: Senior Management
**Primary Goals:**
- Monitor team performance across all territories
- See which trusts are being actively worked vs. neglected
- Track pipeline health and forecasting
- Review activity levels per rep
- Identify coaching opportunities

**Key Screens:**
- Management Dashboard (overview)
- Team Performance Reports
- Trust Coverage Matrix (last contact per trust)
- Pipeline Analytics
- Activity Reports by Rep

---

## Phase 1 Core Features

### 1. Trust Account Management

#### Trust Profile Page (Primary UI Focus)

**Page Structure:**
```
Header Section:
- Trust name and NHS code
- ICB association
- Account owner dropdown (assigned sales rep)
- Account stage dropdown (Prospect, Contacted, Engaged, Active Client, Churned)
- Last contact date with visual alert if overdue
- Next follow-up date

Tab Navigation:
- Contacts
- Opportunities
- Activities
- Notes
- Details

Key Contacts Section:
- Contact cards showing:
  - Name
  - Job title and department
  - Email and phone
  - Role badges (Decision Maker, Influencer, Champion)
  - Last contact date
  - Quick action buttons (Log Activity, Schedule Meeting)
- Add new contact button

Active Opportunities Section:
- List of opportunities with:
  - Opportunity name
  - Stage, value, probability
  - Expected close date
  - View details link
- Create new opportunity button

Recent Activity Section:
- Timeline of recent activities
- Activity type icon (call, meeting, email)
- Date and brief description
- Next steps from activity
- View all activities link
- Log activity button

Account Notes Section:
- Chronological notes with timestamp and author
- Add note button
```

#### Trust List View (For Sales Reps)

**Features:**
- Card-based layout showing assigned trusts
- Each card displays:
  - Trust name and code
  - ICB name
  - Account stage
  - Last contact date (with alert if overdue)
  - Number of opportunities and total pipeline value
  - Key contact name
  - Visual indicators for attention needed
- Filters: Stage, ICB, Sort options
- Search functionality

#### Trust List View (For Management)

**Features:**
- Same layout as sales rep view but shows ALL trusts
- Additional filters:
  - Filter by account owner (sales rep)
  - Days since last contact
- Bulk actions (assign accounts, export data)

---

### 2. Contact Management

#### Contact CRUD Operations

**Add Contact Form Fields:**
- Full Name * (required)
- Job Title * (required)
- Department
- Email * (required)
- Phone
- LinkedIn URL
- Role Classification (checkboxes):
  - Decision Maker
  - Influencer
  - Champion (Internal Advocate)
- Preferred Contact Method (radio buttons):
  - Email
  - Phone
  - LinkedIn
- Notes (text area)

**Contact Card Display:**
- Avatar or initials
- Name and job title
- Department
- Contact details (email, phone)
- Role badges
- Last contact date
- Quick action buttons (Edit, Delete, Log Activity, Schedule Meeting)

**Contact List View:**
- Searchable and filterable
- Group by trust
- Filter by role (Decision Makers only, etc.)
- Sort by last contact date

---

### 3. Opportunity Pipeline

#### Pipeline Kanban View

**Columns:**
1. Identification (30% probability)
2. Discovery (50% probability)
3. Proposal (70% probability)
4. Negotiation (90% probability)
5. Closed Won
6. Closed Lost (hidden by default)

**Opportunity Card Display:**
- Trust name
- Opportunity name
- Service line
- Estimated value
- Probability percentage
- Expected close date
- Days in current stage
- View details link

**Features:**
- Drag-and-drop between stages (updates probability automatically)
- Pipeline value summary per column
- Total weighted pipeline value
- Filters:
  - By trust
  - By service line
  - By owner
  - By value range
  - By expected close date
- Create new opportunity button

#### Opportunity Detail Page

**Page Sections:**
```
Header:
- Opportunity name
- Stage dropdown
- Probability dropdown

Basic Information:
- Trust (with link to trust profile)
- ICB
- Service line
- Owner (sales rep)

Financial Details:
- Estimated value
- Contract length (months)
- Expected close date
- Actual close date (if closed)

Context:
- Opportunity source (dropdown: Analytics Insight, Cold Outreach, Referral, Inbound)
- Performance driver (text: what problem does this solve?)
- Competitive intelligence (text)

Key Contacts:
- List of contacts involved
- Add contact link

Next Steps:
- Checklist of tasks
- Add task button

Recent Activity:
- Activity timeline specific to this opportunity
- Log activity button

Documents (Phase 2):
- Placeholder for future document management

Action Buttons:
- Edit opportunity
- Log activity
- Add document (disabled in Phase 1)
- Delete opportunity (with confirmation)
```

#### Create/Edit Opportunity Form

**Form Fields:**
- Opportunity Name * (required)
- Trust * (dropdown)
- Service Line (dropdown or text):
  - General Surgery
  - Trauma & Orthopaedics
  - Urology
  - ENT
  - Ophthalmology
  - Diagnostics - MRI
  - Diagnostics - CT
  - Diagnostics - Ultrasound
  - Other
- Stage * (dropdown)
- Probability * (integer 0-100)
- Estimated Value (currency)
- Contract Length (months)
- Expected Close Date (date picker)
- Opportunity Source (dropdown)
- Performance Driver (text area)
- Competitive Intel (text area)
- Owner (dropdown - defaults to current user)

---

### 4. Activity & Task Management

#### Quick Activity Log (Modal/Slide-over)

**Form Fields:**
- Trust * (dropdown with search)
- Contact (dropdown - filtered by selected trust)
- Opportunity (dropdown - filtered by selected trust)
- Activity Type * (radio buttons):
  - Call
  - Meeting
  - Email
  - Proposal
  - Demo
  - Other
- Date & Time * (date/time picker - defaults to now)
- Duration (minutes)
- Subject * (text input)
- Notes (text area)
- Outcome (radio buttons):
  - Positive
  - Neutral
  - Negative
- Follow-up Required? (checkbox)
  - If checked, show:
    - Follow-up Date (date picker)
    - Assign To (dropdown - defaults to current user)
- Next Steps (text area)

**Save Behavior:**
- Creates activity record
- Updates last_contact_date on account
- Creates task if follow-up required
- Redirects back to previous page or trust profile

#### Activity Timeline View

**Display:**
- Chronological list (newest first)
- Each activity shows:
  - Activity type icon
  - Date and time
  - Contact name (if associated)
  - Opportunity name (if associated)
  - Subject
  - Brief notes excerpt
  - Outcome indicator
  - Expand to see full details
- Filter options:
  - By activity type
  - By date range
  - By outcome
  - By trust
- Export to CSV

#### Task Management

**My Tasks View:**

**Sections:**
1. Overdue (red indicator)
2. Today
3. This Week
4. Later

**Task Card Display:**
- Task title
- Trust name (with link)
- Contact/opportunity (if associated)
- Due date
- Assigned by (if not self)
- Checkbox to mark complete
- Quick actions (Edit, Delete)

**Create Task Form:**
- Task Title * (required)
- Description (text area)
- Trust (dropdown)
- Contact (dropdown)
- Opportunity (dropdown)
- Due Date * (date picker)
- Assign To * (dropdown)

---

### 5. Management Dashboard

#### Team Performance Dashboard

**Key Metrics (Cards):**
- Total Pipeline Value (all reps)
- Number of Active Opportunities
- Weighted Pipeline Value (probability-adjusted)
- Expected Closes This Quarter

**Team Activity Summary (Last 30 Days):**
- Total Activities
- Breakdown by type (Calls, Meetings, Emails, Proposals)

**Rep Performance Table:**

**Columns:**
- Rep Name
- Pipeline Value
- Number of Opportunities
- Activities (Last 30 Days)
- Activities (Last 7 Days)
- Number of Active Trusts
- Average Days Since Last Contact

**Sortable by any column**

**Trust Coverage Health:**
- Trusts Contacted This Month: X / 156 (percentage)
- Trusts Not Contacted in 30+ Days (Attention Needed)
- Trusts Not Contacted in 60+ Days (Critical)
- Average Days Since Last Contact (all trusts)

**Action Buttons:**
- View Detailed Reports
- Export Data (CSV)
- Email Report to Team

#### Trust Coverage Matrix

**Display:**
- Filterable table of ALL trusts
- Columns:
  - Trust Name and Code
  - ICB
  - Account Owner (Rep)
  - Account Stage
  - Last Contact Date
  - Days Since Contact
  - Status Indicator (color-coded):
    - 🟢 Active (< 14 days)
    - 🟡 At Risk (14-30 days)
    - 🔴 Neglected (30-60 days)
    - ⚫ Critical (60+ days)
  - Number of Opportunities
  - Pipeline Value
  - Number of Contacts
  - Activities (Last 30 Days)

**Filters:**
- By rep
- By ICB
- By status indicator
- By account stage
- Sort by any column

**Summary Stats:**
- Active: X trusts
- At Risk: X trusts
- Neglected: X trusts
- Critical: X trusts

**Export Options:**
- Export to CSV
- Email Report

---

### 6. Simple Performance Alert System

**Minimal Analytics Integration for Phase 1:**

Create a simple view that flags trusts with poor RTT performance to display on trust profile pages.

**Alert Logic:**
```sql
Performance Status:
- Critical: RTT compliance < 50%
- Concern: RTT compliance < 70%
- Good: RTT compliance >= 70%

Breach Status:
- High: 52+ week waiters > 500
- Moderate: 52+ week waiters 100-500
- Low: 52+ week waiters < 100
```

**Display on Trust Profile Page:**
```
┌─ Performance Alert ──────────────────────────────────────────┐
│ 🔴 CRITICAL RTT PERFORMANCE                                  │
│ 18-week compliance: 45.2% (Target: 92%)                      │
│ 52+ week waiters: 342 patients                               │
│                                                               │
│ Recommended Action: Discuss insourcing opportunities         │
└───────────────────────────────────────────────────────────────┘
```

**No Complex Integration:**
- Simple badge/alert component
- Pulls latest data from trust_metrics table
- No automated opportunity creation
- No AI/ML scoring
- Just a visual indicator to inform sales reps

---

## Database Schema

### New CRM Tables

```sql
-- Accounts table (one per trust)
CREATE TABLE accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trust_code VARCHAR(10) REFERENCES trust_metrics(trust_code) UNIQUE,
    
    -- Ownership
    account_owner VARCHAR(255), -- Email or user ID
    account_stage VARCHAR(50) DEFAULT 'prospect', 
    -- prospect, contacted, engaged, active_client, churned
    
    -- Contact tracking
    last_contact_date DATE,
    next_follow_up_date DATE,
    
    -- Business context
    estimated_annual_spend NUMERIC,
    services_provided TEXT[], -- Array of service lines
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255),
    
    CONSTRAINT valid_stage CHECK (account_stage IN ('prospect', 'contacted', 'engaged', 'active_client', 'churned'))
);

-- Contacts table (multiple per trust)
CREATE TABLE contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trust_code VARCHAR(10) REFERENCES trust_metrics(trust_code),
    
    -- Personal information
    full_name VARCHAR(255) NOT NULL,
    job_title VARCHAR(255),
    department VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    linkedin_url TEXT,
    
    -- Role classification
    is_decision_maker BOOLEAN DEFAULT FALSE,
    is_influencer BOOLEAN DEFAULT FALSE,
    is_champion BOOLEAN DEFAULT FALSE,
    
    -- Contact preferences
    preferred_contact_method VARCHAR(50), -- email, phone, linkedin
    
    -- Engagement tracking
    last_contact_date DATE,
    contact_stage VARCHAR(50) DEFAULT 'cold',
    -- cold, aware, engaged, advocate
    
    -- Notes
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255)
);

-- Opportunities table
CREATE TABLE opportunities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trust_code VARCHAR(10) REFERENCES trust_metrics(trust_code),
    
    -- Opportunity details
    opportunity_name TEXT NOT NULL,
    service_line VARCHAR(100),
    
    -- Pipeline stage
    stage VARCHAR(50) NOT NULL,
    -- identification, discovery, proposal, negotiation, closed_won, closed_lost
    probability INTEGER CHECK (probability >= 0 AND probability <= 100),
    
    -- Financial
    estimated_value NUMERIC,
    contract_length_months INTEGER,
    expected_close_date DATE,
    actual_close_date DATE,
    
    -- Context
    opportunity_source VARCHAR(50), 
    -- analytics_insight, cold_outreach, referral, inbound
    performance_driver TEXT,
    competitive_intel TEXT,
    
    -- Ownership
    opportunity_owner VARCHAR(255),
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255),
    
    CONSTRAINT valid_stage CHECK (stage IN ('identification', 'discovery', 'proposal', 'negotiation', 'closed_won', 'closed_lost'))
);

-- Activities table
CREATE TABLE activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relationships
    trust_code VARCHAR(10) REFERENCES trust_metrics(trust_code),
    contact_id UUID REFERENCES contacts(id),
    opportunity_id UUID REFERENCES opportunities(id),
    
    -- Activity details
    activity_type VARCHAR(50) NOT NULL,
    -- call, meeting, email, proposal, demo, other
    subject TEXT NOT NULL,
    notes TEXT,
    
    -- Timing
    activity_date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER,
    
    -- Follow-up
    outcome VARCHAR(50), -- positive, neutral, negative
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    follow_up_assigned_to VARCHAR(255),
    next_steps TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255),
    
    CONSTRAINT valid_activity_type CHECK (activity_type IN ('call', 'meeting', 'email', 'proposal', 'demo', 'other')),
    CONSTRAINT valid_outcome CHECK (outcome IN ('positive', 'neutral', 'negative') OR outcome IS NULL)
);

-- Account notes table
CREATE TABLE account_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trust_code VARCHAR(10) REFERENCES trust_metrics(trust_code),
    
    note_text TEXT NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255)
);

-- Tasks table
CREATE TABLE tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Relationships
    trust_code VARCHAR(10) REFERENCES trust_metrics(trust_code),
    contact_id UUID REFERENCES contacts(id),
    opportunity_id UUID REFERENCES opportunities(id),
    
    -- Task details
    task_title TEXT NOT NULL,
    task_description TEXT,
    due_date DATE NOT NULL,
    
    -- Assignment
    assigned_to VARCHAR(255) NOT NULL,
    
    -- Status
    completed BOOLEAN DEFAULT FALSE,
    completed_date TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255)
);

-- Indexes for performance
CREATE INDEX idx_accounts_owner ON accounts(account_owner);
CREATE INDEX idx_accounts_stage ON accounts(account_stage);
CREATE INDEX idx_accounts_last_contact ON accounts(last_contact_date);

CREATE INDEX idx_contacts_trust ON contacts(trust_code);
CREATE INDEX idx_contacts_decision_maker ON contacts(is_decision_maker) WHERE is_decision_maker = TRUE;

CREATE INDEX idx_opportunities_trust ON opportunities(trust_code);
CREATE INDEX idx_opportunities_stage ON opportunities(stage);
CREATE INDEX idx_opportunities_owner ON opportunities(opportunity_owner);
CREATE INDEX idx_opportunities_close_date ON opportunities(expected_close_date);

CREATE INDEX idx_activities_trust ON activities(trust_code);
CREATE INDEX idx_activities_date ON activities(activity_date);
CREATE INDEX idx_activities_type ON activities(activity_type);
CREATE INDEX idx_activities_created_by ON activities(created_by);

CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON tasks(due_date) WHERE completed = FALSE;
CREATE INDEX idx_tasks_trust ON tasks(trust_code);
```

### Database Views for Reporting

```sql
-- Trust coverage view for management reporting
CREATE VIEW vw_trust_coverage AS
SELECT 
    tm.trust_code,
    tm.trust_name,
    tm.icb_name,
    a.account_owner,
    a.account_stage,
    a.last_contact_date,
    CURRENT_DATE - a.last_contact_date AS days_since_contact,
    COUNT(DISTINCT o.id) AS active_opportunities,
    SUM(o.estimated_value) AS pipeline_value,
    COUNT(DISTINCT c.id) AS contact_count,
    COUNT(DISTINCT act.id) FILTER (WHERE act.activity_date >= CURRENT_DATE - INTERVAL '30 days') AS activities_last_30_days,
    CASE 
        WHEN a.last_contact_date IS NULL THEN 'never_contacted'
        WHEN CURRENT_DATE - a.last_contact_date < 14 THEN 'active'
        WHEN CURRENT_DATE - a.last_contact_date < 30 THEN 'at_risk'
        WHEN CURRENT_DATE - a.last_contact_date < 60 THEN 'neglected'
        ELSE 'critical'
    END AS coverage_status
FROM trust_metrics tm
LEFT JOIN accounts a ON tm.trust_code = a.trust_code
LEFT JOIN opportunities o ON tm.trust_code = o.trust_code AND o.stage NOT IN ('closed_won', 'closed_lost')
LEFT JOIN contacts c ON tm.trust_code = c.trust_code
LEFT JOIN activities act ON tm.trust_code = act.trust_code
GROUP BY tm.trust_code, tm.trust_name, tm.icb_name, a.account_owner, a.account_stage, a.last_contact_date;

-- Simple performance alert view (minimal analytics integration)
CREATE VIEW vw_trust_performance_alerts AS
SELECT 
    trust_code,
    trust_name,
    trust_total_percent_within_18_weeks,
    trust_total_total_52_plus_weeks,
    CASE 
        WHEN trust_total_percent_within_18_weeks < 50 THEN 'critical'
        WHEN trust_total_percent_within_18_weeks < 70 THEN 'concern'
        ELSE 'good'
    END AS performance_status,
    CASE
        WHEN trust_total_total_52_plus_weeks > 500 THEN 'high_breach_count'
        WHEN trust_total_total_52_plus_weeks > 100 THEN 'moderate_breach_count'
        ELSE 'low_breach_count'
    END AS breach_status
FROM trust_metrics
WHERE period = (SELECT MAX(period) FROM trust_metrics);

-- Pipeline analytics view
CREATE VIEW vw_pipeline_analytics AS
SELECT 
    o.opportunity_owner,
    o.stage,
    COUNT(*) AS opportunity_count,
    SUM(o.estimated_value) AS total_value,
    SUM(o.estimated_value * o.probability / 100) AS weighted_value,
    AVG(o.probability) AS avg_probability,
    COUNT(*) FILTER (WHERE o.expected_close_date < CURRENT_DATE + INTERVAL '30 days') AS closing_this_month,
    COUNT(*) FILTER (WHERE o.expected_close_date < CURRENT_DATE + INTERVAL '90 days') AS closing_this_quarter
FROM opportunities o
WHERE o.stage NOT IN ('closed_won', 'closed_lost')
GROUP BY o.opportunity_owner, o.stage;
```

---

## Navigation Structure

```
🏠 Home
   └─ Personal dashboard (My tasks, My pipeline, Recent activities)

📊 Analytics (Existing - Keep Separate)
   ├─ Overview
   ├─ RTT Deep Dive
   ├─ Operational
   ├─ Capacity
   └─ Benchmarking

🎯 CRM
   ├─ My Accounts (Sales Rep View)
   │   └─ Individual Trust Profile Pages
   ├─ All Accounts (Management View - show all trusts)
   ├─ Contacts (Searchable directory)
   ├─ My Pipeline (Kanban board)
   ├─ My Tasks & Activities
   └─ Management Reports (Senior Management Only)
       ├─ Team Performance Dashboard
       ├─ Trust Coverage Matrix
       └─ Pipeline Analytics

📋 Tenders (Keep Separate - No CRM Integration Yet)
   ├─ Active Opportunities
   ├─ Frameworks
   └─ Awarded Contracts

⚙️ Settings
   ├─ My Profile
   ├─ User Management (Management Only)
   └─ Territory Assignment (Management Only)
```

---

## User Roles & Permissions

### Sales Representative
**Can:**
- View and edit their assigned accounts
- View all contacts across all trusts
- Create/edit contacts
- Create/edit opportunities
- Log activities
- Create/complete tasks (assigned to them)
- View their own pipeline
- View their own tasks and activities

**Cannot:**
- View other reps' pipelines (unless management)
- Access management reports
- Assign accounts to other reps
- View system-wide analytics

### Sales Manager / Senior Management
**Can:**
- Everything a Sales Rep can do, PLUS:
- View all accounts (all reps)
- View all pipelines (all reps)
- Access management dashboard
- Access trust coverage matrix
- View team performance reports
- Assign accounts to reps
- Export data

**Cannot:**
- (No restrictions for this role in Phase 1)

### System Administrator
**Can:**
- Everything Sales Manager can do, PLUS:
- User management (create, edit, delete users)
- Role assignment
- System settings

---

## API Endpoints (Supabase Functions or Next.js API Routes)

### Accounts
- `GET /api/accounts` - Get all accounts (filtered by user role)
- `GET /api/accounts/:trustCode` - Get single account
- `POST /api/accounts` - Create account
- `PUT /api/accounts/:trustCode` - Update account
- `DELETE /api/accounts/:trustCode` - Delete account

### Contacts
- `GET /api/contacts` - Get all contacts (with filters)
- `GET /api/contacts/:id` - Get single contact
- `GET /api/contacts/trust/:trustCode` - Get contacts for trust
- `POST /api/contacts` - Create contact
- `PUT /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact

### Opportunities
- `GET /api/opportunities` - Get all opportunities (filtered by user)
- `GET /api/opportunities/:id` - Get single opportunity
- `GET /api/opportunities/trust/:trustCode` - Get opportunities for trust
- `POST /api/opportunities` - Create opportunity
- `PUT /api/opportunities/:id` - Update opportunity
- `DELETE /api/opportunities/:id` - Delete opportunity

### Activities
- `GET /api/activities` - Get all activities (with filters)
- `GET /api/activities/:id` - Get single activity
- `GET /api/activities/trust/:trustCode` - Get activities for trust
- `POST /api/activities` - Create activity (and auto-create task if follow-up required)
- `PUT /api/activities/:id` - Update activity
- `DELETE /api/activities/:id` - Delete activity

### Tasks
- `GET /api/tasks` - Get all tasks (filtered by assigned user)
- `GET /api/tasks/:id` - Get single task
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `PUT /api/tasks/:id/complete` - Mark task as complete
- `DELETE /api/tasks/:id` - Delete task

### Reporting
- `GET /api/reports/trust-coverage` - Trust coverage matrix data
- `GET /api/reports/team-performance` - Team performance dashboard data
- `GET /api/reports/pipeline-analytics` - Pipeline analytics data

---

## Key Development Phases

### Week 1-2: Core Data & Account Management
**Deliverables:**
- [ ] Database schema implementation (all tables and views)
- [ ] Supabase migration scripts
- [ ] Account CRUD API endpoints
- [ ] Trust list view (sales rep perspective)
- [ ] Trust list view (management perspective)
- [ ] Trust profile page shell (tabs, header, basic layout)
- [ ] Account assignment functionality (management only)
- [ ] Basic authentication and role checks

### Week 3-4: Contacts & Activities
**Deliverables:**
- [ ] Contact CRUD API endpoints
- [ ] Contact form (add/edit)
- [ ] Contact cards on trust profile page
- [ ] Contact list/directory view
- [ ] Activity logging modal/form
- [ ] Activity timeline on trust profile
- [ ] Activity list view (filterable)
- [ ] Task CRUD API endpoints
- [ ] Task list view (My Tasks)
- [ ] Task creation from activity follow-ups

### Week 5-6: Opportunities & Reporting
**Deliverables:**
- [ ] Opportunity CRUD API endpoints
- [ ] Opportunity form (add/edit)
- [ ] Pipeline kanban view
- [ ] Opportunity detail page
- [ ] Opportunity cards on trust profile
- [ ] Management dashboard
- [ ] Trust coverage matrix
- [ ] Team performance reports
- [ ] Simple performance alerts on trust profiles
- [ ] Basic data export functionality

---

## Technical Implementation Notes

### Frontend Components (ShadCN/UI)

**Core Components Needed:**
- Card
- Button
- Input
- Textarea
- Select (Dropdown)
- Checkbox
- Radio Group
- Date Picker
- Dialog (Modal)
- Sheet (Slide-over)
- Tabs
- Table
- Badge
- Avatar
- Separator
- Command (for search)
- Form (with react-hook-form)
- Toast (for notifications)

**Custom Components to Build:**
- TrustCard (for list views)
- ContactCard (for contact display)
- OpportunityCard (for pipeline)
- ActivityTimelineItem
- TaskCard
- QuickActivityLogModal
- TrustProfileHeader
- PerformanceAlertBanner
- PipelineStageColumn (for kanban)
- ManagementDashboardCard

### State Management

**Global State:**
- User authentication state
- User role and permissions
- Current user information

**Local State (per page/component):**
- Form states
- Filter states
- Pagination states
- Modal open/close states

**Data Fetching:**
- Use React Query (TanStack Query) for data fetching, caching, and synchronization
- Optimistic updates for better UX

### Data Flow

**Activity Logging Example:**
1. User opens "Log Activity" modal
2. User fills form (trust, contact, type, notes, etc.)
3. User clicks "Save Activity"
4. Frontend sends POST to `/api/activities`
5. Backend:
   - Creates activity record
   - Updates `last_contact_date` on `accounts` table
   - If follow-up required, creates task record
6. Frontend:
   - Optimistically updates UI
   - Refetches relevant queries (activity timeline, tasks, account data)
   - Shows success toast
   - Closes modal

### Performance Considerations

**Pagination:**
- Implement pagination for all list views
- Default page size: 20-50 items
- Infinite scroll for activity timelines (optional)

**Filtering:**
- Client-side filtering for small datasets (<100 items)
- Server-side filtering for large datasets

**Caching:**
- Cache trust list (156 trusts - small dataset)
- Cache ICB list
- Cache user list (for assignment dropdowns)
- Invalidate cache on mutations

---

## What's Explicitly OUT of Scope (Phase 1)

❌ **Tender Integration with CRM**
- No linking tenders to opportunities
- No automated opportunity creation from tenders
- Tenders remain a separate section

❌ **Advanced Analytics Integration**
- No complex opportunity scoring algorithms
- No AI/ML-based recommendations
- No automated alerts beyond simple performance flags
- No predictive analytics

❌ **Document Management**
- No file uploads
- No proposal storage
- No document versioning
- Placeholder only in opportunity detail page

❌ **Email Integration**
- No email sending from CRM
- No email tracking
- Manual email logging only

❌ **Calendar Integration**
- No Google Calendar / Outlook sync
- Manual meeting scheduling only

❌ **Mobile App**
- Desktop/tablet web only
- Mobile responsive, but not native app

❌ **Advanced Workflow Automation**
- No automated task creation (except from activity follow-ups)
- No automated stage transitions
- No automated email triggers

❌ **Custom Reporting Builder**
- Pre-built reports only
- Export to CSV only

❌ **Multi-tenancy**
- Single company/organization only
- No tenant isolation

---

## Future Enhancements (Phase 2+)

### Phase 2 Possibilities:
- Document management system
- Email integration (send from CRM)
- Tender → Opportunity automation
- Advanced performance scoring
- Calendar integration
- Mobile app

### Phase 3 Possibilities:
- AI-powered opportunity recommendations
- Predictive analytics
- Custom reporting builder
- Workflow automation builder
- Multi-tenancy support
- API for third-party integrations

---

## Success Criteria

### Functional Success:
- [ ] Sales reps can view and manage their assigned trusts
- [ ] Sales reps can add and manage contacts
- [ ] Sales reps can create and track opportunities through pipeline
- [ ] Sales reps can log activities and manage tasks efficiently
- [ ] Management can view team performance metrics
- [ ] Management can identify neglected trusts (coverage gaps)
- [ ] Simple performance alerts visible on trust profiles

### Technical Success:
- [ ] All database tables created with proper relationships
- [ ] All CRUD operations working for core entities
- [ ] Role-based access control working correctly
- [ ] Pages load in <2 seconds
- [ ] No critical bugs or data integrity issues
- [ ] Mobile-responsive design (desktop-first, but works on tablet)

### User Experience Success:
- [ ] Sales reps can log an activity in <60 seconds
- [ ] Trust profile page provides all needed information at a glance
- [ ] Pipeline kanban is intuitive and easy to use
- [ ] Management dashboard provides actionable insights
- [ ] Forms are clear with helpful validation messages

---

## Claude Code Instructions

When building this system using Claude Code, follow these principles:

1. **Start with Database**: Implement schema first, verify with test data
2. **Build Bottom-Up**: API endpoints → Data hooks → Components
3. **Component Library First**: Set up ShadCN components before custom components
4. **One Feature at a Time**: Complete each feature fully before moving to next
5. **Test as You Go**: Manual testing of each endpoint and component
6. **Responsive by Default**: Use Tailwind responsive utilities consistently
7. **Error Handling**: Every API call should have error handling
8. **Loading States**: Every data fetch should have loading skeleton
9. **Optimistic Updates**: Use for better UX where appropriate
10. **TypeScript Strict**: Type everything, no `any` types

### Development Order:
1. Database schema + migrations
2. Auth setup and role checks
3. Trust account management
4. Contact management
5. Activity logging
6. Task management
7. Opportunity pipeline
8. Management reporting

---

## Context for Claude Code

**Existing Project:**
- Location: `C:\Users\Mark\Projects\NHS Data Analytics v5`
- Database: Supabase PostgreSQL
- Existing Tables: `trust_metrics`, `icbs` (156 NHS trusts, 42 ICBs)
- Data: 1,816 trust-month observations (Aug 2024 - July 2025)
- Already Built: Analytics dashboard with RTT, A&E, diagnostics visualization

**New CRM System:**
- Extends existing project
- Uses same trust/ICB data as foundation
- Separate navigation section
- Minimal integration with analytics (just performance alerts)
- Focus on sales team productivity

**Design System:**
- ShadCN/UI components
- Tailwind CSS
- NHS color palette (blue primary, green/amber/red for status)
- Professional, clean aesthetic

---

## Authentication & User Management

### Authentication System
**Supabase Auth** is already implemented in the existing application. No additional authentication setup required for CRM features.

**Existing Auth Features:**
- User registration (self-signup)
- Login/logout
- Password reset
- Session management

### User Management
**User Creation Flow:**
1. New users self-signup through existing registration page
2. Default role: Sales Representative
3. Admin users can access User Management screen
4. Admins can promote users to Admin/Manager roles

**User Roles:**
- **Sales Representative** (default for new signups)
- **Sales Manager / Senior Management** (promoted by admin)
- **System Administrator** (promoted by admin)

### Territory Assignment
**Trust Assignment Process:**
1. Admins access User Management or dedicated Territory Assignment screen
2. Admins can assign trusts to specific sales reps
3. Assignment creates/updates `account_owner` field in `accounts` table
4. Sales reps see only their assigned trusts in "My Accounts" view
5. Managers/Admins see all trusts in "All Accounts" view

**Implementation:**
```sql
-- Update account owner
UPDATE accounts 
SET account_owner = 'user@example.com', 
    updated_at = NOW() 
WHERE trust_code = 'RGT';
```

### Unassigned Trusts Behavior
**If trust has no account_owner:**
- Trust appears in "All Accounts" view (visible to everyone)
- Any user can view the trust profile page
- Any user can add/edit contacts
- Any user can log activities
- Any user can add notes
- Trust does NOT appear in any user's "My Accounts" view
- Trust does NOT appear in any user's "My Pipeline" view
- Opportunities created for unassigned trusts are visible in "All Accounts" but not in personal pipelines

**Rationale:** Allows collaborative work on prospects before formal assignment, while keeping personal workspaces clean.

### Data Privacy
**No special data privacy considerations required at this time.**

Standard good practices:
- Contact data stored securely in Supabase PostgreSQL
- Access controlled via Supabase Row Level Security (RLS) policies
- Users can only view data appropriate to their role
- Audit trails via `created_by` and `created_at` fields

**Future Consideration:** If GDPR compliance becomes necessary, implement:
- Data retention policies
- Right to erasure (delete contact data)
- Consent tracking
- Data export functionality

---

## Additional Implementation Notes

### User Role Checks
**Frontend:**
```typescript
// Hook for checking user role
export function useUserRole() {
  const { user } = useAuth(); // Existing auth hook
  const { data: userRole } = useQuery(['userRole', user?.id], async () => {
    // Fetch role from profiles or users table
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id)
      .single();
    return data?.role || 'sales_rep';
  });
  
  return {
    role: userRole,
    isSalesRep: userRole === 'sales_rep',
    isManager: userRole === 'manager' || userRole === 'admin',
    isAdmin: userRole === 'admin'
  };
}

// Usage in components
const { isManager } = useUserRole();
if (isManager) {
  // Show management features
}
```

**Backend (RLS Policies):**
```sql
-- Sales reps can only view their assigned accounts
CREATE POLICY "Sales reps view assigned accounts" ON accounts
  FOR SELECT
  USING (
    account_owner = auth.email() OR 
    account_owner IS NULL OR
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('manager', 'admin')
  );

-- Managers and admins can view all accounts
CREATE POLICY "Managers view all accounts" ON accounts
  FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) IN ('manager', 'admin')
  );
```

### Territory Assignment UI
**Admin/Manager Feature:**

Location: `/app/settings/territories/page.tsx` or within User Management screen

```
┌─ Territory Assignment ──────────────────────────────────────┐
│                                                              │
│ Assign Trusts to Sales Reps                                 │
│                                                              │
│ Sales Rep: [John Smith ▼]                                   │
│                                                              │
│ Assigned Trusts (12):                                       │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ ☑ RGT - Cambridge University Hospitals NHS FT           ││
│ │ ☑ RTQ - Royal Papworth Hospital NHS FT                  ││
│ │ ☐ RWH - Royal Winchester NHS FT                         ││
│ │ ☐ RDE - Royal Devon University Healthcare NHS FT        ││
│ │ ...                                                      ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ Filter by ICB: [All ICBs ▼]                                 │
│ Search: [_____________]                                      │
│                                                              │
│                              [Cancel]  [Save Assignments]    │
└──────────────────────────────────────────────────────────────┘
```

**Bulk Assignment:**
- Select multiple trusts via checkboxes
- Assign all selected to chosen rep
- Clear assignments (set to unassigned)

---

## End of Phase 1 Plan

This document provides complete context for building the KPI Health Insights CRM Phase 1. Focus on core functionality, clean implementation, and setting the foundation for future enhancements.