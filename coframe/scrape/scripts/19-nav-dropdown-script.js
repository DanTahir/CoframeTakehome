function delay(ms) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}

	document.addEventListener("DOMContentLoaded", function() {
		const dropdownToggles = document.querySelectorAll('.nav__dropdown-toggle');
		const heroInnerContainerElement = document.querySelector('.hero__inner-container');
		const contentElement = document.querySelector('.content');
		const navElement = document.querySelector('.nav'); // Selecting the nav element for border changes

		let activeDropdown = null;

		// Function to check if the screen is mobile
		const isMobile = () => window.matchMedia('(max-width: 767px)').matches;

		// Function to get computed animation duration
		const getAnimationDuration = (element) => {
			const computedStyle = window.getComputedStyle(element);
			// Get the transition duration and convert to milliseconds
			const transitionDuration = parseFloat(computedStyle.transitionDuration) * 1000;
			const animationDuration = parseFloat(computedStyle.animationDuration) * 1000;
			return Math.max(transitionDuration, animationDuration); // Use whichever is longer
		};

		dropdownToggles.forEach(toggle => {
			const dropdownId = toggle.getAttribute('id');
			const dropdown = document.querySelector(`.nav-dropdown[id="${dropdownId}"]`);

			// Function to show the dropdown
			const showDropdown = async (dropdown) => {
				if (activeDropdown !== null && activeDropdown !== dropdown && !isMobile()) {
					await hideDropdown(activeDropdown);
				}

				toggle.classList.add('active');

				if (!isMobile()) {
					if (contentElement !== null) {
						contentElement.classList.add('blur');
					}

					if (heroInnerContainerElement !== null) {
						heroInnerContainerElement.classList.add('blur');
					}
				}

				navElement.style.borderColor = 'transparent';

				if (isMobile()) {
					dropdown.classList.add('mobile-visible');
					dropdown.classList.remove('visible');
				} else {
					dropdown.classList.add('visible');
					dropdown.classList.remove('mobile-visible');
				}

				activeDropdown = dropdown; // Track currently open dropdown
			};

			// Function to hide the dropdown
			const hideDropdown = async (dropdown) => {
				dropdown.classList.remove('mobile-visible');
				dropdown.classList.remove('visible');

				toggle.classList.remove('active');

				if (contentElement !== null) {
					contentElement.classList.remove('blur');
				}

				if (heroInnerContainerElement !== null) {
					heroInnerContainerElement.classList.remove('blur');
				}

				const animationDuration = getAnimationDuration(dropdown);

				if (!isMobile()) {
					await delay(animationDuration);
				}

				navElement.style.borderColor = '';
				activeDropdown = null; // Reset the active dropdown
			};

			if (isMobile()) {
				// On mobile, listen for clicks instead of hover
				toggle.addEventListener('click', async () => {
					if (dropdown.classList.contains('mobile-visible')) {
						await hideDropdown(dropdown);
					} else {
						await showDropdown(dropdown);
					}
				});
			} else {
				// Desktop hover behavior
				toggle.addEventListener('mouseenter', async () => {
					if (isMobile()) return;
					await showDropdown(dropdown);
				});

				toggle.addEventListener('mouseleave', async () => {
					if (isMobile()) return;

					if (!dropdown.matches(':hover')) {
						await hideDropdown(dropdown);
					}
				});

				dropdown.addEventListener('mouseleave', async () => {
					if (isMobile()) return;
          
					if (!toggle.matches(':hover')) {
						await hideDropdown(dropdown);
					}
				});
			}
		});

		function resetDropdown() {
			dropdownToggles.forEach(toggle => {
				const dropdownId = toggle.getAttribute('id');
				const dropdown = document.querySelector(`.nav-dropdown[id="${dropdownId}"]`);

				dropdown.classList.remove('mobile-visible');
				dropdown.classList.remove('visible');
      });
		}

		// Reapply event listeners on window resize (if switching between mobile/desktop)
		window.addEventListener('resize', () => {
			dropdownToggles.forEach(toggle => {
				const dropdownId = toggle.getAttribute('id');
				const dropdown = document.querySelector(`.nav-dropdown[id="${dropdownId}"]`);
				resetDropdown();
				activeDropdown = null; // Reset active dropdown on resize
			});
		});
	});