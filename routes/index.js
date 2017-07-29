var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function (req, res, next) {
    var cookie = JSON.parse(req.sessionStore.sessions[req.sessionID]);
    console.log(cookie.cas_user);
    console.log(req.session.ticket);
    res.render('index');
});

module.exports = router;
