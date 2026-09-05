
	document.addEventListener('DOMContentLoaded', function() {
		// Constants
		const SCROLL_THRESHOLD = 50;

		// Elements
		const navClass = document.querySelector(".nav");
		const mobileMenu = document.querySelector(".w-nav-menu");

		// Elements to add/remove the .cc-dark class
		const elementsToDarken = [
			document.querySelector('nav'),
			document.querySelector('.nav-wrap'),
			document.querySelector('.nav__logo'),
			...document.querySelectorAll('.nav__dropdown-toggle'),
			...document.querySelectorAll('.nav__link'),
			...document.querySelectorAll('.nav-dropdown'),
			document.querySelector('.cta-invisible.cc-hero'),
			document.querySelector('.nav__menu-button__image')
		];

		// Store the original theme for reset
		const originalTheme = navClass.getAttribute("data-nav-theme");

		// Function to check if the mobile menu is open
		function isNavMenuOpen() {
			return mobileMenu.getAttribute("data-nav-menu-open") !== null;
		}

		// Function to apply or reset styles
		function applyStyles() {
			const scrollDistance = window.scrollY;

			if (isNavMenuOpen()) {
				// Remove .cc-dark and apply transparent theme when mobile menu is open
				elementsToDarken.forEach(el => {
					if (el && el.classList) el.classList.remove('cc-dark');
				});
				navClass.setAttribute("data-nav-theme", "transparent");
			} else {
				// Revert to original theme or apply .cc-dark if scrolled past threshold
				if (scrollDistance > SCROLL_THRESHOLD) {
					elementsToDarken.forEach(el => {
						if (el && el.classList) el.classList.add('cc-dark');
					});
				} else {
					resetStyles();
				}
				// Revert to original theme
				if (originalTheme) {
					navClass.setAttribute("data-nav-theme", originalTheme);
				} else {
					navClass.removeAttribute("data-nav-theme");
				}
			}

			// Control body scroll behavior
			document.body.style.overflowX = 'hidden';
			document.body.style.overflowY = isNavMenuOpen() ? 'hidden' : 'visible';
		}

		// Function to reset styles to initial state
		function resetStyles() {
			elementsToDarken.forEach(el => {
				if (el && el.classList) el.classList.remove('cc-dark');
			});
			document.body.style.overflowX = 'hidden';
			document.body.style.overflowY = 'visible';
		}

		// Observe changes to 'data-nav-menu-open' on mobile menu
		const observer = new MutationObserver(applyStyles);
		observer.observe(mobileMenu, {
			attributes: true,
			attributeFilter: ['data-nav-menu-open']
		});

		// Reapply styles on scroll and window resize
		window.addEventListener('scroll', applyStyles);
		window.addEventListener('resize', applyStyles);

		// Initial style application
		applyStyles();
	});
