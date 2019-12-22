var fs = require('fs');
const mongo = require('mongodb');
var bodyParser = require('body-parser')
var infobox = require('wiki-infobox');
var express = require('express')

const app = express()
const port = 8080
var distDir = __dirname + "/dist/";
var eventsDir =__dirname + "/src/assets/test-db/events/";
const mongoURI = 'mongodb://kindred:m4rv3l@ds257648.mlab.com:57648/kindred-marvel';
var eventsCollection;

mongo.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}, (err, client) => {
  if (err) {
    console.error(err)
    process.exit(0);
  }
  const db = client.db('kindred-marvel')
  eventsCollection = db.collection('events');
});
var jsonParser = bodyParser.json({limit:1024*1024*20, type:'application/json'});
// app.use(express.json());
app.use(jsonParser);
app.use(express.static(distDir));

app.get('/wiki/:title', getInfoBox);
app.post('/events/:id', saveEventData);
app.get('/events/:id',  getEventData);
app.get('/events',  getAllEventsData);

app.listen(port, () => console.log(`app running on port ${port}`));

// function saveEventData(req, res) {
//   const eventId = req.body.id;
//   const successMessage = `event ${eventId} data written to DB`;
//   console.log('writing event to DB:', eventId);
//   eventsCollection
//     .insertOne(req.body)
//     .then(item => res.status(201).json(successMessage))
//     .catch(err => res.status(503).json(err));
// }

function saveEventData(req, res) {
  const eventId = req.body.id;
  const successMessage = `event ${eventId} data written to DB`;
  console.log('writing event to DB:', eventId);
  eventsCollection
    .findOne({id: req.body.id})
    // .catch(err => eventsCollection
    //   .insertOne(req.body).then(item => res.status(201).json(successMessage))
    //   .then(console.log)
    //   .catch(console.error))
    .catch(console.error);
}

function getAllEventsData(req, res) {
  console.log('getting all events from DB');
  eventsCollection
    .findOne({etag:"c3e2543b4eb4e7a93ba8ca71295ddfdb7c13600b"})
    .then(events => res.status(201).json(events)) //.then(console.log)
    .catch(err => res.status(503).json(err)).catch(console.error);
}
function getEventData(req, res) {
  const id = req.params.id;
  eventsCollection
    .findOne({ id })
    .then(event => res.status(201).json(event)) //.then(console.log)
    .catch(err => res.status(503).json(err)).catch(console.error);
}

function getInfoBox(req, res) {
  infobox(req.params.title, 'en', (err, data) => {
    if (err) console.log(err);
    res.json(data);
  });
};

