const sql = require("sql-bricks"),
      { API } = require("../../web_api_interface");

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
                    const results = await this.getCharacters(req.body.filter);

                    if(results.status !== "ok"){
                        if(results.code === 0x0 || results.code === 0x1)
                            res.status(403)
                        else if(results.code === 0x2)
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
            case "edt":
                try {
                    const results = await this.editCharacter(req.body.ident, req.body.data);

                    if(results.status !== "ok"){
                        if(results.code === 0x0 || results.code === 0x1 || results.code === 0x2 || results.code === 0x3 || results.code === 0x4 || results.code === 0x6 || results.code === 0x7 || results.code === 0x9)
                            res.status(403)
                        else if(results.code === 0x8)
                            res.status(500)

                        results.code = undefined;
                    } else {
                        _.manager.addAction(user.id, "Server characters operation. Character " + req.body.ident + " has been edited");
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
            case "rem":
                try {
                    const results = await this.removeCharacter(req.body.ident);

                    if(results.status !== "ok"){
                        res.status(500)

                        results.code = undefined;
                    } else {
                        _.manager.addAction(user.id, "Server characters operation. Character " + req.body.ident + " has been removed");
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
            default: 
                res.status(403).end(JSON.stringify({
                    status: "error",
                    message: "Unknown root function " + req.body.function[0]
                }))
            break;
        }
    }

    async editCharacter(ident, data) {
        let formated = new Object(), size;

        if(data != null){
            if(data.name != null && typeof data.name === 'string' && data.name.trim() != ''){
                if(data.name.length > 0 && data.name.length < 255)
                    formated.name = data.name;
                else
                    return {
                        status: "error",
                        code: 0x0,
                        message: "The name field must have a strings type only and it length may be between 1 and 254 characters."
                    }
            }

            if(data.id != null){
                if(typeof data.id === 'number' && data.id >= 0 && data.id < Number.MAX_SAFE_INTEGER)
                    formated.id = data.id;
                else
                    return {
                        status: "error",
                        code: 0x1,
                        message: 'The id must have of type number and must be between 0 and ' + Number.MAX_SAFE_INTEGER + ' (inclusive), but give ' + data.id
                    }
            }

            if(data.health != null){
                if(typeof data.health === 'number' && data.health >= 0 && data.health < Number.MAX_SAFE_INTEGER)
                    formated.health = data.health;
                else
                    return {
                        status: "error",
                        code: 0x2,
                        message: 'The health must have of type number and must be between 0 and ' + Number.MAX_SAFE_INTEGER + ' (inclusive), but give ' + data.health
                    }
            }

            if(data.endurance != null){
                if(typeof data.endurance === 'number' && data.endurance >= 0 && data.endurance < Number.MAX_SAFE_INTEGER)
                    formated.endurance = data.endurance;
                else
                    return {
                        status: "error",
                        code: 0x3,
                        message: 'The id must have of type number and must be between 0 and ' + Number.MAX_SAFE_INTEGER + ' (inclusive), but give ' + data.endurance
                    }
            }

            if(data.map != null){
                if(typeof data.map === 'object' && Array.isArray(data.map))
                    formated.map = data.map.join('/');
                else
                    return {
                        status: "error",
                        code: 0x4,
                        message: 'The map must have of type array, but give ' + (typeof data.map)
                    }
            }

            if(data.inventory != null){
                if(typeof data.inventory === 'object' && (size = this.manager.roughSizeOfObject(data.inventory)) < 102400)
                    formated.inventory = JSON.stringify(data.inventory);
                else
                    return {
                        status: "error",
                        code: 0x5,
                        message: 'The inventory object must have maximum weight of 100 Kib(102400 bytes), but give ' + size
                    }
            }

            if(data.experience != null){
                if(typeof data.experience === 'object' && (size = this.manager.roughSizeOfObject(data.experience)) < 10240)
                    formated.experience = JSON.stringify(data.experience);
                else
                    return {
                        status: "error",
                        code: 0x6,
                        message: 'The experience object must have maximum weight of 10 Kib(10240 bytes), but give ' + size
                    }
            }

            if(data.data != null){
                if(typeof data.data === 'object' && (size = this.manager.roughSizeOfObject(data.data)) < 102400)
                    formated.data = JSON.stringify(data.data);
                else
                    return {
                        status: "error",
                        code: 0x7,
                        message: 'The data object must have maximum weight of 100 Kib(102400 bytes), but give ' + size
                    }
            }
        }

        if(Object.keys(formated).length > 0){
            try {
                await this.manager.query('common', sql.update('characters', formated).where(sql.like('id', ident)).toString());

                return {
                    status: 'ok'
                }
            } catch (e) {
                global.web_logger.error(e);

                return {
                    status: "error",
                    code: 0x8,
                    message: "Interanl server error"
                }
            }
        } else {
            return {
                status: "error",
                code: 0x9,
                message: "No initial data transmitted."
            }
        }
    }

    async getCharacters(filter){
        const _ = this,
              q = sql.select('*').from('characters'),
              w = new Array();
        
        if(filter){
            if(filter.contains){
                let p = new Array(),
                    c = filter.contains.data;
                    
                if(c instanceof Array){
                        for(let i = 0, leng = c.length;i < leng;i++){
                            p.push(sql.like(c[i].name, `%${c[i].value}%`));
                        }

                    if(filter.contains.operator && filter.contains.operator === "or")
                        w.push(sql.or(p));
                    else
                        w.push(sql.and(p));
                } else if(typeof c === "object") {
                    w.push(sql.like(c.name, `%${c.value}%`));
                } else
                    return {
                        status: "error",
                        code: 0x0,
                        message: "Contains must be object or array"
                    }
            }
            
            if(filter.beetwen){
                if(typeof filter.beetwen === "object")
                    w.push(sql.between(filter.beetwen.column, filter.beetwen.from, filter.beetwen.to));
                else
                    return {
                        status: "error",
                        code: 0x1,
                        message: "Beetwen must be object or array"
                    }
            }
        }

        try {
            const characters = await _.manager.query("common", q.where(w.length > 0 ? sql.and(w) : sql("1")).toString())

            if(characters.length > 0) {
                for(let i = 0, leng = characters.length;i < leng;i++){
                    characters[i].inventory     = characters[i].inventory   != null ? JSON.parse(characters[i].inventory)               : null;
                    characters[i].data          = characters[i].data        != null ? JSON.parse(characters[i].data)                    : null;
                    characters[i].experience    = characters[i].experience  != null ? JSON.parse(characters[i].experience)              : null;
                    characters[i].businesses    = characters[i].businesses  != null ? characters[i].businesses.split(',')               : null;
                    characters[i].own           = characters[i].own         != null ? characters[i].own.split(',')                      : null;
                    characters[i].busts         = characters[i].busts       != null ? characters[i].busts.split(',')                    : null;
                    characters[i].map           = characters[i].map         != null ? characters[i].map.split('/')                      : new Array();
                    characters[i].sex           = characters[i].sex         != null ? characters[i].sex[0] === 0 ? 'Male' : 'Female'    : null;
                    characters[i].owner         = characters[i].owner       != null ? parseInt(characters[i].owner)                     : null;
                }
                
                return {
                    status: "ok",
                    characters: characters
                }
            } else {
                return {
                    status: "ok",
                    characters: new Array()
                }
            }
        } catch (e) {
            global.web_logger.error(e);

            return {
                status: "error",
                code: 0x2,
                message: "Error while executing request"
            };
        }
    }

    async removeCharacter(ident){
        try {
            await this.manager.query("common", sql.deleteFrom('characters').where('id', ident).toString());

            return {
                status: 'ok'
            }
        } catch (e) {
            global.web_logger.error(e);

            return {
                status: "error",
                code: 0x0,
                message: "Error while executing request"
            };
        }
    }
}