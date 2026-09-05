(function() {
		const container = document.getElementById('cursor-container');

		function syncContainerSize() {
			const w = Math.max(
				document.body.scrollWidth,
				document.documentElement.scrollWidth
			);
			const h = Math.max(
				document.body.scrollHeight,
				document.documentElement.scrollHeight
			);
			container.style.width = w + 'px';
			container.style.height = h + 'px';
		}

		// Initial sizing
		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', syncContainerSize, {
				once: true
			});
		} else {
			syncContainerSize();
		}
		window.addEventListener('load', syncContainerSize, {
			once: true
		});
		window.addEventListener('resize', syncContainerSize);

		// Observe for content or layout changes
		const ro = new ResizeObserver(syncContainerSize);
		ro.observe(document.body);
		ro.observe(document.documentElement);

		const mo = new MutationObserver(() => {
			Promise.resolve().then(syncContainerSize);
		});
		mo.observe(document.documentElement, {
			childList: true,
			subtree: true,
			attributes: true,
			characterData: true
		});
	})();