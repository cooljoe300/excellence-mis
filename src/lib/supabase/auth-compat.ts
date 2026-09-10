/**
 * Compatibility layer for Supabase Auth API
 * This provides the old v1-like API methods for existing code
 */

export interface AuthCompatClient {
  getUser(): Promise<{ data: { user: { id: string; email?: string; user_metadata: Record<string, unknown> } | null }; error: any }>;
  signInWithPassword(credentials: { email: string; password: string }): Promise<{ data: any; error: any }>;
  signUp(credentials: { email: string; password: string }): Promise<{ data: any; error: any }>;
  updateUser(attributes: any): Promise<{ data: any; error: any }>;
  signOut(): Promise<{ error: any }>;
  admin: {
    updateUserById(userId: string, attributes: any): Promise<{ data: any; error: any }>;
    deleteUser(userId: string): Promise<{ data: any; error: any }>;
    listUsers(): Promise<{ data: { users: Array<{ id: string; email?: string }> }; error: any }>;
    createUser(attributes: any): Promise<{ data: any; error: any }>;
  };
}

export function createAuthCompat(supabase: any): AuthCompatClient {
  return {
    getUser: async () => {
      // @ts-ignore - Supabase v2 API
      return supabase.auth.getUser();
    },
    signInWithPassword: async (credentials) => {
      // @ts-ignore - Supabase v2 API
      return supabase.auth.signInWithPassword(credentials);
    },
    signUp: async (credentials) => {
      // @ts-ignore - Supabase v2 API
      return supabase.auth.signUp(credentials);
    },
    updateUser: async (attributes) => {
      // @ts-ignore - Supabase v2 API
      return supabase.auth.updateUser(attributes);
    },
    signOut: async () => {
      // @ts-ignore - Supabase v2 API
      return supabase.auth.signOut();
    },
    admin: {
      updateUserById: async (userId, attributes) => {
        // This is a stub - in v2, admin operations should use service role client
        // For now, return an error to indicate this needs proper implementation
        return { 
          data: null, 
          error: { message: 'Admin operations require service role client. Use createAdminClient() instead.' } 
        };
      },
      deleteUser: async (userId) => {
        return { 
          data: null, 
          error: { message: 'Admin operations require service role client. Use createAdminClient() instead.' } 
        };
      },
      listUsers: async () => {
        return { 
          data: { users: [] }, 
          error: { message: 'Admin operations require service role client. Use createAdminClient() instead.' } 
        };
      },
      createUser: async (attributes) => {
        return { 
          data: null, 
          error: { message: 'Admin operations require service role client. Use createAdminClient() instead.' } 
        };
      },
    },
  };
}