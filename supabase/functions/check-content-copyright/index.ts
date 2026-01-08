import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple hash function for text content
async function computeSHA256(data: string | ArrayBuffer): Promise<string> {
  const buffer = typeof data === "string" 
    ? new TextEncoder().encode(data) 
    : new Uint8Array(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

// Normalize lyrics for comparison
function normalizeLyrics(lyrics: string): string {
  return lyrics
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

// Calculate Levenshtein distance between two strings
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  if (m === 0) return n;
  if (n === 0) return m;
  
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1
        );
      }
    }
  }
  
  return dp[m][n];
}

// Calculate similarity percentage between two strings
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 100;
  
  const distance = levenshteinDistance(str1, str2);
  return ((1 - distance / maxLength) * 100);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { songId } = await req.json();

    if (!songId) {
      return new Response(
        JSON.stringify({ error: "Song ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the song details
    const { data: song, error: songError } = await supabase
      .from("songs")
      .select("id, title, full_lyrics, audio_url, seller_id, has_lyrics, has_audio")
      .eq("id", songId)
      .single();

    if (songError || !song) {
      return new Response(
        JSON.stringify({ error: "Song not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update song status to checking
    await supabase
      .from("songs")
      .update({ content_check_status: "checking" })
      .eq("id", songId);

    let audioHash: string | null = null;
    let lyricsHash: string | null = null;
    let lyricsWordCount = 0;
    let copyrightStatus = "clear";
    let plagiarismStatus = "clear";
    let audioMatchConfidence: number | null = null;
    let lyricsSimilarityScore: number | null = null;
    let similarSongId: string | null = null;
    let detectionType: string | null = null;
    let matchedContent: string | null = null;
    let blocked = false;
    let flagged = false;

    // Check audio hash if audio exists
    if (song.has_audio && song.audio_url) {
      try {
        // Download audio file from storage
        const audioPath = song.audio_url.replace(/.*\/song-audio\//, "");
        const { data: audioData, error: audioError } = await supabase.storage
          .from("song-audio")
          .download(audioPath);

        if (!audioError && audioData) {
          const audioBuffer = await audioData.arrayBuffer();
          audioHash = await computeSHA256(audioBuffer);

          // Check for exact audio hash matches
          const { data: audioMatches } = await supabase
            .from("content_fingerprints")
            .select("song_id")
            .eq("audio_file_hash", audioHash)
            .neq("song_id", songId);

          if (audioMatches && audioMatches.length > 0) {
            // Get matched song title
            const { data: matchedSong } = await supabase
              .from("songs")
              .select("title")
              .eq("id", audioMatches[0].song_id)
              .single();

            copyrightStatus = "blocked";
            audioMatchConfidence = 100;
            similarSongId = audioMatches[0].song_id;
            detectionType = "exact_audio_match";
            matchedContent = `Exact audio match with "${matchedSong?.title || 'Unknown'}"`;
            blocked = true;
          }
        }
      } catch (e) {
        console.error("Audio check error:", e);
      }
    }

    // Check lyrics similarity if lyrics exist
    if (song.has_lyrics && song.full_lyrics) {
      const normalizedLyrics = normalizeLyrics(song.full_lyrics);
      lyricsHash = await computeSHA256(normalizedLyrics);
      lyricsWordCount = normalizedLyrics.split(/\s+/).filter((w: string) => w.length > 0).length;

      // Check for exact lyrics hash matches
      const { data: lyricsMatches } = await supabase
        .from("content_fingerprints")
        .select("song_id")
        .eq("lyrics_hash", lyricsHash)
        .neq("song_id", songId);

      if (lyricsMatches && lyricsMatches.length > 0) {
        // Get matched song title
        const { data: matchedSong } = await supabase
          .from("songs")
          .select("title")
          .eq("id", lyricsMatches[0].song_id)
          .single();

        plagiarismStatus = "blocked";
        lyricsSimilarityScore = 100;
        similarSongId = lyricsMatches[0].song_id;
        detectionType = "exact_lyrics_match";
        matchedContent = `Exact lyrics match with "${matchedSong?.title || 'Unknown'}"`;
        blocked = true;
      } else {
        // Check for similar lyrics
        const { data: candidates } = await supabase
          .from("content_fingerprints")
          .select("song_id, lyrics_word_count")
          .gte("lyrics_word_count", Math.floor(lyricsWordCount * 0.7))
          .lte("lyrics_word_count", Math.ceil(lyricsWordCount * 1.3))
          .neq("song_id", songId)
          .limit(20);

        if (candidates && candidates.length > 0) {
          for (const candidate of candidates) {
            // Fetch the candidate song's lyrics
            const { data: candidateSong } = await supabase
              .from("songs")
              .select("title, full_lyrics")
              .eq("id", candidate.song_id)
              .single();

            if (candidateSong?.full_lyrics) {
              const candidateNormalized = normalizeLyrics(candidateSong.full_lyrics);
              const similarity = calculateSimilarity(normalizedLyrics, candidateNormalized);

              if (similarity > 80) {
                plagiarismStatus = "blocked";
                lyricsSimilarityScore = similarity;
                similarSongId = candidate.song_id;
                detectionType = "high_lyrics_similarity";
                matchedContent = `${Math.round(similarity)}% lyrics match with "${candidateSong.title}"`;
                blocked = true;
                break;
              } else if (similarity > 70) {
                plagiarismStatus = "flagged";
                lyricsSimilarityScore = similarity;
                similarSongId = candidate.song_id;
                detectionType = "medium_lyrics_similarity";
                matchedContent = `${Math.round(similarity)}% lyrics similarity with "${candidateSong.title}"`;
                flagged = true;
                break;
              } else if (similarity > 60) {
                // Log but don't flag
                lyricsSimilarityScore = similarity;
                similarSongId = candidate.song_id;
                detectionType = "low_lyrics_similarity";
              }
            }
          }
        }
      }
    }

    // Determine final content check status
    let finalStatus = "clear";
    if (blocked) {
      finalStatus = "blocked";
    } else if (flagged) {
      finalStatus = "flagged";
    }

    // Insert or update content fingerprint
    const { error: fingerprintError } = await supabase
      .from("content_fingerprints")
      .upsert({
        song_id: songId,
        audio_file_hash: audioHash,
        lyrics_hash: lyricsHash,
        lyrics_word_count: lyricsWordCount,
        copyright_check_status: copyrightStatus,
        plagiarism_check_status: plagiarismStatus,
        audio_match_confidence: audioMatchConfidence,
        lyrics_similarity_score: lyricsSimilarityScore,
        similar_song_id: similarSongId,
        checked_at: new Date().toISOString(),
      }, { onConflict: "song_id" });

    if (fingerprintError) {
      console.error("Fingerprint upsert error:", fingerprintError);
    }

    // Update song status
    await supabase
      .from("songs")
      .update({ 
        content_check_status: finalStatus,
        requires_ownership_proof: blocked || flagged
      })
      .eq("id", songId);

    // Add to review queue if flagged or blocked
    if (blocked || flagged) {
      await supabase
        .from("content_review_queue")
        .insert({
          song_id: songId,
          queue_type: copyrightStatus === "blocked" ? "copyright" : "plagiarism",
          priority: blocked ? 1 : 3,
          status: "pending",
          detection_type: detectionType,
          confidence_score: lyricsSimilarityScore || audioMatchConfidence,
          matched_content: matchedContent,
          matched_song_id: similarSongId,
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: finalStatus,
        blocked,
        flagged,
        detectionType,
        matchedContent,
        similarityScore: lyricsSimilarityScore || audioMatchConfidence,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Content check error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});