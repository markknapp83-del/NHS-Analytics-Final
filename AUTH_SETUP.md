# Authentication Setup Guide

This guide will help you set up Supabase authentication with two-factor authentication (2FA) and role-based access control for the NHS Analytics application.

## Prerequisites

- Supabase project with URL and anon key configured in `.env.local`
- Supabase MCP server configured for database management
- npm/node installed

## Step 1: Supabase MCP Server Configuration

The official Supabase MCP server has been configured at:
`/Users/markknapp/Library/Application Support/Claude/claude_desktop_config.json`

**Important:** You must **restart Claude Desktop** for the MCP server to become available.

After restarting, you'll be able to:
- Run SQL queries directly through Claude
- Manage database schema
- View and modify data
- Execute the database setup script

## Step 2: Install Required Packages

The required packages have already been installed:
- `@supabase/supabase-js` - Supabase client
- `@supabase/ssr` - Supabase SSR utilities for Next.js
- `@supabase/mcp-server-supabase` - Official Supabase MCP server (globally installed)

## Step 3: Database Setup

**Option A: Using Supabase MCP (Recommended after Claude restart)**

After restarting Claude Desktop, you can ask Claude to:
```
Please run the SQL from database-setup.sql using the Supabase MCP
```

**Option B: Manual Setup via Supabase Dashboard**

1. Open your Supabase project dashboard
2. Navigate to SQL Editor
3. Run the SQL script from `database-setup.sql` in the project root

This script will:
- Create the `user_profiles` table with role management
- Set up Row Level Security (RLS) policies
- Create helper functions for user management
- Set up automatic profile creation for new users

## Step 4: Enable Multi-Factor Authentication in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Settings**
3. Scroll to the **Multi-Factor Authentication** section
4. Enable **Multi-Factor Authentication**
5. Save changes

## Step 5: Create Your First Administrator

After running the database setup SQL:

1. Create a user account through the Supabase Dashboard or by signing up through the app
2. Find the user's UUID in the Supabase Authentication dashboard
3. Run this SQL query in the SQL Editor:

```sql
UPDATE public.user_profiles
SET role = 'administrator'
WHERE id = 'YOUR_USER_UUID_HERE';
```

## Features Implemented

### Authentication
- ✅ Email/password login
- ✅ Two-factor authentication (TOTP)
- ✅ Session management
- ✅ Automatic session refresh
- ✅ Secure cookie-based sessions

### Route Protection
- ✅ Middleware protects all `/dashboard/*` routes
- ✅ Unauthenticated users redirected to `/login`
- ✅ Authenticated users accessing `/login` redirected to `/dashboard`
- ✅ Settings page restricted to administrators only

### Role-Based Access Control
- ✅ Two roles: `user` and `administrator`
- ✅ Administrators can access Settings page
- ✅ Settings page shows user management interface
- ✅ Administrators can change user roles
- ✅ Users can only read their own profile

### Settings Page (Administrator Only)
- ✅ View all user accounts
- ✅ Change user roles
- ✅ Send password reset emails
- ✅ Enable/disable 2FA for own account
- ✅ Located at `/dashboard/settings`

### UI Components
- ✅ Login form with email/password
- ✅ MFA enrollment flow with QR code
- ✅ MFA verification during login
- ✅ Settings link in sidebar (admin only)
- ✅ Logout button in sidebar
- ✅ Professional NHS-themed design

## Usage

### User Sign-Up Flow

1. User navigates to `/login`
2. User clicks "Sign up" link
3. User fills in:
   - Full Name
   - Email
   - Password (minimum 6 characters)
   - Confirm Password
4. Upon successful sign-up:
   - User profile is automatically created with 'user' role
   - Success message is displayed
   - User is redirected to sign-in form
5. User can now sign in with their credentials

### User Login Flow

1. User navigates to the app (redirected to `/login` if not authenticated)
2. User enters email and password
3. If 2FA is enabled:
   - User is prompted to enter 6-digit code from authenticator app
   - After successful verification, user is redirected to dashboard
4. If 2FA is not enabled:
   - User is immediately redirected to dashboard

### Administrator Features

Administrators have access to the Settings page where they can:

1. **User Management**
   - View all users in the system
   - Change user roles (user ↔ administrator)
   - Send password reset emails

2. **Security Settings**
   - Enable 2FA for their own account
   - View 2FA status

### Enabling 2FA

Users (including administrators) can enable 2FA:

1. Navigate to Settings page (admin only for now)
2. Click "Enable 2FA" button
3. Scan the QR code with an authenticator app (Google Authenticator, Authy, etc.)
4. Enter the 6-digit verification code
5. 2FA is now enabled for that account

## File Structure

```
src/
├── app/
│   ├── login/
│   │   └── page.tsx                 # Login page
│   ├── dashboard/
│   │   ├── settings/
│   │   │   └── page.tsx            # Settings page (admin only)
│   │   └── layout.tsx              # Dashboard layout with sidebar
│   └── layout.tsx                  # Root layout with AuthProvider
├── components/
│   ├── auth/
│   │   ├── login-form.tsx          # Login form component
│   │   ├── mfa-setup.tsx           # MFA enrollment component
│   │   └── mfa-verify.tsx          # MFA verification component
│   └── dashboard/
│       └── sidebar.tsx             # Sidebar with Settings and Logout
├── contexts/
│   └── auth-context.tsx            # Auth context provider
├── lib/
│   ├── supabase-auth.ts            # Auth utility functions
│   └── supabase-client.ts          # Supabase client (existing)
├── types/
│   ├── auth.ts                     # Auth-related types
│   └── database.ts                 # Database types (updated)
└── middleware.ts                   # Route protection middleware
```

## Security Considerations

✅ **Implemented Security Features:**
- Row Level Security (RLS) enabled on `user_profiles` table
- Users can only read their own profile
- Only administrators can modify roles
- Service role key stored in environment variables (server-side only)
- Anon key used for client-side operations
- Session stored in secure HTTP-only cookies
- Middleware validates authentication on every request
- Admin routes protected by role checks

⚠️ **Important Notes:**
- Never expose the service role key in client-side code
- Always use RLS policies to protect sensitive data
- Encourage all users to enable 2FA for enhanced security
- Regularly review user access and roles

## Testing the Implementation

1. **Test Login:**
   - Navigate to `/login`
   - Enter credentials
   - Verify redirect to dashboard

2. **Test Route Protection:**
   - Try accessing `/dashboard` without authentication
   - Verify redirect to login page

3. **Test Administrator Access:**
   - Login as administrator
   - Verify Settings link appears in sidebar
   - Navigate to Settings page
   - Verify user management features

4. **Test Regular User:**
   - Login as regular user
   - Verify Settings link does NOT appear in sidebar
   - Try accessing `/dashboard/settings` directly
   - Verify redirect to dashboard

5. **Test 2FA:**
   - Enable 2FA through Settings page
   - Logout and login again
   - Verify 2FA prompt appears
   - Enter code and verify access granted

6. **Test Logout:**
   - Click "Log Out" button in sidebar
   - Verify redirect to login page
   - Verify cannot access dashboard without re-authenticating

## Troubleshooting

### Error: "Missing Supabase environment variables"
- Verify `.env.local` contains `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Error: "Failed to fetch user profile"
- Ensure database setup SQL has been run
- Check that RLS policies are enabled
- Verify user has a profile in `user_profiles` table

### Settings page not accessible
- Verify user role is set to 'administrator' in database
- Check middleware is running correctly
- Review browser console for errors

### 2FA not working
- Ensure MFA is enabled in Supabase Dashboard
- Verify authenticator app is synced with correct time
- Check that TOTP factor is properly enrolled

## Next Steps

- Add email verification for new user signups
- Implement user invitation system for administrators
- Add audit logging for security events
- Create user profile management page for regular users
- Add password strength requirements
- Implement account lockout after failed attempts