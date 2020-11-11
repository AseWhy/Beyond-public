const sql = require("sql-bricks"),
      { API } = require("../../web_api_interface");

module.exports = class Api extends API {
    constructor(manager){
        super(manager, false, "POST");

        this.update_waiter = null;
        this.waiter_timeout = 1000 * 60 * 15 // 15 minutes
    }

    async handle(req, res, user){
        const _ = this;

        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        req.body.function.splice(0, 1);
        
        switch(req.body.function[0]){
            case "get":
                try {
                    const results = await this.getBinds(req.body.filter);

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
                    const results = await this.editBind(req.body.ident, req.body.data);

                    if(results.status !== "ok"){
                        if(results.code === 0x0 || results.code === 0x1 || results.code === 0x2 || results.code === 0x4)
                            res.status(403)
                        else if(results.code === 0x3)
                            res.status(500)

                        results.code = undefined;
                    } else {
                        _.manager.addAction(user.id, "Server binds operation. Bind " + req.body.ident + " has been edited");
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
                    const results = await this.removeBind(req.body.ident);

                    if(results.status !== "ok"){
                        res.status(500)

                        results.code = undefined;
                    } else {
                        _.manager.addAction(user.id, "Server binds operation. Bind " + req.body.ident + " has been removed");
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

    async editBind(ident, data) {
        let formated = new Object(), size;

        if(data != null){
            if(data.excecutor != null && typeof data.excecutor === 'string' && data.excecutor.trim() != ''){
                if(data.excecutor.length > 0 && data.excecutor.length < 255)
                    formated.excecutor = data.excecutor;
                else
                    return {
                        status: "error",
                        code: 0x0,
                        message: "The excecutor field must have a strings type only and it length may be between 1 and 254 characters."
                    }
            }

            if(data.fire_after != null){
                if(typeof data.fire_after === 'number' && data.fire_after >= 0 && data.fire_after < Number.MAX_SAFE_INTEGER)
                    formated.fire_after = data.fire_after;
                else
                    return {
                        status: "error",
                        code: 0x1,
                        message: 'The fire_after must have of type number and must be between 0 and ' + Number.MAX_SAFE_INTEGER + ' (inclusive), but give ' + data.fire_after
                    }
            }

            if(data.data != null){
                if(typeof data.data === 'object' && (size = this.manager.roughSizeOfObject(data.data)) < 102400)
                    formated.data = JSON.stringify(data.data);
                else
                    return {
                        status: "error",
                        code: 0x2,
                        message: 'The data object must have maximum weight of 100 Kib(102400 bytes), but give ' + size
                    }
            }
        }

        if(Object.keys(formated).length > 0){
            try {
                await this.manager.query('common', sql.update('binds', formated).where(sql.like('work_ident', ident)).toString());

                return {
                    status: 'ok'
                }
            } catch (e) {
                global.web_logger.error(e);

                return {
                    status: "error",
                    code: 0x3,
                    message: "Interanl server error"
                }
            }
        } else {
            return {
                status: "error",
                code: 0x4,
                message: "No initial data transmitted."
            }
        }
    }

    async getBinds(filter){
        const _ = this,
              q = sql.select('*').from('binds'),
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
            const binds = await _.manager.query("common", q.where(w.length > 0 ? sql.and(w) : sql("1")).toString());

            for(let i = 0, leng = binds.length; i < leng; i++)
                binds[i].data = JSON.parse(binds[i].data);

            if(binds.length > 0) {
                return {
                    status: "ok",
                    binds
                }
            } else {
                return {
                    status: "ok",
                    binds: new Array()
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

    async removeBind(ident){
        try {
            await this.manager.query("common", sql.deleteFrom('binds').where('work_ident', ident).toString());

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