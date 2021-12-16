const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser')

var whitelist = ['https://sws-pocket.web.app', 'https://sws-pocket.firebaseapp.com', 'https://lmm-oa-sws.web.app', 'https://lmm-oa-sws.firebaseapp.com']
var corsOptionsDelegate = function (req, callback) {
  var corsOptions;
  const reqOrigin = req.header('Origin');
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
  callback(null, corsOptions) // callback expects two parameters: error and options
}

// Route import
var swsPocketRoute = require('./sws-pocket/sws-pocket');
var lmmoaRoute = require('./lmm-oa/lmm-oa');

const app = express();

app.disable('x-powered-by');

if (process.env.NODE_ENV === 'production') {
  app.use(cors(corsOptionsDelegate));
} else {
  app.use(cors({ origin: true })); // allow cors during dev
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/api/sws-pocket', swsPocketRoute)
app.use('/api/lmm-oa', lmmoaRoute)

const port = process.env.PORT || 8000;

app.get('/', (req, res) => {
    res.send('Hello World!')
})

// Handling invalid routes
app.get('*', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.status(404).send(JSON.stringify({message: 'Hamarino ny adiresy ampiasainao fa misy diso'}));
})

// Handling any other errors
app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.send(JSON.stringify({message: error.message}))
})

app.listen(port, () => {
  console.log(`server up and running`)
})
