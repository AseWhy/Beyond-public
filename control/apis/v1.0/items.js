const sql = require("sql-bricks"),
      { API } = require("../../web_api_interface");

module.exports = class Api extends API {
    constructor(manager){
        super(manager, false, "POST");

        this.update_waiter = null;
        this.waiter_timeout = 1000 * 60 * 15;
    }

    async handle(req, res, user){
        const _ = this;

        req.body.function.splice(0, 1);

        res.setHeader('Content-Type', 'application/json; charset=utf-8')

        switch(req.body.function[0]){
            case "items":
                switch(req.body.function[1]){
                    case "get":
                        try {
                            const results = await this.getItem(req.body.filter);

                            if(results.status !== "ok"){
                                if(results.code === 0x0 || results.code === 0x1)
                                    res.status(403)
                                else if(results.code === 0x2)
                                    res.status(500)

                                results.code = undefined;
                            }

                            res.end(JSON.stringify(results));
                        } catch (e){
                            res.status(500).end(JSON.stringify({
                                status: "error",
                                message: "Error while excecutiong request"
                            }))
                        }
                    break;
                    case "set":
                        try {
                            const results = await this.setItem(req.body.data);

                            if(results.status !== "ok"){
                                if(results.code === 0x0 || results.code === 0x1)
                                    res.status(500)
                                else
                                    res.status(403)

                                results.code = undefined;
                            } else {
                                _.manager.addAction(user.id, "Server item operation. Item " + req.body.data.named_id + ' installation', req.body.data);
                            }

                            res.end(JSON.stringify(results));

                            _.update();
                        } catch (e){
                            res.status(500).end(JSON.stringify({
                                status: "error",
                                message: "Error while excecutiong request"
                            }))
                        }
                    break;
                    case "rem":
                        try {
                            const results = await this.remItem(req.body.named_id);

                            if(results.status !== "ok"){
                                res.status(500)

                                results.code = undefined;
                            } else {
                                _.manager.addAction(user.id, "Server item operation. Item " + req.body.named_id + ' removed', {id: req.body.named_id});
                            }

                            res.end(JSON.stringify(results));

                            _.update();
                        } catch (e){
                            res.status(500).end(JSON.stringify({
                                status: "error",
                                message: "Error while excecutiong request"
                            }))
                        }
                    break;
                    case "edt":
                        try {
                            const results = await this.edtItem(req.body.named_id, req.body.data);

                            if(results.status !== "ok"){
                                res.status(500)

                                results.code = undefined;
                            } else {
                                _.manager.addAction(user.id, "Server item operation. Item " + req.body.named_id + ' edited', {id: req.body.data});
                            }

                            res.end(JSON.stringify(results));

                            _.update();
                        } catch (e){
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
            break
            case "types":
                switch(req.body.function[1]){
                    case "add":
                        try {
                            const results = await this.addType(req.body.data);
        
                            if(results.status !== "ok"){
                                if(results.code === 0x1 || results.code === 0x2 || results.code === 0x3 || results.code === 0x4)
                                    res.status(403)
                                else if(results.code === 0x0)
                                    res.status(500)
        
                                results.code = undefined;
                            } else {
                                _.manager.addAction(user.id, "Server item type operation. Item type " + req.body.data.named_id + ' addition', req.body.data);
                            }
        
                            res.end(JSON.stringify(results));
                        } catch (e){
                            res.status(500).end(JSON.stringify({
                                status: "error",
                                message: "Error while excecutiong request"
                            }))
                        }
                    break;
                    case "rem":
                        try {
                            const results = await this.remType(req.body.ident);
        
                            if(results.status !== "ok"){
                                res.status(500)
        
                                results.code = undefined;
                            } else {
                                _.manager.addAction(user.id, "Server item type operation. Item type " + req.body.ident + ' removed', {id: req.body.id});
                            }
        
                            res.end(JSON.stringify(results));

                            _.update();
                        } catch (e){
                            res.status(500).end(JSON.stringify({
                                status: "error",
                                message: "Error while excecutiong request"
                            }))
                        }
                    break;
                    case "edt":
                        try {
                            const results = await this.edtType(req.body.ident, req.body.data);
        
                            if(results.status !== "ok"){
                                if(results.code === 0x1 || results.code === 0x2 || results.code === 0x3 || results.code === 0x4)
                                    res.status(403)
                                else if(results.code === 0x0)
                                    res.status(500)
        
                                results.code = undefined;
                            } else {
                                _.manager.addAction(user.id, "Server item type operation. Item type " + req.body.ident + ' edited', {id: req.body.data});
                            }
        
                            res.end(JSON.stringify(results));

                            _.update();
                        } catch (e){
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

    update(){
        const _ = this;

        if(_.update_waiter)
            clearTimeout(_.update_waiter)

        _.update_waiter = setTimeout(() => {
            _.update_waiter = null;

            _.manager.requestUpdate('item');
        }, _.waiter_timeout)
    }

    async addType(data){
        try {
            const formated = new Object();

            if(typeof data.display === "string")
                formated.display = data.display
            else if(data.display != undefined)
                return {
                    status: 'error',
                    code: 0x1,
                    message: 'the display must be string'
                }

            if(typeof data.description === "string")
                formated.description = data.description
            else if(data.description != undefined)
                return {
                    status: 'error',
                    code: 0x2,
                    message: 'the description must be string'
                }

            if(Array.isArray(data.fields))
                formated.fields = JSON.stringify(data.fields);
            else if(data.fields != undefined)
                return {
                    status: 'error',
                    code: 0x3,
                    message: 'the fields must be an Array instance'
                }

            if(Object.keys(formated).length === 0)
                return {
                    status: 'error',
                    code: 0x4,
                    message: "can't add empty object"
                }

            return {
                status: "ok",
                ident: (await this.manager.query("item", sql.insert('types', formated).toString())).insertId
            }
        } catch(e){
            return {
                status: "error",
                code: 0x0,
                message: "Error while executing request"
            }
        }
    }

    async remType(i){
        try {
            await this.manager.query("item", sql.delete('types').where(sql.like('id', i)).toString());

            return {
                status: "ok",
            }
        } catch(e){
            return {
                status: "error",
                code: 0x0,
                message: "Error while executing request"
            }
        }
    }

    async edtType(ident, data){
        try {
            const formated = new Object();

            if(typeof data.display === "string")
                formated.display = data.display
            else if(data.display != undefined)
                return {
                    status: 'error',
                    code: 0x1,
                    message: 'the display must be string'
                }

            if(typeof data.description === "string")
                formated.description = data.description
            else if(data.description != undefined)
                return {
                    status: 'error',
                    code: 0x2,
                    message: 'the description must be string'
                }

            if(Array.isArray(data.fields))
                formated.fields = JSON.stringify(data.fields);
            else if(data.fields != undefined)
                return {
                    status: 'error',
                    code: 0x3,
                    message: 'the fields must be an Array instance'
                }

            if(Object.keys(formated).length === 0)
                return {
                    status: 'error',
                    code: 0x4,
                    message: "can't add empty object"
                }

            await this.manager.query("item", sql.update('types', formated).where(sql.like('id', ident)).toString());

            return {
                status: "ok",
            }
        } catch(e){
            return {
                status: "error",
                code: 0x0,
                message: "Error while executing request"
            }
        }
    }

    async edtItem(ident, data){
        try {
            const formated = new Object();

            if(typeof data.named_id === "string")
                formated.named_id = data.named_id;
            else
                return {
                    status: 'error',
                    code: 0x1,
                    message: 'the ident must be string'
                }
    
            if(typeof data.display === "string")
                formated.display = data.display;
            else if(data.display != undefined)
                return {
                    status: 'error',
                    code: 0x2,
                    message: 'the display must be string'
                }
    
            if(typeof data.description === "string")
                formated.description = data.description;
            else if(data.description != undefined)
                return {
                    status: 'error',
                    code: 0x3,
                    message: 'the description must be string'
                }
    
            if(typeof data.type === "number")
                formated.type = data.type;
            else if(data.type != undefined)
                return {
                    status: 'error',
                    code: 0x4,
                    message: 'the type must be number'
                }
    
            if(Array.isArray(data.data))
                formated.data = JSON.stringify(data.data);
            else if(data.data != undefined)
                return {
                    status: 'error',
                    code: 0x5,
                    message: 'the data must be an Array instance'
                }

            await this.manager.query("item", sql.update('items', formated).where(sql.like('named_id', ident)).toString());

            return {
                status: "ok",
            }
        } catch(e){
            return {
                status: "error",
                code: 0x0,
                message: "Error while executing request"
            }
        }
    }

    async remItem(i){
        try {
            await this.manager.query("item", sql.delete('items').where(sql.like('named_id', i)).toString());

            return {
                status: "ok",
            }
        } catch(e){
            return {
                status: "error",
                code: 0x0,
                message: "Error while executing request"
            }
        }
    }

    async setItem(data){
        try {
            const formated = new Object();

            if(typeof data.named_id === "string")
                formated.named_id = data.named_id;
            else
                return {
                    status: 'error',
                    code: 0x2,
                    message: 'the ident must be string'
                }
    
            if(typeof data.display === "string")
                formated.display = data.display;
            else if(data.display != undefined)
                return {
                    status: 'error',
                    code: 0x3,
                    message: 'the display must be string'
                }
    
            if(typeof data.description === "string")
                formated.description = data.description;
            else if(data.description != undefined)
                return {
                    status: 'error',
                    code: 0x4,
                    message: 'the description must be string'
                }
    
            if(typeof data.type === "number")
                formated.type = data.type;
            else if(data.type != undefined)
                return {
                    status: 'error',
                    code: 0x5,
                    message: 'the type must be number'
                }
    
            if(Array.isArray(data.data))
                formated.data = JSON.stringify(data.data);
            else if(data.data != undefined)
                return {
                    status: 'error',
                    code: 0x6,
                    message: 'the data must be an Array instance'
                }


            await this.manager.query("item", sql.insert('items', formated).toString());

            return {
                status: "ok",
            }
        } catch(e){
            if(e.code === 'ER_DUP_ENTRY')
                return {
                    status: "error",
                    code: 0x0,
                    message: "Ident " + d.named_id + " already exists"
                }
            

            return {
                status: "error",
                code: 0x1,
                message: "Error while executing request"
            }
        }
    }

    async getItem(f){
        const _ = this,
              q = sql.select("*").from('items'),
              w = new Array();

        if(f) {
            if(f.contains){
                let p = new Array(),
                    c = f.contains.data;
                    
                if(c instanceof Array){
                        for(let i = 0, leng = c.length;i < leng;i++){
                            p.push(sql.like(c[i].name, `%${c[i].value}%`));
                        }

                    if(f.contains.operator && f.contains.operator === "or")
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
            
            if(f.beetwen){
                if(typeof f.beetwen === "object")
                    w.push(sql.between(f.beetwen.column, f.beetwen.from, f.beetwen.to));
                else
                    return {
                        status: "error",
                        code: 0x1,
                        message: "Beetwen must be object or array"
                    }
            }
        }

        try {
            const types = await _.manager.query("item", sql.select('*').from('types').toString()),
                  items = await _.manager.query("item", q.where(w.length > 0 ? sql.and(w) : sql("1")).toString());

            for(let i = 0, leng = types.length;i < leng;i++)
                types[i].fields = types[i].fields && JSON.parse(types[i].fields) || new Array();

            for(let i = 0, leng = items.length;i < leng;i++)
                items[i].data = items[i].data && JSON.parse(items[i].data) || new Array();

            return {
                status: "ok",
                items: items,
                types: types
            }
        } catch (e) {
            return {
                status: "error",
                code: 0x2,
                message: "Error while executing request"
            };
        }
    }
}