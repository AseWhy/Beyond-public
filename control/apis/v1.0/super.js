const sql = require("sql-bricks"),
      { createHash } = require("crypto"),
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
            case "users":
                switch(req.body.function[1]){
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
                    case "add":
                        try {
                            const results = await this.addUser(req.body.data);

                            if(results.status !== "ok"){
                                if(results.code === 0x0 || results.code === 0x1 || results.code === 0x3)
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
                                if(results.code === 0x0 || results.code === 0x1 || results.code === 0x2 || results.code === 0x3 || results.code === 0x5)
                                    res.status(403)
                                else if(results.code === 0x4)
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
                            const results = await this.removeUser(req.body.ident);

                            if(results.status !== "ok"){
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
                    default: 
                        res.status(403).end(JSON.stringify({
                            status: "error",
                            message: "Unknown root function " + req.body.function[1]
                        }))
                    break;
                }
            break;
            case "roles":
                switch(req.body.function[1]){
                    case "get":
                        try {
                            const results = await this.getRole(req.body.filter);

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
                            const results = await this.addRole(req.body.data);

                            if(results.status !== "ok"){
                                if(results.code === 0x0 || results.code === 0x2)
                                    res.status(403)
                                else if(results.code === 0x1)
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
                            const results = await this.editRole(req.body.ident, req.body.data);

                            if(results.status !== "ok"){
                                if(results.code === 0x0 || results.code === 0x1 || results.code === 0x3)
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
                            const results = await this.removeRole(req.body.ident);

                            if(results.status !== "ok"){
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
                    default: 
                        res.status(403).end(JSON.stringify({
                            status: "error",
                            message: "Unknown root function " + req.body.function[1]
                        }))
                    break;
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

    async addUser(data){
        let formated = new Object();

        if(data != null){
            if(data.login != null && typeof data.login === 'string' && data.login.trim() != ''){
                if(data.login.length < 255)
                    formated.login = createHash('sha256').update(data.login).digest('hex');
                else
                    return {
                        status: "error",
                        code: 0x0,
                        message: "The login field must have a strings type only and it length may be between 1 and 254 characters."
                    }
            }

            if(data.password != null && typeof data.password === 'string' && data.password.trim() != ''){
                if(data.password.length < 255)
                    formated.password = createHash('sha256').update(data.password).digest('hex');
                else
                    return {
                        status: "error",
                        code: 0x1,
                        message: "The password field must have a strings type only and it length may be between 1 and 254 characters."
                    }
            }
        }

        if(Object.keys(formated).length > 0){
            try {
                await this.manager.query('admin', sql.insert('users', formated).toString());

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

    async editUser(ident, data) {
        let formated = new Object();

        if(data != null){
            if(data.login != null && typeof data.login === 'string' && data.login.trim() != ''){
                if(data.login.length < 255)
                    formated.login = createHash('sha256').update(data.login).digest('hex');
                else
                    return {
                        status: "error",
                        code: 0x0,
                        message: "The login field must have a strings type only and it length may be between 1 and 254 characters."
                    }
            }

            if(data.password != null && typeof data.password === 'string' && data.password.trim() != ''){
                if(data.password.length < 255)
                    formated.password = createHash('sha256').update(data.password).digest('hex');
                else
                    return {
                        status: "error",
                        code: 0x1,
                        message: "The password field must have a strings type only and it length may be between 1 and 254 characters."
                    }
            }

            if(data.role != null && typeof data.role === 'string' && data.role.trim() != ''){
                if(data.role.length < 255)
                    formated.role = data.role;
                else
                    return {
                        status: "error",
                        code: 0x2,
                        message: "The password field must have a strings type only and it length may be between 1 and 254 characters."
                    }
            }

            if(data.display_name != null && typeof data.display_name === 'string' && data.display_name.trim() != ''){
                if(data.display_name.length < 255)
                    formated.display_name = data.display_name;
                else
                    return {
                        status: "error",
                        code: 0x3,
                        message: "The password field must have a strings type only and it length may be between 1 and 254 characters."
                    }
            }

            if(data.avatar != null){
                formated.avatar = sql('0x' + Buffer.from(data.avatar, 'hex').toString('hex'));
            }
        }

        if(Object.keys(formated).length > 0){
            try {
                await this.manager.query('admin', sql.update('users', formated).where(sql.like('id', ident)).toString());

                return {
                    status: 'ok'
                }
            } catch (e) {
                global.web_logger.error(e);

                return {
                    status: "error",
                    code: 0x4,
                    message: "Interanl server error"
                }
            }
        } else {
            return {
                status: "error",
                code: 0x5,
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
            const users = await _.manager.query("admin", q.where(w.length > 0 ? sql.and(w) : sql("1")).toString());

            if(users.length > 0) {
                for(let i = 0, leng = users.length;i < leng; i++)
                    users[i].avatar = users[i].avatar != null ? users[i].avatar.toString('hex') : null;

                return {
                    status: "ok",
                    users: users,
                    roles: await _.manager.query("admin", sql.select('*').from('roles').toString()),
                }
            } else {
                return {
                    status: "ok",
                    users: new Array(),
                    roles: new Array()
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

    async removeUser(ident){
        try {
            await this.manager.query("admin", sql.deleteFrom('users').where('id', ident).toString());

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

    async addRole(data){
        let formated = new Object();

        if(data != null){
            if(data.rolename != null && typeof data.rolename === 'string' && data.rolename.trim() != ''){
                if(data.rolename.length < 255)
                    formated.rolename = data.rolename;
                else
                    return {
                        status: "error",
                        code: 0x0,
                        message: "The rolename field must have a strings type only and it length may be between 1 and 254 characters."
                    }
            }
        }

        if(Object.keys(formated).length > 0){
            try {
                await this.manager.query('admin', sql.insert('roles', formated).toString());

                return {
                    status: 'ok'
                }
            } catch (e) {
                global.web_logger.error(e);

                return {
                    status: "error",
                    code: 0x1,
                    message: "Interanl server error"
                }
            }
        } else {
            return {
                status: "error",
                code: 0x2,
                message: "No initial data transmitted."
            }
        }
    }

    async editRole(ident, data) {
        let formated = new Object();

        if(data != null){
            if(data.rolename != null && typeof data.rolename === 'string' && data.rolename.trim() != ''){
                if(data.rolename.length < 255)
                    formated.rolename = data.rolename;
                else
                    return {
                        status: "error",
                        code: 0x0,
                        message: "The rolename field must have a strings type only and it length may be between 1 and 254 characters."
                    }
            }

            if(data.permissions != null){
                if(typeof data.permissions === 'number' && data.permissions > -Number.MAX_SAFE_INTEGER && data.permissions < Number.MAX_SAFE_INTEGER)
                    formated.permissions = data.permissions;
                else
                    return {
                        status: "error",
                        code: 0x1,
                        message: "The permissions field must have a number type only and it value may be between " + -Number.MAX_SAFE_INTEGER + " and " + Number.MAX_SAFE_INTEGER + " characters."
                    }
            }
        }

        if(Object.keys(formated).length > 0){
            try {
                await this.manager.query('admin', sql.update('roles', formated).where(sql.like('ident', ident)).toString());

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

    async getRole(filter){
        const _ = this,
              q = sql.select('*').from('roles'),
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
            const roles = await _.manager.query("admin", q.where(w.length > 0 ? sql.and(w) : sql("1")).toString());

            if(roles.length > 0) {
                return {
                    status: "ok",
                    roles: roles,
                }
            } else {
                return {
                    status: "ok",
                    roles: new Array()
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

    async removeRole(ident){
        try {
            await this.manager.query("admin", sql.deleteFrom('roles').where('ident', ident).toString());

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