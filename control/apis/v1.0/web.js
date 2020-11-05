const sql = require("sql-bricks"),
      { API } = require("../../web_api_interface");

module.exports = class Api extends API {
    constructor(manager){
        super(manager, false, "GET");
    }

    async handle(req, res, user){
        const _ = this;

        req.query.function.splice(0, 1);

        switch(req.query.function[0]){
            case "map":
                try {
                    if(req.query.province != null){
                        res.setHeader('Content-Type', 'image/png');
    
                        const responce = (await this.manager.query('map', sql.select('gfx').from('provinces').where(sql.like('id', parseInt(req.query.province))).toString()))[0];
    
                        if(responce.gfx){
                            res.end(responce.gfx)
                        } else {
                            res.status(403).end(JSON.stringify({
                                status: 'error',
                                message: 'cannot find province gfx for id ' + req.query.province
                            }))
                        }
                    } else if(req.query.region != null){
                        res.setHeader('Content-Type', 'image/png');
                        
                        const responce = (await this.manager.query('map', sql.select('gfx').from('regions').where(sql.like('id', parseInt(req.query.region))).toString()))[0];
    
                        if(responce.gfx){
                            res.end(responce.gfx)
                        } else {
                            res.status(403).end(JSON.stringify({
                                status: 'error',
                                message: 'cannot find region gfx for id ' + req.query.region
                            }))
                        }
                    } else if(req.query.world != null){
                        res.setHeader('Content-Type', 'image/png');
                        
                        const responce = (await this.manager.query('map', sql.select('gfx').from('worlds').where(sql.like('id', parseInt(req.query.world))).toString()))[0];
    
                        if(responce.gfx){
                            res.end(responce.gfx)
                        } else {
                            res.status(403).end(JSON.stringify({
                                status: 'error',
                                message: 'cannot find world gfx for id ' + req.query.world
                            }))
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
        }
    }
}