const { default: axios } = require("axios");
const mongoose = require("mongoose");
const Mongoose = require('mongoose').Mongoose;
const WebSocket = require("ws");

// DataBase Connection
var dataManager = new Mongoose({ useUnifiedTopology: true });
dataManager.connect("mongodb+srv://verox:Cjd38cdbBjWP7b1K@verox.3g7nh.mongodb.net/Signals?authSource=admin&replicaSet=atlas-4iomyp-shard-0&readPreference=primary&ssl=true&ssl_cert_reqs=CERT_NONE", { useNewUrlParser: true }).then(console.dir("Connecting to MongoDB - DataManager..."));
var apiManager = new Mongoose({ useUnifiedTopology: true });
apiManager.connect("mongodb+srv://verox:Cjd38cdbBjWP7b1K@verox.3g7nh.mongodb.net/Verox?authSource=admin&replicaSet=atlas-4iomyp-shard-0&readPreference=primary&ssl=true&ssl_cert_reqs=CERT_NONE", { useNewUrlParser: true }).then(console.dir("Connecting to MongoDB - DataManager..."));

// Collection Objects
var db_signals = dataManager.model("signals", new mongoose.Schema({},{ strict: false }), "signals");
var db_prices = apiManager.model("price", new mongoose.Schema({},{ strict: false }), "price");
var db_tokens = apiManager.model("deviceTokens", new mongoose.Schema({},{ strict: false }), "deviceTokens");
var db_user = apiManager.model("user", new mongoose.Schema({},{ strict: false }), "user");
var db_signal = apiManager.model("signal", new mongoose.Schema({},{ strict: false }), "signal");

var user_tokens = {};

let header = {
    'Content-Type': 'application/json',
    'Authorization': 'key=AAAAZegd2IM:APA91bEoVGqCKiVI6e8G3lUSgbUVurg67tjtWhxyrXV-u1Zf_F5zvmuqBFZ8R9ffDbXgWoLsuTN7eJ8QpTyBssX_abENF2kVxmD1Ysii-1hoahtnvnz_-oO7Q6gukMQM9cGA89Yv1mBC'
}

let coins = {"bitcoin": 48000}

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

// let sendMessage = async (tos, title, body, img) =>{ Whatsapp message
//     tos.array.forEach(to => {
//         body = {
//             'notification': {'title': title,'body': body},
//             'to': to,
//             'image': img
//         }
//         let r = axios.post("https://wapi.veroxai.io/whatsapp/send", body).then(res=>{

//         }).catch(err=>{
            
//         });
//     });
// }

const pricesWs = new WebSocket('wss://ws.coincap.io/prices?assets=ALL');

pricesWs.onmessage = function (msg) {
    let _coins = JSON.parse(msg.data);
    Object.keys(_coins).forEach(c=>{
        coins[c] = parseFloat(_coins[c]);
    })
}

function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

let prepairForPriceNotification = async () =>{
    try {
        let mycoins = {...coins};
        coins = {};
        let queries = [];
        Object.keys(mycoins).forEach(c=>{
            queries.push({"coin": c, "state": 1, "trigger": "up", "price": {$lte: mycoins[c]}})
            queries.push({"coin": c, "state": 1, "trigger": "down", "price": {$gte: mycoins[c]}})
        });
        console.log(queries)
        if(queries.length > 0){
            let signal_list = await db_prices.find({$or: queries}).exec();
            console.log(signal_list)
            let bulk_p = [];
            let bulk_n = {};
            signal_list.forEach(s=>{
                bulk_p.push({updateOne:{"filter": {"_id": mongoose.Types.ObjectId(s.get("_id"))}, "update": {"state": 0}}})
            });
            let notifications = [];
            signal_list.forEach(s=>{
                let _text = s.get("trigger") == "up"? `${capitalize(s.get("coin"))} is more than ${s.get("price")}`:`${capitalize(s.get("coin"))} is less than ${s.get("price")}`;
                notifications.push({token: user_tokens[s.get("userId")].fcm, title: `${capitalize(s.get("coin"))} Alert`, body: _text})
                if(Object.keys(bulk_n).includes(s.get("userId")))bulk_n[s.get("userId")].push({title: _text, ts: new Date().getTime()});
                else bulk_n[s.get("userId")] = [{title: _text, ts: new Date().getTime()}];
            });
            console.log(notifications)
            sendNotification(notifications);
            if(bulk_p.length > 0) db_prices.bulkWrite(bulk_p);
            // update notifications
            let bulk_u = [];
            Object.keys(bulk_n).forEach(u=>{
                bulk_u.push({updateOne:{"filter": {"userId":u}, "update": {$push: {"notification": {$each: bulk_n[u], $sort: { ts: -1 },$slice: 10}}}}})
            });
            if(bulk_u.length > 0) db_user.bulkWrite(bulk_u);
        }
    } catch (error) {
        console.log("error while preparing for notification")
    }
}

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
            console.log(user_tokens[change.fullDocument.userId])
        } catch (error) {
            console.log("User Token updation error")
        }
    });
    const signalStream = db_signals.watch(pipeline, { fullDocument: "updateLookup" });
    signalStream.on('change', (change) => {
        signalAlert(change.fullDocument);
    });
}

let signalAlert = async data =>{
    try {
        let user_list = await db_signal.find({coin: data.coin, status: 1}).exec();
        let notifications = [];
        
        let bulk_n = {};
        user_list.forEach(s=>{
            let _text = data.label == "B"? `Buy signal is triggered on ${capitalize(data.coin)}`:`Sell signal is triggered on ${capitalize(data.coin)}`;
            notifications.push({token: user_tokens[s.get("userId")].fcm, title: `Buy/Sell Alert`, body: _text})
            if(Object.keys(bulk_n).includes(s.get("userId")))bulk_n[s.get("userId")].push({title: _text, ts: new Date().getTime()});
            else bulk_n[s.get("userId")] = [{title: _text, ts: new Date().getTime()}];
        });
        let bulk_u = [];
        Object.keys(bulk_n).forEach(u=>{
            bulk_u.push({updateOne:{"filter": {"userId":u}, "update": {$push: {"notification": {$each: bulk_n[u], $sort: { ts: -1 },$slice: 10}}}}})
        });
        if(bulk_u.length > 0) db_user.bulkWrite(bulk_u);
    } catch (error) {
        console.log("Signal Error")
    }
}

setInterval(() => {
    prepairForPriceNotification();
}, 300000);
userTokens();
// Upstream
getData();
prepairForPriceNotification();