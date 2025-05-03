// pages/api/stats.js
// --- PASTE CODE FROM PREVIOUS ANSWER ---
import { D1Database } from '@cloudflare/d1';
import { checkAuth } from '../../lib/auth'; // Import the auth check

async function getStats(env) {
   if (!env.CLOUDFLARE_ACCOUNT_ID || !env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_DATABASE_ID) {
        console.error("Cloudflare D1 environment variables are not properly set for stats.");
        return null;
   }

   let D1;
   try {
        D1 = new D1Database(env.CLOUDFLARE_DATABASE_ID, {
            accountId: env.CLOUDFLARE_ACCOUNT_ID,
            apiKey: env.CLOUDFLARE_API_TOKEN,
        });
   } catch (initError) {
        console.error("Failed to initialize D1Database client for stats:", initError);
        return null;
   }


  try {
    // Example Queries - Add more as needed!
    const totalHitsStmt = D1.prepare(`SELECT COUNT(*) as total FROM hits`);
    const hitsByPageStmt = D1.prepare(`SELECT pathname, COUNT(*) as count FROM hits GROUP BY pathname ORDER BY count DESC LIMIT 20`);
    const hitsByReferrerStmt = D1.prepare(`SELECT referrer, COUNT(*) as count FROM hits WHERE referrer IS NOT NULL AND referrer != '' GROUP BY referrer ORDER BY count DESC LIMIT 20`);
    const hitsLast24hStmt = D1.prepare(`SELECT COUNT(*) as total FROM hits WHERE timestamp >= datetime('now', '-1 day')`);
    const uniqueHostnamesStmt = D1.prepare(`SELECT DISTINCT hostname FROM hits LIMIT 50`); // Example: Get sites tracked


    // Execute queries concurrently
    const results = await D1.batch([
         totalHitsStmt,
         hitsByPageStmt,
         hitsByReferrerStmt,
         hitsLast24hStmt,
         uniqueHostnamesStmt
     ]);

     // Process results safely, checking for success and providing defaults
     const totalHitsResult = results[0]?.results?.[0];
     const hitsByPageResult = results[1];
     const hitsByReferrerResult = results[2];
     const hitsLast24hResult = results[3]?.results?.[0];
     const uniqueHostnamesResult = results[4];


    return {
        totalHits: totalHitsResult?.total || 0,
        hitsLast24h: hitsLast24hResult?.total || 0,
        pages: hitsByPageResult?.success ? hitsByPageResult.results : [],
        referrers: hitsByReferrerResult?.success ? hitsByReferrerResult.results : [],
        sites: uniqueHostnamesResult?.success ? uniqueHostnamesResult.results.map(r => r.hostname) : [],
    };
  } catch (e) {
    console.error("D1 Stats Error executing batch:", e.message, e.cause ? `Cause: ${e.cause}`: '');
    return null; // Indicate failure to fetch stats
  }
}

export default async function handler(req, res) {
  // --- Authentication Check ---
  // Pass 'res' so checkAuth can send 401 response if needed
  if (!checkAuth(req, res)) {
    // If checkAuth returns false AND sent a response, we just return.
    return;
  }
  // --- End Authentication Check ---

  if (req.method === 'GET') {
    try {
      const stats = await getStats(process.env);
      if (stats) {
        res.status(200).json(stats);
      } else {
        // If getStats returned null due to an error
        res.status(500).json({ message: 'Failed to fetch stats due to server error.' });
      }
    } catch (error) {
        // Catch unexpected errors in the handler itself
        console.error("Stats API Error (catch block):", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}