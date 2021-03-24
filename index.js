//importing app
const express = require('express')
const app = express()

// setting .env variables
require('dotenv').config()
function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1) ) + min;
}

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
var generator = require('generate-password');

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
const OrgFeed = require('./models/OrgFeed');
const pay = require('./models/Pay');
const Coupon = require('./models/Coupons');
const applicant = require('./models/applicants');
const paymentinfo=require('./models/paymentinfo')
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
        photo: req.body.photo,
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
                mod.save().then((file)=>{
                  neworg.save().then((doc)=>{
                    const token = jwt.sign({"modprofile":file,"orgprofile":doc}, 'sarvasva')
                    res.status(200).send({"jwt":token,"modprofile":file,"orgprofile":doc})
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
    res.status(400).send({"err":err})
  })
}).catch((err)=>{
  console.log(err)
  res.status(400).send({"err":err})
})
})                          

app.post('/mod',async (req,res)=>{
  const token =jwt.verify(req.header('Authorization'),'sarvasva')
  console.log(token)
  var password =  generator.generate({
    length: 8,
    numbers: true
  })
  await admin.auth().createUser({
    email: req.body.email,
    emailverified: false,
    password: password
  }).then((user)=>{
    const mod= new moderator({
      UID: user.uid,
      email: user.email,
      orgId: token.orgprofile.orgId,
      access: req.body.access||'MOD'
    })
    mod.save().then(async (doc)=>{
      const file = await organisation.findOne({orgId:doc.orgId})
        const token = jwt.sign({"modprofile":doc,"orgprofile":file}, 'sarvasva')
        res.status(200).send({"jwt":token,"modprofile":doc,"orgprofile":file})
    }).catch((err)=>{
      admin.auth().deleteUser(user.uid).then(()=>{
        res.status(404).send({"err":err})
      })
    })
  }).catch((err)=>{
        res.status(400).send({"err":err})
  })
})

app.post('/add',async(req,res)=>{
  await admin.auth().verifyIdToken(req.header('Authorization')).then(async (token)=>{
       const doc= await User.findOne({UID:token.uid})
      if(!doc){
      const newUser= new User({
        UID:token.uid,
        email:token.email,
        displayName:token.name,
        photo:token.picture,
        Level:req.body.level||1,
        points:0
      })
      newUser.save().then((doc)=>{
        var token = jwt.sign({doc}, 'sarvasva')
        console.log(doc)
        res.status(200).send({"jwt":token,"profile":doc})
      }).catch((err)=>{
        res.status(400).send(err)
      })
    }else{
      var token = jwt.sign({doc}, 'sarvasva')
      res.status(200).send({"jwt":token,"profile":doc})
    }
    }).catch((err)=>{
      res.status(400).send({"err":err})
    })
})

app.get('/login',async (req,res)=>{
    try{
      const token = await admin.auth().verifyIdToken(req.header('Authorization'))
      console.log(token)
      const doc = await moderator.findOne({UID:token.uid})
        const file = await organisation.findOne({orgId:doc.orgId})
        const ticket = jwt.sign({"modprofile":doc,"orgprofile":file}, 'sarvasva')
        res.status(200).send({"jwt":ticket,"modprofile":doc,"orgprofile":file})
    } catch(err){
      console.log(err)
      res.status(403).send({"err":err})
    }
})

app.post('/orgname',async (req,res)=>{
  organisation.findOne({orgName:req.body.orgName}).then((doc)=>{
    if(doc){
      res.status(200).send({"taken":true})
    }else{
      res.status(200).send({"taken":false})
    }
  })
})

app.get('/orgfeed', async (req,res)=>{
  const ticket= jwt.verify(req.header('Authorization'),'sarvasva')
  const posts= await OrgFeed.find({orgId:ticket.orgprofile.orgId}).sort({created_at:-1})
  console.log(posts)
  res.status(200).send(posts)  
})

app.post('/orgfeed', async (req,res)=>{
  const ticket= jwt.verify(req.header('Authorization'),'sarvasva')
  console.log(ticket.orgprofile.orgId)
  const post = new OrgFeed({
    Type: req.body.Type,
    photoUrl: req.body.photoUrl,
    targetAmount: req.body.targetAmount,
    reachedAmount: req.body.reachedAmount,
    Title: req.body.Title,
    Caption: req.body.Caption,
    detailedInfo: req.body.detailedInfo,
    blogLink: req.body.blogLink,
    Shoutout: req.body.Shoutout,
    orgId: ticket.orgprofile.orgId,
    likes: req.body.likes,
    orgName: ticket.orgprofile.orgName,
    liked: false
  })
  console.log(post)
  post.save().then((doc)=>{
    res.status(200).send(doc)
  }).catch((err)=>{
    res.status(400).send({"err":err})
  })
})

app.post('/updatepro',async (req,res)=>{
  const ticket= jwt.verify(req.header('Authorization'),'sarvasva')
  const ID=ticket.orgprofile.orgId
  if(ID){
    const file = await organisation.updateOne({orgId:ID},{
      orgName: req.body.orgName,
      displayName: req.body.displayName,
      website:req.body.website,
      number: req.body.number,
      photo:req.body.photo,
      tagline:req.body.tagline
    })
    res.status(200).send(file)
  }
  
})

app.post('/like', async (req,res)=>{
  const ticket= jwt.verify(req.header('Authorization'),'sarvasva')
  var ID=''
  if(ticket.doc){
    ID=ticket.doc.UID
  }
  if(ticket.modprofile){
    ID=ticket.modprofile.UID
  }
  var conditions = {
    _id:req.body.id,
    "likes.userId": {
      $ne: ID
    }}
    var update = {
      $addToSet: { likes: { userId:ID, amount: req.body.amount||0} }
  }
  OrgFeed.findOneAndUpdate(conditions,update,{new: true}).then((doc)=>{
    if(doc==null){
      res.status(400).send({"err":"already liked"})
    }else{
    res.status(200).send({"success":true,"id" : doc._id})
    }
   }).catch((err)=>{
    res.status(400).send({"err":err})
   })
})

app.post('/follow', async (req,res)=>{
  const ticket= jwt.verify(req.header('Authorization'),'sarvasva')
  if(ticket.orgprofile==undefined){
    var conditions = {
      "UID":ticket.doc.UID,
      "following.orgId": {
        $ne: req.body.orgId
      }}
      var update = {
        $addToSet: { following: { orgId: req.body.orgId, orgName: req.body.orgName } }
    }
    
    User.findOneAndUpdate(conditions,update,{new: true}).then((doc)=>{
      if(doc==null){
        res.status(200).send({"msg":"already followed"})
      }else{
      res.status(200).send(doc)
      }
    }).catch((err)=>{
     res.status(400).send({"err":err})
    })
  }else{
    var conditions = {
      "orgId":ticket.orgprofile.orgId,
      "following.orgId": {
        $ne: req.body.orgId
      }}
    var update = {
        $addToSet: { following: { orgId: req.body.orgId, orgName: req.body.orgName } }
    }
    organisation.findOneAndUpdate(conditions,update,{new: true}).then((doc)=>{
      if(doc==null){
        res.status(400).send({"msg":"already followed"})
      }else{
      res.status(200).send({"success":true})
      }
    }).catch((err)=>{
     res.status(400).send({"err":err})
    })
  }
})

app.post('/unlike', async(req,res)=>{
  const ticket= jwt.verify(req.header('Authorization'),'sarvasva')
  var ID=''
  if(ticket.doc){
    ID=ticket.doc.UID
  }
  if(ticket.modprofile){
    ID=ticket.modprofile.UID
  }
  var conditions = {
    _id:req.body.id
  }
    var update = {
      $pull: { likes: { userId:ID, amount: req.body.amount||0 } }
  }
  OrgFeed.findOneAndUpdate(conditions,update,{new: true}).then((doc)=>{
    if(doc==null){
      res.status(400).send({"err":"already not liked"})
    }else{
      console.log(doc)
    res.status(200).send({"success":true,"id":doc._id})
    }
   }).catch((err)=>{
    res.status(400).send({"err":err})
   })
})

app.post('/unfollow', async (req,res)=>{
  const ticket= jwt.verify(req.header('Authorization'),'sarvasva')
  if(ticket.orgprofile==undefined){
    var conditions = {
      "UID":ticket.doc.UID
    }
      var update = {
        $pull: { following: { orgId: req.body.orgId, orgName: req.body.orgName } }
    }
    
    User.findOneAndUpdate(conditions,update,{new: true}).then((doc)=>{
      if(doc==null){
        res.status(400).send({"msg":"already followed"})
      }else{
      res.status(200).send({"success":true})
      }
    }).catch((err)=>{
     res.status(400).send({"err":err})
    })
  }else{
    var conditions = {
      "orgId":ticket.orgprofile.orgId
    }
    var update = {
        $pull: { following: { orgId: req.body.orgId, orgName: req.body.orgName } }
    }
    organisation.findOneAndUpdate(conditions,update,{new: true}).then((doc)=>{
      if(doc==null){
        res.status(200).send({"msg":"already followed"})
      }else{
      res.status(200).send(doc)
      }
    }).catch((err)=>{
     res.status(400).send({"err":err})
    })
  }
})

app.delete('/orgfeed', async (req,res)=>{
  const ticket= jwt.verify(req.header('Authorization'),'sarvasva')
  const posts= await OrgFeed.findOneAndDelete({orgId:ticket.orgprofile.orgId})
  if(posts==null){
    res.status(404).send({"msg":"not found"})
  }else{
    res.status(200).send({"success":true})
  }
})

// GET endpoint to return search results
app.get('/search', async (req, res) => {
  var search_string = req.body.search_query
  var searchKey = new RegExp(search_string, 'i')
  var found_orgs = await organisation.find({ displayName: searchKey})
  var found_users = await User.find({ displayName: searchKey})
  if ((!found_orgs.length)&&(!found_users.length)){
    res.status(200).send({ "msg": "No Search Results!" })
  }
  else{
  console.log({"orgs":found_orgs,"users":found_users})
    res.status(200).send({"orgs":found_orgs,"users":found_users})
  }
})

app.get('/feed',async (req,res)=>{
  if(req.header('Authorization')){
  const ticket= jwt.verify(req.header('Authorization'),'sarvasva')
  var posts=[]
  var ID='';

  if(ticket.orgprofile){
    ID=ticket.orgprofile.UID
    var list=[];
    var newdata= await organisation.findOne({orgId:ticket.orgprofile.orgId})
    if(newdata.following.length){
    for(var i=0;i<newdata.following.length;i++){
      list.push(newdata.following[i].orgId)
    }
    posts = await OrgFeed.find({orgId: {$in:list}}).sort({created_at:-1})
  }else{
    posts = await OrgFeed.find({}).sort({created_at:-1})
  }
  }else{
    var list=[];
    ID=ticket.doc.UID
    
    var newdata= await User.findOne({email:ticket.doc.email})
    if(newdata.following.length){
    for(var i=0;i<newdata.following.length;i++){
      list.push(newdata.following[i].orgId)
    }
    posts =  await OrgFeed.find({orgId: {$in:list}}).sort({created_at:-1})
  }else{
    posts = await OrgFeed.find({}).sort({created_at:-1})
  }
  }
  for(var i=0;i<posts.length;i++){
    var n=posts[i].likes.length
    for(var j=0;j<n;j++){
        if(posts[i].likes[j].userId==ID){
          posts[i].liked=true
          break
        }
    }
  }
  res.status(200).send(posts)
}else{
  posts = await OrgFeed.find({}).sort({created_at:-1})
  console.log(posts[0])
  res.status(200).send(posts)
}
})

app.get('/profile', async (req,res)=>{
  const ticket= jwt.verify(req.header('Authorization'),'sarvasva')
  const ID=ticket.orgprofile.orgId
  if(ID){
    const file = await organisation.findOne({orgId:ID})
    res.status(200).send(file)
  }
})

app.get('/mods',async (req,res)=>{
  const ticket= jwt.verify(req.header('Authorization'),'sarvasva')
  const ID=ticket.orgprofile.orgId
  const file = await moderator.find({orgId:ID})
  res.status(200).send(file)
})

app.post('/payment',async (req,res)=>{
  const ticket= jwt.verify(req.header('Authorization'),'sarvasva')
  const newpayment = new pay({
    UID: ticket.doc.UID,
    OrgId: req.body.orgId,
    amount: req.body.amount,
    id: req.body.id
  })
  newpayment.save().then(async ()=>{
    var prob= true;
    var getCP=null;
    if(getRndInteger(1,4)%4==0){
      prob=false
    }
    if(prob){
      getCP= await Coupon.findOne({Quantity:{$ne:0}})
      console.log(getCP)
      getCP.Quantity=getCP.Quantity-1
    }
    const doc = await User.findOne({email:ticket.doc.email})
    console.log(doc)
    doc.points=doc.points+5
    if((doc.points/doc.level)>=10){
        doc.level=doc.level+1
    }
    doc.save().then(()=>{
      res.status(200).send({"success":true,"coupon":getCP})
  }).catch((err)=>{
    console.log(err)
    res.status(400).send({"msg":"points error"})
    })
  }).catch((err)=>{
    console.log(err)
    res.status(400).send({"msg":"error in payment addition"})
  })
})

app.post('/application', async (req,res)=>{
  const ticket= jwt.verify(req.header('Authorization'),'sarvasva')
  if(ticket.doc){
    const newapplicant = new applicant({
      email:ticket.doc.email,
      Reason: req.body.Reason,
      orgId: req.body.orgId,
      ModEmail: req.body.ModEmail
    })
    newapplicant.save().then(()=>{
      res.status(200).send({"success":true})
    }).catch((err)=>{
      console.log(err)
      res.status(400).send({"msg":"error"})
    })
  }else{
    res.status(400).send({"msg":"you are already a mod"})
  }
})

app.get('/application', async (req,res)=>{
  const ticket= jwt.verify(req.header('Authorization'),'sarvasva')
  console.log(ticket.orgprofile.orgId)
  const applicants = await applicant.find({orgId:ticket.orgprofile.orgId})
  res.status(200).send(applicants)
})

app.post('/reject', async (req,res)=>{
  const ticket= jwt.verify(req.header('Authorization'),'sarvasva')
  const applicants = await applicant.findOneAndDelete({email:req.body.email})
  res.status(200).send({"success":true})
})

app.post('/coupon', async(req,res)=>{
  const newcp= new Coupon({
    text: req.body.text,
    code: req.body.code,
    name: req.body.name,
    photo: req.body.photo,
    Quantity: req.body.Quantity
  })
  newcp.save().then(()=>{
    res.status(200).send()
  })
})
app.post('/paymentinfo',async(req,res)=>{
  const newinfo = new paymentinfo({
    orgId: req.body.orgId,
    google : {
      upiId: req.body.upiId,
      merchantName:req.body.merchantName
    }
  })
  newinfo.save().then((doc)=>{
    console.log(doc)
    res.status(200).send({"success":true})
  })
})

app.get('/paymentinfo',async(req,res)=>{
  let data = await paymentinfo.findOne({orgId:req.body.orgId});
  res.status(200).send(data)
})

// server up check
app.listen(port, () => {
  console.log('Server is up on port ' + port)
})