import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "wudassie-hymnal-super-secret-jwt-key-2024";

export const requireAuth = (req, res, next) => {
	const header = req.headers.authorization;
	if (!header || !header.startsWith("Bearer ")) {
		return res.status(401).json({ error: "Authentication required" });
	}

	const token = header.slice(7);
	try {
		const payload = jwt.verify(token, JWT_SECRET);
		req.user = payload;
		next();
	} catch {
		return res.status(401).json({ error: "Invalid or expired token" });
	}
};

export const requireRole = (...roles) => (req, res, next) => {
	requireAuth(req, res, () => {
		if (!req.user || !roles.includes(req.user.role)) {
			return res.status(403).json({ error: "You do not have permission to perform this action" });
		}
		next();
	});
};

export const requireAdmin = requireRole("admin");
