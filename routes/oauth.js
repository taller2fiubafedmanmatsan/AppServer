const express = require('express');
const passport = require('passport');
require('../passport')(passport);
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('config');

router.route('/signin/facebook').
    post(passport.authenticate('facebookToken', {session: false}),
        async (req, res)=>
        {
          const token = await signToken(req.user);
          res.status(200).send(token);
        });

async function signToken(user) {
  return jwt.sign({_id: user._id}, config.jwt_key, {expiresIn: 86400});
}


module.exports = router;
