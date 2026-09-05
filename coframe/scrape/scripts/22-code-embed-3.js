document.addEventListener('DOMContentLoaded', function() {
		const form = document.querySelector('.footer .newsletter-form__form');
		const inputField = form.querySelector('.newsletter-form__text-field');
		const submitButton = form.querySelector('.newsletter-form__button');

		// Function to validate email format
		function isValidEmail(email) {
			const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			return emailPattern.test(email);
		}

		// Submit the form when the CTA button is clicked
		submitButton.addEventListener('click', function(event) {
			event.preventDefault();

			const email = inputField.value.trim();

			if (isValidEmail(email)) {
				form.requestSubmit(); // Trigger form submit if valid
			} else {
				alert('Please enter a valid email address.');
			}
		});

		// Add an event listener for keypress on the form
		form.addEventListener('keypress', function(event) {
			// Check if the key pressed is Enter (keyCode 13)
			if (event.key === 'Enter') {
				// Prevent the default behavior if necessary
				event.preventDefault();

				// Check if the element that triggered the event is an input
				if (event.target.tagName.toLowerCase() === 'input') {
					const email = inputField.value.trim();

					if (isValidEmail(email)) {
						form.requestSubmit(); // Trigger form submit if valid
					} else {
						alert('Please enter a valid email address.');
					}
				}
			}
		});
	});