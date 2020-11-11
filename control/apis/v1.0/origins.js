const sql = require("sql-bricks"),
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

            _.manager.requestUpdate('origin');
        }, _.waiter_timeout)
    }

    async handle(req, res, user){
        const _ = this;

        res.setHeader('Content-Type', 'application/json; charset=utf-8');

        req.body.function.splice(0, 1);
        
        switch(req.body.function[0]){
            case "get":
                try {
                    const results = await this.getOrigins(req.body.filter);

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
            case "add":
                try {
                    const results = await this.addOrigin(req.body.data);

                    if(results.status !== "ok"){
                        if(results.code === 0x0 || results.code === 0x1 || results.code === 0x3)
                            res.status(403)
                        else if(results.code === 0x2)
                            res.status(500)

                        results.code = undefined;
                    } else {
                        _.manager.addAction(user.id, "Server origins operation. Origin " + req.body.ident + " has been added");
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
                    const results = await this.editOrigin(req.body.ident, req.body.data);

                    if(results.status !== "ok"){
                        if(results.code === 0x0 || results.code === 0x1 || results.code === 0x2 || results.code === 0x3 || results.code === 0x4 || results.code === 0x6 || results.code === 0x8)
                            res.status(403)
                        else if(results.code === 0x7)
                            res.status(500)

                        results.code = undefined;
                    } else {
                        _.manager.addAction(user.id, "Server origins operation. Origin " + req.body.ident + " has been edited");
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
            case "rem":
                try {
                    const results = await this.removeOrigin(req.body.ident);

                    if(results.status !== "ok"){
                        res.status(500)

                        results.code = undefined;
                    } else {
                        _.manager.addAction(user.id, "Server origins operation. Origin " + req.body.ident + " has been removed");
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

    async addOrigin(data){
        let formated = new Object();

        if(data != null){
            if(data.pd_origin_desc != null && typeof data.pd_origin_desc === 'string' && data.pd_origin_desc.trim() != ''){
                formated.pd_origin_desc = data.pd_origin_desc;
            }

            if(data.pd_origin_display != null && typeof data.pd_origin_display === 'string' && data.pd_origin_display.trim() != ''){
                if(data.pd_origin_display.length > 0 && data.pd_origin_display.length < 255)
                    formated.pd_origin_display = data.pd_origin_display;
                else
                    return {
                        status: "error",
                        code: 0x0,
                        message: "The pd_origin_display field must have a strings type only and it length may be between 1 and 254 characters."
                    }
            }

            if(data.pd_origin_name != null && typeof data.pd_origin_name === 'string' && data.pd_origin_name.trim() != ''){
                if(data.pd_origin_name.length > 0 && data.pd_origin_name.length < 255)
                    formated.pd_origin_name = data.pd_origin_name;
                else
                    return {
                        status: "error",
                        code: 0x1,
                        message: "The pd_origin_name field must have a strings type only and it length may be between 1 and 254 characters."
                    }
            }
        }

        if(Object.keys(formated).length > 0){
            try {
                await this.manager.query('common', sql.insert('origin_defaults', {...formated, data: `{"pay":{"bans": 0},"busts":{"health": 0,"endurance": 0},"skills":{"craft": 0,"trade": 0,"battle": 0,"command": 0,"control": 0},"stats":{"agility": 0,"strength": 0,"intelligence": 0}}`}).toString());

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
        } else {
            return {
                status: "error",
                code: 0x3,
                message: "No initial data transmitted."
            }
        }
    }

    async editOrigin(ident, data) {
        let formated = new Object(), size;

        if(data != null){
            if(data.pd_origin_desc != null && typeof data.pd_origin_desc === 'string' && data.pd_origin_desc.trim() != ''){
                formated.pd_origin_desc = data.pd_origin_desc;
            }

            if(data.pd_origin_display != null && typeof data.pd_origin_display === 'string' && data.pd_origin_display.trim() != ''){
                if(data.pd_origin_display.length > 0 && data.pd_origin_display.length < 255)
                    formated.pd_origin_display = data.pd_origin_display;
                else
                    return {
                        status: "error",
                        code: 0x0,
                        message: "The pd_origin_display field must have a strings type only and it length may be between 1 and 254 characters."
                    }
            }

            if(data.pd_origin_name != null && typeof data.pd_origin_name === 'string' && data.pd_origin_name.trim() != ''){
                if(data.pd_origin_name.length > 0 && data.pd_origin_name.length < 255)
                    formated.pd_origin_name = data.pd_origin_name;
                else
                    return {
                        status: "error",
                        code: 0x1,
                        message: "The pd_origin_name field must have a strings type only and it length may be between 1 and 254 characters."
                    }
            }

            if(data.data){
                formated.data = new Object();

                if(data.data.pay != null){
                    formated.data.pay = new Object();

                    if(data.data.pay.bans != null){
                        if(typeof data.data.pay.bans === 'number' && data.data.pay.bans >= 0 && data.data.pay.bans < Number.MAX_SAFE_INTEGER)
                            formated.data.pay.bans = data.data.pay.bans;
                        else
                            return {
                                status: "error",
                                code: 0x2,
                                message: 'The pay.bans must have of type number and must be between 0 and ' + Number.MAX_SAFE_INTEGER + ' (inclusive), but give ' + data.data.pay.bans
                            }
                    }

                    if(Object.keys(formated.data.pay).length === 0)
                        delete formated.data.pay;
                }

                if(data.data.busts != null){
                    formated.data.busts = new Object();
                    
                    // Health
                    if(data.data.busts.health != null){
                        if(typeof data.data.busts.health === 'number' && data.data.busts.health >= 0 && data.data.busts.health < Number.MAX_SAFE_INTEGER)
                            formated.data.busts.health = data.data.busts.health;
                        else
                            return {
                                status: "error",
                                code: 0x3,
                                message: 'The busts.health must have of type number and must be between 0 and ' + Number.MAX_SAFE_INTEGER + ' (inclusive), but give ' + data.data.busts.health
                            }
                    }

                    // Endurance
                    if(data.data.busts.endurance != null){
                        if(typeof data.data.busts.endurance === 'number' && data.data.busts.endurance >= 0 && data.data.busts.endurance < Number.MAX_SAFE_INTEGER)
                            formated.data.busts.endurance = data.data.busts.endurance;
                        else
                            return {
                                status: "error",
                                code: 0x4,
                                message: 'The busts.endurance must have of type number and must be between 0 and ' + Number.MAX_SAFE_INTEGER + ' (inclusive), but give ' + data.data.busts.endurance
                            }
                    }

                    if(Object.keys(formated.data.busts).length === 0)
                        delete formated.data.busts;
                }

                if(data.data.stats != null){
                    formated.data.stats = new Object();

                    for(let key in data.data.stats){
                        if(data.data.stats[key] != null){
                            if(typeof data.data.stats[key] === 'number' && data.data.stats[key] > -Number.MAX_SAFE_INTEGER && data.data.stats[key] < Number.MAX_SAFE_INTEGER)
                                formated.data.stats[key] = data.data.stats[key];
                            else
                                return {
                                    status: "error",
                                    code: 0x5,
                                    message: 'The stats.' + key + ' must have of type number and must be between 0 and ' + Number.MAX_SAFE_INTEGER + ' (inclusive), but give ' + data.data.skills[key]
                                }
                        }
                    }

                    if(Object.keys(formated.data.stats).length === 0)
                        delete formated.data.stats;
                }

                if(data.data.skills != null){
                    formated.data.skills = new Object();

                    for(let key in data.data.skills){
                        if(data.data.skills[key] != null){
                            if(typeof data.data.skills[key] === 'number' && data.data.skills[key] > -Number.MAX_SAFE_INTEGER && data.data.skills[key] < Number.MAX_SAFE_INTEGER)
                                formated.data.skills[key] = data.data.skills[key];
                            else
                                return {
                                    status: "error",
                                    code: 0x6,
                                    message: 'The skills.' + key + ' must have of type number and must be between 0 and ' + Number.MAX_SAFE_INTEGER + ' (inclusive), but give ' + data.data.skills[key]
                                }
                        }
                    }

                    if(Object.keys(formated.data.skills).length === 0)
                        delete formated.data.skills;
                }

                formated.data = JSON.stringify(formated.data).replace(/\\/g, '\\\\');
            }
        }

        if(Object.keys(formated).length > 0){
            try {
                await this.manager.query('common', sql.update('origin_defaults', formated).where(sql.like('pd_origin_name', ident)).toString());

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

    async getOrigins(filter){
        const _ = this,
              q = sql.select('*').from('origin_defaults'),
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
            const origins = await _.manager.query("common", q.where(w.length > 0 ? sql.and(w) : sql("1")).toString());

            for(let i = 0, leng = origins.length; i < leng; i++)
                origins[i].data = JSON.parse(origins[i].data);

            if(origins.length > 0) {
                return {
                    status: "ok",
                    origins
                }
            } else {
                return {
                    status: "ok",
                    origins: new Array()
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

    async removeOrigin(ident){
        try {
            await this.manager.query("common", sql.deleteFrom('origin_defaults').where('pd_origin_name', ident).toString());

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