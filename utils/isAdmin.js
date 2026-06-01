
    function isAdmin(req, res, next) {
  if (!req.user || req.user.isAdmin !==true) {
    return res.status(403).send("Access Denied: Admin only");
  }
  next();
}

module.exports=isAdmin;