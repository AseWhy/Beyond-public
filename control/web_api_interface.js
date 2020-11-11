const { statSync } = require("fs"),
      { join } = require('path');

module.exports.PERMISSIONS = {
    // Common permissions
    LOGIN:          0x0001,
    UPDATE:         0x0002,
    WEB_INTERFACE:  0x0004,
    LOGS:           0x0008,
    ITEMS:          0x0010,
    STATISTICS:     0x0020,
    BUSINESSES:     0x0040,
    USERS:          0x0080,
    CHARACTERS:     0x0100,
    MAILING:        0x0200,
    MAP:            0x0400,
    ACTIONS:        0x0800,
    ORIGINS:        0x1000,
    BINDS:          0x2000
}

module.exports.API = class API {
    constructor(manager, inner, method, alias){
        this.manager = manager;
        this.alias = alias;
        this.inner = inner;
        this.method = method;

        this.subApis = new Map();
    }

    addSubApi(key, path){
        path = join(__dirname, 'apis', path);

        if(statSync(path).isFile()){
            const api = new (require(path))(this.manager);

            if(api instanceof API)
                this.subApis.set(key || api.alias, api);
            else
                throw new TypeError("The api must be an API instance");
        } else
            throw new TypeError("The path " + path + " does not link to file.");
    }

    dropTo(key, req, res, ...args){
        if(this.subApis.has(key)){
            const api = this.subApis.get(key);

            if(api.method === req.method || (api.method instanceof Array && api.method.includes(req.method))){
                return api.handle(req, res, ...args);
            } else {
                res.end(JSON.stringify({
                    status: "error",
                    message: "Api can only accept " + (api.method instanceof Array ? api.method.join(", ") : api.method.toString()).toUpperCase() + " requests"
                }));
            }
        } else {
            throw new TypeError("Cannot find api " + key);
        }
    }

    getSubApi(key){
        return this.subApis.get(key);
    }
}