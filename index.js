const express = require('express');
const cors = require('cors');

var whitelist = ['https://sws-pocket.web.app', 'https://sws-pocket.firebaseapp.com', /https://sws-pocket--staging-.+.web.app/i]
var corsOptionsDelegate = function (req, callback) {
  var corsOptions;
  if (whitelist.indexOf(req.header('Origin')) !== -1) {
    corsOptions = { origin: true } // reflect (enable) the requested origin in the CORS response
  } else {
    corsOptions = { origin: false } // disable CORS for this request
  }
  callback(null, corsOptions) // callback expects two parameters: error and options
}

// Route import
var swsPocketRoute = require('./sws-pocket/sws-pocket');
var lmmoaRoute = require('./lmm-oa/lmm-oa');

const app = express();

app.disable('x-powered-by');
app.use(cors(corsOptionsDelegate));
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
