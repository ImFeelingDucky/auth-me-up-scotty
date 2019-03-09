'use strict';

// Handle registration form submission.
// Should get a Make Credentials challenge
$('#register').submit(async function (event) {
  event.preventDefault()

  const username = this.username.value;
  const name = this.name.value

  if (!username || !name) {
    alert('Username or name is missing or unsupported!')
    return
  }

  // Ask server for a challenge for this username.
  const response = await getMakeCredentialsChallenge({ username, name })

  // The server will return a challenge in JSON, but we need `challenge` and `user.id` as Uint8Array buffers. Let's convert.
  const publicKey = preformatMakeCredReq(response)

  const responseLogMessage = `Got MakeCredential Challenge from server, which we are about to use on navigator.credentials.create()
response: ${JSON.stringify(publicKey)}`
  alert(responseLogMessage)
  console.log(responseLogMessage)

  // It is now in the correct format, and we can ask the browser to create a new credential for this user
  const newCred = await navigator.credentials.create({ publicKey })

  const makeCredResponse = publicKeyCredentialToJSON(newCred)

  alert(`navigator credentials creation resulted in: ${JSON.stringify(makeCredResponse)}`)

  // Send the completed challenge back to the server
  const credResponse = await sendWebAuthnResponse(makeCredResponse)

  // We caught the condition where `response.status !== 'ok'` in `sendWebAuthnResponse, so this should be fine
  loadMainContainer()
})

// Handle login form submission
$('#login').submit(function (event) {
  event.preventDefault()

  const username = this.username.value

  if (!username) {
    alert('Username is missing!')
    return
  }

  getAssertionChallenge({username})
    .then(response => {
      const publicKey = preformatGetAssertReq(response)
      return navigator.credentials.get({ publicKey })
    })
    .then(response => {
      const getAssertionResponse = publicKeyCredentialToJSON(response)
      return sendWebAuthnResponse(getAssertionResponse)
    })
    .then(response => {
      if (response.status === 'ok') {
        response.message && alert('Successfully passed assertion challenge. Message from server: ${response.message}')
        loadMainContainer()
      } else {
        alert(`Error passing assertionChallenge: ${response.message}`)
      }
    })
    .catch(err => alert(`getAssertionChallenge failed :( with error: ${err}`))
})

const getMakeCredentialsChallenge = async formBody => {
  return fetch('/webauthn/register', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formBody)
  })
  .then(response => response.json())
  .then(response => {
    if (response.status !== 'ok') alert(`Server responded with error in getMakeCredentialsChallenge: ${response.message}`)

    return response
  })
    .catch(err => alert(`getMakeCredentialsChallenge failed :( with error: ${err}`))
}

const getAssertionChallenge = formBody => {
  return fetch('/webauthn/login', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formBody)
  })
  .then(response => response.json())
  .then(response => {
    if (response.status !== 'ok') alert(`Server responded with error in getAssertionChallenge: ${response.message}`)

    return response
  })
  .catch(err => alert(`getAssertionChallenge failed :( with error: ${err})`))
}

const sendWebAuthnResponse = body => {
  return fetch('/webauthn/response', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formBody)
  })
  .then(response => response.json())
  .then(response => {
    if (response.status !== 'ok') alert(`Server responded with error in sendWebAuthnResponse: ${response.message}`)

    return response
  })
  .catch(err => alert(`sendWebAuthnResponse failed :( with error: ${err})`))
}
