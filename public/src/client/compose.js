'use strict';

define('forum/compose', ['hooks'], function (hooks) {
	const Compose = {};

	// Add anonymous toggle to composer
	function addAnonToggle(container) {
		const c = container && container.length ? container : $('.composer:visible').last();
		if (!c.length) return;

		const toolbar = c.find('ul.formatting-group').first();
		const form = c.closest('form').length ? c.closest('form') : c.find('form').first();

		// Add hidden field for anonymous flag
		let hidden = form.find('input[name="anonymous"]');
		if (!hidden.length) {
			hidden = $('<input type="hidden" name="anonymous" value="0" />').appendTo(form);
		}

		// Add anonymous toggle to toolbar
		if (toolbar.length && !toolbar.find('[data-anon-toggle]').length) {
			const li = $('<li data-anon-toggle class="d-flex align-items-center"></li>');
			const label = $('<label class="btn btn-sm btn-link text-reset position-relative m-0"></label>');
			const icon = $('<i class="fa fa-user-secret me-1"></i>');
			const cb = $('<input type="checkbox" class="me-1" />');
			const text = $('<span>Anonymous</span>');
			label.append(icon, cb, text);
			li.append(label);
			toolbar.append(li);

			cb.on('change', function () {
				hidden.val(this.checked ? '1' : '0');
			});
		}
	}

	// Hook into composer events
	hooks.on('action:composer.enhance', ({ container }) => addAnonToggle(container));
	hooks.on('action:composer.topic.new', () => setTimeout(addAnonToggle, 100));
	hooks.on('action:composer.post.new', () => setTimeout(addAnonToggle, 100));
	hooks.on('action:composer.post.edit', () => setTimeout(addAnonToggle, 100));

	// Intercept v3 API requests to add anonymous field
	const originalFetch = window.fetch;
	window.fetch = function(url, options) {
		if (url.includes('/api/v3/topics') && options && options.method === 'POST') {
			const form = $('.composer:visible form').first();
			if (form.length) {
				const anonymousField = form.find('input[name="anonymous"]');
				if (anonymousField.length && options.body) {
					try {
						const bodyData = JSON.parse(options.body);
						bodyData.anonymous = anonymousField.val() === '1';
						options.body = JSON.stringify(bodyData);
					} catch (e) {
						// Could not parse body, skip
					}
				}
			}
		}
		return originalFetch.call(this, url, options);
	};

	return Compose;
});
