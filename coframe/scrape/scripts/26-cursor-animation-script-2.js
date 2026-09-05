/* ========================================
	   Configuration and Constants
	   ======================================== */

	const RANDOM_POSITION_RANGE_X = {
		MIN: 50,
		MAX: 300
	};
	const RANDOM_POSITION_RANGE_Y = {
		MIN: 50,
		MAX: 150
	};
	const FADE_OUT_DURATION = 200;

	var hasNuked = false;
	const timeoutMap = [];

	/* ========================================
	   Utility Functions
	   ======================================== */

	function getRandomInRange(min, max) {
		return Math.random() * (max - min) + min;
	}

	function getCssVariableDuration(element, variableName) {
		const rootStyles = getComputedStyle(element);
		const duration = parseFloat(rootStyles.getPropertyValue(variableName)) * 1000; // Convert from seconds to milliseconds
		return duration || 600; // Default to 600ms if not found
	}

	function setCustomTimeout(callback, delay, shouldNuke = false, ...args) {
		if (hasNuked && shouldNuke) return;
		const timeoutId = setTimeout(callback, delay, ...args);
		timeoutMap.push({
			timeoutId,
			shouldNuke
		});
		return timeoutId;
	}

	function delay(ms, shouldNuke) {
		if (hasNuked && shouldNuke) return;
		return new Promise(resolve => setCustomTimeout(resolve, ms, shouldNuke));
	}

	function clearTimeouts() {
		timeoutMap.forEach((item, index) => {
			if (item.shouldNuke) {
				clearTimeout(item.timeoutId);
				timeoutMap.splice(index, 1);
			}
		});
	}

	/* ========================================
	   Metric Logic
	   ======================================== */

	var stage = 0;

	function getRandomPercentage(stage) {
		const stages = [{
				min: 10,
				max: 15
			},
			{
				min: 16,
				max: 20
			},
			{
				min: 21,
				max: 25
			},
			{
				min: 20,
				max: 30
			}
		];

		const {
			min,
			max
		} = stages[Math.min(stage - 1, stages.length - 1)];

		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	async function updateMetric(container) {
		const isHero = container?.closest('.hero') !== null;
		if (hasNuked && isHero) return;

		const metric = container.querySelector('.metric');
		if (!metric) return;

		const metricNumber = metric.querySelector('.metric__number');
		const randomPercentage = getRandomPercentage(++stage);

		metricNumber.textContent = `${randomPercentage}%`;

		updateStyles(metric, {
			opacity: '0',
			top: '0',
			transition: 'none'
		});

		await delay(1, isHero);
		if (hasNuked && isHero) return;

		updateStyles(metric, {
			opacity: '1',
			top: '-42px',
			transition: 'opacity 400ms var(--easing-cubic-bezier), top 400ms var(--easing-cubic-bezier)'
		});

		await delay(2000, isHero);
		if (hasNuked && isHero) return;

		updateStyles(metric, {
			opacity: '0',
			top: '0'
		});
	}

	function updateStyles(element, styles = {}) {
		Object.entries(styles).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				element.style[key] = value;
			}
		});
	}

	/* ========================================
	   Cursor Cloning and Movement
	   ======================================== */

	function cloneCursor(originalCursor, horizontalSide, verticalSide, shouldReset, isHero) {
		if (hasNuked && isHero) return;

		const clonedCursor = originalCursor.cloneNode(true);

		if (isHero) {
			clonedCursor.setAttribute('data-should-reset', 'true');
		}

		positionCursor(clonedCursor, originalCursor.getBoundingClientRect());

		if (shouldReset) {
			resetCursor(clonedCursor);
		} else {
			randomizeCursorPosition(clonedCursor, horizontalSide, verticalSide);
		}

		const cursorContainer = document.querySelector('.cursor-container');

		cursorContainer.appendChild(clonedCursor);

		originalCursor.style.opacity = '0'; // Hide the original cursor

		return clonedCursor;
	}

	function positionCursor(clonedCursor, rect) {
		const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
		const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

		clonedCursor.style.position = 'absolute';
		clonedCursor.style.left = `${rect.left + scrollLeft}px`;
		clonedCursor.style.top = `${rect.top + scrollTop}px`;
	}

	function resetCursor(clonedCursor) {
		clonedCursor.style.opacity = '1';
		clonedCursor.style.transform = 'translate(0, 0)';
	}

	function getAllowedMovementRange(cursorRect, viewportSize, side, axis, minRange, maxRange) {
		let maxMovement = 0;

		if (axis === 'X') {
			if (side === 'left') {
				maxMovement = cursorRect.left;
			} else if (side === 'right') {
				maxMovement = viewportSize.width - cursorRect.right;
			}
		} else if (axis === 'Y') {
			if (side === 'top') {
				maxMovement = cursorRect.top;
			} else if (side === 'bottom') {
				maxMovement = viewportSize.height - cursorRect.bottom;
			}
		}

		// Ensure maxMovement is not negative
		maxMovement = Math.max(0, maxMovement);

		// Limit the maxMovement to maxRange
		maxMovement = Math.min(maxMovement, maxRange);

		// Now set minMovement to the lesser of minRange and maxMovement
		const minMovement = Math.min(minRange, maxMovement);

		return {
			minMovement,
			maxMovement
		};
	}

	function randomizeCursorPosition(clonedCursor, horizontalSide, verticalSide) {
		const cursorRect = clonedCursor.getBoundingClientRect();
		const viewportSize = {
			width: window.innerWidth,
			height: window.innerHeight
		};

		let moveX = 0,
			moveY = 0;

		if (horizontalSide) {
			const {
				minMovement,
				maxMovement
			} = getAllowedMovementRange(cursorRect, viewportSize, horizontalSide, 'X', RANDOM_POSITION_RANGE_X.MIN, RANDOM_POSITION_RANGE_X.MAX);
			if (maxMovement > 0) {
				const randomX = getRandomInRange(minMovement, maxMovement);
				moveX = horizontalSide === 'left' ? -randomX : randomX;
			}
		}

		if (verticalSide) {
			const {
				minMovement,
				maxMovement
			} = getAllowedMovementRange(cursorRect, viewportSize, verticalSide, 'Y', RANDOM_POSITION_RANGE_Y.MIN, RANDOM_POSITION_RANGE_Y.MAX);
			if (maxMovement > 0) {
				const randomY = getRandomInRange(minMovement, maxMovement);
				moveY = verticalSide === 'top' ? -randomY : randomY;
			}
		}

		clonedCursor.style.opacity = '0';
		clonedCursor.style.transform = `translate(${moveX}px, ${moveY}px)`;
	}

	function animateCursor(cursor, horizontalSide, verticalSide, shouldNuke) {
		if (hasNuked && shouldNuke) return;

		const {
			moveX,
			moveY
		} = calculateCursorMovement(cursor, horizontalSide, verticalSide);
		const distance = calculateDistance(moveX, moveY);
		const transitionDuration = distance * 2;

		setupCursorTransition(cursor, moveX, moveY, transitionDuration);

		cursor.style.transform = `translate(${moveX}px, ${moveY}px)`;
		cursor.style.opacity = '0';
	}

	function calculateCursorMovement(cursor, horizontalSide, verticalSide) {
		const cursorRect = cursor.getBoundingClientRect();
		const viewportSize = {
			width: window.innerWidth,
			height: window.innerHeight
		};

		let moveX = 0,
			moveY = 0;

		if (horizontalSide) {
			const {
				minMovement,
				maxMovement
			} = getAllowedMovementRange(cursorRect, viewportSize, horizontalSide, 'X', RANDOM_POSITION_RANGE_X.MIN, RANDOM_POSITION_RANGE_X.MAX);
			if (maxMovement > 0) {
				const randomX = getRandomInRange(minMovement, maxMovement);
				moveX = horizontalSide === 'left' ? -randomX : randomX;
			}
		}

		if (verticalSide) {
			const {
				minMovement,
				maxMovement
			} = getAllowedMovementRange(cursorRect, viewportSize, verticalSide, 'Y', RANDOM_POSITION_RANGE_Y.MIN, RANDOM_POSITION_RANGE_Y.MAX);
			if (maxMovement > 0) {
				const randomY = getRandomInRange(minMovement, maxMovement);
				moveY = verticalSide === 'top' ? -randomY : randomY;
			}
		}

		return {
			moveX,
			moveY
		};
	}

	function calculateDistance(x, y) {
		return Math.sqrt(x ** 2 + y ** 2);
	}

	function setupCursorTransition(cursor, moveX, moveY, duration) {
		const fadeOutDelay = duration - FADE_OUT_DURATION;
		cursor.style.transition = `transform ${duration}ms var(--easing-cubic-bezier), opacity ${FADE_OUT_DURATION}ms var(--easing-cubic-bezier) ${fadeOutDelay}ms`;
	}

	/* ========================================
	   Element Cloning and Animation
	   ======================================== */

	function cloneContent(originalContent, shouldNuke) {
		if (hasNuked && shouldNuke) return;

		const clonedContent = originalContent.cloneNode(true);

		if (shouldNuke) {
			clonedContent.setAttribute('data-should-reset', 'true');
		}

		clonedContent.style.position = 'absolute';
		clonedContent.style.opacity = '0';
		clonedContent.style.zIndex = '9999';
		clonedContent.style.transition = 'none';

		return clonedContent;
	}

	async function showElement(state, settings, originalContent, clonedContent, container) {
		showContainer(container);
		animateClonedContent(state, clonedContent);

		const isHero = container?.closest('.hero') !== null;

		await delay(parseInt(state.animationDuration) + parseInt(state.animationDelay), isHero);

		if (hasNuked && isHero) return;

		removeClonedContent(container, clonedContent, originalContent, isHero);

		const originalCursor = originalContent.querySelector('.cursor');
		const clonedCursor = cloneCursor(originalCursor, state.horizontalSide, state.verticalSide, true, isHero);

		await delay(200, isHero);
		if (hasNuked && isHero) return;

		hideOriginalContent(originalContent, state, isHero);

		updateMetric(container);

		animateCursor(clonedCursor, state.horizontalSide, state.verticalSide, isHero);

		// Get the cursor's transition duration dynamically
		const computedStyle = getComputedStyle(clonedCursor);
		const transitionDuration = parseFloat(computedStyle.transitionDuration) * 1000;

		// Wait for the cursor to finish animating
		await delay(transitionDuration + 4000, isHero);

		setUpRetypeAnimation(originalContent, container, settings, state);
	}

	function showContainer(container) {
		const isHero = container?.closest('.hero') !== null;
		if (hasNuked && isHero) return;

		container.style.opacity = '1';
	}

	function animateClonedContent(state, clonedContent, shouldNuke) {
		if (hasNuked && shouldNuke) return;

		if (!clonedContent) return;

		clonedContent.style.transition = state.horizontalStartDistance === '0px' && state.verticalStartDistance === '0px' ?
			`opacity ${state.animationDuration}ms var(--easing-cubic-bezier) ${state.animationDelay}ms` :
			`all ${state.animationDuration}ms var(--easing-cubic-bezier) ${state.animationDelay}ms`;

		clonedContent.style[state.horizontalSide] = '0';
		clonedContent.style[state.verticalSide] = '0';
		clonedContent.style.opacity = '1';
	}

	function removeClonedContent(container, clonedContent, originalContent, shouldNuke) {
		if (hasNuked && shouldNuke) return;

		if (!container || !clonedContent) return;

		container.removeChild(clonedContent);
		originalContent.style.opacity = '1';
	}

	function hideOriginalContent(originalContent, state, shouldNuke) {
		if (hasNuked && shouldNuke) return;

		if (!originalContent) return;

		originalContent.style.transition = '-webkit-backdrop-filter 200ms var(--easing-cubic-bezier), backdrop-filter 200ms var(--easing-cubic-bezier), border-color 200ms var(--easing-cubic-bezier)';
		originalContent.style.backdropFilter = 'blur(0px)';
		originalContent.style.webkitBackdropFilter = 'blur(0px)';
		originalContent.style.borderColor = 'transparent';

		originalContent.querySelectorAll('.tag').forEach(element => {
			element.style.transition = 'opacity 200ms var(--easing-cubic-bezier)';
			element.style.opacity = '0';
		});
	}

	/* ========================================
	   Animation Functions
	   ======================================== */

	function toggleTextAnimation(element, animationType) {
		if (animationType === 'in') {
			element.classList.remove('hidden', 'animate-out');
			element.classList.add('visible', 'animate-in');
		} else if (animationType === 'out') {
			element.classList.remove('visible', 'animate-in');
			element.classList.add('hidden', 'animate-out');
		}
	}

	async function fadeInText(retypeElement, fullText, shouldNuke) {
		const letterEffectDuration = getCssVariableDuration(document.documentElement, '--letter-effect-duration');

		// Split the words for animation
		const words = fullText.split(' ');
		retypeElement.innerHTML = ''; // Clear the element to add spans

		words.forEach((word, index) => {
			const span = document.createElement('span');
			span.classList.add('letter-effect', 'hidden');
			span.textContent = word;

			retypeElement.appendChild(span);

			if (index < words.length - 1) {
				const space = document.createTextNode(' ');
				retypeElement.appendChild(space);
			}
		});

		const spans = retypeElement.querySelectorAll('span');

		// Animate words in one by one with the same duration delay
		for (let i = 0; i < spans.length; i++) {
			toggleTextAnimation(spans[i], 'in');
			await delay(letterEffectDuration * 0.3, shouldNuke); // Delay between each word
		}
	}

	async function fadeOutText(retypeElement, shouldNuke) {
		const letterEffectDuration = getCssVariableDuration(document.documentElement, '--letter-effect-duration');

		const spans = retypeElement.querySelectorAll('span');

		// Animate words out one by one with the same duration delay
		for (let i = 0; i < spans.length; i++) {
			toggleTextAnimation(spans[i], 'out');
			await delay(letterEffectDuration * 0.3, shouldNuke); // Delay between each word, same as fadeIn
		}
	}

	async function typingAnimation(retypeElement, fullText, shouldNuke, useFadeEffect = false, callback) {
		if (hasNuked && shouldNuke) return;

		if (useFadeEffect) {
			// Get the letter effect duration from CSS
			const rootStyles = getComputedStyle(document.documentElement);

			await fadeInText(retypeElement, fullText, shouldNuke);

			// Trigger the callback after the fade-in animation completes
			if (callback) callback();
		} else {
			// Default word-by-word typing logic
			typeText(retypeElement, fullText, 0, 150, 3, shouldNuke, callback);
		}
	}

	function handleCursorAnimation(originalCursor, state, isHero) {
		if (!originalCursor || hasNuked && isHero) return;

		originalCursor.style.transition = 'none';
		originalCursor.style.transform = 'translate(0, 0)';
		originalCursor.style.opacity = '0';

		const clonedCursor = cloneCursor(originalCursor, state.horizontalSide, state.verticalSide, false, isHero);
		const {
			x: currentTranslateX,
			y: currentTranslateY
		} = getTranslateValues(clonedCursor);
		const clonedMoveX = -currentTranslateX;
		const clonedMoveY = -currentTranslateY;
		const distance = Math.sqrt(clonedMoveX ** 2 + clonedMoveY ** 2);
		const transitionDuration = distance * 2;

		clonedCursor.style.transition = `transform ${transitionDuration}ms var(--easing-cubic-bezier), opacity ${FADE_OUT_DURATION}ms var(--easing-cubic-bezier) ${transitionDuration - FADE_OUT_DURATION}ms`;
		clonedCursor.style.transform = 'translate(0, 0)';
		clonedCursor.style.opacity = '1';

		return clonedCursor;
	}

	function setUpRetypeAnimation(originalContent, container, settings, state) {
		currentVersion = 1; // Reset the version for each animation
		if (settings.getAttribute('data-animation-retype') !== 'true') return;
		retypeAnimation(originalContent, container, settings, state);
	}

	function typeText(element, text, index, speed, chunkSize, shouldNuke, callback) {
		if (hasNuked && shouldNuke) return;

		if (text && text.length > 0) {
			if (index < text.length) {
				const nextIndex = Math.min(index + chunkSize, text.length);
				const nextText = text.slice(0, nextIndex);

				// Update the element's content with the new text and append the cursor
				element.innerHTML = nextText + `<span class="thin-cursor" ${shouldNuke ? 'data-should-reset="true"' : ''}>|</span>`;

				setCustomTimeout(() => {
					if (hasNuked && shouldNuke) return;
					typeText(element, text, nextIndex, speed, chunkSize, shouldNuke, callback);
				}, speed, shouldNuke);
			} else if (callback) {
				element.innerHTML = text; // Finalize the text without the cursor
				callback();
			}
		}
	}

	async function retypeAnimation(originalContent, container, settings, state) {
		const isHero = container?.closest('.hero') !== null;
		if (hasNuked && isHero) return;

		const retypeElements = originalContent.querySelectorAll('[data-retype-text="true"]');
		const loopEnabled = settings.getAttribute('data-animation-retype-loop') === 'true'; // Check if loop is enabled

		// If the loop is enabled and all versions are displayed, reset to version 0
		if (currentVersion >= 3) {
			if (loopEnabled) {
				currentVersion = 0; // Reset the version to loop
			} else {
				return; // Exit if no looping
			}
		}

		const retypeElement = retypeElements[0];
		const fullText = retypeElement.getAttribute(`data-retype-version-${currentVersion + 1}`);

		if (!fullText || fullText.trim() === '') return;

		// If spans don't exist, wrap the current text in spans (without fading in)
		if (!retypeElement.querySelector('span')) {
			const words = retypeElement.textContent.split(' ');
			retypeElement.innerHTML = ''; // Clear the current text

			// Wrap each word in a span, without any fade-in
			words.forEach((word, index) => {
				const span = document.createElement('span');
				span.classList.add('letter-effect', 'visible'); // Ensure it's visible immediately
				span.textContent = word;
				retypeElement.appendChild(span);

				if (index < words.length - 1) {
					retypeElement.appendChild(document.createTextNode(' ')); // Add space between words
				}
			});
		}

		const originalCursor = originalContent.querySelector('.cursor');

		// Handle the cursor animation and reset for the next typing effect
		const clonedCursor = handleCursorAnimation(originalCursor, state, isHero);

		// Get the cursor's transition duration dynamically
		const computedStyle = getComputedStyle(clonedCursor);
		const transitionDuration = parseFloat(computedStyle.transitionDuration) * 1000;

		// Wait for the cursor to finish moving before fading out the current text
		await delay(transitionDuration, isHero);

		// Fade out the current text
		await fadeOutText(retypeElement, isHero);
		await delay(500, isHero); // Wait for out animation to complete

		// Typing animation for the new text
		await typingAnimation(retypeElement, fullText, isHero, true);

		// Update the version for the next text
		currentVersion++;

		resetRetypeAnimation(originalContent, settings, state, container, clonedCursor, retypeAnimation, isHero, settings); // Pass `settings`
	}

	async function resetRetypeAnimation(originalContent, settings, state, container, clonedCursor, retypeAnimation, isHero) {
		if (hasNuked && isHero) return;

		// Hide content-related styles before continuing to the next text
		originalContent.style.borderColor = 'transparent';
		originalContent.querySelectorAll('.tag').forEach(element => {
			element.style.opacity = '0';
		});

		// Move the cursor away before the next animation step
		animateCursor(clonedCursor, state.horizontalSide, state.verticalSide, isHero);

		// Get the cursor's transition duration dynamically
		const computedStyle = getComputedStyle(clonedCursor);
		const transitionDuration = parseFloat(computedStyle.transitionDuration) * 1000;

		// Wait for the cursor to finish moving
		await delay(transitionDuration, isHero);

		updateMetric(container);

		await delay(4000, isHero); // Wait before triggering the next text

		// Call the next retype animation (recursive step)
		retypeAnimation(originalContent, container, settings, state);
	}

	/* ========================================
	   Element Initialization and Resizing
	   ======================================== */

	document.addEventListener('DOMContentLoaded', () => {
		const cursorAnimationElements = document.querySelectorAll('.cursor-animation');

		// Set the opacity of each element to 0 on page load
		cursorAnimationElements.forEach(element => {
			element.style.opacity = '0';
		});
	});

	window.addEventListener('load', () => {
		const textElement = document.querySelector('h1[data-retype-text="true"]');

		if (textElement && !textElement.querySelector('span')) {
			const words = textElement.textContent.split(' ');
			textElement.innerHTML = ''; // Clear the current text

			// Wrap each word in a span, ensuring no layout shift
			words.forEach((word, index) => {
				const span = document.createElement('span');
				span.classList.add('letter-effect', 'visible'); // Ensure it's visible immediately
				span.textContent = word;
				textElement.appendChild(span);

				// Add space between words but avoid it after the last word
				if (index < words.length - 1) {
					textElement.appendChild(document.createTextNode(' ')); // Add space between words
				}
			});
		}

		document.querySelectorAll('.cursor-animation').forEach(container => {
			const settings = container.querySelector('.cursor-animation__settings');
			if (!settings) return;

			const contentElements = Array.from(container.children).filter(child => !child.classList.contains('cursor-animation__settings'));
			if (contentElements.length === 0) return;

			const isHero = container?.closest('.hero') !== null;

			const originalContent = contentElements[0];
			const clonedContent = cloneContent(originalContent, isHero);

			if (!clonedContent) return;

			const state = initializeState(settings, originalContent);

			setStartPosition(state, clonedContent);
			const originalRect = originalContent.getBoundingClientRect();
			clonedContent.style.width = `${originalRect.width}px`;
			clonedContent.style.height = `${originalRect.height}px`;

			originalContent.style.opacity = '0';
			container.appendChild(clonedContent);

			let animationTimeout;

			const observer = new IntersectionObserver(entries => {
				entries.forEach(entry => {
					if (entry.isIntersecting) {
						const isHero = container?.closest('.hero') !== null;

						animationTimeout = setCustomTimeout(() => {
							if (hasNuked && isHero) return;
							showElement(state, settings, originalContent, clonedContent, container);
						}, 50, isHero);
					}
				});
			}, {
				threshold: window.innerWidth >= 992 ? 0.8 : 0.5,
				rootMargin: '0px'
			});

			observer.observe(container);

			const handleResize = () => {
				clearTimeout(animationTimeout);
				resetElementOnResize(clonedContent, state, originalContent, container);
			};

			window.addEventListener('resize', handleResize);

			setCustomTimeout(() => {
				window.removeEventListener('resize', handleResize);
			}, parseInt(state.animationDuration) + parseInt(state.animationDelay));
		});
	});

	function initializeState(settings, originalContent) {
		const isMobile = window.innerWidth <= 991;
		const horizontalSide = settings.getAttribute(isMobile ? 'data-animation-horizontal-side-mobile' : 'data-animation-horizontal-side') || '';
		const verticalSide = settings.getAttribute(isMobile ? 'data-animation-vertical-side-mobile' : 'data-animation-vertical-side') || '';

		return {
			horizontalSide: horizontalSide || null,
			horizontalStartDistance: ensurePixelSuffix(settings.getAttribute('data-animation-horizontal-start-distance') || '-200'),
			verticalSide: verticalSide || null,
			verticalStartDistance: ensurePixelSuffix(settings.getAttribute('data-animation-vertical-start-distance') || '-200'),
			animationDelay: settings.getAttribute('data-animation-delay') || '0',
			animationDuration: settings.getAttribute('data-animation-duration') || '2000',
			originalBorderColor: getComputedStyle(originalContent).borderColor
		};
	}

	function ensurePixelSuffix(value) {
		return value.includes('px') ? value : `${value}px`;
	}

	function setStartPosition(state, clonedContent) {
		if (!clonedContent) return;

		if (state.horizontalStartDistance !== '0px') {
			clonedContent.style[state.horizontalSide] = state.horizontalStartDistance;
		}
		if (state.verticalStartDistance !== '0px') {
			clonedContent.style[state.verticalSide] = state.verticalStartDistance;
		}
	}

	async function resetElementOnResize(clonedContent, state, originalContent, container) {
		const isHero = container?.closest('.hero') !== null;
		if (hasNuked && isHero) return;

		if (clonedContent) {
			clonedContent.style.transition = 'none';
			clonedContent.style[state.horizontalSide || 'left'] = '0';
			clonedContent.style[state.verticalSide || 'top'] = '0';
			clonedContent.style.opacity = '1';

			container.removeChild(clonedContent);
		}

		originalContent.style.opacity = '1';

		await delay(300, isHero);
		if (hasNuked && isHero) return;

		resetOriginalContentStyle(originalContent);
		resetTagsAndCursors(originalContent, container, state);
	}

	function resetOriginalContentStyle(originalContent) {
		originalContent.style.transition = 'backdrop-filter 200ms var(--easing-cubic-bezier), border-color 200ms var(--easing-cubic-bezier)';
		originalContent.style.backdropFilter = 'blur(0px)';
		originalContent.style.borderColor = 'transparent';
	}

	function resetTagsAndCursors(originalContent, container, state) {
		const isHero = container?.closest('.hero') !== null;
		if (hasNuked && isHero) return;

		originalContent.querySelectorAll('.tag').forEach(element => {
			element.style.opacity = '0';
		});

		originalContent.querySelectorAll('.cursor').forEach(cursor => {
			const clonedCursor = cloneCursor(cursor, state.horizontalSide, state.verticalSide, false, isHero);
			animateCursor(clonedCursor, state.horizontalSide, state.verticalSide);
		});

		updateMetric(container);
	}

	/* ========================================
	   Text Typing
	   ======================================== */

	function typeText(element, text, index, speed, chunkSize, shouldNuke, callback) {
		if (hasNuked && shouldNuke) return;

		if (text && text.length > 0) {
			if (index < text.length) {
				const nextIndex = Math.min(index + chunkSize, text.length);
				const nextText = text.slice(0, nextIndex);

				// Update the element's content with the new text and append the cursor
				element.innerHTML = nextText + `<span class="thin-cursor" ${shouldNuke ? 'data-should-reset="true"' : ''}>|</span>`;

				setCustomTimeout(() => {
					if (hasNuked && shouldNuke) return;
					typeText(element, text, nextIndex, speed, chunkSize, shouldNuke, callback)
				}, speed, shouldNuke);
			} else if (callback) {
				element.innerHTML = text; // Finalize the text without the cursor
				callback();
			}
		}
	}

	function getTranslateValues(element) {
		const style = window.getComputedStyle(element);
		const matrix = new WebKitCSSMatrix(style.transform);
		return {
			x: matrix.m41,
			y: matrix.m42
		};
	}

	/* ========================================
	   Reset Hero Animations
	   ======================================== */

	window.addEventListener('scroll', () => {
		const heroElement = document.querySelector('.hero');
		const heroRect = heroElement.getBoundingClientRect();

		if (heroRect.bottom < 0) {
			resetHeroAnimations();
		}
	});

	function resetHeroAnimations() {
		if (hasNuked) return;

		hasNuked = true;

		clearTimeouts();

		const cursorAnimations = document.querySelectorAll('.hero .cursor-animation');

		cursorAnimations.forEach(container => {
			const contentElements = Array.from(container.children).filter(child => !child.classList.contains('cursor-animation__settings'));
			if (contentElements.length === 0) return;

			const originalContent = contentElements[0];
			const retypeElements = originalContent.querySelectorAll('[data-retype-text="true"]');
			const metricElement = container.querySelector('.metric');
			const clonedContents = document.querySelectorAll('[data-should-reset="true"]');

			retypeElements.forEach(retypeElement => {
				const finalTextVersion = retypeElement.getAttribute('data-retype-version-3') ||
					retypeElement.getAttribute('data-retype-version-2') ||
					retypeElement.getAttribute('data-retype-version-1');
				retypeElement.innerText = finalTextVersion || retypeElement.innerText;
			});

			originalContent.style.transition = 'none';
			originalContent.style.opacity = '1';
			originalContent.style.backdropFilter = 'blur(0px)';
			originalContent.style.webkitBackdropFilter = 'blur(0px)';
			originalContent.style.borderColor = 'transparent';

			if (metricElement) {
				metricElement.style.transition = 'none';
				metricElement.style.opacity = '0';
			}

			container.querySelectorAll('.tag').forEach(tag => {
				tag.style.transition = 'none';
				tag.style.opacity = '0';
			});

			clonedContents.forEach(clonedContent => {
				clonedContent.remove();
			});

			container.querySelectorAll('.cursor, .thin-cursor').forEach(cursor => {
				cursor.style.transition = 'none';
				cursor.style.opacity = '0';
			});

			setTimeout(() => {
				document.querySelectorAll('.hero .cursor-animation').forEach(element => {
					element.style.opacity = '1';
				});
			}, 100);
		});
	}