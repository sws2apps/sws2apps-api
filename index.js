const express = require('express');
const cors = require('cors');
const limiter = require('express-rate-limit');
var favicon = require('serve-favicon');
var path = require('path');

var whitelist = ['https://sws-pocket.web.app', 'https://sws-pocket.firebaseapp.com', 'https://lmm-oa-sws.web.app', 'https://lmm-oa-sws.firebaseapp.com']
var corsOptionsDelegate = function (req, callback) {
  var corsOptions;
  if (process.env.NODE_ENV === 'production') {
    const reqOrigin = req.header('Origin');
    if (reqOrigin) {
      if (whitelist.indexOf(reqOrigin) !== -1) {
        corsOptions = { origin: true } // reflect (enable) the requested origin in the CORS response
      } else {
        // allow alpha & beta release
        if (reqOrigin.startsWith("https://lmm-oa-sws--alpha") && reqOrigin.endsWith(".web.app")) {
          corsOptions = { origin: true }
        } else if (reqOrigin.startsWith("https://lmm-oa-sws--beta") && reqOrigin.endsWith(".web.app")) {
          corsOptions = { origin: true }
        } else if (reqOrigin.startsWith("https://sws-pocket--alpha") && reqOrigin.endsWith(".web.app")) {
          corsOptions = { origin: true }
        } else if (reqOrigin.startsWith("https://sws-pocket--beta") && reqOrigin.endsWith(".web.app")) {
          corsOptions = { origin: true }
        } else {
          corsOptions = { origin: false } // disable CORS for this request
        }
      }
    } else {
      corsOptions = { origin: false }
    }
  } else {
    corsOptions = { origin: true }; // allow cors during dev
  }
  
  callback(null, corsOptions) // callback expects two parameters: error and options
}

// Route import
var appsRoute = require('./routes/apps');
var swsPocketRoute = require('./routes/sws-pocket');

const app = express();

app.disable('x-powered-by');

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))

app.use(cors(corsOptionsDelegate));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(limiter({
  windowMs: 20000,
  max: 1,
  message: JSON.stringify({
    message: 'Too many requests, please try again later.'
  })
}))

app.use('/api', appsRoute)
app.use('/api/sws-pocket', swsPocketRoute)

const port = process.env.PORT || 8000;

app.get('/', (req, res) => {
    res.send('SWS Apps API services')
})

// Handling invalid routes
app.get('*', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.status(404).send(JSON.stringify({message: 'You are trying to access an invalid endpoint.'}));
})

app.post('*', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.status(404).send(JSON.stringify({message: 'You are trying to access an invalid endpoint.'}));
})

// Handling any other errors
app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.send(JSON.stringify({message: error.message}))
})

app.listen(port, () => {
  console.log(`server up and running`)
})
