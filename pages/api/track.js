// pages/api/track.js
// --- PASTE CODE FROM PREVIOUS ANSWER ---
import { D1Database } from '@cloudflare/d1';

async function trackHit(env, data) {
    // Check for existence of env vars is good practice
    if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_DATABASE_ID) {
        console.error("Cloudflare D1 environment variables are not properly set.");
        // Consider if you want to expose this error detail or just log it
        return false;
    }

    let D1;
    try {
         D1 = new D1Database(env.CLOUDFLARE_DATABASE_ID, {
            accountId: env.CLOUDFLARE_ACCOUNT_ID,
            apiKey: env.CLOUDFLARE_API_TOKEN,
        });
    } catch (initError) {
        console.error("Failed to initialize D1Database client:", initError);
        return false;
    }


  try {
    const stmt = D1.prepare(
      `INSERT INTO hits (hostname, pathname, referrer, user_agent, screen_width, screen_height, language) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      data.hostname || '', // Ensure defaults if somehow missing
      data.pathname || '',
      data.referrer || null,
      data.user_agent || null,
      typeof data.screen_width === 'number' ? data.screen_width : null, // Basic type check
      typeof data.screen_height === 'number' ? data.screen_height : null,
      data.language || null
    );
    const { success } = await stmt.run(); // Check D1 result
    if (!success) {
         console.error("D1 stmt.run() indicated failure.");
         return false;
    }
    console.log('Hit tracked:', data.pathname, 'on', data.hostname);
    return true;
  } catch (e) {
    console.error("D1 Error executing INSERT:", e.message, e.cause ? `Cause: ${e.cause}`: '');
    return false;
  }
}

export default async function handler(req, res) {
  // CORS Headers (essential for tracking script)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // More restrictive in production? e.g., your actual domains
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Preflight CORS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
        // Next.js usually parses JSON automatically for POST
        const data = req.body;

        // More robust validation
        if (!data || typeof data !== 'object' || !data.pathname || !data.hostname) {
            console.warn("Received invalid/incomplete tracking data:", data);
            // Be careful not to log potentially sensitive data from req.body if structure is unexpected
            return res.status(400).json({ message: 'Invalid request body. Missing required fields: pathname, hostname.' });
        }

        const success = await trackHit(process.env, data);

        if (success) {
            // Use 201 for resource created, or 200/204 for accepted/no content
            res.status(201).json({ message: 'Hit tracked' });
        } else {
            // Don't expose internal error details to the client unless necessary
            res.status(500).json({ message: 'Failed to track hit due to server error.' });
        }
    } catch (error) {
        // Catch potential JSON parsing errors or other unexpected issues
        console.error("Tracking API Error (catch block):", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}