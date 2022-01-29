const getServerVersion = () => {
	return process.env.npm_package_version;
};

module.exports = {
	getServerVersion,
};
