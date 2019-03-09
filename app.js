const express       = require('express');
const bodyParser    = require('body-parser');

const session = require('express-session')

const path          = require('path');
const crypto        = require('crypto');

const config        = require('./config.json');
const defaultroutes = require('./routes/default');
const passwordauth  = require('./routes/password');
const webauthnauth  = require('./routes/webauthn.js');

const app = express();

app.use(bodyParser.json());

/* ----- session ----- */
// app.use(cookieSession({
//   name: 'session',
//   keys: [crypto.randomBytes(32).toString('hex')],

//   // Cookie Options
//   maxAge: 24 * 60 * 60 * 1000 // 24 hours
// }))
// app.use(cookieParser())

app.use(session({
  name: 'maximum-damage-corp',
  resave: false,
  rolling: true,
  saveUninitialized: true,
  secret: crypto.randomBytes(32).toString('hex'),
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000 // one week
  },
  // TODO: Change to real store
  store: new session.MemoryStore()
}))

/* ----- serve static ----- */
app.use(express.static(path.join(__dirname, 'static')));

app.use('/', defaultroutes)
app.use('/password', passwordauth)
app.use('/webauthn', webauthnauth)

const port = process.env.PORT || config.port || 3000;
app.listen(port);
console.log(`Started app on port ${port}`);

module.exports = app;
