// public/sheep.js
// --- PASTE CODE FROM PREVIOUS ANSWER ---
(function() {
    // Prevents the script from running multiple times if accidentally included twice
    if (window.sheepCounterTracked) {
      return;
    }
    window.sheepCounterTracked = true;
  
    try {
        // Find the script tag itself to get the server URL dynamically
        var scriptTag = document.currentScript;
        if (!scriptTag) {
            // Fallback for older browsers or specific loading scenarios
            var scripts = document.getElementsByTagName('script');
            scriptTag = scripts[scripts.length - 1];
        }
  
        if (!scriptTag || !scriptTag.src) {
            console.error("SheepCounter: Could not find its own script tag reliably.");
            return;
        }
  
        // Derive the API endpoint URL from the script's src attribute
        // Assumes src is like "https://your-sheepcounter.vercel.app/sheep.js"
        // It replaces '/sheep.js' at the end with '/api/track'
        var trackerScriptUrl = scriptTag.src;
        var baseApiUrl = trackerScriptUrl.substring(0, trackerScriptUrl.lastIndexOf('/')); // Get URL without filename
        var apiUrl = baseApiUrl + '/api/track';
  
  
        // Basic check if the derived URL seems valid
        if (!apiUrl.startsWith('http') || !apiUrl.includes('/api/track')) {
             console.error("SheepCounter: Could not determine a valid API endpoint URL from script tag src:", trackerScriptUrl);
             return;
        }
  
        var data = {
          hostname: window.location.hostname,
          // Send full path including query params & hash? Usually just pathname.
          pathname: window.location.pathname, // Consider window.location.href for full URL
          referrer: document.referrer || null,
          user_agent: navigator.userAgent || null,
          screen_width: window.screen.width || null,
          screen_height: window.screen.height || null,
          language: navigator.language || navigator.userLanguage || null, // Broader language support
          // Add more data points if needed, e.g., connection type
          // connection: navigator.connection ? navigator.connection.effectiveType : null,
        };
  
        // Use navigator.sendBeacon if available (more reliable for sending data on page unload)
        if (navigator.sendBeacon) {
          var blob = new Blob([JSON.stringify(data)], { type: 'application/json; charset=UTF-8' });
          var sent = navigator.sendBeacon(apiUrl, blob);
          // Optional: log success/failure only during development
          // if (!sent) { console.warn("SheepCounter: sendBeacon returned false."); }
          // else { console.log("SheepCounter: Beacon sent to", apiUrl); }
        } else {
          // Fallback to fetch for older browsers
          fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json; charset=UTF-8',
            },
            body: JSON.stringify(data),
            keepalive: true // Important hint for browsers to try keeping request alive on unload
          }).then(response => {
            // Optional: Check response status only during development
            // if (!response.ok) { console.warn("SheepCounter: Fetch response not OK:", response.status); }
            // else { console.log("SheepCounter: Fetch sent to", apiUrl); }
          }).catch(function(error) {
            console.error('SheepCounter: Error sending tracking data via fetch:', error);
          });
        }
    } catch (e) {
        // Catch any unexpected errors during script execution
        console.error("SheepCounter: Unexpected error in tracking script:", e);
    }
  })();