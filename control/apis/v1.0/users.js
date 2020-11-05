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
                    const results = await this.getUsers(req.body.filter);

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
                    const results = await this.editUser(req.body.ident, req.body.data);

                    if(results.status !== "ok"){
                        if(results.code === 0x0 || results.code === 0x1 || results.code === 0x2 || results.code === 0x3 || results.code === 0x4 || results.code === 0x6 || results.code === 0x8)
                            res.status(403)
                        else if(results.code === 0x7)
                            res.status(500)

                        results.code = undefined;
                    } else {
                        _.manager.addAction(user.id, "Server users operation. User " + req.body.ident + " has been edited");
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

    async editUser(ident, data) {
        let formated = new Object(), size;

        if(data != null){
            if(data.scenario != null && typeof data.scenario === 'string' && data.scenario.trim() != ''){
                if(data.scenario.length > 0 && data.scenario.length < 255)
                    formated.scenario = data.scenario;
                else
                    return {
                        status: "error",
                        code: 0x0,
                        message: "The scenario field must have a strings type only and it length may be between 1 and 254 characters."
                    }
            }

            if(data.registered != null){
                if(typeof data.registered === 'boolean')
                    formated.registered = data.registered ? 1 : 0;
                else
                    return {
                        status: "error",
                        code: 0x1,
                        message: "The registered field must have a boolean type only"
                    }
            }

            if(data.banned != null){
                if(typeof data.banned === 'boolean')
                    formated.banned = data.banned ? 1 : 0;
                else
                    return {
                        status: "error",
                        code: 0x2,
                        message: "The banned field must have a boolean type only"
                    }
            }

            if(data.notify != null){
                if(typeof data.notify === 'boolean')
                    formated.notify = data.notify ? 1 : 0;
                else
                    return {
                        status: "error",
                        code: 0x3,
                        message: "The notify field must have a boolean type only"
                    }
            }
            
            if(data.id != null){
                if(typeof data.id === 'number' && data.id >= 0 && data.id < Number.MAX_SAFE_INTEGER)
                    formated.id = data.id;
                else
                    return {
                        status: "error",
                        code: 0x4,
                        message: 'The id must have of type number and must be between 0 and ' + Number.MAX_SAFE_INTEGER + ' (inclusive), but give ' + data.id
                    }
            }

            if(data.scenario_state != null){
                if(typeof data.scenario_state === 'number' && data.scenario_state >= 0 && data.scenario_state < 256)
                    formated.scenario_state = data.scenario_state;
                else
                    return {
                        status: "error",
                        code: 0x5,
                        message: 'The scenario_state must have of type number and must be between 0 and 255 (inclusive), but give ' + data.scenario_state
                    }
            }

            if(data.scenario_data != null){
                if(typeof data.scenario_data === 'object' && (size = this.manager.roughSizeOfObject(data.scenario_data)) < 102400)
                    formated.scenario_data = JSON.stringify(data.scenario_data);
                else
                    return {
                        status: "error",
                        code: 0x6,
                        message: 'The data object must have maximum weight of 100 Kib(102400 bytes), but give ' + size
                    }
            }
        }

        if(Object.keys(formated).length > 0){
            try {
                await this.manager.query('common', sql.update('users', formated).where(sql.like('id', ident)).toString());

                return {
                    status: 'ok'
                }
            } catch (e) {
                global.web_logger.error(e);

                return {
                    status: "error",
                    code: 0x7,
                    message: "Interanl server error"
                }
            }
        } else {
            return {
                status: "error",
                code: 0x8,
                message: "No initial data transmitted."
            }
        }
    }

    async getUsers(filter){
        const _ = this,
              q = sql.select('*').from('users'),
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
            const users = await _.manager.query("common", q.where(w.length > 0 ? sql.and(w) : sql("1")).toString());

            if(users.length > 0) {
                const characters = await _.manager.query("common", sql.select('name', 'id', 'origin', 'owner').from('characters').where(sql.or(users.map(e => sql.like('owner', e.id)))).toString()),
                      form_characters = new Map();

                for(let i = 0, leng = characters.length; i < leng;i++) {
                    form_characters.set(parseInt(characters[i].owner), characters[i]);
                }

                for(let i = 0, leng = users.length; i < leng;i++) {
                    users[i].character = form_characters.get(users[i].id);
                    users[i].scenario_data = JSON.parse(users[i].scenario_data);
                    users[i].banned = users[i].banned === 1;
                    users[i].notify = users[i].notify === 1;
                    users[i].registered = users[i].registered === 1;
                }

                return {
                    status: "ok",
                    users: users,
                    characters: characters
                }
            } else {
                return {
                    status: "ok",
                    users: new Array(),
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
}