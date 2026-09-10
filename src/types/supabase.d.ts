/**
 * Supabase type declarations to fix type resolution issues
 */

import '@supabase/supabase-js';

// Extend the Supabase auth client to include methods for v2 API
declare module '@supabase/supabase-js' {
  interface SupabaseAuthClient {
    getUser(): Promise<{
      data: { user: { id: string; email?: string; user_metadata: Record<string, unknown> } | null };
      error: any;
    }>;
    signInWithPassword(credentials: { email: string; password: string }): Promise<{
      data: { user: any; session: any };
      error: any;
    }>;
    signUp(credentials: { email: string; password: string }): Promise<{
      data: { user: any; session: any };
      error: any;
    }>;
    updateUser(attributes: any): Promise<{
      data: { user: any };
      error: any;
    }>;
    signOut(): Promise<{
      error: any;
    }>;
    admin: {
      updateUserById(userId: string, attributes: any): Promise<{
        data: { user: any };
        error: any;
      }>;
      deleteUser(userId: string): Promise<{
        data: { user: any };
        error: any;
      }>;
      listUsers(): Promise<{
        data: { users: Array<{ id: string; email?: string }> };
        error: any;
      }>;
      createUser(attributes: any): Promise<{
        data: { user: any };
        error: any;
      }>;
    };
  }
}

// Also extend the auth module from @supabase/ssr
declare module '@supabase/ssr' {
  interface SupabaseAuthClient {
    getUser(): Promise<{
      data: { user: { id: string; email?: string; user_metadata: Record<string, unknown> } | null };
      error: any;
    }>;
    signInWithPassword(credentials: { email: string; password: string }): Promise<{
      data: { user: any; session: any };
      error: any;
    }>;
    signUp(credentials: { email: string; password: string }): Promise<{
      data: { user: any; session: any };
      error: any;
    }>;
    updateUser(attributes: any): Promise<{
      data: { user: any };
      error: any;
    }>;
    signOut(): Promise<{
      error: any;
    }>;
    admin: {
      updateUserById(userId: string, attributes: any): Promise<{
        data: { user: any };
        error: any;
      }>;
      deleteUser(userId: string): Promise<{
        data: { user: any };
        error: any;
      }>;
      listUsers(): Promise<{
        data: { users: Array<{ id: string; email?: string }> };
        error: any;
      }>;
      createUser(attributes: any): Promise<{
        data: { user: any };
        error: any;
      }>;
    };
  }
}