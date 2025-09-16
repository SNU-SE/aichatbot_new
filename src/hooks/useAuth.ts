
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { persistStudentToken } from './useSupabaseAuth';
import { useToast } from '@/hooks/use-toast';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: 'admin' | 'student' | null;
  loading: boolean;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    loading: true
  });
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null
        }));

        if (session?.user) {
          // Defer role fetching to prevent deadlocks
          setTimeout(async () => {
            try {
              const { data: roleData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id)
                .single();

              setAuthState(prev => ({
                ...prev,
                role: roleData?.role ?? null,
                loading: false
              }));
            } catch (error) {
              console.error('Error fetching user role:', error);
              setAuthState(prev => ({ ...prev, role: null, loading: false }));
            }
          }, 0);
        } else {
          setAuthState(prev => ({ ...prev, role: null, loading: false }));
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null
      }));

      if (!session) {
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      toast({
        title: "로그인 성공",
        description: "성공적으로 로그인되었습니다."
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "로그인 실패",
        description: error.message || "로그인 중 오류가 발생했습니다.",
        variant: "destructive"
      });
      return { data: null, error };
    }
  };

  const signUp = async (email: string, password: string, role: 'admin' | 'student', studentData?: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) throw error;

      // Create role assignment
      if (data.user) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role: role
          });

        if (roleError) throw roleError;

        // If student, create student record
        if (role === 'student' && studentData) {
          const { error: studentError } = await supabase
            .from('students')
            .insert({
              ...studentData,
              user_id: data.user.id
            });

          if (studentError) throw studentError;
        }
      }

      toast({
        title: "회원가입 성공",
        description: "계정이 성공적으로 생성되었습니다."
      });

      return { data, error: null };
    } catch (error: any) {
      toast({
        title: "회원가입 실패",
        description: error.message || "회원가입 중 오류가 발생했습니다.",
        variant: "destructive"
      });
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear any cached data
      localStorage.removeItem('userType');
      localStorage.removeItem('studentId');
      localStorage.removeItem('studentProfile');
      persistStudentToken(null);

      toast({
        title: "로그아웃 완료",
        description: "성공적으로 로그아웃되었습니다."
      });
    } catch (error: any) {
      toast({
        title: "로그아웃 실패",
        description: error.message || "로그아웃 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    }
  };

  return {
    ...authState,
    signIn,
    signUp,
    signOut
  };
};
