//importing app
const express = require('express')
const app = express()

// setting .env variables
require('dotenv').config()

// firebase admin
var admin = require("firebase-admin");

var serviceAccount = require("./socialgoal-e4d3d-firebase-adminsdk-ada12-3d018848f6.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://socialgoal-e4d3d-default-rtdb.firebaseio.com"
});
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
const moderator=require('./models/moderators');
const { request } = require('express');

//authentication
const authenticate = async (idToken)=>{
  await admin.auth().verifyIdToken(idToken)
  .then((token) => {
    return token
  })
  .catch((err) => {
    return err
  });

}

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
  await authenticate(req.header('Authorization')).then((token)=>{
      const neworg= new organisation({
        UID: token.uid,
        username: req.body.username,
        organisation: req.body.organisation,
        email: token.email,
        photo: token.picture,
        website: req.body.website,
        number: req.body.number,
        logo: req.body.logo,
        tagline: req.body.tagline
      })
      const mod= new moderator({
        UID: token.uid,
        username: req.body.username,
        email: token.email,
        organisation: req.body.organisation,
        access: 'HEAD'
      })
       organisation.findOne(neworg).then((doc)=>{
        if(!doc){
          moderator.findOne(mod).then((doc)=>{
            if(!doc){
                mod.save().then(()=>{
                  neworg.save().then((doc)=>{
                    res.status(200).send(doc)
                }).catch((err)=>{
                  res.status(400).send(err)
                })
                }).catch((err)=>{
                res.status(400).send(err)
              })  
            }else{
              res.status(400).send('duplicate file in mod database')
            }
          }).then((err)=>{
            console.log(err)
            res.status(400).send(err)
          })
        }else{
          res.status(400).send('duplicate file in org database')
        }
      }).then((err)=>{
        console.log(err)
        res.status(400).send(err)
      })
  }).catch((err)=>{
    console.log(err)
    res.status(400).send('you are an imposter')
  })                                
})

app.post('/mod',async (req,res)=>{
  await authenticate(req.header('Authorization')).then((token)=>{
    const mod= new moderator({
      UID: token.uid,
      username: req.body.username,
      email: token.email,
      organisation: req.body.organisation,
      access: req.body.access
    })
    mod.save().then((doc)=>{
      res.status(200).send(doc)
    }).catch((err)=>{
      res.status(404).send(err)
    })
  }).catch((err)=>{
      console.log(err)
      res.status(403).send('you are an imposter')
  })
})

app.get('/login',async (req,res)=>{
  await authenticate(req.header('Authorization')).then((token)=>{
    moderator.findOne({UID:token.uid}).then((doc)=>{
      res.status(200).send(doc)
    }).catch((err)=>{
      console.log(err)
      res.status(400).send(err)
    })
  }).catch((err)=>{
    console.log(err)
    res.status(403).send('you are an imposter')
  })
})

//server up check
app.listen(port, () => {
  console.log('Server is up on port ' + port)
})