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
var jwt = require('jsonwebtoken');

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
const User = require('./models/User');

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
  await admin.auth().createUser({
    email: req.body.email,
    emailverified: false,
    password: req.body.password
  }).then((user)=>{
    console.log(user)
      organisation.estimatedDocumentCount().then((num)=>{
      const neworg= new organisation({
        UID: user.uid,
        orgName: req.body.orgName,
        displayName: req.body.displayName,
        orgId: num||0,
        email: user.email,
        website: req.body.website,
        number: req.body.number,
        logo: req.body.logo,
        tagline: req.body.tagline
      })
      const mod= new moderator({
        UID: user.uid,
        email: user.email,
        orgId: num||0,
        access: 'HEAD'
      })
       organisation.findOne(neworg).then((doc)=>{
        if(!doc){
          moderator.findOne(mod).then((doc)=>{
            if(!doc){
                mod.save().then(()=>{
                  neworg.save().then((doc)=>{
                    const token = jwt.sign({doc}, 'sarvasva')
                    res.status(200).send({"jwt":token,"profile":doc})
                }).catch((err)=>{
                  admin.auth().deleteUser(user.uid).then(() => {console.log({"msg":"Successfully deleted user"})
                  res.status(400).send(err)}).catch((error) => {console.log(error);});
                })
                }).catch((err)=>{
                admin.auth().deleteUser(user.uid).then(() => {console.log({"msg":"Successfully deleted user"})
                res.status(400).send(err)})
                .catch((error) => {console.log(error);});
          
              })  
            }else{
              admin.auth().deleteUser(user.uid).then(() => {
                console.log({"msg":"Successfully deleted user"})
                res.status(400).send({"msg":"duplicate file in mod database"})
            }).catch((error) => {console.log(error);});
            }
          }).catch((err)=>{
            console.log(err)
            admin.auth().deleteUser(user.uid).then(() => {console.log({"msg":"Successfully deleted user"})
            res.status(400).send(err)})
            .catch((error) => {console.log(error);});
          })
        }else{
          admin.auth().deleteUser(user.uid).then(() => {
          console.log({"msg":"Successfully deleted user"})
          res.status(400).send({"msg":"duplicate file in org database"})}).
          catch((error) => {console.log(error);});
        }
      }).catch((err)=>{
        console.log(err)
        admin.auth().deleteUser(user.uid).then(() => {console.log('Successfully deleted user')
        res.status(400).send(err)})
        .catch((error) => {console.log(error);});
      })
  }).catch((err)=>{
    console.log(err)
    res.status(400).send({"msg":"cant get lastid"})
  })
}).catch((err)=>{
  console.log(err)
  res.status(400).send({"msg":"you are an imposter"})
})
})                          

app.post('/mod',async (req,res)=>{
  await admin.auth().createUser({
    email: req.body.email,
    emailverified: false,
    password: req.body.password
  }).then((user)=>{
    const mod= new moderator({
      UID: user.uid,
      email: user.email,
      orgId: req.body.orgId,
      access: req.body.access||'HEAD'
    })
    mod.save().then((doc)=>{
      var token = jwt.sign({doc}, 'sarvasva')
      res.status(200).send({"jwt":token,"profile":doc})
    }).catch((err)=>{
      admin.auth().deleteUser(user.uid).then(()=>{
        res.status(404).send(err)
      })
    })
  }).catch((err)=>{
    admin.auth().deleteUser(user.uid).then(()=>{
      console.log(err)
      res.status(403).send({"msg":"error adding to firebase"})
    })
  })
})

app.post('/add',async(req,res)=>{
  await admin.auth().verifyIdToken(req.header('Authorization')).then((token)=>{
      const newUser= new User({
        UID:token.uid,
        email:token.email,
        displayName:token.name,
        photo:token.picture,
        Level:req.body.level||'1'
      })
      newUser.save().then((doc)=>{
        var token = jwt.sign(doc, 'sarvasva')
        res.status(200).send({"jwt":token,"profile":doc})
      }).catch((err)=>{
        res.status(400).send(err)
      })
  }).catch((err)=>{
    res.status(400).send(err)
  })
})

app.get('/login',async (req,res)=>{
    try{
      const token = await jwt.verify(req.header('Authorization'),'sarvasva')
      console.log(token)
      moderator.findOne({UID:token.doc.UID}).then((doc)=>{
        res.status(200).send(doc)
      }).catch((err)=>{
        console.log(err)
        res.status(400).send(err)
      })
    } catch(err){
      console.log(err)
      res.status(403).send('you are an imposter')
    }
})

app.post('/orgname',async (req,res)=>{
  organisation.findOne({orgName:req.body.orgName}).then((doc)=>{
    if(doc){
      res.status(400).send('orgName taken')
    }else{
      res.status(200).send('okay')
    }
  })
})

//server up check
app.listen(port, () => {
  console.log('Server is up on port ' + port)
})