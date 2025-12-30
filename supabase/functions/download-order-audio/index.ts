import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateWatermarkCode(buyerId: string, orderItemId: string, timestamp: number): string {
  const data = `${buyerId}-${orderItemId}-${timestamp}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
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

    const { order_item_id } = await req.json();

    if (!order_item_id) {
      return new Response(
        JSON.stringify({ error: 'Order item ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Download request: user ${user.id}, order_item_id ${order_item_id}`);

    // Verify purchase ownership via order_items + orders
    const { data: orderItem, error: orderItemError } = await supabase
      .from('order_items')
      .select(`
        *,
        songs:song_id (
          id,
          title,
          audio_url,
          has_audio
        ),
        orders:order_id (
          id,
          buyer_id,
          payment_status
        )
      `)
      .eq('id', order_item_id)
      .single();

    if (orderItemError || !orderItem) {
      console.error('Order item not found:', orderItemError);
      return new Response(
        JSON.stringify({ error: 'Order item not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const order = orderItem.orders as any;
    const song = orderItem.songs as any;

    // Verify user owns this order
    if (order.buyer_id !== user.id) {
      console.error('Access denied: user does not own this order');
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify payment is complete
    if (order.payment_status !== 'paid') {
      console.error('Payment not completed:', order.payment_status);
      return new Response(
        JSON.stringify({ error: 'Payment not completed' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if song has audio
    if (!song?.audio_url || !song.has_audio) {
      return new Response(
        JSON.stringify({ error: 'Audio file not available for this song' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check/create download access
    const { data: existingAccess } = await supabase
      .from('download_access')
      .select('*')
      .eq('order_item_id', order_item_id)
      .eq('buyer_id', user.id)
      .single();

    if (!existingAccess) {
      // Grant download access if not exists
      await supabase.from('download_access').insert({
        order_item_id: order_item_id,
        song_id: song.id,
        buyer_id: user.id,
        access_type: 'full',
        is_active: true,
      });
    } else if (!existingAccess.is_active) {
      return new Response(
        JSON.stringify({ error: 'Download access has been revoked' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate or get watermark code
    let watermarkCode = orderItem.watermark_code;
    if (!watermarkCode) {
      watermarkCode = generateWatermarkCode(user.id, order_item_id, Date.now());
      
      // Update order item with watermark code
      await supabase
        .from('order_items')
        .update({ watermark_code: watermarkCode })
        .eq('id', order_item_id);
      
      // Also store in audio_watermarks table
      await supabase.from('audio_watermarks').insert({
        buyer_id: user.id,
        song_id: song.id,
        watermark_code: watermarkCode,
      });
    }

    // Get the audio file path from the URL
    const audioPath = song.audio_url.includes('song-audio/') 
      ? song.audio_url.split('song-audio/')[1]
      : song.audio_url;

    // Create signed URL for audio download
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from('song-audio')
      .createSignedUrl(audioPath, 300); // 5 minute expiry

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('Signed URL error:', signedUrlError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate download URL' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment download count
    await supabase
      .from('order_items')
      .update({ download_count: (orderItem.download_count || 0) + 1 })
      .eq('id', order_item_id);

    // Log download activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      entity_type: 'audio_download',
      entity_id: order_item_id,
      action: 'download',
      metadata: {
        song_id: song.id,
        song_title: song.title,
        watermark_code: watermarkCode,
      },
    });

    console.log(`Download success: user ${user.id}, song ${song.title}, watermark ${watermarkCode}`);

    return new Response(
      JSON.stringify({
        success: true,
        download_url: signedUrlData.signedUrl,
        filename: `${song.title.replace(/[^a-zA-Z0-9]/g, '_')}_licensed.mp3`,
        watermark_code: watermarkCode,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Download order audio error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
