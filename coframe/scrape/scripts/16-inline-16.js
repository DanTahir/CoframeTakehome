// Coframe antiflicker: hide body until coframe:show event or 2s timeout
    const style = document.createElement('style');
    style.innerHTML = 'body { opacity: 0 !important; }';
    const cfhide = () => document.head.appendChild(style);
    const cfshow = () => style.remove();
    cfhide(); setTimeout(cfshow, 2000);
    document.addEventListener('coframe:show', cfshow);

    // Coframe queue setup:
    window.CFQ = window.CFQ || [];
    window.CFQ.push({config: {
        projectId: "66efa29715ea03a761f91b44",
    }});