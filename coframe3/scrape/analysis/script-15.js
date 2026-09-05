
  (function () {
        // Early exit for performance testing
        if (/cf_disable/.test(location.search)) return console.warn('[Coframe] Disabled via URL parameter');
        
        // Coframe config
        const config = {
          projectId: '66efa29715ea03a761f91b44',
          startTime: Date.now(),
          timeoutMs: 1000,
          currentUrl: window.location.href,
        };
    
        // Prevent duplicate installation
        const script_id = 'coframe-sdk-js';
        if (document.getElementById(script_id)) return console.warn('[Coframe] SDK already installed');
        
        // Coframe queue setup
        (window.CFQ = window.CFQ || []).push({ config });
    
        // Coframe antiflicker CSS
        const style = document.createElement('style');
        style.id = 'coframe-antiflicker';
        style.textContent = 
          ':root { --cf-show: 0;}' +
          'body { opacity: var(--cf-show) !important; transition: opacity 0.2s ease; }'
        
        function hide() { document.head.appendChild(style); }
        function show() {
          document.documentElement.style.setProperty('--cf-show', '1');
          style.parentNode && style.parentNode.removeChild(style);
        }
        hide(); setTimeout(show, config.timeoutMs);
        
        // Coframe SDK JS
        var edgeUrl = new URL('https://edge.cofra.me/cf.js');
        edgeUrl.searchParams.set('config', encodeURIComponent(JSON.stringify(config)));
    
        const script = document.createElement('script');
        script.id = script_id;
        script.async = true;
        script.src = edgeUrl.toString();
        script.onerror = () => { show(); console.error('[Coframe] SDK failed to load'); };
        document.head.appendChild(script);
    })();
