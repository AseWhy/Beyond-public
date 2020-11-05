const { readdir, readFile } = require("fs"),
      { join } = require('path'),
      { API } = require("../../web_api_interface");

const logs_path = join(global.config.paths.root, 'logs');

module.exports = class Api extends API {
    constructor(manager){
        super(manager, false, "POST");
    }

    async handle(req, res, user){
        const _ = this;

        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        req.body.function.splice(0, 1);
        
        switch(req.body.function[0]){
            case "get":
                try {
                    const results = await _.getLogs(req.body.time, req.body.seed);

                    if(results.status !== "ok"){
                        if(results.code === 0x0 || results.code === 0x1)
                            res.status(500)

                        results.code = undefined;
                    }

                    res.end(JSON.stringify(results));
                } catch (e){
                    global.web_logger.error(e);

                    res.status(500).end(JSON.stringify({
                        status: "error",
                        message: "Error while excecutiong request"
                    }))
                }
            break;
        }
    }

    getLogs(time, seed) {
        if(time == null || seed == null)
            return new Promise((res, rej) => {
                readdir(logs_path, (err, data) => {
                    if(err){
                        rej(err);

                        return;
                    }

                    for(let i = 0, leng = data.length; i < leng; i++){
                        data[i] = (data[i] = data[i].split('.')) && {
                            created: parseInt(data[i][1]),
                            type: data[i][0],
                            seed: parseInt(data[i][2])
                        };
                    }

                    res({
                        status: 'ok',
                        data: data
                    });
                })
            });
        else
            return new Promise((res, rej) => {
                readdir(logs_path, (err, data) => {
                    if(err){
                        rej({
                            status: 'error',
                            code: 0x0,
                            message: 'Error while loading logs'
                        });

                        return;
                    }

                    for(let i = 0, leng = data.length; i < leng; i++){
                        data[i] = (data[i] = data[i].split('.'));

                        if(data[i][1] == time && data[i][2] == seed){
                            readFile(join(logs_path, data[i].join('.')), (err, raw) => {
                                if(err){
                                    rej({
                                        status: 'error',
                                        code: 0x1,
                                        message: 'Error while loading logs'
                                    });
            
                                    return;
                                }

                                res({
                                    status: 'ok',
                                    data: raw.toString('utf-8')
                                });

                                return;
                            })

                            return;
                        }
                    }
                })
            })
    }
}