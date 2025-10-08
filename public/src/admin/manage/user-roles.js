define('admin/manage/user-roles', ['alerts', 'bootbox', 'autocomplete'], function (alerts, bootbox, autocomplete) {
	const UserRoles = {};
	UserRoles.init = function () {
		const userSearchEl = $('#user-search');
		const assignRoleBtn = $('#assign-role-btn');
		const roleSelect = $('#role-select');
		const createRoleInput = $('#create-role-input');
		const createRoleBtn = $('#create-role-btn');
		const deleteRoleSelect = $('#delete-role-select');
		const deleteRoleBtn = $('#delete-role-btn');
		let selectedUid = 0;
		function loadRoles() {
			socket.emit('admin.userRoles.getRoles', {}, function (err, data) {
				if (err) return alerts.error(err);
				roleSelect.empty().append('<option value="">No Role</option>');
				deleteRoleSelect.empty();
				data.roles.forEach(role => {
					roleSelect.append(`<option value="${role}">${role}</option>`);
					deleteRoleSelect.append(`<option value="${role}">${role}</option>`);
				});
			});
		}
		loadRoles();
		autocomplete.user(userSearchEl, function (ev, ui) {
			userSearchEl.val(ui.item.user.username);
			selectedUid = ui.item.user.uid;
			alerts.success(`Selected user: ${ui.item.user.username} (UID: ${selectedUid})`);
			return false;
		});
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
