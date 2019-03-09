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

  const responseLogMessage = `Got MakeCredential Challenge from server, which we are about to use on navigator.credentials.create()
response: ${JSON.stringify(response)}`
  alert(responseLogMessage)
  console.log(responseLogMessage)

  // The server will return a challenge in JSON, but we need `challenge` and `user.id` as Uint8Array buffers. Let's convert.
  const publicKey = preformatMakeCredReq(response)

  // It is now in the correct format, and we can ask the browser to create a new credential for this user
  const newCred = await navigator.credentials.create({ publicKey })

  alert(`navigator credentials creation resulted in: ${JSON.stringify(newCred)}`)

  const makeCredResponse = publicKeyCredentialToJSON(newCred)

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
    if (response.status !== 'ok') alert(`Server responded with error: ${response.message}`)

    return response
  })
}
