const { createHash } = require("crypto"),
        sql = require("sql-bricks"),
        utils = require("../../src/utils"),
        { API } = require("../web_api_interface");

module.exports = class Api extends API {
    constructor(manager){
        super(manager, true, ["POST", "GET"]);

        this.addSubApi('businesses', './v1.0/businesses.js');
        this.addSubApi('characters', './v1.0/characters.js');
        this.addSubApi('users', './v1.0/users.js');
        this.addSubApi('items', './v1.0/items.js');
        this.addSubApi('logs', './v1.0/logs.js');
        this.addSubApi('map', './v1.0/map.js');
        this.addSubApi('web', './v1.0/web.js');
        
        this.manager = manager;
    }

    async handle(req, res){
        const _ = this, body = req.method === "POST" ? req.body : req.query;

        if(typeof body !== "object" || typeof body.token != 'string' && (typeof body.login != 'string' || typeof body.password != 'string')){
            res.status(403).end(JSON.stringify({
                status: "error",
                message: "Login data not transmitted"
            }))

            return;
        }

        if(typeof body.function != 'string'){
            res.status(403).end(JSON.stringify({
                status: "error",
                message: "Call data not transmitted"
            }))

            return;
        }

        res.setHeader('Content-Type', 'application/json; charset=utf-8')

        switch((body.function = body.function.split("."))[0]){
            case "login":
                try {
                    const response = await _.login(body.login, body.password);

                    if(response.status !== "ok") {
                        if(response.code === 0x0)
                            res.status(500);
                        else if(response.code === 0x1)
                            res.status(403);

                        response.code = undefined;
                    }

                    res.end(JSON.stringify(response))
                } catch (e){
                    global.web_logger.error(e);

                    res.status(500).end(JSON.stringify({
                        status: "error",
                        message: "Error logging into account"
                    }))
                }
            break;
            case "account":
                if(body.params){
                    const denied = ['login', 'password'];

                    if(body.params instanceof Array)
                        body.params.filter(e => !denied.includes(e));
                    else {
                        res.status(403).end(JSON.stringify({
                            status: "error",
                            message: "The list of requested fields must be an array"
                        }));

                        return;
                    }
                }

                try {
                    const response = await _.account(body.token, "token", body.params || ['id', 'display_name', 'role'])

                    if(response.status !== "ok") {
                        if(response.code === 0x0 || response.code === 0x3)
                            res.status(403);
                        else if(response.code === 0x1 || response.code === 0x2)
                            res.status(500);

                        response.code = undefined;
                    }

                    res.end(JSON.stringify(response))
                } catch(e) {
                    global.web_logger.error(e);

                    res.status(500).end(JSON.stringify({
                        status: "error",
                        message: "Error when getting user info"
                    }))
                }
            break;
            case 'update': // Обновляет выбранный менеджер
                try {
                    let responce = await _.account(body.token, "token", ['id']);

                    if(responce.status !== "ok"){
                        if(responce.code === 0x0 || responce.code === 0x3)
                            res.status(403);
                        else if(responce.code === 0x1 || responce.code === 0x2)
                            res.status(500);

                        responce.code = undefined;
                        
                        responce.message = "Token verification error"
                        
                        res.end(JSON.stringify(responce))

                        return;
                    } else {
                        _.manager.addAction(responce.id, "Server update operation, update manager: " + body.target, {target: body.target});
                    }

                    await _.manager.requestUpdate(body.target);

                    res.end(JSON.stringify({status: 'ok'}))
                } catch (e) {
                    global.web_logger.error(e);

                    res.status(500).end(JSON.stringify({
                        status: "error",
                        message: "Token verification error"
                    }))
                }
            break;
            case "web":
                try {
                    let responce = await _.account(body.token, "token", ['id']);

                    if(responce.status !== "ok"){
                        if(responce.code === 0x0 || responce.code === 0x3)
                            res.status(403);
                        else if(responce.code === 0x1 || responce.code === 0x2)
                            res.status(500);

                        responce.code = undefined;
                        responce.message = "Token verification error"
                        
                        res.end(JSON.stringify(responce));

                        return;
                    }

                    await super.dropTo('web', req, res, responce)  // Передаем управление веб интерфейсу
                } catch (e) {
                    global.web_logger.error(e);

                    res.status(500).end(JSON.stringify({
                        status: "error",
                        message: "Token verification error"
                    }))
                }
            break;
            case "logs":
                try {
                    let responce = await _.account(body.token, "token", ['id']);

                    if(responce.status !== "ok"){
                        if(responce.code === 0x0 || responce.code === 0x3)
                            res.status(403);
                        else if(responce.code === 0x1 || responce.code === 0x2)
                            res.status(500);

                        responce.code = undefined;
                        responce.message = "Token verification error"
                        
                        res.end(JSON.stringify(responce));

                        return;
                    }

                    await super.dropTo('logs', req, res, responce)  // Передаем управление веб интерфейсу
                } catch (e) {
                    global.web_logger.error(e);

                    res.status(500).end(JSON.stringify({
                        status: "error",
                        message: "Token verification error"
                    }))
                }
            break;
            case "items":
                try {
                    let responce = await _.account(body.token, "token", ['id']);

                    if(responce.status !== "ok"){
                        if(responce.code === 0x0 || responce.code === 0x3)
                            res.status(403);
                        else if(responce.code === 0x1 || responce.code === 0x2)
                            res.status(500);

                        responce.code = undefined;
                        responce.message = "Token verification error"
                        
                        res.end(JSON.stringify(responce));

                        return;
                    }

                    await super.dropTo('items', req, res, responce)  // Передаем управление интерфейсу предметов
                } catch (e) {
                    global.web_logger.error(e);

                    res.status(500).end(JSON.stringify({
                        status: "error",
                        message: "Token verification error"
                    }))
                }
            break;
            case "statistics":
                try {
                    let responce = await _.account(body.token, "token", ['id']);

                    if(responce.status !== "ok"){
                        if(responce.code === 0x0 || responce.code === 0x3)
                            res.status(403);
                        else if(responce.code === 0x1 || responce.code === 0x2)
                            res.status(500);

                        responce.code = undefined;
                        
                        responce.message = "Token verification error"
                        
                        res.end(JSON.stringify(responce))

                        return;
                    }

                    const stats = await global.web_messager.send('statistics'),
                          buffer = new Array();

                    for(let i = 0, keys = Object.keys(stats.stats), leng = keys.length;i < leng;i++){
                        buffer.push(
                            {
                                borderColor: stats.stats[keys[i]].color,
                                data: stats.stats[keys[i]].stack,
                                label: stats.stats[keys[i]].display,
                                displayed: stats.stats[keys[i]].displayed,
                                units: stats.stats[keys[i]].units
                            }
                        )
                    }

                    stats.stats = buffer;

                    stats.displayed = buffer.filter(e => e.displayed);

                    res.end(JSON.stringify({ status: 'ok', stats }));
                } catch (e) {
                    global.web_logger.error(e);

                    res.status(500).end(JSON.stringify({
                        status: "error",
                        message: "Token verification error"
                    }))
                }
            break;
            case "businesses":
                try {
                    let responce = await _.account(body.token, "token", ['id']);

                    if(responce.status !== "ok"){
                        if(responce.code === 0x0 || responce.code === 0x3)
                            res.status(403);
                        else if(responce.code === 0x1 || responce.code === 0x2)
                            res.status(500);

                        responce.code = undefined;
                        responce.message = "Token verification error"
                        
                        res.end(JSON.stringify(responce));

                        return;
                    }

                    await super.dropTo('businesses', req, res, responce)  // Передаем управление интерфейсу бизнесов
                } catch (e) {
                    global.web_logger.error(e);

                    res.status(500).end(JSON.stringify({
                        status: "error",
                        message: "Token verification error"
                    }))
                }
            break;
            case "users":
                try {
                    let responce = await _.account(body.token, "token", ['id']);

                    if(responce.status !== "ok"){
                        if(responce.code === 0x0 || responce.code === 0x3)
                            res.status(403);
                        else if(responce.code === 0x1 || responce.code === 0x2)
                            res.status(500);

                        responce.code = undefined;
                        responce.message = "Token verification error"
                        
                        res.end(JSON.stringify(responce));

                        return;
                    }

                    await super.dropTo('users', req, res, responce)  // Передаем управление интерфейсу пользователей
                } catch (e) {
                    global.web_logger.error(e);

                    res.status(500).end(JSON.stringify({
                        status: "error",
                        message: "Token verification error"
                    }))
                }
            break;
            case "characters":
                try {
                    let responce = await _.account(body.token, "token", ['id']);

                    if(responce.status !== "ok"){
                        if(responce.code === 0x0 || responce.code === 0x3)
                            res.status(403);
                        else if(responce.code === 0x1 || responce.code === 0x2)
                            res.status(500);

                        responce.code = undefined;
                        responce.message = "Token verification error"
                        
                        res.end(JSON.stringify(responce));

                        return;
                    }

                    await super.dropTo('characters', req, res, responce)  // Передаем управление интерфейсу пользователей
                } catch (e) {
                    global.web_logger.error(e);

                    res.status(500).end(JSON.stringify({
                        status: "error",
                        message: "Token verification error"
                    }))
                }
            break;
            case "mailing":
                try {
                    let responce = await _.account(body.token, "token", ['id']);

                    if(responce.status !== "ok"){
                        if(responce.code === 0x0 || responce.code === 0x3)
                            res.status(403);
                        else if(responce.code === 0x1 || responce.code === 0x2)
                            res.status(500);

                        responce.code = undefined;
                        
                        responce.message = "Token verification error"
                        
                        res.end(JSON.stringify(responce))

                        return;
                    } else {
                        const result = await this.mailing(body);

                        if(responce.status !== "ok"){
                            res.status(403);

                            responce.code = undefined;
                        } else
                            _.manager.addAction(responce.id, "Server mailing operation, mailing message", body);
                        
                        res.end(JSON.stringify(result))
                    }
                } catch (e) {
                    global.web_logger.error(e);

                    res.status(500).end(JSON.stringify({
                        status: "error",
                        message: "Token verification error"
                    }))
                }
            break;
            case "map":
                try {
                    let responce = await _.account(body.token, "token", ['id']);

                    if(responce.status !== "ok"){
                        if(responce.code === 0x0 || responce.code === 0x3)
                            res.status(403);
                        else if(responce.code === 0x1 || responce.code === 0x2)
                            res.status(500);

                        responce.code = undefined;

                        responce.message = "Token verification error"
                        
                        res.end(JSON.stringify(responce))

                        return;
                    }
                    
                    await super.dropTo('map', req, res, responce)  // Передаем управление интерфейсу карт
                } catch (e) {
                    global.web_logger.error(e);

                    res.status(500).end(JSON.stringify({
                        status: "error",
                        message: "Token verification error"
                    }))
                }
            break;
            case "actions":
                try {
                    let responce = await _.account(body.token, "token", ['id']);

                    if(responce.status !== "ok"){
                        if(responce.code === 0x0 || responce.code === 0x3)
                            res.status(403);
                        else if(responce.code === 0x1 || responce.code === 0x2)
                            res.status(500);

                        responce.code = undefined;
                        
                        responce.message = "Token verification error"
                        
                        res.end(JSON.stringify(responce))

                        return;
                    } else {
                        const result = await _.actions(body.from, body.to);

                        if(responce.status !== "ok"){
                            res.status(500);

                            responce.code = undefined;
                        }
                        
                        res.end(JSON.stringify(result))
                    }
                } catch (e) {
                    global.web_logger.error(e);

                    res.status(500).end(JSON.stringify({
                        status: "error",
                        message: "Token verification error"
                    }))
                }
            break;
        }
    }

    async account(auth, auth_type = "token", fields_c = null){
        const _ = this;

        if(typeof auth !== "string" || auth_type !== "id" && auth_type !== "login" && auth_type !== "token")
            return {
                status: "error",
                code: 0x0,
                message: "unable to recognize the requested type"
            }

        if(!(fields_c instanceof Array))
            return {
                status: "error",
                code: 0x0,
                message: "the list of requested fields must be an array"
            };

        if(auth_type !== "token")
                try {
                    const results = await _.manager.query('admin', sql.select(...fields_c).from('users').where(sql.like(auth_type, auth)).toString());
                    
                    if(results.length !== 0)
                        return {
                            status: "ok",
                            ...results[0]
                        };
                    else
                        return {
                            status: "error",
                            code: 0x2,
                            message: "can't find users for " + auth_type + " like " + auth
                        }
                } catch (e){
                    return {
                        status: "error",
                        code: 0x1,
                        message: "error when getting user info"
                    }
                }
        else
            try {
                let results = await _.manager.query('admin', sql.select("*").from('access').where(sql.like('token', auth)).toString())

                if(results.length !== 0 && Date.now() < results[0].valid_to) {
                    results = await _.manager.query('admin', sql.select(...fields_c).from('users').where(sql.like('login', results[0].owner)).toString())
                    
                    if(results.length !== 0)
                        return {
                            status: "ok",
                            ...results[0]
                        };
                    else
                        return {
                            status: "error",
                            code: 0x2,
                            message: "can't find users for " + auth_type + " like " + auth
                        };
                } else
                    return {
                        status: "error",
                        code: 0x3,
                        message: `it is impossible to use the token "${auth}" the token may have expired, or it was not previously created`
                    };
            } catch (e) {
                return {
                    status: "error",
                    code: 0x1,
                    message: "error when getting user info"
                };
            }
    }

    async login(login, password){
        const _ = this;

        password = createHash("sha256").update(password).digest("hex");
        login = createHash("sha256").update(login).digest("hex");

        try {
            let results = await _.manager.query('admin', sql.select('*').from('users').where(sql.like('login', login)).toString())

            const valid = Date.now() + 43200000, // Токен выдается на 12 часов
                  token = createHash("sha256").update("#" + Date.now() + login + (Math.random() * Number.MAX_SAFE_INTEGER) + (Math.random() * Number.MAX_SAFE_INTEGER)).digest("hex");

            if(results.length > 0 && results[0].password === password && results[0].login === login){
                results = await _.manager.query('admin', sql.select('*').from('access').where(sql.like('owner', login)).toString())

                if(results.length !== 0){
                    if(Date.now() < results[0].valid_to)
                        return {
                            status: "ok",
                            token: results[0].token,
                            valid_to: results[0].valid_to
                        };
                    else {
                        results = await _.manager.query('admin', sql.update("access", {token, valid_to: valid}).where(sql.like("owner", login)).toString())
                            
                        return {
                            status: "ok",
                            token: token,
                            valid_to: valid
                        };
                    }
                } else {
                    await _.manager.query('admin', sql.insert("access", {token, owner: login, valid_to: valid}).toString())
                    
                    return {
                        status: "ok",
                        token: token,
                        valid_to: valid
                    }
                }
            } else 
                return {
                    status: "error",
                    code: 0x1,
                    message: "incorrect login or password"
                };
        } catch (e) {
            return {
                status: "error",
                code: 0x0,
                message: "error logging into account"
            }
        }
    }

    async mailing(input){
        const formated = new Object(),
              data = new Object();

        formated.excecutor = 'send-message-to-all-users-0x0';

        formated.work_ident = utils.random_id();

        if(typeof input.type === "string")
            data.type = input.type;
        else
            data.type = 'notify';

        if(typeof input.after === "number")
            formated.fire_after = Date.now() + input.after;
        else
            formated.fire_after = 0;

        if(typeof input.data === "object" && input.data != null) {
            if(input.data.content.trim() !== ''){
                data.content = input.data.content.trim();
            } else {
                return {
                    status: "error",
                    code: 0x0,
                    message: "content cannot be empty"
                }
            }

            if(input.data.attachments){
                data.attachments = new Array();

                for(let i = 0, leng = input.data.attachments.length;i < leng;i++){
                    const attachment = {type: 'attachment'};

                    if(typeof input.data.attachments[i].data === "string"){
                        attachment.data = input.data.attachments[i].data;
                    } else {
                        return {
                            status: "error",
                            code: 0x1,
                            message: "the data must be string"
                        }
                    }

                    switch(input.data.attachments[i].mime){
                        case 'image/png':
                        case 'image/jpeg':
                        case 'image/tiff':
                        case 'image/gif':
                        case 'image/pjpeg':
                        case 'image/svg+xml':
                        case 'image/webp':
                            attachment.mime = input.data.attachments[i].mime;
                        break;
                        default:
                            return {
                                status: "error",
                                code: 0x2,
                                message: "unknown mime type " + input.data.attachments[i].mime
                            }
                    }

                    data.attachments.push(attachment);
                }
            }
        }

        formated.data = JSON.stringify(data).replace(/\\/g, '\\\\');

        await this.manager.query('common', sql.insert("binds", formated).toString())

        return {
            status: "ok"
        }
    }

    async actions(from, to){
        try {
            const actions = await this.manager.query('admin', sql.select('owner', 'id', 'description').from('actions').where(sql.between('id', from, to)).toString()), 
                  users = new Array(), users_out = new Array(), count = (await this.manager.query('admin', 'SELECT COUNT(id) as total FROM `actions` WHERE 1'))[0];

            for(let i = 0, leng = actions.length;i < leng;i++)
                if(!users.includes(actions[i].owner)) {
                    users.push(actions[i].owner);

                    users_out.push(actions[i].owner = await this.account(actions[i].owner.toString(), 'id', ['display_name', 'role']));

                    if(actions[i].owner.status === 'ok'){
                        actions[i].owner.status = undefined;
                    } else {
                        return {
                            status: "error",
                            code: 0x0,
                            message: "error when getting user actions"
                        };
                    }
                } else {
                    actions[i].owner = users_out[users.indexOf(actions[i].owner)];
                }

            return {
                status: 'ok',
                data: {
                    total: count.total,
                    next: to + 1 <= count.total,
                    prev: from - 1 >= 0,
                    actions: actions,
                    user_ids: users,
                    fast_info: users_out
                }
            }
        } catch (e) {
            return {
                status: "error",
                code: 0x1,
                message: "error when getting user actions"
            };
        }
    }
}