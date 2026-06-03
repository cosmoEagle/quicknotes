"use client";
import { useState, useEffect } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";

export function useAuth() {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Hydrate from server-validated session on mount (getUser() validates the JWT server-side)
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user ?? null);
      setLoading(false);
    });

    // Keep state in sync with any auth changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    return error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await createClient().auth.signUp({ email, password });
    return error;
  };

  const signOut = async () => {
    await createClient().auth.signOut();
  };

  return { user, loading, signIn, signUp, signOut };
}
