import type { APIRoute } from 'astro';
import { AmplitudeClient } from '../../lib/amplitude-client';

export const GET: APIRoute = async ({ request }) => {
  try {
    // Check if required environment variables are set
    const apiKey = import.meta.env.AMPLITUDE_API_KEY;
    const secretKey = import.meta.env.AMPLITUDE_SECRET_KEY;
    const projectId = import.meta.env.AMPLITUDE_PROJECT_ID;

    if (!apiKey || !secretKey) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required environment variables: AMPLITUDE_API_KEY and AMPLITUDE_SECRET_KEY'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    const client = new AmplitudeClient({
      apiKey,
      secretKey,
      projectId
    });

    const results = await client.runAllTests();
    
    return new Response(JSON.stringify({
      success: true,
      timestamp: new Date().toISOString(),
      results
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });

  } catch (error: any) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}; 