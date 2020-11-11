const sql = require("sql-bricks"),
      { API } = require("../../web_api_interface"),
      { createReadStream } = require('fs');

module.exports = class Api extends API {
    constructor(manager){
        super(manager, false, "GET");
    }

    async handle(req, res, user){
        const _ = this;

        req.query.function.splice(0, 1);

        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        switch(req.query.function[0]){
            case "map":
                try {
                    if(req.query.province != null){
                        res.setHeader('Content-Type', 'image/png');
    
                        const responce = (await this.manager.query('map', sql.select('gfx').from('provinces').where(sql.like('id', req.query.province)).toString()))[0];
    
                        if(responce && responce.gfx){
                            res.end(responce.gfx)
                        } else {
                            createReadStream('./control/data/images/not-found-404.png').pipe(res.status(404));
                        }
                    } else if(req.query.region != null){
                        res.setHeader('Content-Type', 'image/png');
                        
                        const responce = (await this.manager.query('map', sql.select('gfx').from('regions').where(sql.like('id', req.query.region)).toString()))[0];
    
                        if(responce && responce.gfx){
                            res.end(responce.gfx)
                        } else {
                            createReadStream('./control/data/images/not-found-404.png').pipe(res.status(404));
                        }
                    } else if(req.query.world != null){
                        res.setHeader('Content-Type', 'image/png');
                        
                        const responce = (await this.manager.query('map', sql.select('gfx').from('worlds').where(sql.like('id', req.query.world)).toString()))[0];
    
                        if(responce && responce.gfx){
                            res.end(responce.gfx)
                        } else {
                            createReadStream('./control/data/images/not-found-404.png').pipe(res.status(404));
                        }
                    } else {
                        res.status(403).end(JSON.stringify({
                            status: 'error',
                            message: 'Target not transmitted'
                        }))
                    }
                } catch (e) {
                    console.error(e);

                    res.status(500).end(JSON.stringify({
                        status: 'error',
                        message: 'Internal server error'
                    }))
                }
            break;
            default: 
                res.status(403).end(JSON.stringify({
                    status: "error",
                    message: "Unknown root function " + req.query.function[0]
                }))
            break;
        }
    }
}