const express   = require('express');
const utils     = require('../utils');
const config    = require('../config.json');
const base64url = require('base64url');
const router    = express.Router();
const database  = require('./db');

/* ---------- ROUTES START ---------- */
router.post('/register', (request, response) => {
  // Check submitted data and enter it into database
  if (!request.body || !request.body.username || !request.body.name) {
    response.json({
      status: 'failed',
      message: 'Request missing name or username field!'
    })

    return
  }

  const { username, name } = request.body

  if (database[username] && database[username].registered) {
    response.json({
      status: 'failed',
      message: `Username ${username} already exists!`
    })

    return
  }

  database[username] = {
    name,
    registered: false,
    id: utils.randomBase64URLBuffer(),
    authenticators: []
  }

  // Send back MakeCredentialRequest challenge
  const challengeMakeCred = utils.generateServerMakeCredRequest(username, name, database[username].id)
  challengeMakeCred.status = 'ok'

  console.log(`session is: ${JSON.stringify(request.session)}`)

  request.session.challenge = challengeMakeCred.challenge
  request.session.username = username

  response.json(challengeMakeCred)
})

/* ---------- ROUTES END ---------- */

module.exports = router;
