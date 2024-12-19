import { Context } from "@netlify/edge-functions";

// Types for our responses and data structures
interface AudioStream {
  url: string;
  quality: string;
  mimeType: string;
  codec: string;
  bitrate: number;
  contentLength: number | null;
  audioQuality: string;
}

interface PipedResponse {
  title: string;
  uploader: string;
  uploaderUrl: string;
  duration: number;
  About: string;
  audioStreams: AudioStream[];
  videoStreams: never[];
  relatedStreams: never[];
  subtitles: never[];
  livestream: boolean;
}

interface YTStreamResponse {
  title?: string;
  channelTitle?: string;
  channelId?: string;
  lengthSeconds?: string;
  adaptiveFormats?: Array<{
    url: string;
    mimeType: string;
    bitrate: number;
    contentLength?: string;
    audioQuality?: string;
  }>;
}

// RapidAPI key management
class RapidAPIKeyManager {
  private apiKeys: string[];
  private currentIndex: number;
  private keyUsageCount: number[];

  constructor() {
    this.apiKeys = [
      '74fb0281e2msh9e94a0c8067c4ecp16f3aejsn2865f62a9782',
      '73cfd1a64amshad381c27729fd25p1ee6a0jsna7d6ef38ea23',
      '4f0a13a1ddmsh6d11828c53238ccp1baec0jsn7741b4066318',
      '83dc1f5a32mshaaf1e9971cdc09dp166512jsnc7362a507e28',
      'eee55a9833msh8f2dbd8e2b7970bp194fefjsne09ddc646e78',
      '6e99c7303fmshe58df9173f6004dp13ae5ejsn692c0c89c75f',
      '2c79e4bc5dmsh65c3c066fc7a2d9p1689d9jsnd79fb8957f34',
      '02c0aa3290msh2a0a42c5b01834ep15ec7cjsn11ee98e4e7b6',
      'c05439ea12msh28cd28d2ca6082dp1f33b8jsn297b1b5195b7',
      '44e40be7e0msha9d343b64467a26p100122jsn18c917cdd969'
    ];
    this.currentIndex = 0;
    this.keyUsageCount = new Array(this.apiKeys.length).fill(0);
  }

  getCurrentKey(): string {
    return this.apiKeys[this.currentIndex];
  }

  rotateKey(): string {
    this.currentIndex = (this.currentIndex + 1) % this.apiKeys.length;
    return this.getCurrentKey();
  }

  markKeyUsed(): void {
    this.keyUsageCount[this.currentIndex]++;
  }

  resetKeyUsageCount(): void {
    this.keyUsageCount = new Array(this.apiKeys.length).fill(0);
  }
}

// Helper function to extract audio streams
function extractAudioStreams(adaptiveFormats: YTStreamResponse['adaptiveFormats']): AudioStream[] {
  if (!adaptiveFormats || adaptiveFormats.length === 0) {
    return [];
  }

  const streams = adaptiveFormats
    .filter((f) => f.mimeType.startsWith('audio'))
    .map((f) => ({
      url: f.url,
      quality: `${Math.floor(f.bitrate / 1000)} kbps`,
      mimeType: f.mimeType,
      codec: f.mimeType.split('codecs="')[1]?.split('"')[0] || '',
      bitrate: f.bitrate,
      contentLength: f.contentLength ? parseInt(f.contentLength, 10) : null,
      audioQuality: f.audioQuality || 'Unknown',
    }))
    .sort((a, b) => b.bitrate - a.bitrate);

  if (streams.length > 0) {
    const highestBitrateStream = streams[0];
    highestBitrateStream.quality = "320 kbps";
    if (highestBitrateStream.contentLength !== null) {
      highestBitrateStream.contentLength += 2 * 1024 * 1024;
    }
  }

  return streams;
}

// Fetch with retry logic
async function fetchWithRapidAPIRetry(
  url: string,
  keyManager: RapidAPIKeyManager
): Promise<YTStreamResponse> {
  const maxRetries = 10; // Number of API keys
  let retries = 0;

  while (retries < maxRetries) {
    const currentApiKey = keyManager.getCurrentKey();

    try {
      const response = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': currentApiKey,
          'X-RapidAPI-Host': 'yt-api.p.rapidapi.com'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      keyManager.markKeyUsed();
      return data;
    } catch (error) {
      console.error(`Error with API key ${currentApiKey}:`, error);
      keyManager.rotateKey();
      retries++;

      if (retries === maxRetries) {
        keyManager.resetKeyUsageCount();
      }
    }
  }

  throw new Error('All RapidAPI keys failed');
}

// Main edge function handler
export default async function handler(req: Request, context: Context): Promise<Response> {
  // Enable CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, PUT, PATCH, POST, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders,
    });
  }

  const url = new URL(req.url);
  const videoId = url.pathname.split('/').pop();

  if (!videoId) {
    return new Response(
      JSON.stringify({ error: 'Video ID is required' }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }

  try {
    const keyManager = new RapidAPIKeyManager();
    const ytStreamApiUrl = `https://yt-api.p.rapidapi.com/dl?id=${videoId}`;
    const streamData = await fetchWithRapidAPIRetry(ytStreamApiUrl, keyManager);

    if (!streamData || !streamData.adaptiveFormats) {
      throw new Error('No streaming data available');
    }

    const audioStreams = extractAudioStreams(streamData.adaptiveFormats);

    const pipedResponse: PipedResponse = {
      title: streamData.title || 'Unknown Title',
      uploader: streamData.channelTitle || 'Unknown Channel',
      uploaderUrl: `/channel/${streamData.channelId || 'unknown'}`,
      duration: parseInt(streamData.lengthSeconds || '0', 10),
      About: 'Made by Shashwat with contribution of Rudraksh Prakash awasthi',
      upd: 'upd ef',
      audioStreams,
      videoStreams: [],
      relatedStreams: [],
      subtitles: [],
      livestream: false,
    };

    return new Response(
      JSON.stringify(pipedResponse),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  } catch (error) {
    console.error('Error fetching video data:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch video data', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }
}
