const { readdirSync, statSync } = require("fs"),
      { join } = require("path"),
      bricks = require("sql-bricks"),
      mysql = require("mysql");

module.exports.WebRunApi = class WebRunApi {
    constructor(app){
        const _ = this;

        _.actions_writes = new Array();
        _.apis = new Map();
        _.pools = new Map();

        for(let key in global.config.pools){
            _.pools.set(key, mysql.createPool({
                connectionLimit : 10,
                charset  : 'utf8mb4',
                host     : global.config.pools[key].host || global.config.connection.mysql.host,
                user     : global.config.pools[key].username || global.config.connection.mysql.username,
                password : global.config.pools[key].password || global.config.connection.mysql.password,
                database : global.config.pools[key].name
            }));
        }

        let apis = readdirSync(join(__dirname, "/apis")),
            extention = /\.[^.]+$/, av, na, api;

        for(let i = 0, leng = apis.length;i < leng;i++){
            av = apis[i].replace(extention, "");
            na = join(__dirname, "/apis/", apis[i]);
            api = new (require(na))(_);

            if(statSync(na).isFile())
                _.apis.set(api.alias != null ? api.alias : av, api);
        }

        app
            .all('/api/*', (req, res) => {
                const api = _.getApi(req.params[0]);

                if(api) {
                    if(api.method === req.method || api.method instanceof Array && api.method.includes(req.method)){
                        if(api.inner){
                            api.handle(req, res);
                        } else {
                            res.status(403).end(JSON.stringify({
                                status: "error",
                                message: "unable to access the api web interface"
                            }));
                        }
                    } else {
                        res.end(JSON.stringify({
                            status: "error",
                            message: "Api can only accept " + (api.method instanceof Array ? api.method.join(", ") : api.method.toString()).toUpperCase() + " requests"
                        }));
                    }
                } else
                    res.end(JSON.stringify({
                        status: "error",
                        message: "Unknown api version"
                    }))
            })

        setInterval(() => {
            const writes_dump = Array.from(_.actions_writes);

            if(writes_dump.length !== 0)
                _.pools.get('admin').query(bricks.insert('actions', ['owner', 'description', 'data']).values(writes_dump).toString(), (error, results, fields) => {
                    if(error)
                        global.web_logger.error(error);

                    global.web_logger.log("action recording completed, " + writes_dump.length + " actions recorded")

                    _.actions_writes.splice(0, writes_dump.length);
                });
            else
                global.web_logger.log("action recording completed, 0 actions recorded")
        }, 1000 * 60 * 5); // 5 minutes
    }
    
    hasPermission(user, perm){
        return user.permissions === -1 || (user.permissions & perm) != 0;
    }

    roughSizeOfObject( object ) {
        let objectList = [],
            stack = [ object ],
            bytes = 0, key;
    
        while ( stack.length ) {
            let value = stack.pop();
    
            switch(typeof value){
                case 'boolean':
                    bytes += 4;
                break;
                case 'string':
                    bytes += value.length * 2;
                break;
                case 'number':
                    bytes += 8;
                break;
                case 'object':
                    if(objectList.includes( value ))
                        break;
    
                    objectList.push(value);
    
                    for(key in value) {
                        stack.push(value[key]);
                        
                        bytes += key.length * 2;
                    }
                break;
            }
        }
    
        return bytes;
    }

    checkArg(argset, argpatt, res) {
        for(let key in argpatt){
            if(typeof argset[key] !== argpatt[key]){
                res.end(JSON.stringify({
                    status: "error",
                    message: "Wrong argument " + key
                }));

                return false;
            }
        }
        return true;
    }

    requestUpdate(name){
        return global.web_messager.send('update_manager', {name});
    }

    query(basename, query){
        const _ = this;

        return new Promise((res, rej) => {
            if(!_.pools.has(basename)){
                const error = new Error("Base not found " + basename);

                global.web_logger.warn(error);

                rej(error);

                return;
            }

            _.pools.get(basename).query(query, (error, results, fields) => {
                if(error){
                    global.web_logger.error("Error when query '" + query + "'", error);

                    rej(error);

                    return;
                }

                res(results, fields);
            })
        })
    }

    addAction(owner, msg, data){
        this.actions_writes.push([owner, msg, JSON.stringify(data)]);
    }

    getApi(v){
        return this.apis.get(v.replace(/\/|\\/g, ''));
    }
}