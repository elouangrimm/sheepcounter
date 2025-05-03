// pages/dashboard.js
// --- PASTE CODE FROM PREVIOUS ANSWER ---
import { useState, useEffect } from 'react';
import { checkAuth } from '../lib/auth'; // Import the auth check helper

// This function runs ON THE SERVER before rendering the page or serving from cache
export async function getServerSideProps(context) {
  const { req, res } = context;

  // Perform authentication check on the server-side
  // Pass only 'req' here initially. If it fails, checkAuth returns false.
  const isAuthenticated = checkAuth(req);

  if (!isAuthenticated) {
      // If checkAuth failed, explicitly set the WWW-Authenticate header and status code
      // This triggers the browser's basic auth prompt.
      res.setHeader('WWW-Authenticate', 'Basic realm="SheepCounter"');
      res.statusCode = 401;
      res.end('Authentication required.'); // Send simple response body

      // Return an empty props object to prevent Next.js trying to render the page component
      // when authentication failed. The browser will handle the 401.
       return { props: { authenticated: false, initialError: 'Auth required' } };
  }

  // If authenticated, signal the component to render and fetch data client-side
  // We don't fetch data here to keep server-side load minimal and show loading state
  return {
    props: { authenticated: true, initialError: null },
  };
}


// --- Dashboard Component ---
export default function Dashboard({ authenticated, initialError }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(authenticated); // Start loading only if authenticated initially
  const [error, setError] = useState(initialError); // Set initial error from SSR

  useEffect(() => {
    // Only fetch data if authenticated by getServerSideProps
    if (!authenticated) {
        setLoading(false);
        return; // Stop here if not authenticated
    }

    // Reset error if we are authenticated and starting fetch
    setError(null);
    setLoading(true);

    fetch('/api/stats') // Fetch from our protected stats API (will include browser cookies/auth)
      .then(res => {
        if (!res.ok) {
           // Handle potential errors like network issues or non-JSON response
           // Also check for 401 in case session/auth expired client-side somehow
           if(res.status === 401) {
               throw new Error("Authentication failed or expired. Please refresh.");
           }
           throw new Error(`Failed to fetch stats: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        setStats(data);
        setError(null); // Clear previous errors on success
      })
      .catch(err => {
        console.error("Error fetching stats:", err);
        setError(err.message || "An unknown error occurred while fetching stats.");
        setStats(null); // Clear stats on error
      })
      .finally(() => {
        setLoading(false);
      });

  }, [authenticated]); // Re-run effect if authentication status changes (though unlikely with SSR check)

  // Render based on state
  if (!authenticated && initialError) {
      return <div>Error: {initialError}</div>; // Should typically be handled by browser auth prompt
  }

  if (loading) {
    return <div>Loading Sheep Counter stats...</div>;
  }

  if (error) {
    return <div>Error loading stats: {error}</div>;
  }

  if (!stats) {
     // This state might occur briefly or if fetch fails silently
     return <div>No stats data available.</div>;
  }

  // --- Display Stats ---
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px' }}>
      <h1>🐑 Sheep Counter Dashboard</h1>
      <p>Welcome, {process.env.NEXT_PUBLIC_SHEEP_USER || 'Admin'}!</p> {/* Example: Use env var if needed, but SHEEP_USER is server-side only */}

      <div style={styles.section}>
        <h2>Overview</h2>
        <p><strong>Total Hits:</strong> {stats.totalHits}</p>
        <p><strong>Hits (Last 24h):</strong> {stats.hitsLast24h}</p>
         <p><strong>Tracked Sites:</strong> {stats.sites?.join(', ') || 'None yet'}</p>
      </div>

      <div style={styles.section}>
        <h2>Top Pages (Last 20)</h2>
        {stats.pages && stats.pages.length > 0 ? (
          <ul style={styles.list}>
            {stats.pages.map((page, index) => (
              <li key={index} style={styles.listItem}>
                <code>{page.pathname}</code>: {page.count} hits
              </li>
            ))}
          </ul>
        ) : (
          <p>No page data yet.</p>
        )}
      </div>

      <div style={styles.section}>
        <h2>Top Referrers (Last 20)</h2>
        {stats.referrers && stats.referrers.length > 0 ? (
           <ul style={styles.list}>
            {stats.referrers.map((ref, index) => (
               <li key={index} style={styles.listItem}>
                {ref.referrer ? <a href={ref.referrer} target="_blank" rel="noopener noreferrer">{ref.referrer}</a> : <i>Direct/Unknown</i>}: {ref.count} hits
              </li>
            ))}
          </ul>
        ) : (
          <p>No referrer data yet.</p>
        )}
      </div>

       {/* Add more stats displays here as needed */}

    </div>
  );
}

// Basic inline styles
const styles = {
    section: {
        marginBottom: '30px',
        paddingBottom: '15px',
        borderBottom: '1px solid #eee',
    },
    list: {
        listStyle: 'none',
        paddingLeft: '0',
    },
    listItem: {
        marginBottom: '8px',
        fontSize: '0.9em',
    }
};