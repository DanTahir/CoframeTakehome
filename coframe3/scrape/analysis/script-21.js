
	document.addEventListener("DOMContentLoaded", () => {
		const elementsToFadeIn = document.querySelectorAll(".fade-in");

		const delayMapping = {
			's': '0.4s',
			'm': '0.8s',
			'l': '1.2s',
			'xl': '1.6s'
		};
    
    var observer;

		// Create the observer with a default threshold
		const createObserver = (threshold = 0.4) => {
			return new IntersectionObserver((entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						const delayKey = entry.target.getAttribute('data-fade-delay');
						const delay = delayMapping[delayKey] || '0s';
						entry.target.style.animationDelay = delay;
						entry.target.classList.add("faded-in");
            if (observer === null) return;
						observer.unobserve(entry.target); // Stop observing once animation is applied
					}
				});
			}, {
				threshold: threshold
			});
		};

		elementsToFadeIn.forEach((element) => {
			// Check if the element has a custom fade threshold, otherwise use the default one
			const threshold = parseFloat(element.getAttribute('data-fade-threshold')) || 0.4;
			observer = createObserver(threshold);
      if (observer === null) return;
			observer.observe(element);
		});
	});
