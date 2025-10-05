'use strict';

const UserRoles = module.exports;

UserRoles.get = async function (req, res) {
	res.render('admin/manage/user-roles', {});
};
