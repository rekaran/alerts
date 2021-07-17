const express = require("express");
const { router } = require("./routes/router");
const cors = require("cors");

const app = express();

const whitelist = ["*"];

var corsOptionsDelegate = (req, callback) => {
    let corsOptions = {
        origin:true,
    };
    callback(null, corsOptions); // callback expects two parameters: error and options
}

app.use(cors(corsOptionsDelegate));

app.use(express.json({limit: '50mb', extended: true}));
app.use(express.urlencoded({
    limit: '10mb',
    parameterLimit: 100000,
    extended: true
}));


app.use(router);

const server = app.listen(8021, "0.0.0.0");