const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    const token = req.header('x-auth-token');

    if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mlgs_secret_key_2024');
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token is not valid' });
    }
};
