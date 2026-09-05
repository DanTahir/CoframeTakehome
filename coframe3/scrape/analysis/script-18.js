
	document.addEventListener('DOMContentLoaded', function() {
		const heroContainer = document.querySelector('.hero');
		const heroBg = document.querySelector('.hero__bg-elements');

		heroContainer.addEventListener('mousemove', function(e) {
			const rect = heroContainer.getBoundingClientRect();
			const relX = ((e.clientX - rect.left) / rect.width) * 100;
			const relY = ((e.clientY - rect.top) / rect.height) * 100;

			// Update CSS variables for mask position and show element
			heroBg.style.setProperty('--x', `${relX}%`);
			heroBg.style.setProperty('--y', `${relY}%`);
			heroBg.style.opacity = 1; // Fade in the element
		});

		heroContainer.addEventListener('mouseleave', function(e) {
			// Fade out the element only if leaving the hero container
			if (!e.relatedTarget || !heroContainer.contains(e.relatedTarget)) {
				heroBg.style.opacity = 0; // Fade out the element
			}
		});

		// Listen for the mouse leaving the window
		window.addEventListener('mouseout', function(e) {
			if (!e.relatedTarget && e.clientY <= 0) {
				// Mouse left the window
				heroBg.style.opacity = 0;
			}
		});
	});
