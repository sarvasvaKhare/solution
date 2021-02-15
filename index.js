//importing app
const express = require('express')
const app = express()

// setting .env variables
require('dotenv').config()

// swagger docs
const swaggerJsDocs = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
const swaggerOptions = {
  swaggerDefinition: {
    info: {
      title: 'my memes api',
      description: 'memes fetch',
      contact: {
        name: 'sarvasva khare'
      },
      servers: ['http://localhost:8081']
    }
  },
  apis: ['index.js']
}

const swaggerDocs = swaggerJsDocs(swaggerOptions);
app.use('/api-docs',swaggerUi.serve,swaggerUi.setup(swaggerDocs));
//setting up cors for inter-domain requests
var cors = require('cors')
app.use(cors())

//setting up body parser to parse req into body
var bodyParser = require('body-parser')
app.use(bodyParser.json());

//port as enviroment variable
const port = process.env.PORT || 8080

//mongodb
const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://sarvasva:9839352215@cluster0.dzaft.mongodb.net/users?retryWrites=true&w=majority', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
  console.log('database is connected!')
});


// model schema
const organisation=require('./models/organisation')
const moderator=require('./models/moderators')

//index routes
/**
 *@swagger
 *  /memes:
 *  get:
 *    description: Use to fetch latest 100 memes
 *    responses:
 *      '200':
 *        description: A succesfull response with memes
 *      '404':
 *        description: A failed response with no memes :(
 */
app.post('/org', async (req, res) => {                                  
  const neworg= new organisation({
    username: req.body.username,
    organisation: req.body.organisation,
    email: req.body.email,
    password:req.body.password,
    website: req.body.website,
    number: req.body.number,
    logo: req.body.logo,
    tagline: req.body.tagline
  })
  const mod= new moderator({
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
    organisation: req.body.organisation,
    access: req.body.access
  })
  await mod.save().catch((err)=>{
    res.status(400).send(err)
  })
  await neworg.save().then((doc)=>{
      res.status(200).send(doc)
  }).catch((err)=>{
    res.status(400).send(err)
  })
})

app.post('/mod',async (req,res)=>{
  const mod= new moderator({
    username: req.body.username,
    email: req.body.email,
    password: req.body.password,
    organisation: req.body.organisation,
    access: req.body.access
  })
  await mod.save().then((doc)=>{
    res.status(200).send(doc)
  }).catch((err)=>{
    res.status(404).send(err)
  })
})

app.get('/login',async (req,res)=>{
  await moderator.findOne({username:req.body.username,password:req.body.password},'organisation email').exec()
  .then((doc)=>{
   res.status(200).send(doc)
  }).catch((err)=>{
    res.status(404).send(err)
  })
})

//server up check
app.listen(port, () => {
  console.log('Server is up on port ' + port)
})