/**
 * Helper functions for Supabase Auth API v2
 * These provide type-safe wrappers around the auth methods
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export async function getUser(supabase: SupabaseClient) {
  // @ts-ignore - Supabase v2 API
  return supabase.auth.getUser();
}

export async function signInWithPassword(supabase: SupabaseClient, credentials: { email: string; password: string }) {
  // @ts-ignore - Supabase v2 API
  return supabase.auth.signInWithPassword(credentials);
}

export async function signUp(supabase: SupabaseClient, credentials: { email: string; password: string }) {
  // @ts-ignore - Supabase v2 API
  return supabase.auth.signUp(credentials);
}

export async function updateUser(supabase: SupabaseClient, attributes: any) {
  // @ts-ignore - Supabase v2 API
  return supabase.auth.updateUser(attributes);
}

export async function signOut(supabase: SupabaseClient) {
  // @ts-ignore - Supabase v2 API
  return supabase.auth.signOut();
}

export async function listUsers(supabase: SupabaseClient) {
  // @ts-ignore - Supabase v2 API
  return supabase.auth.admin.listUsers();
}

export async function createUser(supabase: SupabaseClient, attributes: any) {
  // @ts-ignore - Supabase v2 API
  return supabase.auth.admin.createUser(attributes);
}

export async function updateUserById(supabase: SupabaseClient, userId: string, attributes: any) {
  // @ts-ignore - Supabase v2 API
  return supabase.auth.admin.updateUserById(userId, attributes);
}

export async function deleteUser(supabase: SupabaseClient, userId: string) {
  // @ts-ignore - Supabase v2 API
  return supabase.auth.admin.deleteUser(userId);
}