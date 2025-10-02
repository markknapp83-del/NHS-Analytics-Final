/**
 * Role-Based Access Control (RBAC) utilities
 *
 * Role definitions:
 * - data_only: Access to analytics/dashboards only
 * - sales: Access to CRM, analytics, and tenders
 * - management: Access to all features + team management
 * - system_administrator: Full admin access
 */

import type { UserRole } from '@/types/auth';

export interface RolePermissions {
  canAccessAnalytics: boolean;
  canAccessCRM: boolean;
  canAccessTenders: boolean;
  canManageTeam: boolean;
  isSystemAdmin: boolean;
}

/**
 * Get permissions for a given role
 */
export function getRolePermissions(role: UserRole | null): RolePermissions {
  if (!role) {
    return {
      canAccessAnalytics: false,
      canAccessCRM: false,
      canAccessTenders: false,
      canManageTeam: false,
      isSystemAdmin: false,
    };
  }

  switch (role) {
    case 'data_only':
      return {
        canAccessAnalytics: true,
        canAccessCRM: false,
        canAccessTenders: false,
        canManageTeam: false,
        isSystemAdmin: false,
      };

    case 'sales':
      return {
        canAccessAnalytics: true,
        canAccessCRM: true,
        canAccessTenders: true,
        canManageTeam: false,
        isSystemAdmin: false,
      };

    case 'management':
      return {
        canAccessAnalytics: true,
        canAccessCRM: true,
        canAccessTenders: true,
        canManageTeam: true,
        isSystemAdmin: true, // Management has same access as admin for now
      };

    case 'system_administrator':
      return {
        canAccessAnalytics: true,
        canAccessCRM: true,
        canAccessTenders: true,
        canManageTeam: true,
        isSystemAdmin: true,
      };

    default:
      return {
        canAccessAnalytics: false,
        canAccessCRM: false,
        canAccessTenders: false,
        canManageTeam: false,
        isSystemAdmin: false,
      };
  }
}

/**
 * Check if a role can access a specific route
 */
export function canAccessRoute(role: UserRole | null, route: string): boolean {
  const permissions = getRolePermissions(role);

  // Analytics routes (dashboard)
  if (route.startsWith('/dashboard')) {
    return permissions.canAccessAnalytics;
  }

  // CRM routes
  if (route.startsWith('/crm')) {
    // Management routes require team management permission
    if (route.includes('/management')) {
      return permissions.canManageTeam;
    }
    return permissions.canAccessCRM;
  }

  // Tenders routes
  if (route.startsWith('/tenders')) {
    return permissions.canAccessTenders;
  }

  // Settings route (admin only)
  if (route.startsWith('/dashboard/settings')) {
    return permissions.isSystemAdmin;
  }

  // Default: deny access
  return false;
}

/**
 * Get the default landing page for a role
 */
export function getDefaultLandingPage(role: UserRole | null): string {
  if (!role) return '/login';

  const permissions = getRolePermissions(role);

  // Priority: Analytics > CRM > Login
  if (permissions.canAccessAnalytics) {
    return '/dashboard';
  }

  if (permissions.canAccessCRM) {
    return '/crm/accounts';
  }

  // Fallback
  return '/login';
}

/**
 * Get user-friendly role name
 */
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case 'data_only':
      return 'Data Only';
    case 'sales':
      return 'Sales';
    case 'management':
      return 'Management';
    case 'system_administrator':
      return 'System Administrator';
    default:
      return 'Unknown';
  }
}
