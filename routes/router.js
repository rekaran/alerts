const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const axios = require("axios");
const Mongoose = require('mongoose').Mongoose;

var apiManager = new Mongoose({ useUnifiedTopology: true });
apiManager.connect("mongodb+srv://verox:Cjd38cdbBjWP7b1K@verox.3g7nh.mongodb.net/Verox?authSource=admin&replicaSet=atlas-4iomyp-shard-0&readPreference=primary&ssl=true&ssl_cert_reqs=CERT_NONE", { useNewUrlParser: true }).then(console.dir("Connecting to MongoDB - DataManager..."));

var user_tokens = {};

var db_tokens = apiManager.model("deviceTokens", new mongoose.Schema({},{ strict: false }), "deviceTokens");
var db_admin = apiManager.model("admin_calls", new mongoose.Schema({},{ strict: false }), "admin_calls");

function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

let header = {
    'Content-Type': 'application/json',
    'Authorization': 'key=AAAAZegd2IM:APA91bEoVGqCKiVI6e8G3lUSgbUVurg67tjtWhxyrXV-u1Zf_F5zvmuqBFZ8R9ffDbXgWoLsuTN7eJ8QpTyBssX_abENF2kVxmD1Ysii-1hoahtnvnz_-oO7Q6gukMQM9cGA89Yv1mBC'
}

let sendNotification = async tos =>{
    tos.forEach(to => {
        to.token.forEach(t=>{
            body = {
                'notification': {'title': to.title,'body': to.body},
                'to': t,
                'priority': 'high',
                'image': to.img || ""
            }
            let r = axios.post("https://fcm.googleapis.com/fcm/send", body, {headers: header}).then(res=>{
    
            }).catch(err=>{
                
            });
        });
    });
}

router.post("/sendadminnotification", (req, res, next)=>{
    try {
        let notifications = [];
        let _body = `Admin has given ${req.body.type} signal for ${capitalize(req.body.coin)}.`
        Object.keys(user_tokens).forEach(u=>{
            notifications.push({token: user_tokens[u].fcm, title: "Admin Call", body: _body, img: req.body.image})
        })
        sendNotification(notifications);
        db_admin.updateOne(req.body,req.body,{upsert: true}).exec()
        res.send({ status: 200, message: `Successfully send the notification`});
    } catch (error) {
        res.send({ status: 400, message: `Error - ${error}`});
    }
});

router.use("/", (req, res, next)=>{
    res.status(301).redirect("https://veroxai.io");
    // res.send('Welcome to UDF Adapter for TradingView. See ./config for more details.');
});

let userTokens = async () => {
    try {
        let _tokens = await db_tokens.find({}).exec();
        _tokens.forEach(t=>{
            let toks = [];
            let mobs = [];
            if (t.get("ios")){
                if(t.get("ios.fcm_token")) toks.push(t.get("ios.fcm_token"));
                if(t.get("ios.mobile")) mobs.push(t.get("ios.mobile"));
            }
            if (t.get("web")){
                if(t.get("web.fcm_token")) toks.push(t.get("web.fcm_token"));
                if(t.get("web.mobile")) mobs.push(t.get("web.mobile"));
            }
            user_tokens[t.get("userId")] = {fcm: toks, mobile: mobs};
        })
    } catch (error) {
        console.log("User Token Error")
    }
}

async function getData() {
    const pipeline = [
    ];
    const userStream = db_tokens.watch(pipeline, { fullDocument: "updateLookup" });
    userStream.on('change', (change) => {
        try {
            let toks = [];
            let mobs = [];
            if (change.fullDocument.ios){
                if(change.fullDocument.ios.fcm_token) toks.push(change.fullDocument.ios.fcm_token);
                if(change.fullDocument.ios.mobile) mobs.push(change.fullDocument.ios.mobile);
            }
            if (change.fullDocument.web){
                if(change.fullDocument.web.fcm_token) toks.push(change.fullDocument.web.fcm_token);
                if(change.fullDocument.web.mobile) mobs.push(change.fullDocument.web.mobile);
            }
            user_tokens[change.fullDocument.userId] = {fcm: toks, mobile: mobs};
        } catch (error) {
            console.log("User Token updation error")
        }
    });
}

userTokens();
getData();

module.exports = {router};