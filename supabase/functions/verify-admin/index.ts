
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    const isValid = password === adminPassword;
    
    console.log(`Admin login attempt: ${isValid ? 'Success' : 'Failed'}`);

    return new Response(
      JSON.stringify({ 
        success: isValid, 
        message: isValid ? '인증 성공' : '비밀번호가 올바르지 않습니다.'
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
