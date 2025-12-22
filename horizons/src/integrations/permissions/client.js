import { supabase } from '@/lib/supabaseClient';

/**
 * Fetches all role permissions from the database
 * @returns {Promise<{data: any[], error: any}>}
 */
export const fetchRolePermissions = async () => {
  try {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('*');

    if (error) {
      console.error('[Permissions] Supabase error fetching permissions:', error.message);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('[Permissions] Network/Client error fetching role permissions:', error);
    return { data: null, error };
  }
};

/**
 * Updates or inserts a permission for a specific role and page.
 * Uses UPSERT strategy for simplicity and reliability.
 * 
 * @param {string} role - The user role
 * @param {string} pageKey - The identifier for the page/feature
 * @param {boolean} canAccess - Whether access is granted
 * @returns {Promise<{data: any, error: any}>}
 */
export const updatePermission = async (role, pageKey, canAccess) => {
  console.log(`[Permissions] Processing: Role=${role}, Page=${pageKey}, Access=${canAccess}`);

  try {
    // ✅ استخدام UPSERT - أبسط وأضمن
    const { data, error } = await supabase
      .from('role_permissions')
      .upsert(
        { 
          role, 
          page_key: pageKey, 
          can_access: canAccess,
          updated_at: new Date().toISOString()
        },
        { 
          onConflict: 'role,page_key',  // مفتاح التعارض
          ignoreDuplicates: false        // تحديث إذا موجود
        }
      )
      .select()
      .single();

    if (error) {
      console.error('[Permissions] Upsert failed:', error.message);
      return { data: null, error };
    }

    console.log('[Permissions] Upsert successful:', data);
    return { data, error: null };

  } catch (error) {
    console.error(`[Permissions] Unexpected error for ${role}:${pageKey}:`, error);
    return { data: null, error };
  }
};

/**
 * Get a single permission value
 * @param {string} role 
 * @param {string} pageKey 
 * @returns {Promise<boolean>}
 */
export const getPermission = async (role, pageKey) => {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('can_access')
    .eq('role', role)
    .eq('page_key', pageKey)
    .maybeSingle();

  if (error) return false;
  return data?.can_access || false;
};

/**
 * Bulk update permissions for a role
 * @param {string} role 
 * @param {Object} permissions - { pageKey: boolean, ... }
 * @returns {Promise<{success: boolean, error: any}>}
 */
export const bulkUpdatePermissions = async (role, permissions) => {
  const records = Object.entries(permissions).map(([pageKey, canAccess]) => ({
    role,
    page_key: pageKey,
    can_access: canAccess,
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabase
    .from('role_permissions')
    .upsert(records, { onConflict: 'role,page_key' });

  if (error) {
    console.error('[Permissions] Bulk update failed:', error);
    return { success: false, error };
  }

  return { success: true, error: null };
};