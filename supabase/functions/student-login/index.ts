import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { env, supabaseConfig } from '../_shared/environment.ts';

const supabaseUrl = supabaseConfig.url();
const serviceRoleKey = supabaseConfig.serviceRoleKey();
const jwtSecret = env.get('SUPABASE_JWT_SECRET');

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentId } = await req.json();

    if (!studentId || typeof studentId !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid studentId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const normalizedId = studentId.trim();

    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('student_id, class_name, name, mother_tongue')
      .eq('student_id', normalizedId)
      .maybeSingle();

    if (studentError) {
      console.error('Failed to fetch student:', studentError);
      return new Response(JSON.stringify({ error: 'Failed to verify student' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!student) {
      return new Response(JSON.stringify({ error: 'Student not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate JWT valid for 1 hour
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      role: 'student',
      student_id: normalizedId,
      iss: supabaseUrl,
      aud: 'authenticated',
      iat: now,
      exp: now + 60 * 60 // 1 hour
    };

    const token = await signJwt(payload);

    return new Response(JSON.stringify({
      token,
      student
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('student-login error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
