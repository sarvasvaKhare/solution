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
        orgDisplayName: req.body.orgDisplayName,
        orgId: num,
        email: user.email,
        website: req.body.website,
        number: req.body.number,
        logo: req.body.logo,
        tagline: req.body.tagline
      })
      const mod= new moderator({
        UID: user.uid,
        email: user.email,
        orgName: req.body.orgName,
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
                  admin.auth().deleteUser(user.uid).then(() => {console.log('Successfully deleted user')
                  res.status(400).send(err)}).catch((error) => {console.log('Error deleting user:', error);});
                  
                })
                }).catch((err)=>{
                admin.auth().deleteUser(user.uid).then(() => {console.log('Successfully deleted user')
                res.status(400).send(err)})
                .catch((error) => {console.log('Error deleting user:', error);});
          
              })  
            }else{
              admin.auth().deleteUser(user.uid).then(() => {
                console.log('Successfully deleted user')
                res.status(400).send('duplicate file in mod database')
            }).catch((error) => {console.log('Error deleting user:', error);});
            }
          }).catch((err)=>{
            console.log(err)
            admin.auth().deleteUser(user.uid).then(() => {console.log('Successfully deleted user')
            res.status(400).send(err)})
            .catch((error) => {console.log('Error deleting user:', error);});
          })
        }else{
          admin.auth().deleteUser(user.uid).then(() => {
          console.log('Successfully deleted user')
          res.status(400).send('duplicate file in org database')}).
          catch((error) => {console.log('Error deleting user:', error);});
        }
      }).catch((err)=>{
        console.log(err)
        admin.auth().deleteUser(user.uid).then(() => {console.log('Successfully deleted user')
        res.status(400).send(err)})
        .catch((error) => {console.log('Error deleting user:', error);});
      })
  }).catch((err)=>{
    console.log(err)
    res.status(400).send('cant get lastid')
  })
}).catch((err)=>{
  console.log(err)
  res.status(400).send('you are an imposter')
})
})                          

app.post('/mod',async (req,res)=>{
  await admin.auth().createUser({
    email: req.body.email,
    emailverified: false,
    password: req.body.passworde
  }).then((user)=>{
    const mod= new moderator({
      UID: user.uid,
      email: user.email,
      orgId: req.body.orgID,
      access: req.body.access||'HEAD'
    })
    mod.save().then((doc)=>{
      res.status(200).send(doc)
    }).catch((err)=>{
      res.status(404).send(err)
    })
  }).catch((err)=>{
      console.log(err)
      res.status(403).send('error adding to firebase')
  })
})
app.post('/add',async(req,res)=>{
  await admin.auth().verifyIdToken(req.header('Authorization')).then((token)=>{
      const newUser= new User({
        username:req.body.username,
        UID:token.uid,
        email:token.email,
        displayName:token.name,
        photo:token.picture,
        Level:req.body.level||'1'
      })
      newUser.save().then((doc)=>{
          res.status(200).send(doc)
      }).catch((err)=>{
        res.status(400).send(err)
      })
  }).catch((err)=>{
    res.status(400).send(err)
  })
})
app.get('/login',async (req,res)=>{
  if(req.body.org==true){
    await admin.auth().verifyIdToken(req.header('Authorization')).then((token)=>{
      moderator.findOne({UID:token.user_id}).then((doc)=>{
        res.status(200).send(doc)
      }).catch((err)=>{
        console.log(err)
        res.status(400).send(err)
      })
    }).catch((err)=>{
      console.log(err)
      res.status(403).send('you are an imposter')
    })
  }else{
  await admin.auth().verifyIdToken(req.header('Authorization')).then((token)=>{
      User.findOne({UID:token.uid}).then((doc)=>{
        res.status(200).send(doc)
      }).catch((err)=>{
        res.status(400).send(err)
      })
  }).catch((err)=>{
    console.log(err)
    res.status(403).send('you are an imposter')
  })
}
})

app.post('/user', async(req,res)=>{
  User.findOne({username:req.body.username}).then((doc)=>{
    if(doc){
      res.status(400).send('username taken')
    }else{
      res.status(200).send('okay')
    }
  }).catch((err)=>{
    res.status(400).send(err)
  })
})
app.post('/orgname',async (req,res)=>{
  organisation.findOne({orgName:req.body.orgName}).then((doc)=>{
    if(doc){
      res.status(400).send('username taken')
    }else{
      res.status(200).send('okay')
    }
  })
})
//server up check
app.listen(port, () => {
  console.log('Server is up on port ' + port)
})