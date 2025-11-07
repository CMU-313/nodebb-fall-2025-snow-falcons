'use strict';

const widgetsController = module.exports;
const admin = require('../../widgets/admin');

widgetsController.get = async function (req, res) {
	const data = await admin.get();
	const url = (req.originalUrl || req.url || req.path || '').toString();
	if (res.locals.isAPI || url.includes('api')) {
		return res.json(data);
	}
	res.render('admin/extend/widgets', data);
};
