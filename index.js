//importing app
const express = require('express')
const app = express()

// setting .env variables
require('dotenv').config()

function getRndInteger(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// firebase admin
var admin = require("firebase-admin");
var serviceAccount = require("./socialgoal-e4d3d-firebase-adminsdk-ada12-3d018848f6.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://socialgoal-e4d3d-default-rtdb.firebaseio.com"
});

//setting up cors for inter-domain requests
var cors = require('cors')
app.use(cors())

//setting up body parser to parse req into body
var bodyParser = require('body-parser')
app.use(bodyParser.json());

//jwt- token and password
var jwt = require('jsonwebtoken');
var generator = require('generate-password');

//port as enviroment variable
const port = process.env.PORT || 8080

//mongodb
const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://sarvasva:9839352215@cluster0.dzaft.mongodb.net/users?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log('database is connected!')
});


// model schema
const organisation = require('./models/organisation')
const moderator = require('./models/moderators');
const User = require('./models/User');
const OrgFeed = require('./models/OrgFeed');
const pay = require('./models/Pay');
const Coupon = require('./models/Coupons');
const applicant = require('./models/applicants');
// const paymentinfo=require('./models/paymentinfo');
const Activity = require('./models/Activity');
const Feedback = require('./models/Feedback');
const CovidCity = require('./models/CovidCity');

//mail settings
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'donutorgapp@gmail.com',
      pass: 'QwertyuioP123'
    }
  });
//app routes


// covid endpoints
app.get('/cities', async (req, res) => {
    try {
        var cities
        if (req.query.search_query) {
            var search_string = req.query.search_query
            var searchKey = new RegExp(search_string, 'i')
            cities = await CovidCity.find({city: searchKey})
        } else {
            cities = await CovidCity.find({})
        }
        res.status(200).send(cities)
    } catch (e) {
        console.log(e)
        res.status(400).send({"err": "server error"})
    }
})

app.get('city', async (req, res) => {
    try {
        var city
        if (req.query.id) {
            city = await CovidCity.findOne({id: req.query.id})
            res.status(200).send(city)
        } else {
            res.status(400).send({"err": "No such city"})
        }
    } catch (e) {
        console.log(e)
        res.status(400).send({"err": "server error"})
    }
})

app.get('/explore', async (req, res) => {
    try{
        var ID = '';
        var Name = '';
        if (req.header('Authorization')){
            const ticket = jwt.verify(req.header('Authorization'), 'sarvasva')
            if (ticket.orgprofile) {
                ID = ticket.orgprofile.orgId
                Name = ticket.orgprofile.orgName
            }else{
                ID = ticket.doc.UID
                Name = ticket.doc.displayName
            }
        }
        const explore = await organisation.find({showOnExplore:true, followers : {$nin: {id:ID,name:Name}}})
        console.log(explore)
        res.status(200).send(explore)    
    }catch(e){
        console.log(e)
        res.status(400).send({"err":"servor error"})
    }
})


// organisation registration route
app.post('/org', async (req, res) => {
    try {
        await admin.auth().createUser({         // verify ID-TOKEN from Firebase
            email: req.body.email,
            emailverified: false,
            password: req.body.password
        }).then((user) => {
            console.log(user)
            organisation.estimatedDocumentCount().then((num) => {     // create
                const neworg = new organisation({                     // new Org
                    UID: user.uid,                                    // in mongodb
                    orgName: req.body.orgName,
                    displayName: req.body.displayName,
                    orgId: num || 0,
                    email: user.email,
                    website: req.body.website,
                    number: req.body.number,
                    photo: req.body.photo,
                    tagline: req.body.tagline,
                    google: {
                        upiId: req.body.upiId,
                        merchantName: req.body.merchantName
                    },
                    posts: 0,
                    enabled: false
                })
                const mod = new moderator({
                    UID: user.uid,                                 // create moderator profile as head of org
                    email: user.email,
                    orgId: num || 0,
                    access: 'HEAD'
                })
                organisation.findOne(neworg).then((doc) => {      // search for duplicate org
                    if (!doc) {
                        moderator.findOne(mod).then((doc) => {    // search for dupilacte moderator
                            if (!doc) {
                                mod.save().then((file) => {       // if no duplicate save new org and mod profile
                                    neworg.save().then((doc) => {
                                        var mailOptions = {
                                            from: 'donutorgapp@gmail.com',
                                            to: user.email,
                                            subject: 'Welcome to Donut',
                                            text: `Thank you for applying to Donut. 
Donut promises to be the one stop platform for all the social welfare activities. The app and the team is evolving everyday. With a vision to help India achieve the 17 UN Sustainable Development Goals, we are looking forward to Organisations like yours to help us bring this huge impact.
                                                                                        
Here is the next step for your onboarding to the Donut platform. Fill this form - https://forms.gle/gXAKjvBb3YQzsb2o7
                                            
Reply to this email if you have any queries.
                                            
Cheers
Team Donut`}
                                          transporter.sendMail(mailOptions, function(error, info){
                                              if(error){
                                                  console.log(error)
                                              }else{
                                                console.log(info.response)
                                                res.status(200).send({"success":true})
                                              }
                                          }) 
                                        }
                                          ).catch((err) => {
                                        admin.auth().deleteUser(user.uid).then(() => {
                                            console.log({"msg": "Successfully deleted user"})  // if failure
                                            res.status(400).send({"err": "cant create new org"})
                                        }).catch((error) => {
                                            console.log(error);
                                        });
                                    })
                                }).catch((err) => {                                            // delete from
                                    admin.auth().deleteUser(user.uid).then(() => {
                                        console.log({"msg": "Successfully deleted user"})      // firebase
                                        res.status(400).send({"err": "cant create new org"})
                                    }).catch((error) => {
                                            console.log(error);
                                        });
                                })
                            } else {
                                admin.auth().deleteUser(user.uid).then(() => {
                                    console.log({"msg": "Successfully deleted user"})
                                    res.status(400).send({"err": "duplicate file in mod database"})
                                }).catch((error) => {
                                    console.log(error);
                                });
                            }
                        }).catch((err) => {
                            console.log(err)
                            admin.auth().deleteUser(user.uid).then(() => {
                                console.log({"msg": "Successfully deleted user"})
                                res.status(400).send({"err": "cant create new org"})
                            }).catch((error) => {
                                    console.log(error);
                                });
                        })
                    } else {
                        admin.auth().deleteUser(user.uid).then(() => {
                            console.log({"msg": "Successfully deleted user"})
                            res.status(400).send({"err": "duplicate file in org database"})
                        }).catch((error) => {
                            console.log(error);
                        });
                    }
                }).catch((err) => {
                    console.log(err)
                    admin.auth().deleteUser(user.uid).then(() => {
                        console.log('Successfully deleted user')
                        res.status(400).send(err)
                    }).catch((error) => {
                            console.log(error);
                        });
                })
            }).catch((err) => {
                console.log(err)
                res.status(400).send({"err": "no estimated count"})
            })
        }).catch((err) => {
            console.log(err)
            res.status(400).send({"err": err.errorInfo.message})
        })
    } catch (err) {
        console.log(err)
        res.status(400).send({"err": "server err"})
    }
})

app.post('/mod', async (req, res) => {
    try {
        const token = jwt.verify(req.header('Authorization'), 'sarvasva')  
        console.log(token)                                     // verify access of the person adding mod if correct
        var password = generator.generate({                    // generate random password
            length: 8,
            numbers: true
        })
        await admin.auth().createUser({                       // create new user with email provided
            email: req.body.email,                            // in firebase
            emailverified: false,
            password: password
        }).then((user) => {
            const mod = new moderator({                       // add new moderator in moderator table in mongodb
                UID: user.uid,
                email: user.email,
                orgId: token.orgprofile.orgId,
                access: req.body.access || 'MOD'
            })
            mod.save().then(async (doc) => {
                res.status(200).send({"success": true})    // return sucess if mod added
            }).catch((err) => {
                admin.auth().deleteUser(user.uid).then(() => {
                    res.status(404).send({"err": "duplicate moderator"})
                })
            })
        }).catch((err) => {
            res.status(400).send({"err": "error in saving moderator"})
        })
    } catch (err) {
        console.log(err)
        res.status(400).send({"err": "server error"})
    }
})

app.post('/add', async (req, res) => {
    try {
        await admin.auth().verifyIdToken(req.header('Authorization')).then(async (token) => { // verify ID-token
            const doc = await User.findOne({UID: token.uid})               // check if user already exists in database
            if (!doc) {
                const newUser = new User({                                 // if not create new user
                    UID: token.uid,
                    email: token.email,
                    displayName: token.name,
                    photo: token.picture,
                    Level: req.body.level || 1,
                    points: 0
                })
                newUser.save().then((doc) => {
                    var token = jwt.sign({doc}, 'sarvasva')              // save and give jwt
                    console.log(doc)
                    res.status(200).send({"jwt": token, "profile": doc})
                }).catch((err) => {
                    res.status(400).send({"err": "login error"})
                })
            } else {
                var token = jwt.sign({doc}, 'sarvasva')               // if user exist create jwt and send
                res.status(200).send({"jwt": token, "profile": doc})
            }
        }).catch((err) => {
            res.status(400).send({"err": "login error"})
        })
    } catch (err) {
        console.log(err)
        res.status(400).send({"err": "server error"})
    }
})

app.get('/login', async (req, res) => {                         // org login route
    try {
        const token = await admin.auth().verifyIdToken(req.header('Authorization')) // verify Id-token
        console.log(token)
        const doc = await moderator.findOne({UID: token.uid})                // search for orgprofile
        const file = await organisation.findOne({orgId: doc.orgId})        // and modprofile and create jwt to send
        if (file.enabled) {
            const ticket = jwt.sign({"modprofile": doc, "orgprofile": file}, 'sarvasva')
            res.status(200).send({"jwt": ticket, "modprofile": doc, "orgprofile": file})
        } else {
            res.status(400).send({"err": "Organisation currently under review"})
        }
    } catch (err) {
        console.log(err)
        res.status(403).send({"err": "server error"})
    }
})

app.post('/orgname', async (req, res) => {
    try {
        organisation.findOne({orgName: req.body.orgName}).then((doc) => {     // check for duplicate orgName
            if (doc) {
                res.status(200).send({"taken": true})
            } else {
                res.status(200).send({"taken": false})
            }
        })
    } catch (err) {
        console.log(err)
        res.status(200).send({"err": "server error"})
    }
})

app.get('/orgfeed', async (req, res) => {
    try {
        var ID;
        var selfID;
        var posts;
        if(req.header('Authorization')){
        const ticket = jwt.verify(req.header('Authorization'), 'sarvasva')
        if (ticket.orgprofile) {
            selfID = ticket.orgprofile.orgId
        }else{
            selfID = ticket.doc.UID
        }
    }
        ID = req.query.orgId
        if (ID) {
            console.log(ID)
            if (req.query.page) {
                posts = await OrgFeed.find({orgId: ID})
            } else {
                posts = await OrgFeed.find({orgId: ID})
            }
            for (var i = 0; i < posts.length; i++) {
                var n = posts[i].likes.length
                var org = await organisation.findOne({orgId: posts[i].orgId})
                posts[i].orgPhoto = org.photo
                if(selfID){
                for (var j = 0; j < n; j++) {
                    if (posts[i].likes[j].userId == selfID) {
                        posts[i].liked = true
                        break
                    }
                }
            }
            }
        } else {
            if (selfID) {
                console.log(ID)
                if (req.query.page) {
                    posts = await OrgFeed.find({orgId: selfID})
                } else {
                    posts = await OrgFeed.find({orgId: selfID})
                }
                for (var i = 0; i < posts.length; i++) {
                    var n = posts[i].likes.length
                    var org = await organisation.findOne({orgId: posts[i].orgId})
                    posts[i].orgPhoto = org.photo
                    for (var j = 0; j < n; j++) {
                        if (posts[i].likes[j].userId == selfID) {
                            posts[i].liked = true
                            break
                        }
                    }
                }
            } else {
                res.status(400).send({"err": "Send either token or orgId"})
                return
            }
        }

        posts.reverse()
        console.log(posts)
        res.status(200).send(posts)
    } catch (err) {
        console.log(err)
        res.status(400).send({"err": "server error"})
    }
})

app.post('/orgfeed', async (req, res) => {
    try {
        const ticket = jwt.verify(req.header('Authorization'), 'sarvasva')
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
        post.save().then(async (doc) => {
            const org = await organisation.findOne({orgId: ticket.orgprofile.orgId})
            org.posts = org.posts + 1
            org.save().then(() => {
                res.status(200).send(doc)
            })
        }).catch((err) => {
            res.status(400).send({"err": "cant save post"})
        })
    } catch (err) {
        console.log(err),
            res.status(400).send({"err": "server error"})
    }
})

app.post('/updatepro', async (req, res) => {
    try {
        const ticket = jwt.verify(req.header('Authorization'), 'sarvasva')
        const ID = ticket.orgprofile.orgId
        if (ID) {
            const file = await organisation.updateOne({orgId: ID}, {
                orgName: req.body.orgName,
                displayName: req.body.displayName,
                website: req.body.website,
                number: req.body.number,
                photo: req.body.photo,
                tagline: req.body.tagline
            })
            res.status(200).send({"success": true})
        }
    } catch (err) {
        console.log(err)
        res.status(400).send({"err": "server error"})
    }
})

app.post('/like', async (req, res) => {
    try {
        const ticket = jwt.verify(req.header('Authorization'), 'sarvasva')
        var ID = ''
        var name = ''
        if (ticket.doc) {
            ID = ticket.doc.UID,
                name = ticket.doc.displayName
        }
        if (ticket.modprofile) {
            ID = ticket.orgprofile.UID
            name = ticket.orgprofile.orgName
        }
        var conditions = {
            _id: req.body.id,
            "likes.userId": {
                $ne: ID
            }
        }
        var update = {
            $addToSet: {likes: {userId: ID, amount: req.body.amount || 0}}
        }
        OrgFeed.findOneAndUpdate(conditions, update, {new: true}).then((doc) => {
            if (doc == null) {
                res.status(400).send({"err": "already liked"})
            } else {
                var data = ''
                if (req.body.amount) {
                    data = `${name} donated ${req.body.amount} through your post ${doc.Title}`
                } else {
                    data = `${name} liked your post ${doc.Title}`
                }
                const newactive = new Activity({
                    person1: ID,
                    person2: doc.orgId,
                    data: data,
                    id: doc._id,
                    image: null,
                    activityId: ID + doc._id
                })
                newactive.save().then(() => {
                    res.status(200).send({"success": true, "id": doc._id})
                }).catch((err) => {
                    console.log(err)
                    res.status(200).send({"success": true, "id": doc._id})
                })
            }
        }).catch((err) => {
            console.log(err)
            res.status(400).send({"err": "feed not found or bad request"})
        })
    } catch (err) {
        console.log(err)
        res.status(400).send({"err": "server error"})
    }
})

app.post('/follow', async (req, res) => {
    try {
        const ticket = jwt.verify(req.header('Authorization'), 'sarvasva')
        var name = ''
        if (ticket.orgprofile == undefined) {
            name = ticket.doc.displayName
            var conditions = {
                "UID": ticket.doc.UID
            }

            var update = {
                $addToSet: {following: {orgId: req.body.orgId, orgName: req.body.orgName}}
            }

            User.findOneAndUpdate(conditions, update, {new: true}).then((doc) => {
                if (doc == null) {
                    res.status(200).send({"msg": "already followed"})
                } else {
                    var conditions = {
                        "orgId": req.body.orgId
                    }
                    var update = {
                        $addToSet: {followers: {id: ticket.doc.UID, name: ticket.doc.displayName}}
                    }
                    organisation.findOneAndUpdate(conditions, update, {new: true}).then((doc) => {
                        var data = `${name} started following you`
                        const newactive = new Activity({
                            person1: ticket.doc.UID,
                            person2: req.body.orgId,
                            data: data,
                            id: req.body.orgId,
                            image: null,
                            activityId: ticket.doc.UID + req.body.orgId
                        })
                        newactive.save().then((doc) => {
                            console.log(doc)
                            res.status(200).send({"success": true})
                        }).catch((err) => {
                            console.log(err)
                            res.status(200).send({"success": true})
                        })
                    })
                }
            }).catch((err) => {
                res.status(400).send({"err": "server error"})
            })
        } else {
            if (ticket.orgprofile.orgId == req.body.orgId) {
                res.status(200).send({"success": false})
            } else {
                name = ticket.orgprofile.orgName
                var conditions = {
                    "orgId": ticket.orgprofile.orgId
                }
                var update = {
                    $addToSet: {following: {orgId: req.body.orgId, orgName: req.body.orgName}}
                }
                organisation.findOneAndUpdate(conditions, update, {new: true}).then((doc) => {
                    var conditions = {
                        "orgId": req.body.orgId
                    }
                    var update = {
                        $addToSet: {followers: {id: ticket.orgprofile.orgId, name: ticket.orgprofile.orgName}}
                    }
                    organisation.findOneAndUpdate(conditions, update, {new: true}).then(() => {
                        if (doc == null) {
                            res.status(400).send({"msg": "already followed"})
                        } else {
                            var data = `${name} started following you`
                            const newactive = new Activity({
                                person1: ticket.orgprofile.orgId,
                                person2: req.body.orgId,
                                data: data,
                                id: req.body.orgId,
                                image: null,
                                activityId: ticket.orgprofile.orgId + req.body.orgId
                            })
                            newactive.save().then((doc) => {
                                console.log(doc)
                                res.status(200).send({"success": true})
                            }).catch((err) => {
                                console.log(err)
                                res.status(200).send({"success": true})
                            })
                        }
                    })
                }).catch((err) => {
                    console.log(err)
                    res.status(400).send({"err": "error in following"})
                })
            }
        }
    } catch (err) {
        console.log(err)
        res.status(400).send({"err": "server error"})
    }
})

app.post('/unlike', async (req, res) => {
    try {
        const ticket = jwt.verify(req.header('Authorization'), 'sarvasva')
        var ID = ''
        if (ticket.doc) {
            ID = ticket.doc.UID
        }
        if (ticket.modprofile) {
            ID = ticket.orgprofile.UID
        }
        var conditions = {
            _id: req.body.id
        }
        var update = {
            $pull: {likes: {userId: ID, amount: req.body.amount || 0}}
        }
        OrgFeed.findOneAndUpdate(conditions, update, {new: true}).then((doc) => {
            if (doc == null) {
                res.status(400).send({"err": "already not liked"})
            } else {
                console.log(doc)
                res.status(200).send({"success": true, "id": doc._id})
            }
        }).catch((err) => {
            res.status(400).send({"err": "err in orgfeed"})
        })
    } catch (err) {
        console.log(err)
        res.status(400).send({"err": "server error"})
    }
})

app.post('/unfollow', async (req, res) => {
    try {
        const ticket = jwt.verify(req.header('Authorization'), 'sarvasva')
        if (ticket.orgprofile == undefined) {
            var conditions = {
                "UID": ticket.doc.UID
            }
            var update = {
                $pull: {following: {orgId: req.body.orgId, orgName: req.body.orgName}}
            }

            User.findOneAndUpdate(conditions, update, {new: true}).then((doc) => {
                if (doc == null) {
                    res.status(400).send({"msg": "already followed"})
                } else {
                    var conditions = {
                        "orgId": req.body.orgId,
                    }
                    var update = {
                        $pull: {followers: {id: ticket.doc.UID, name: ticket.doc.displayName}}
                    }
                    organisation.findOneAndUpdate(conditions, update, {new: true}).then((doc) => {
                        res.status(200).send({"success": true})
                    })
                }
            }).catch((err) => {
                res.status(400).send({"err": "err in unfollow"})
            })
        } else {
            var conditions = {
                "orgId": ticket.orgprofile.orgId
            }
            var update = {
                $pull: {following: {orgId: req.body.orgId, orgName: req.body.orgName}}
            }
            organisation.findOneAndUpdate(conditions, update, {new: true}).then((doc) => {
                if (doc == null) {
                    res.status(200).send({"msg": "already followed"})
                } else {
                    var conditions = {
                        "orgId": req.body.orgId,
                    }
                    var update = {
                        $pull: {followers: {id: ticket.orgprofile.orgId, name: ticket.orgprofile.orgName}}
                    }
                    organisation.findOneAndUpdate(conditions, update, {new: true}).then(() => {
                        res.status(200).send({"success": true})
                    })
                }
            }).catch((err) => {
                res.status(400).send({"err": "err in unfollow"})
            })
        }
    } catch (err) {
        console.log(err)
        res.status(400).send({"err": "Server error"})
    }
})

app.delete('/orgfeed', async (req, res) => {
    try {
        const ticket = jwt.verify(req.header('Authorization'), 'sarvasva')
        const posts = await OrgFeed.findOneAndDelete({orgId: ticket.orgprofile.orgId})
        if (posts == null) {
            res.status(400).send({"err": "not found"})
        } else {
            res.status(200).send({"success": true})
        }
    } catch (err) {
        console.log(err)
        res.status(400).send({"err": "Server error"})
    }
})

app.get('version', async(req, res)=>{
    res.status(200).send({
        'version':'0.0.2',
        'mandatoryUpdate':true
    })
})

// GET endpoint to return search results
app.get('/search', async (req, res) => {
    try {
        var search_string = req.query.search_query
        var searchKey = new RegExp(search_string, 'i')
        var found_orgs = await organisation.find({orgName: searchKey})
        var found_users = await User.find({displayName: searchKey})
        res.status(200).send({"orgs": found_orgs, "users": found_users})
    } catch (err) {
        console.log(err);
        res.status(400).send({"err": "server error"})
    }
})

app.get('/feed', async (req, res) => {
    var posts = []
    try {
        if (req.header('Authorization')) {
            const ticket = jwt.verify(req.header('Authorization'), 'sarvasva')

            var ID = '';

            if (ticket.orgprofile) {
                ID = ticket.orgprofile.UID
                var list = [];
                var newdata = await organisation.findOne({orgId: ticket.orgprofile.orgId})
                if (newdata.following.length) {
                    for (var i = 0; i < newdata.following.length; i++) {
                        list.push(newdata.following[i].orgId)
                    }
                }
            } else {
                var list = [];
                ID = ticket.doc.UID
                console.log(ID)
                var newdata = await User.findOne({UID: ID})
                if (newdata.following.length) {
                    console.log(newdata.following.length)
                    for (var i = 0; i < newdata.following.length; i++) {
                        list.push(newdata.following[i].orgId)
                        console.log(newdata.following[i].orgId)
                    }
                }
            }
            posts = await OrgFeed.find({orgId: {$in: list}})
            for (var i = 0; i < posts.length; i++) {
                var n = posts[i].likes.length
                var org = await organisation.findOne({orgId: posts[i].orgId})
                posts[i].orgPhoto = org.photo
                for (var j = 0; j < n; j++) {
                    if (posts[i].likes[j].userId == ID) {
                        posts[i].liked = true
                        break
                    }
                }
            }
            posts.reverse()

            res.status(200).send(posts)
        } else {
            posts = await OrgFeed.find({orgId: {$in: list}})
            for (var i = 0; i < posts.length; i++) {
                var n = posts[i].likes.length
                var org = await organisation.findOne({orgId: posts[i].orgId})
                posts[i].orgPhoto = org.photo
                for (var j = 0; j < n; j++) {
                    if (posts[i].likes[j].userId == ID) {
                        posts[i].liked = true
                        break
                    }
                }
            }
            posts.reverse()

            console.log(posts)
            res.status(200).send(posts)
        }
    } catch (err) {
        console.log(err)
        res.status(400).send({"err": "server error"})
    }
})

app.get('/profile', async (req, res) => {
    try {
        const ticket = jwt.verify(req.header('Authorization'), 'sarvasva')
        const ID = ticket.orgprofile.orgId
        if (ID) {
            const file = await organisation.findOne({orgId: ID})
            res.status(200).send(file)
        }
    } catch (err) {
        console.log(err)
        res.status(400).send({"err": "Server Error"})
    }
})

app.get('/profileinfo', async (req, res) => {
    const id = req.query.id
    try {
        if (req.query.is_user == "false") {
            const file = await organisation.findOne({orgId: id})
            res.status(200).send({orgProfile: file})
        } else {
            const file = await User.findOne({UID: id})
            res.status(200).send({userProfile: file})
        }
    } catch (err) {
        console.log(err)
        res.status(400).send({"err": err})
    }

})

app.get('/mods', async (req, res) => {
    try {
        const ticket = jwt.verify(req.header('Authorization'), 'sarvasva')
        const ID = ticket.orgprofile.orgId
        const file = await moderator.find({orgId: ID})
        res.status(200).send(file)
    } catch (err) {
        console.log(err)
        res.status(400).send({"err": "server err"})
    }
})

app.post('/payment', async (req, res) => {
    try {
        const ticket = jwt.verify(req.header('Authorization'), 'sarvasva')
        const newpayment = new pay({
            UID: ticket.doc.UID,
            orgId: req.body.orgId,
            amount: req.body.amount,
            id: req.body.id
        })
        newpayment.save().then(async () => {
            var prob = true;
            var getCP = null;
            if (getRndInteger(1, 4) % 4 == 0) {
                prob = false
            }
            if (prob) {
                getCP = await Coupon.findOne({Quantity: {$ne: 0}})
                console.log(getCP)
                getCP.Quantity = getCP.Quantity - 1
            }
            const doc = await User.findOne({email: ticket.doc.email})
            console.log(doc)
            doc.points = doc.points + 5
            if ((doc.points / doc.level) >= 10) {
                doc.level = doc.level + 1
            }
            doc.save().then(() => {
                res.status(200).send({"success": true, "coupon": getCP})
            }).catch((err) => {
                console.log(err)
                res.status(400).send({"err": "points error"})
            })
        }).catch((err) => {
            console.log(err)
            res.status(400).send({"err": "error in payment addition"})
        })
    } catch (err) {
        console.log(err);
        res.status(400).send({"err": "Server Error"})
    }
})

app.post('/application', async (req, res) => {
    try {
        const ticket = jwt.verify(req.header('Authorization'), 'sarvasva')
        if (ticket.doc) {
            const newapplicant = new applicant({
                email: ticket.doc.email,
                Reason: req.body.Reason,
                orgId: req.body.orgId,
                UID: ticket.doc.UID,
                profilePic: ticket.doc.photo,
                name: ticket.doc.displayName
            })
            newapplicant.save().then(() => {
                res.status(200).send({"success": true})
            }).catch((err) => {
                console.log(err)
                res.status(400).send({"err": "error"})
            })
        } else {
            res.status(400).send({"err": "you are already a mod"})
        }
    } catch (err) {
        console.log(err)
        res.status(400).send({"err": "Server error"})
    }
})

app.get('/application', async (req, res) => {
    try {
        const ticket = jwt.verify(req.header('Authorization'), 'sarvasva')
        var applicants
        if(ticket.orgprofile){
            console.log(ticket.orgprofile.orgId)
            applicants = await applicant.find({orgId: ticket.orgprofile.orgId}).sort({created_at: -1})
        }else{
            applicants = await applicant.find({orgId: req.query.orgId, UID: ticket.doc.UID}).sort({created_at: -1})
        }
        applicants.reverse()
        res.status(200).send(applicants)
    } catch (err) {
        console.log(err)
        res.status(400).send({"err": "Server error"})
    }
})

app.post('/reject', async (req, res) => {
    try {
        const ticket = jwt.verify(req.header('Authorization'), 'sarvasva')
        const applicants = await applicant.findOneAndDelete({email: req.body.email})
        res.status(200).send({"success": true})
    } catch (err) {
        console.log(err)
        res.status(400).send({"err": "Server Error"})
    }
})

app.post('/coupon', async (req, res) => {
    try {
        const newcp = new Coupon({
            text: req.body.text,
            code: req.body.code,
            name: req.body.name,
            photo: req.body.photo,
            Quantity: req.body.Quantity
        })
        newcp.save().then(() => {
            res.status(200).send()
        })
    } catch (err) {
        console.log(err)
        res.status(400).send({"err": "Server error"})
    }
})

app.post('/paymentinfo', async (req, res) => {
    try {
        const ticket = jwt.verify(req.header('Authorization'), 'sarvasva')
        if (ticket.orgprofile) {
            const newinfo = await organisation.findOne({orgId: ticket.orgprofile.orgId})
            newinfo.donation.upiId = req.body.upiId,
            newinfo.donation.merchantName = req.body.merchantName
            newinfo.donation.donationLink = req.body.donationLink
            newinfo.donation.amount = req.body.amount
            newinfo.donation.showAmount = req.body.showAmount
            newinfo.save().then((doc) => {
                res.status(200).send({"success": true})
            }).catch((err) => {
                console.log(err)
                res.status(400).send({"err": "Server Error"})
            })
        } else {
            res.status(400).send({"err": "unauthorized"})
        }
    } catch (err) {
        console.log(err)
        res.status(400).send({"err": "Server Error"})
    }
})

app.get('/paymentinfo', async (req, res) => {
    try {
        let data = await organisation.findOne({orgId: req.query.orgId}, 'orgId donation');
        res.status(200).send(data)
    } catch (err) {
        console.log(err);
        res.status(400).send({"err": "Server error"})
    }
})

app.get('/activity', async (req, res) => {
    var ticket
    try{
        ticket = jwt.verify(req.header('Authorization'), 'sarvasva');
    }catch(e){
        res.status(200).send([])
        return
    }
    try{
        var user = ' '
        if (ticket.orgprofile) {
            user = ticket.orgprofile.orgId
        } else if(ticket.doc){
            user = ticket.doc.UID
        }else{
            res.status(200).send([])
        }
        var result;
        if (req.query.limit) {
            if (req.query.start_after) {
                result = await Activity.find({person2: user}).limit(req.query.limit).skip(req.query.start_after).sort({created_at: -1})
            } else {
                result = await Activity.find({person2: user}).limit(req.query.limit).sort({created_at: -1})
            }
        } else {
            result = await Activity.find({person2: user})
        }
        result.reverse()
        res.status(200).send(result)
    } catch (err) {
        console.log(err)
        res.status(400).send({"err": "Server error"})
    }
})

app.get('/feedback', async (req, res) => {
    res.status(200).send({"Status": "GET endpoint not implemented"});
})

app.post('/feedback', async (req, res) => {
    try {
        const ticket = jwt.verify(req.header('Authorization'), 'sarvasva');
        var user = '';
        var isuser = false;
        if (ticket.orgprofile) {
            user = ticket.orgprofile.orgId;
        } else {
            isuser = true;
            user = ticket.doc.UID;
        }
        const feedback = new Feedback({
            isUser: isuser,
            id: user,
            feedback: req.body.feedback
        })
        feedback.save().then((doc) => {
            res.status(200).send({"success": true})
        }).catch((err) => {
            console.log(err)
            res.status(400).send({"err": "Server Error"})
        })
    } catch (err) {
        console.log(err)
        res.status(400).send({"err": "Server Error"})
    }
})

app.get("/leaderboard", async (req, res) => {
    try {
        const data = await User.find({}, 'displayName photo UID points').where(points).gt(0).sort({points: -1}).limit(5)
        
        res.status(200).send(data)
    } catch (err) {
        console.log(err)
        res.status(200).send([])
    }
})
app.post('/updatePic', async (req, res) => {
    try {
        const ticket = jwt.verify(req.header('Authorization'), 'sarvasva')
        const ID = ticket.orgprofile.orgId
        if (ID) {
            const file = await organisation.updateOne({orgId: ID}, {
                photo: req.body.photo,
            })
            res.status(200).send({"success": true})
        }
    } catch (err) {
        console.log(err)
        res.status(400).send({"err": "server error"})
    }
})
// server up check
app.listen(port, () => {
    console.log('Server is up on port ' + port)
})

