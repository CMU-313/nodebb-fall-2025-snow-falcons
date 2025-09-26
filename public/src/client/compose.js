'use strict';


define('forum/compose', ['hooks'], function (hooks) {
	const Compose = {};

	// inserts anonymous toggle into user interface
	function addAnonToggle(container) {
		// find the composer container
		const c = container && container.length ? container : $('.composer:visible').last();
		if (!c.length) return;

		// place the toggle on the same toolbar that other features lie on
		const t = c.find('ul.formatting-group').first();
		const form = c.closest('form').length ? c.closest('form') : c.find('form').first();

		// if checkbox is ticked
		let hidden = form.find('input[name="anonymous"]');
		if (!hidden.length) {
			hidden = $('<input type="hidden" name="anonymous" value="0" />').appendTo(form);
		}

		// only add the toggle if the toolbar exists & there isnt already an anonymous toggle
		if (t.length && !t.find('[data-anon-toggle]').length) {
			const li = $('<li data-anon-toggle class="d-flex align-items-center"></li>');
			const label = $('<label class="btn btn-sm btn-link text-reset position-relative m-0"></label>');
			const icon = $('<i class="fa fa-user-secret me-1"></i>');
			const cb = $('<input type="checkbox" class="me-1" />');
			const text = $('<span>Anonymous</span>');
			label.append(icon, cb, text);
			li.append(label);
			t.append(li);

			cb.on('change', function () {
				hidden.val(this.checked ? '1' : '0');
			});
		}
	}

	// "enhance" the composer container by adding the anonymous toggle
	hooks.on('action:composer.enhance', ({ container }) => addAnonToggle(container));

	// also run on the composer open/edit events
	// this ensures that the code has the regardless of odd refresh events
	hooks.on('action:composer.topic.new', () => [0, 50, 150, 300].forEach(d => setTimeout(addAnonToggle, d)));
	hooks.on('action:composer.post.new', () => [0, 50, 150, 300].forEach(d => setTimeout(addAnonToggle, d)));
	hooks.on('action:composer.post.edit', () => [0, 50, 150, 300].forEach(d => setTimeout(addAnonToggle, d)));

	// fallback. ensures that the toggle is added regardless
	hooks.on('action:ajaxify.end', () => addAnonToggle());


	return Compose;
});
