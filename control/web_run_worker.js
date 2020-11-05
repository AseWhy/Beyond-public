const { parentPort, workerData } = require('worker_threads'),
      { createReadStream, existsSync, statSync } = require("fs"),
      { join } = require("path"),
        express = require("express"),
        mime = require('./web_run_mimes'),
        parser = require("body-parser"),
        web_app = express();

web_app.use(parser.json({limit: '500mb'}));
web_app.use(parser.urlencoded({extended: true}));

global.config = workerData;
global.web_logger = new (require("./web_run_logger").Logger)(parentPort, "WEB");
global.web_messager = new (require("./web_run_messager").Messager)(parentPort);
global.web_api = new (require("./web_run_api").WebRunApi)(web_app);
global.web_pattern = new (require("./web_run_patterns").WebPattern)();

require("./web_run_prepare");

function getExtension(filename) {
    let dot = filename.lastIndexOf('.');
    
    if (dot === -1 || dot === 0) {
        return '';
    }

    return filename.substr(dot);
}

function handleFsRequest(req, res, level){
    let root = req.params[0].split('/');

    for(let i = 0, leng = root.length; i < leng; i++){
        if((root[i].indexOf('.') != -1 || root[i].indexOf('\\') != -1) && i + 1 < leng){
            res.end("Bad request. Can't find file by given name");

            return;
        }
    }

    const file = join(__dirname, 'data', level, ...root);

    if(existsSync(file))
        if(statSync(file).isFile()){
            res.setHeader('Content-Type', mime.getMIME(getExtension(root[root.length - 1])));

            createReadStream(file).pipe(res);
        } else 
            res.end("Bad request. Can't find file by given name");
    else
        res.end("Bad request. Can't find file by given name");
}

web_app
    .get('/', function (req, res) {
        res.send(global.web_pattern.getPattern("index"));
    })
    .get('/fonts/*', function (req, res) {
        handleFsRequest(req, res, "fonts");
    })
    .get('/scripts/*', function (req, res) {
        handleFsRequest(req, res, "scripts");
    })
    .get('/styles/*', function (req, res) {
        handleFsRequest(req, res, "styles");
    })
    .get('/subpages/*', function (req, res) {
        res.send(global.web_pattern.getPattern(/\/?([^\/]+)\/?/gm.exec(req.params[0])[1]));
    })
    .get('/backgrounds/*', function (req, res) {
        handleFsRequest(req, res, "backgrounds");
    })
    .get('/avatars/*', function (req, res) {
        res.setHeader("Content-Type", 'image/png');

        global.web_api.getApi("v1.0").account(/\/?([^\/]+)\/?/gm.exec(req.params[0])[1], "id", ["avatar"])
            .then(data => {
                if(data.avatar == null)
                    createReadStream(join(__dirname, "/data/images/default_avatar.png")).pipe(res);
                else
                    res.end(data.avatar)
            }).catch(err => {
                createReadStream(join(__dirname, "/data/images/default_avatar.png")).pipe(res);
            })
    })
    .get('/images/*', function (req, res) {
        handleFsRequest(req, res, "images");
    })
    .get('/icons/*', function (req, res) {
        handleFsRequest(req, res, "icons");
    });

web_app.listen(global.config.web_control_panel.port)