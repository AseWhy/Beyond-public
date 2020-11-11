const sql = require('sql-bricks'),
      { API } = require("../../web_api_interface");

module.exports = class Api extends API {
    constructor(manager){
        super(manager, false, "POST");

        this.update_waiter = null;
        this.waiter_timeout = 1000 * 60 * 15 // 15 minutes
    }

    update(){
        const _ = this;

        if(_.update_waiter)
            clearTimeout(_.update_waiter)

        _.update_waiter = setTimeout(() => {
            _.update_waiter = null;

            _.manager.requestUpdate('businesses');
        }, _.waiter_timeout)
    }

    async handle(req, res, user){
        const _ = this;

        req.body.function.splice(0, 1);

        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        switch(req.body.function[0]){
            case "get":
                try {
                    const results = await this.getBusinesses(req.body.filter);

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
            case "rem":
                try {
                    const results = await this.remItem(req.body.ident);

                    if(results.status !== "ok"){
                        res.status(500) 

                        results.code = undefined;
                    } else {
                        _.manager.addAction(user.id, "Server businesses operation. Business " + req.body.ident + " has been removed");
                    }

                    res.end(JSON.stringify(results));

                    this.update();
                } catch (e){
                    global.web_logger.error(e);

                    res.status(500).end(JSON.stringify({
                        status: "error",
                        message: "Error while excecutiong request"
                    }))
                }
            break;
            case "add":
                try {
                    const results = await this.addBusinesses(req.body.data);

                    if(results.status !== "ok"){
                        if(results.code === 0x0 || results.code === 0x1)
                            res.status(403)
                        else if(results.code === 0x2)
                            res.status(500)

                        results.code = undefined;
                    } else {
                        _.manager.addAction(user.id, "Server businesses operation. Business has been added");
                    }

                    res.end(JSON.stringify(results));

                    this.update();
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
                    const results = await this.editBusinesses(req.body.ident, req.body.data);

                    if(results.status !== "ok"){
                        if(results.code === 0x0 || results.code === 0x1 || results.code === 0x2 || results.code === 0x3 || results.code === 0x4 || results.code === 0x6)
                            res.status(403)
                        else if(results.code === 0x5)
                            res.status(500)

                        results.code = undefined;
                    } else {
                        _.manager.addAction(user.id, "Server businesses operation. Business " + req.body.ident + " has been edited");
                    }

                    res.end(JSON.stringify(results));

                    this.update();
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

    async getBusinesses(filter) {
        const _ = this,
              q = sql.select("*").from('businesses'),
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
            return {
                status: "ok",
                businesses: (await _.manager.query("common", q.where(w.length > 0 ? sql.and(w) : sql("1")).toString())).map(e => ({...e, data: JSON.parse(e.data)}))
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

    async remItem(i){
        try {
            await this.manager.query("common", sql.delete('businesses').where(sql.like('id', i)).toString());

            return {
                status: "ok",
            }
        } catch(e){
            global.web_logger.error(e);

            return {
                status: "error",
                code: 0x0,
                message: "Error while executing request"
            }
        }
    }

    async editBusinesses(ident, data) {
        let formated = new Object(), size;

        if(data != null){
            if(data.display != null){
                if(typeof data.display === 'string' && data.display.length > 0 && data.display.length < 255)
                    formated.display = data.display;
                else
                    return {
                        status: "error",
                        code: 0x0,
                        message: "The display field must have a strings type only and it length may be between 1 and 254 characters."
                    }
            }

            if(data.description != null && data.description.trim() != ''){
                if(typeof data.description === 'string' && data.description.length < 10000)
                    formated.description = data.description;
                else
                    return {
                        status: "error",
                        code: 0x1,
                        message: "The description field must have a strings type only and it length may be less than 10000 characters."
                    }
            }

            if(data.condition_data != null && typeof data.condition_data === 'string' && data.condition_data.length < 255)
                formated.condition_data = data.condition_data;
            else
                return {
                    status: "error",
                    code: 0x2,
                    message: "The condition_data field must have a strings type only and it length may be between 1 and 254 characters."
                }
            
            if(data.type != null){
                if(typeof data.type === 'number' && data.type >= 0 && data.type < Number.MAX_SAFE_INTEGER)
                    formated.type = data.type;
                else
                    return {
                        status: "error",
                        code: 0x3,
                        message: 'The type must be of type number and must be between 0 and ' + Number.MAX_SAFE_INTEGER + ' (inclusive), but give ' + data.type
                    }
            }

            if(data.data != null){
                if(typeof data.data === 'object' && (size = this.manager.roughSizeOfObject(data.data)) < 25600)
                    formated.data = JSON.stringify(data.data);
                else
                    return {
                        status: "error",
                        code: 0x4,
                        message: 'The data object must have maximum weight of 25 Kib(25600 bytes), but give ' + size
                    }
            }
        }

        if(Object.keys(formated).length > 0){
            try {
                await this.manager.query('common', sql.update('businesses', formated).where(sql.like('id', ident)).toString());

                return {
                    status: 'ok'
                }
            } catch (e) {
                global.web_logger.error(e);

                return {
                    status: "error",
                    code: 0x5,
                    message: "Interanl server error"
                }
            }
        } else {
            return {
                status: "error",
                code: 0x6,
                message: "No initial data transmitted."
            }
        }
    }

    async addBusinesses(data) {
        const formated = new Object();

        if(data != null){
            if(data.display != null){
                if(typeof data.display === 'string' && data.display.length > 0 && data.display.length < 255)
                    formated.display = data.display;
                else
                    return {
                        status: "error",
                        code: 0x0,
                        message: "The display field must have a strings type only and it length may be between 1 and 254 characters."
                    }
            }

            if(data.description != null){
                if(typeof data.description === 'string' && data.description.length > 0 && data.description.length < 10000)
                    formated.description = data.description;
                else
                    return {
                        status: "error",
                        code: 0x1,
                        message: "The description field must have a strings type only and it length may be between 1 and 9999 characters."
                    }
            }
        }

        formated.condition_data = 'true';

        try {
            await this.manager.query('common', sql.insert('businesses', formated).toString());

            return {
                status: 'ok'
            }
        } catch (e) {
            global.web_logger.error(e);

            return {
                status: "error",
                code: 0x2,
                message: "Interanl server error"
            }
        }
    }
}