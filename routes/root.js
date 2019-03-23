const express = require('express');
const router = express.Router();

router.get('/', async (request, response) => {
  response.status(200).send(`It's alive!`);
});

module.exports = router;
