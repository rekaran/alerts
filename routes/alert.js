const { default: axios } = require("axios");
const mongoose = require("mongoose");
const Mongoose = require('mongoose').Mongoose;
const WebSocket = require("ws");

// DataBase Connection
var dataManager = new Mongoose({ useUnifiedTopology: true });
dataManager.connect("mongodb+srv://verox:Cjd38cdbBjWP7b1K@verox.3g7nh.mongodb.net/Signals?authSource=admin&replicaSet=atlas-4iomyp-shard-0&readPreference=primary&ssl=true&ssl_cert_reqs=CERT_NONE", { useNewUrlParser: true }).then(console.dir("Connecting to MongoDB - DataManager..."));

// Collection Objects
var db_signals = dataManager.model("signals", new mongoose.Schema({},{ strict: false }), "signals");

let header = {
    'Content-Type': 'application/json',
    'Authorization': 'key=AAAAZegd2IM:APA91bEoVGqCKiVI6e8G3lUSgbUVurg67tjtWhxyrXV-u1Zf_F5zvmuqBFZ8R9ffDbXgWoLsuTN7eJ8QpTyBssX_abENF2kVxmD1Ysii-1hoahtnvnz_-oO7Q6gukMQM9cGA89Yv1mBC'
}

let sendNotification = async (tos, title, body, img) =>{
    tos.array.forEach(to => {
        body = {
            'notification': {'title': title,'body': body},
            'to': to,
            'priority': 'high',
            'image': img
        }
        let r = axios.post("https://fcm.googleapis.com/fcm/send", body, {headers: header}).then(res=>{

        }).catch(err=>{
            
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
    console.log(msg)
}

module.exports = {sendNotification}