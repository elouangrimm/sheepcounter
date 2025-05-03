// lib/auth.js
// --- PASTE CODE FROM PREVIOUS ANSWER ---
import { Buffer } from 'buffer'; // Node.js Buffer

export function checkAuth(req, res) {
  const user = process.env.SHEEP_USER;
  const pass = process.env.SHEEP_PASSWORD;

  if (!user || !pass) {
      console.error("Auth credentials not set in environment variables.");
      // Avoid sending response here if used in getServerSideProps initially
      // Let the caller handle the response based on context
      return false; // Indicate failure
  }

  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  let login = '';
  let password = '';

  try {
      // Handle potential errors during base64 decoding
      [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
  } catch (e) {
      console.warn("Error decoding basic auth header:", e.message);
      // Treat as invalid credentials
  }


  if (login && password && login === user && password === pass) {
    return true; // Authenticated
  } else {
    // Only set headers and send response if 'res' is provided (API route context)
    if (res) {
        res.setHeader('WWW-Authenticate', 'Basic realm="SheepCounter"');
        res.status(401).send('Authentication required.');
    }
    return false; // Not authenticated
  }
}