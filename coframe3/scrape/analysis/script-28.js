
	const originalScale = 0.85;
	const originalOpacity = 0.25;

	var swiper1;

	document.addEventListener('DOMContentLoaded', function() {
		swiper1 = new Swiper('.swiper.swiper-variants', {
			loop: false,
			centeredSlides: false,
			slidesPerView: 'auto',
			slidesOffsetBefore: 32,
			slidesOffsetAfter: 32,
			keyboard: {
				enabled: true,
			},
			mousewheel: {
				forceToAxis: true,
				releaseOnEdges: true,
				sensitivity: 1,
				thresholdDelta: 20,
			},
			breakpoints: {
				992: {
					spaceBetween: 24,
				},
				768: {
					spaceBetween: 24,
				},
				479: {
					spaceBetween: 16,
				},
				320: {
					spaceBetween: 16,
				},
			},
		});

		// Select the element with the class 'swiper-wrapper.cc-case-studies'
		const caseStudiesWrapper = document.querySelector('.swiper-wrapper.cc-case-studies');

		// Get all child elements of the selected element
		const caseStudyItems = caseStudiesWrapper.children;

		// Loop through each child element and append a duplicate
		Array.from(caseStudyItems).forEach((item) => {
			const clone = item.cloneNode(true); // Create a duplicate
			caseStudiesWrapper.appendChild(clone); // Append the duplicate
		});

		var swiper2 = new Swiper('.swiper.swiper-case-studies', {
			initialSlide: 0,
			slidesPerView: 2,
			watchSlidesProgress: true,
			loop: true,
			speed: 400,
			keyboard: {
				enabled: true,
			},
			freeMode: false,
			shortSwipes: false,
			longSwipes: false,
			centeredSlides: true,
			slideToClickedSlide: true,
			loop: true,
			spaceBetween: 0,
			grabCursor: true,
			effect: "creative",
			creativeEffect: {
				limitProgress: 2,
				prev: {
					opacity: originalOpacity,
					scale: originalScale,
					translate: ["-100%", 0, 0],
				},
				next: {
					opacity: originalOpacity,
					scale: originalScale,
					translate: ["100%", 0, 0],
				},
			},
			breakpoints: {
				992: {
					slidesPerView: 2,
					mousewheel: {
						forceToAxis: true,
						releaseOnEdges: true,
						sensitivity: 2,
						thresholdDelta: 5,
					},
					resistanceRatio: 0.2,
					touchRatio: 1.5,
					longSwipesRatio: 0.2,
				},
				768: {
					slidesPerView: 1.5,
					mousewheel: {
						forceToAxis: true,
						releaseOnEdges: true,
						sensitivity: 2,
						thresholdDelta: 5,
					},
					resistanceRatio: 0.3,
					touchRatio: 1.5,
					longSwipesRatio: 0.3,
				},
				479: {
					slidesPerView: 1.125,
					mousewheel: {
						forceToAxis: true,
						releaseOnEdges: true,
						sensitivity: 0.5,
						thresholdDelta: 5,
					},
					resistanceRatio: 0.5,
					touchRatio: 1.5,
					longSwipesRatio: 0.3,
				},
				320: {
					slidesPerView: 1.125,
					mousewheel: {
						forceToAxis: true,
						releaseOnEdges: true,
						sensitivity: 0.5,
						thresholdDelta: 5,
					},
					resistanceRatio: 0.5,
					touchRatio: 1.5,
					longSwipesRatio: 0.3,
				},
			},
			on: {
				setTranslate: function(swiper) {
					swiper.slides.forEach((slide) => {
						const slideElement = slide.querySelector('.swiper-slide.cc-case-studies');
						const elements = slide.querySelectorAll('*:not(.case-study-card__bg-image)');

						if (elements) {
							// Calculate progress manually
							let progress = slide.progress;
							progress = Math.min(Math.max(progress, -1), 1); // Ensure progress is between -1 and 1

							const raw = Math.sign(slide.progress) * Math.min(Math.abs(slide.progress), 1);

							// Calculate and apply the opacity and background color based on progress
							const opacity = 1 - Math.abs(raw);
							const bgOpacity = 1 - 0.7 * Math.abs(raw);

							elements
								.forEach(el => {
									el.style.opacity = opacity;
								});

							slide.style.backgroundColor = `rgba(0, 0, 0, ${bgOpacity})`;
						}
					});
				}
			}
		});

		swiper2.slideToLoop(0, 0);

		var swiper3 = new Swiper('.introduction.swiper', {
			keyboard: {
				enabled: true,
			},
			mousewheel: {
				forceToAxis: true,
				releaseOnEdges: true,
				sensitivity: 1,
				thresholdDelta: 20,
			},
			breakpoints: {
				992: {
					slidesPerView: '3',
					spaceBetween: 96,
					centeredSlides: false,
					allowTouchMove: true,
				},
				768: {
					slidesPerView: '2',
					spaceBetween: 48,
					centeredSlides: true,
					allowTouchMove: true,
				},
				479: {
					slidesPerView: '1.5',
					spaceBetween: 32,
					centeredSlides: true,
					allowTouchMove: true,
				},
				320: {
					slidesPerView: '1.5',
					spaceBetween: 32,
					centeredSlides: true,
					allowTouchMove: true,
				},
			},
			wrapperClass: 'introduction__steps'
		});

		const tabs = document.querySelectorAll('.introduction__step'); // Tab buttons
		const tabContents = document.querySelectorAll('.introduction .w-tab-content .w-tab-pane'); // Tab content panes
		const swiperTabsContainer = document.querySelector('.introduction.swiper .swiper-wrapper'); // Swiper tabs container

		// Function to set the active tab and show the relevant content
		function setActiveTab(index) {
			// Update the tabs
			tabs.forEach((tab, i) => {
				if (i === index) {
					tab.classList.add('w--current'); // Mark as active
				} else {
					tab.classList.remove('w--current');
				}
			});

			// Show the correct tab content
			tabContents.forEach((content, i) => {
				if (i === index) {
					content.classList.add('w--tab-active'); // Webflow-specific active class
				} else {
					content.classList.remove('w--tab-active');
				}
			});
		}

		let swiper3AutoplayStarted = false;

		// Intersection Observer to detect when Swiper3 comes into view
		const swiper3Element = document.querySelector('.introduction.swiper');

		const observerOptions = {
			root: null, // Use viewport as root
			threshold: 0.5 // Trigger when 50% of Swiper3 is visible
		};

		const swiper3Observer = new IntersectionObserver((entries) => {
			entries.forEach(entry => {
				if (entry.isIntersecting && !swiper3AutoplayStarted) {
					// Swiper3 is in view, start autoplay and animations
					startAutoplay();
					swiper3AutoplayStarted = true;
				}
			});
		}, observerOptions);

		swiper3Observer.observe(swiper3Element);

		// Custom autoplay functionality
		let autoplayTimeout;
		const autoplayDelay = 4000; // 4 seconds
		let remainingTime = autoplayDelay;
		let autoplayStart;
		let currentTab = 0;

		// Add event listener for clicks on the tabs
		tabs.forEach((tab, index) => {
			tab.addEventListener('click', function() {
				setActiveTab(index);
				swiper3.slideTo(index, 300);
				currentTab = index;

				// Reset autoplay when a tab is clicked
				clearTimeout(autoplayTimeout);
				remainingTime = autoplayDelay;
				startAutoplay();
			});
		});

		// Automatically update tabs and content when swiping to a different slide
		swiper3.on('slideChange', function() {
			const activeIndex = swiper3.realIndex;
			// Update the tab content and active tab
			currentTab = activeIndex;
			setActiveTab(activeIndex);
		});

		// Function to detect when the mobile menu opens or closes
		function detectMobileMenuState() {
			const mobileNavMenu = document.querySelector('.w-nav-menu');

			// Create a MutationObserver to watch for changes in the attributes of the mobile menu
			const observer = new MutationObserver((mutations) => {
				mutations.forEach((mutation) => {
					if (mutation.attributeName === 'data-nav-menu-open') {
						const isMobileNavOpen = mobileNavMenu.hasAttribute('data-nav-menu-open');

						if (isMobileNavOpen) {
							// Pause autoplay when the mobile menu is open
							stopAutoplay();
						} else {
							// Resume autoplay when the mobile menu is closed
							startAutoplay();
						}
					}
				});
			});

			// Observe the attributes of the mobile menu element
			observer.observe(mobileNavMenu, {
				attributes: true
			});
		}

		// Call the function to start observing mobile menu state
		detectMobileMenuState();

		function startAutoplay() {
			// Remove the 'cc-animation-paused' class if present
			tabs.forEach(tab => {
				tab.classList.remove('cc-animation-paused');
			});

			// Clear the existing timeout
			clearTimeout(autoplayTimeout);

			// Record the start time
			autoplayStart = Date.now();

			// Start the timeout
			autoplayTimeout = setTimeout(() => {
				currentTab = (currentTab + 1) % tabs.length; // Move to the next tab
				tabs[currentTab].click(); // Simulate a click on the next tab

				// Reset remainingTime after action
				remainingTime = autoplayDelay;

				// Restart autoplay
				startAutoplay();
			}, remainingTime);
		}

		function stopAutoplay() {
			// Add the 'cc-animation-paused' class if needed
			tabs.forEach(tab => {
				tab.classList.add('cc-animation-paused');
			});

			// Calculate elapsed time
			const elapsed = Date.now() - autoplayStart;

			// Update remainingTime with clamping to prevent negative values
			remainingTime = Math.max(remainingTime - elapsed, 0);

			// Clear the existing timeout
			clearTimeout(autoplayTimeout);
		}

		// Pause autoplay when hovering over the swiper tabs container
		swiperTabsContainer.addEventListener('mouseenter', stopAutoplay);

		// Resume autoplay when leaving the swiper tabs container
		swiperTabsContainer.addEventListener('mouseleave', startAutoplay);
	});
