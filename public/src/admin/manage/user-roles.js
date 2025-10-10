define('admin/manage/user-roles', ['alerts', 'bootbox', 'autocomplete', 'translator'], function (alerts, bootbox, autocomplete, translator) {

	const UserRoles = {};
	UserRoles.init = function () {
		const userSearchEl = $('#user-search');
		const assignRoleBtn = $('#assign-role-btn');
		const roleSelect = $('#role-select');
		const createRoleInput = $('#create-role-input');
		const createRoleBtn = $('#create-role-btn');
		const deleteRoleSelect = $('#delete-role-select');
		const deleteRoleBtn = $('#delete-role-btn');

		//toggle switch from user-role.tpl
		const toggleEl = $('#userRoleTagsEnabled');

		let selectedUid = 0;
		
		function loadRoles() {
			socket.emit('admin.userRoles.getRoles', {}, function (err, data) {
				if (err) {
					return alerts.error(err);
				}
				roleSelect.empty().append('<option value="">No Role</option>');
				deleteRoleSelect.empty();
				data.roles.forEach((role) => {
					roleSelect.append(`<option value="${role}">${role}</option>`);
					deleteRoleSelect.append(`<option value="${role}">${role}</option>`);
				});
			});
		}
		
		// disable all role-management controls when tagging is OFF
		function applyDisabledState(disabled) {
			userSearchEl.prop('disabled', disabled);
			assignRoleBtn.prop('disabled', disabled);
			roleSelect.prop('disabled', disabled);
			createRoleInput.prop('disabled', disabled);
			createRoleBtn.prop('disabled', disabled);
			deleteRoleSelect.prop('disabled', disabled);
			deleteRoleBtn.prop('disabled', disabled);

			const noteId = 'user-roles-disabled-note';
			$('#' + noteId).remove();
			if (disabled) {
				const $note = $('<div/>', {
					id: noteId,
					class: 'alert alert-warning mt-2',
				}).attr('data-i18n', 'admin/manage/user-roles:roles-disabled-warning');
				const container = toggleEl.closest('.form-check').length ? toggleEl.closest('.form-check') : toggleEl.parent();
				container.after($note);
				translator.translate($note[0]);
			}
		}

		function loadTaggingToggle() {
			return $.get(window.config.relative_path + '/api/config')
				.then((config) => {
					const enabled = String(config?.userRoleTagsEnabled ?? '1') === '1';
					if (toggleEl.length) {
						toggleEl.prop('checked', enabled);
					}
					app.config.userRoleTagsEnabled = enabled ? '1' : '0';
					applyDisabledState(!enabled);
				})
				.catch((err) => {
					applyDisabledState(false);
					alerts.error(err?.message || '[[admin/manage/user-roles:user-role-tags-load-failed]]');
				});
		}

		function saveTaggingToggle(checked) {
			socket.emit('admin.config.set', {
				key: 'userRoleTagsEnabled',
				value: checked ? '1' : '0',
			}, function (err) {
				if (err) {
					alerts.error('[[admin/manage/user-roles:user-role-tags-save-failed]]');
					toggleEl.prop('checked', !checked);
					return;
				}
				app.config.userRoleTagsEnabled = checked ? '1' : '0';
				alerts.success('[[admin/manage/user-roles:user-role-tags-saved]]');
				applyDisabledState(!checked);
			});
		}

		loadRoles();
		loadTaggingToggle();
		autocomplete.user(userSearchEl, function (ev, ui) {
			userSearchEl.val(ui.item.user.username);
			selectedUid = ui.item.user.uid;
			alerts.success(`Selected user: ${ui.item.user.username} (UID: ${selectedUid})`);
			return false;
		});

		if (toggleEl.length) {
			toggleEl.on('change', function () {
				const checked = $(this).is(':checked');
				saveTaggingToggle(checked);
			});
		}

		assignRoleBtn.on('click', function () {
			if (selectedUid === 0) return alerts.error('Please select a user first.');
			const role = roleSelect.val();
			socket.emit('admin.userRoles.assignRole', { uid: selectedUid, role: role }, function (err) {
				if (err) return alerts.error(err);
				alerts.success(`Role "${role}" assigned to user ${selectedUid}.`);
				selectedUid = 0;
				userSearchEl.val('');
			});
		});
		createRoleBtn.on('click', function () {
			const roleName = createRoleInput.val();
			if (!roleName) return alerts.error('Role name cannot be empty.');
			socket.emit('admin.userRoles.createRole', { roleName: roleName }, function (err) {
				if (err) return alerts.error(err);
				alerts.success(`Role "${roleName}" created.`);
				createRoleInput.val('');
				loadRoles();
			});
		});
		deleteRoleBtn.on('click', function () {
			const roleName = deleteRoleSelect.val();
			if (!roleName) return alerts.error('Please select a role to delete.');
			if (roleName === 'Student') return alerts.error('Cannot delete the default "Student" role.');
			bootbox.confirm(`Are you sure you want to delete the role "${roleName}"? Users with this role will be automatically assigned the "Student" role (unless they are administrators).`, function (confirm) {
				if (!confirm) return;
				socket.emit('admin.userRoles.deleteRole', { roleName: roleName }, function (err, data) {
					if (err) return alerts.error(err);
					const message = data?.updatedUsers !== undefined ? `Role "${roleName}" deleted. ${data.updatedUsers} users were updated to the default role.` : `Role "${roleName}" deleted.`;
					alerts.success(message);
					loadRoles();
				});
			});
		});
	};
	return UserRoles;
});
