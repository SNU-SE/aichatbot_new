
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, supabaseConfig, env } from '../_shared/environment.ts';

const supabaseUrl = supabaseConfig.url();
const serviceRoleKey = supabaseConfig.serviceRoleKey();
const jwtSecret = env.get('JWT_SECRET', false) || env.get('SUPABASE_JWT_SECRET', false);

if (!jwtSecret) {
  console.error('JWT secret environment variable (JWT_SECRET or SUPABASE_JWT_SECRET) is not configured.');
  throw new Error('JWT secret is not configured');
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
const encoder = new TextEncoder();

const base64UrlEncode = (str: string) =>
  btoa(str)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

const signJwt = async (payload: Record<string, unknown>) => {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(jwtSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signatureInput));
  const encodedSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { password } = await req.json();

    if (!password) {
      return new Response(
        JSON.stringify({ success: false, message: '비밀번호가 필요합니다.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      );
    }

    const adminPassword = Deno.env.get('ADMIN_PASS');

    if (!adminPassword) {
      console.error('ADMIN_PASS environment variable not set');
      return new Response(
        JSON.stringify({ success: false, message: '서버 설정 오류입니다.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

    if (password !== adminPassword) {
      console.warn('Admin login attempt failed: invalid password');
      return new Response(
        JSON.stringify({ success: false, message: '관리자 비밀번호가 올바르지 않습니다.' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'admin@system.local';

    // Ensure admin user exists in auth.users
    let adminUser = null;
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });

    if (listError) {
      console.error('Failed to list users:', listError);
      throw listError;
    }

    if (existingUsers?.users?.length) {
      adminUser = existingUsers.users.find((user) => user.email === adminEmail) ?? null;
    }

    if (!adminUser) {
      const tempPassword = `${crypto.randomUUID()}Aa1!`;
      const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        email_confirm: true,
        password: tempPassword,
        user_metadata: { system: 'admin' }
      });

      if (createError) {
        console.error('Failed to create admin user:', createError);
        throw createError;
      }

      adminUser = createdUser.user;
    }

    if (!adminUser) {
      throw new Error('Unable to ensure admin user exists');
    }

    // Ensure admin role assignment
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: adminUser.id,
        role: 'admin'
      }, {
        onConflict: 'user_id,role'
      });

    if (roleError) {
      console.error('Failed to upsert admin role:', roleError);
      throw roleError;
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      role: 'authenticated',
      iss: supabaseUrl,
      aud: 'authenticated',
      iat: now,
      exp: now + 60 * 60, // 1 hour
      sub: adminUser.id,
      app_metadata: {
        roles: ['admin']
      },
      user_metadata: {
        is_admin: true,
        email: adminUser.email
      }
    };

    const token = await signJwt(payload);

    console.log('Admin login successful for user:', adminUser.id);

    return new Response(
      JSON.stringify({
        success: true,
        token,
        admin: {
          id: adminUser.id,
          email: adminUser.email,
          is_admin: true
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Error in verify-admin function:', error);
    return new Response(
      JSON.stringify({ success: false, message: '서버 오류가 발생했습니다.' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
