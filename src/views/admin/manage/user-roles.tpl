<div class="d-flex flex-column gap-2 px-lg-4">
	<div class="d-flex border-bottom py-2 m-0 sticky-top acp-page-main-header align-items-center justify-content-between flex-wrap gap-2">
		<div class="">
			<h4 class="fw-bold tracking-tight mb-0">User Roles</h4>
			<div id="user-role-tag-settings" class="mb-4">
				<h5 class="fw-bold tracking-tight settings-header mb-3">[[admin/settings/tags:user-role-tags]]</h5>

				<div class="form-check form-switch mb-3">
					<input
						class="form-check-input"
						type="checkbox"
						id="userRoleTagsEnabled"
						data-field="userRoleTagsEnabled"
					/>
					<label class="form-check-label" for="userRoleTagsEnabled">
						[[admin/settings/tags:enable-user-role-tags]]
					</label>
				</div>

				<p class="form-text">
					[[admin/settings/tags:enable-user-role-tags-help]]
				</p>
			</div>
		</div>
	</div>

	<div class="card">
		<div class="card-header">Assign Role to User</div>
		<div class="card-body">
			<div class="mb-3">
				<label for="user-search" class="form-label">Search User</label>
				<input type="text" class="form-control" id="user-search" placeholder="Start typing username...">
			</div>
			<div class="mb-3">
				<label for="role-select" class="form-label">Select Role</label>
				<select class="form-select" id="role-select">
					<!-- Roles will be loaded here by JS -->
				</select>
			</div>
			<button class="btn btn-primary" id="assign-role-btn">Assign Role</button>
		</div>
	</div>

	<div class="card">
		<div class="card-header">Create New Role</div>
		<div class="card-body">
			<div class="mb-3">
				<label for="create-role-input" class="form-label">New Role Name</label>
				<input type="text" class="form-control" id="create-role-input" placeholder="e.g., Mentor">
			</div>
			<button class="btn btn-success" id="create-role-btn">Create Role</button>
		</div>
	</div>

	<div class="card">
		<div class="card-header">Delete Role</div>
		<div class="card-body">
			<div class="mb-3">
				<label for="delete-role-select" class="form-label">Select Role to Delete</label>
				<select class="form-select" id="delete-role-select">
					<!-- Roles will be loaded here by JS -->
				</select>
			</div>
			<button class="btn btn-danger" id="delete-role-btn">Delete Role</button>
		</div>
	</div>
</div>
