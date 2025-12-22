import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateWatermarkCode(buyerId: string, transactionId: string, timestamp: number): string {
  // Create a unique watermark code that can be used for tracing
  const data = `${buyerId}-${transactionId}-${timestamp}`;
  // Simple hash for watermark - in production, use more sophisticated encoding
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const code = Math.abs(hash).toString(36).toUpperCase().padStart(8, '0');
  return `WM-${code}-${timestamp.toString(36).toUpperCase()}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { transactionId } = await req.json();

    if (!transactionId) {
      return new Response(
        JSON.stringify({ error: 'Transaction ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify purchase ownership
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select(`
        *,
        songs:song_id (
          id,
          title,
          audio_url
        )
      `)
      .eq('id', transactionId)
      .eq('buyer_id', user.id)
      .eq('payment_status', 'completed')
      .single();

    if (transactionError || !transaction) {
      return new Response(
        JSON.stringify({ error: 'Purchase not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const song = transaction.songs as any;
    if (!song?.audio_url) {
      return new Response(
        JSON.stringify({ error: 'Audio file not available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if watermark already exists for this transaction
    let watermarkCode: string;
    const { data: existingWatermark } = await supabase
      .from('audio_watermarks')
      .select('watermark_code')
      .eq('transaction_id', transactionId)
      .single();

    if (existingWatermark) {
      watermarkCode = existingWatermark.watermark_code;
    } else {
      // Generate new watermark code
      watermarkCode = generateWatermarkCode(user.id, transactionId, Date.now());
      
      // Store watermark for future tracing
      await supabase.from('audio_watermarks').insert({
        transaction_id: transactionId,
        buyer_id: user.id,
        song_id: song.id,
        watermark_code: watermarkCode
      });
    }

    // Get the audio file from private storage
    const audioPath = song.audio_url.includes('song-audio/') 
      ? song.audio_url.split('song-audio/')[1]
      : song.audio_url;

    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from('song-audio')
      .createSignedUrl(audioPath, 300); // 5 minute signed URL

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('Signed URL error:', signedUrlError);
      return new Response(
        JSON.stringify({ error: 'Failed to access audio file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the audio file
    const audioResponse = await fetch(signedUrlData.signedUrl);
    
    if (!audioResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch audio' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const audioBuffer = await audioResponse.arrayBuffer();

    // Log download activity
    console.log(`Download: user ${user.id}, transaction ${transactionId}, watermark ${watermarkCode}`);

    // Create safe filename
    const safeTitle = song.title.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${safeTitle}_licensed.mp3`;

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Watermark-Code': watermarkCode,
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      }
    });

  } catch (error) {
    console.error('Download purchased error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
