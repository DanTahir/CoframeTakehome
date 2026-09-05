
    var gtagScript = document.createElement('script');
    gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=AW-16699401710';
    document.head.appendChild(gtagScript);
    // Initialize the gtag after the script has been loaded
    gtagScript.onload = function() {
      gtag('js', new Date());
      gtag('config', 'AW-16699401710');
    };
