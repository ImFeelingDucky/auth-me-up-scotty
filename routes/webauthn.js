const express   = require('express');
const utils     = require('../utils');
const config    = require('../config.json');
const base64url = require('base64url');
const router    = express.Router();
const database  = require('./db');

/* ---------- ROUTES START ---------- */

// Give user registration challenge
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

// Where clients post their completed challenges to
router.post('/response', (req, res) => {
  const webAuthnResponse = req.body
  // Weed out funky responses
  if (!webAuthnResponse) replyMalformedResponse(res)
  const { id, rawId, response, type } = webAuthnResponse
  if (!id || !rawId || !response || !type || type !== 'public-key') replyMalformedResponse(res)

  const clientData = JSON.parse(base64url.decode(webAuthnResponse.response.clientDataJSON))

  // Check if the challenge they completed was the challenge we asked them to complete
  if (clientData.challenge !== req.session.challenge) replyWithFail('Challenges don\'t match!')

  if (clientData.origin !== config.origin) replyWithFail('Origins don\'t match!')

  // The meaty part!
  // Check that they completed the challenge successfully

  let result
  if (webAuthnResponse.response.attestationObject != null) {
    // This means we need to create the credential in our database
    result = utils.verifyAuthenticatorAttestationResponse(webAuthnResponse)

    if (result.verified) {
      database[req.session.username].authenticators.push(result.authrInfo)
      database[req.session.username].registered = true
    }
  } else if (webAuthnResponse.response.authenticatorData != null) {
    // This is get assertion
    // Verify that they passed the login challenge
    result = utils.verifyAuthenticatorAssertionResponse(webauthnResp, database[req.session.username].authenticators)
  } else replyWithFail('Cannot determine type of response: both attestationObject and authenticatorData were nullish')

  if (result.verified) {
    req.session.loggedIn = true
    response.json({ status: 'ok', message: 'You are now logged in' })
  } else {
    replyWithFail('Can not authenticate signature!')
  }
})

// Give user login challenge
router.post('/login', (req, res) => {
  if (!req.body || !req.body.username) {
    replyWithFail('Request missing username field!')
    return
  }

  const { username } = req.body

  if (!database[username] || database[username].registered) {
    replyWithFail(`User ${username} does not exist!`)

    return
  }

  const getAssertion = utils.generateServerGetAssertion(database[username].authenticators)
  getAssertion.status = 'ok'

  req.session.challenge = getAssertion.challenge
  req.session.username = username

  res.json(getAssertion)
})

/* ---------- ROUTES END ---------- */

function replyMalformedResponse (res) {
  replyWithFail(res, 'Response malformed; mising one or more of id/rawId/response/type fields; or type is not \'public-key\'')
}

function replyWithFail (res, message) {
  res.json({
    message,
    status: 'failed'
  })
}

module.exports = router;
