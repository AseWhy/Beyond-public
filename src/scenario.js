const { performance } = require("perf_hooks");
const { Response, Keyboard, Button, Attachment, SQLAttachment }         = require("./response"),
      { QueryData }                                                     = require("./querydata"),
      { CouplerEmitter }                                                = require("./coupler.emitter"),
      { GetCharacter }                                                  = require("./ccc/ccc.core"),
      { MessagePattern, ExpressionPattern, ExcecutionPattern, Heap }    = require("./pattern"),
      { join }                                                          = require("path"),
      utils                                                             = require("./utils"),
      sql                                                               = require('sql-bricks');

function getEntry(entry, importer, parent){
    switch(entry.type){
        case "write":
            return new module.exports.CommandWriteEntry(entry, importer);
        case "save":
            return new module.exports.CommandSaveEntry(entry, importer);
        case "typing":
            return new  module.exports.CommandTypingEntry(entry, importer);
        case "query":
            return new module.exports.CommandQueryEntry(entry, importer);
        case "scenario":
            return new module.exports.CommandScenarioEntry(entry, importer);
        case "excecutor":
            return new module.exports.CommandExcecutorEntry(entry, importer, parent);
        case "call":
            return new module.exports.CommandCallEntry(entry, importer, parent);
        case "excecute":
            return new module.exports.CommandExcecuteEntry(entry, importer, parent);
        case "bind":
            return new module.exports.CommandBindEntry(entry, importer, parent);
        case "confirmation-request":
            return new module.exports.CommandConfirmationEntry(entry, importer, parent);
        case "confirmation-ok":
            return new module.exports.CommandConfirmationOkEntry(entry, importer, parent);
        case "game-data":
            return new module.exports.GameDataEntry(entry, importer, parent);
        case "character":
            if(parent.use_character)
                return new module.exports.CommandCharacterEntry(entry, importer);
            else
                throw new Error("Mandatory use of the use_character field for this entry")
    }
}

module.exports.DBEntry = class DBEntry {
    /**
     * 
     * @param {{p_key: String, d_key: String, value: String|Number|Boolean}} data 
     */
    constructor(data){
        this.p_key = data.p_key;
        this.d_key = data.d_key;
        this.value = data.value
    }
}

module.exports.CommandEntry = class CommandEntry {
    constructor(data, importer){
        this.condition = new ExpressionPattern(data.condition, importer, global.common_logger);
        this.state = data.state != null ? data.state : 0;   // Изминение стадии после исполнения события
        this.break_on = data.break_on || false;             // Прерывать ли сценарий после этого действия?

        this.ident = data.ident || "!-0x" + utils.unique_id();
    }

    canToExcecute(data){
        return this.condition.result(data);
    }

    /**
     * Исполняет команду, в зависимости от типа результат может быть разный
     * 
     * @param {PushedCommand} command Команда для обработки
     * @param {CouplerEmitter} emmeter Эмитер ответа
     * @returns {Promise} ожидаение завершения команды
     */
    exec(data, emitter){
        return new Promise((res, rej) => res());
    }
}

module.exports.CommandWriteEntry = class CommandWriteEntry extends module.exports.CommandEntry {
    /**
     * Выводит сообщение по сценарию
     * 
     * @param {{message: String, keyboard: ?Array, buttons_on_row: ?Number}} data
     */
    constructor(data, importer){
        super(data, importer);

        this.keyboard = typeof data.keyboard === 'string' ? new ExpressionPattern(data.keyboard, importer, global.common_logger) : data.keyboard != null ? data.keyboard : null;
        this.auto_typing = data.auto_typing || false;
        this.content = null;

        if(data.prepare != undefined)
            this.prepare = new ExcecutionPattern(data.prepare, importer, global.common_logger);

        if(Array.isArray(data.attachments)){
            for(let i = 0, leng = data.attachments.length;i < leng;i++){
                switch(data.attachments[i].type){
                    case "sql-attachment":
                        data.attachments[i].query = new MessagePattern(data.attachments[i].query, importer, global.common_logger);
                    break;
                    case "attachment":
                        data.attachments[i].path = new MessagePattern(data.attachments[i].path, importer, global.common_logger);
                    break;
                    default:
                        global.common_logger.warn("Unknown attachment type " + data.attachments[i].type)
                    break;
                }
            }

            this.attachments = Array.from(data.attachments);
        } else {
            this.attachments = null;
        }
        
        if(data.message && (Array.isArray(data.message) && data.message.length !== 0|| (typeof data.message === "string" && data.message.trim() !== "")))
            if(Array.isArray(data.message))
                this.content = new MessagePattern(data.message.join("\n"), importer, global.common_logger);
            else
                this.content = new MessagePattern(data.message, importer, global.common_logger);
        else {
            console.error(data)

            throw new TypeError("The message cannot be empty for entry " + this.ident);
        }
    }

    /**
     * @override
     * @see {@link CommandEntry.exec} для подробной информации
     */
    async exec(data, emitter){
        const response = new Response(),
              keyboard = new Array(),
              attachments = new Array();

        if(this.prepare)
            this.prepare.result(data.query)

        response.setContent(this.content.result(data.query));

        if(this.keyboard != null){
            if(Array.isArray(this.keyboard)) {
                for(let i = 0, leng = this.keyboard.length;i < leng;i++)
                    keyboard.push(new Button(
                        this.keyboard[i].title,
                        this.keyboard[i].payload,
                        this.keyboard[i].color !== undefined ? this.keyboard[i].color.toUpperCase() : "WHITE"
                    ))
            } else if(this.keyboard instanceof ExpressionPattern){
                const kb = this.keyboard.result(data.query);

                if(Array.isArray(kb))
                    for(let i = 0, leng = kb.length;i < leng;i++)
                        if(kb[i] != null)
                            keyboard.push(new Button(
                                kb[i].title,
                                kb[i].payload,
                                kb[i].color != undefined ? kb[i].color.toUpperCase() : "WHITE"
                            ))
            }
        }

        if(Array.isArray(this.attachments)){
            for(let i = 0, leng = this.attachments.length;i < leng;i++){
                switch(this.attachments[i].type){
                    case "sql-attachment":
                        attachments.push(new SQLAttachment(this.attachments[i].basename, this.attachments[i].query.result(data.query), "message"));
                    break;
                    case "attachment":
                        attachments.push(new Attachment(join(global.params.paths.root, this.attachments[i].path.result(data.query)), "message"));
                    break;
                    default:
                        global.common_logger.warn("Unknown attachment type " + this.attachments[i].type)
                    break;
                }
            }
        }

        response.addAttachments(...attachments);
            
        response.setKeyboard(new Keyboard(false, true).rowAuto(0, data.buttons_on_row || 3, ...keyboard));
        
        // Если не отключен автонабор
        if(!this.auto_typing)
            return await emitter.reply(response);
        else
            return await new Promise((res, rej) => {
                setTimeout(() => {
                    emitter.reply(response)
                        .then(res)
                        .catch(rej);
                }, response.content.length * emitter.typing_speed); // 100 знаков в секунду

                // Статус: пишу
                emitter.typing();
            });
    }
}

module.exports.CommandCharacterEntry = class CommandCharacterEntry extends module.exports.CommandEntry {
    /**
     * Изминяет данные персонажа в соответсвии с переданными параметрами
     * 
     * @param {{data: Map<String, String> | String, field: "data" | "map" | String}} data шаблон
     */
    constructor(data, importer){
        super(data, importer);

        this.field = data.field || "data";

        if(typeof data.data === "object" && data.data !== null){
            if(data.data instanceof Array){
                this.data = new Array()

                for(let i = 0, leng = data.data.length;i < leng;i++)
                    if(typeof data.data[i].data === 'string')
                        this.data[i] = {
                            ...data.data[i],
                            data: new ExpressionPattern(data.data[i].data, importer, global.common_logger)
                        };
                    else
                        this.data[i] = data.data[i];
            } else {
                this.data = new Map();

                for(let key in data.data)
                    if(typeof data.data[key] === 'string'){
                        this.data.set(key, new ExpressionPattern(data.data[key], importer, global.common_logger))
                    } else {
                        this.data.set(key, data.data[key]);
                    }
            }
        } else if(typeof data.data === "string" || data.data === null)
            this.data = new ExpressionPattern(data.data.toString(), importer, global.common_logger);
        else throw new TypeError("Incorrect data for field '" + this.field + "' in " + this.ident);
    }

    /**
     * @override
     * @see {@link CommandEntry.exec} для подробной информации
     */
    exec(data, emitter){
        const _ = this;;

        if(_.data instanceof Map){
            const data_set = new Object(), from = _.data.keys();

            for(let key of from)
                if(_.data.get(key) instanceof ExpressionPattern)
                    data_set[key] = _.data.get(key).result(data.query);
                else
                    data_set[key] = _.data.get(key);

            data.character.edit(_.field, data_set);

            data.query.get("character").set(_.field, data.character.getDisplayData(_.field))
        } else if(_.data instanceof Array){
            const data_set = new Array();

            for(let i = 0, leng = _.data.length;i < leng;i++)
                if(_.data[i].data instanceof ExpressionPattern)
                    data_set.push({
                        ..._.data[i],
                        data: _.data[i].data.result(data.query)
                    })
                else
                    data_set.push(_.data[i]);

            data.character.edit(_.field, data_set);

            data.query.get("character").set(_.field, data.character.getDisplayData(_.field))
        } else {
            const data_set = _.data.result(data.query);

            data.character.edit(_.field, data_set);

            data.query.get("character").set(_.field, data.character.getDisplayData(_.field))
        }
    }
}

module.exports.GameDataEntry = class GameDataEntry extends module.exports.CommandEntry {
    /**
     * Генерирует шаблон запроса к базе данных, соответственно записывая необходимые данные в неё
     * по этому шаблону
     * 
     * @param {{entries: Map<String, String>}} data шаблон
     */
    constructor(data, importer){
        super(data, importer);

        const _ = this;

        _.order = data.order;
        _.field = data.field;

        if(data.order === 'set')
            if(typeof data.data === 'object')
                (function parse(data, parent){
                    for(let cur in data) {
                        if(typeof data[cur] === 'object' && data[cur] != null){
                            parse(data[cur], parent[cur] = new Object());
                        } else {
                            if(typeof data[cur] === 'string'){
                                parent[cur] = new ExpressionPattern(data[cur], importer, global.common_logger);
                            } else {
                                parent[cur] = data[cur];
                            }
                        }
                    }
                })(data.data, _.data = new Object());
            else
                throw new TypeError("The data must be object");
    }

    /**
     * @override
     * @see {@link CommandEntry.exec} для подробной информации
     */
    async exec(data, emitter){
        if(this.order === 'set'){
            let set_data = new Object();

            (function parse(r_data, parent){
                for(let cur in r_data) {
                    if(typeof r_data[cur] === 'object' && r_data[cur] != null && !(r_data[cur] instanceof ExpressionPattern)){
                        parse(r_data[cur], parent[cur] = new Object());
                    } else {
                        if(r_data[cur] instanceof ExpressionPattern){
                            parent[cur] = r_data[cur].result(data.query);
                        } else {
                            parent[cur] = r_data[cur];
                        }
                    }
                }
            })(this.data, set_data);

            data = JSON.stringify(set_data).replace(/\\/g, '\\\\');

            await global.managers.pool.sql('common', "INSERT INTO `data` (`field_name`, `data`) values ('" + this.field + "', '" + data + "') ON DUPLICATE KEY UPDATE `data` = '" +  data + "'");
        } else if(this.order === 'get'){
            const result = await global.managers.pool.sql('common', sql.select('data').from('data').where(sql.like('field_name', this.field)).toString());

            if(data.query.get('game_data') == null){
                data.query.set('game_data', {});
            }

            data.query.get('game_data').set(this.field, result.length > 1 ? result.map(e => JSON.parse(e.data)) : result[0] == null ? result[0] : JSON.parse(result[0].data));
        }
    }
}

module.exports.CommandSaveEntry = class CommandSaveEntry extends module.exports.CommandEntry {
    /**
     * Генерирует шаблон запроса к базе данных, соответственно записывая необходимые данные в неё
     * по этому шаблону
     * 
     * @param {{entries: Map<String, String>}} data шаблон
     */
    constructor(data, importer){
        super(data, importer);

        this.entries = new Map();

        for(let key in data.entries)
            this.entries.set(key, new ExpressionPattern(data.entries[key], importer, global.common_logger))
    }

    /**
     * @override
     * @see {@link CommandEntry.exec} для подробной информации
     */
    exec(data, emitter){
        let data_set = new Object(),
            from = this.entries.keys();

        for(let key of from)
            data.query.get("state").get("data").set(key, (data_set[key] = this.entries.get(key).result(data.query)));

        return data.user.scenario.editLabels(data_set);
    }
}

module.exports.CommandExcecuteEntry = class CommandExcecuteEntry extends module.exports.CommandEntry {
    /**
     * Исполняемый блок сценария
     * 
     * @param {{entries: Array<any>}} data данные для исполнения
     * @param {Array<String>} importer импортируемые модули
     * @param {vk} vk объект вк
     */
    constructor(data, importer, parent){
        super(data, importer);

        this.vk = parent.manager.vk;
        this.notify_error = parent.notify_error;
        this.entries = new Array();

        if(data.prepare != undefined)
            this.prepare = new ExcecutionPattern(data.prepare, importer, global.common_logger);

        if(data.entries != null)
            for(let i = 0, leng = data.entries.length;i < leng;i++){
                this.addEntry(getEntry(data.entries[i], importer, parent));
            }
    }

    /**
     * Добавляет пункт для исполнения в сценарий
     * 
     * @param {CommandEntry} entry данные для исполнения
     */
    addEntry(entry){
        if(!entry instanceof module.exports.CommandEntry)
            throw new TypeError();

        this.entries.push(entry);
    }

    /**
     * @override
     * @see {@link CommandEntry.exec} для подробной информации
     */
    async exec(data, emitter, manager){
        let b, state_push = 0, _ = this, s = 0;

        if(this.prepare)
            this.prepare.result(data.query);

        for(let i = 0, leng = _.entries.length;i < leng;i++){
            if(_.entries[i].canToExcecute(data.query)){
                try {
                    s = performance.now();

                    b = await _.entries[i].exec(data, emitter, manager) || {};

                    if(!(_.entries[i] instanceof module.exports.CommandExcecuteEntry))
                        global.managers.statistics.updateStat('command_av_handle_unit', performance.now() - s);
                } catch(e) {
                    global.common_logger.error(e);
                    
                    if(_.notify_error)
                        emitter.reply(`При обработке команды произошла ошибка, администрация уже работает над решением проблемы.`);    
                
                    return {
                        state: state_push,
                        result: -1
                    };
                }

                if(_.entries[i] instanceof module.exports.CommandExcecuteEntry && _.entries[i].constructor.name === 'CommandExcecuteEntry'){
                    state_push += b.state;
                } else {
                    state_push += _.entries[i].state;
                }

                if(b.result === 1 || _.entries[i].break_on === true){
                    return {
                        state: state_push,
                        result: 1
                    };
                } else if (b.result === 2 || _.entries[i].ended === true){
                    return {
                        state: state_push,
                        result: 2
                    };
                } else if (b.result === -1){
                    return {
                        state: state_push,
                        result: -1
                    };
                }
            }
        }

        return {
            state: state_push,
            result: this.break_on ? 1 : 0
        }
    }
}

module.exports.CommandExcecutorEntry = class CommandExcecutorEntry extends module.exports.CommandExcecuteEntry {
    constructor(data, importer, parent){
        super(data, importer, parent);

        global.managers.bind.addExcecutor(this.ident, this.exec.bind(this));
    }
}

module.exports.CommandCallEntry = class CommandCallEntry extends module.exports.CommandEntry {
    constructor(data, importer){
        super(data, importer);

        this.procedure = new ExpressionPattern(data.procedure, importer, global.common_logger);
    }

    exec(data, emitter, manager){
        const caller = global.managers.bind.excecutors.get(this.procedure.result(data.query));

        if(typeof caller === "function"){
            return caller(data, emitter, manager);
        } else {
            global.common_logger.warn("Can't find the executor for the function named like " + this.procedure.result(data.query));
        }
    }
}

module.exports.CommandConfirmationEntry = class CommandConfirmationEntry extends module.exports.CommandEntry {
    constructor(data, importer){
        super(data, importer);

        this.procedure = new ExpressionPattern(data.procedure, importer, global.common_logger);
        this.break_on = true;
    }

    async exec(data, emitter, manager){
        return data.character.edit("confirmation", {
            excecutor: this.procedure.result(data.query),
            valid_to: Date.now() + 60000, // 60 minutes
            data: data.toPattern()
        })
    }
}

module.exports.CommandConfirmationOkEntry = class CommandConfirmationOkEntry extends module.exports.CommandEntry {
    constructor(data, importer){
        super(data, importer);

        this.break_on = true;
    }

    async exec(data, emitter, manager){
        if(data.character.confirmation != null)
            if(data.character.confirmation.valid_to > Date.now()){
                const caller = global.managers.bind.excecutors.get(data.character.confirmation.excecutor);

                if(typeof caller === "function"){
                    await caller((data = await QueryData.fromPattern(data.character.confirmation.data)), emitter, manager);

                    await data.close();
                } else {
                    global.common_logger.warn("Can't find the executor for the function named like " + data.character.confirmation.excecutor);
                }
            } else {
                emitter.reply('К сожалению время подтверждения превышает минуту, пожалуйста, запросите повторное подтверждение.')
            }
        else {
            emitter.reply('Никакие действия не ожидают подтверждения. Пожалуйста запросите повторное, если вы уверены что оно было.')
        }
    }
}

module.exports.CommandBindEntry = class CommandBindEntry extends module.exports.CommandExcecuteEntry {
    /**
     * Отложено исполняет сценарий заанный в entries
     * 
     * @param {{jump: string}} data данные для исполнения
     * @param {Array<String>} importer импортируемые модули
     * @param {vk} vk объект вк
     */
    constructor(data, importer, parent){
        super(data, importer, parent);
        
        if(data.jump)
            this.jump = new ExpressionPattern(data.jump, importer, global.common_logger);
        else
            throw new TypeError("Required jump parameter for the bind function, it denotes the jump time.")

        global.managers.bind.addExcecutor(this.ident, this.call.bind(this));
    }

    /**
     * Отложено исполняет сценарий заанный в entries
     * 
     * @param {any} data данные для восстановления
     */
    async call(data){
        await super.exec((data = await QueryData.fromPattern(data)), new CouplerEmitter(this.vk, data.user.id, data.message_id));

        await data.close();
    }

    /**
     * @override
     * @see {@link CommandEntry.exec} для подробной информации
     */
    async exec(data){
        await global.managers.bind.bind(this.ident, Date.now() + this.jump.result(data.query), data.toPattern());
    }
}

module.exports.CommandTypingEntry = class CommandTypingEntry extends module.exports.CommandEntry {
    /**
     * Генерирует по шаблону шаблон отпрвки статуса набора сообщения
     * 
     * @param {{delay: Number}} data шаблон
     */
    constructor(data, importer){
        super(data, importer);

        this.delay = data.delay;
    }

    /**
     * @override
     * @see {@link CommandEntry.exec} для подробной информации
     */
    exec(data, emitter){
        const _ = this;

        return new Promise((res, rej) => {
            setTimeout(res, _.delay);

            emitter.typing();
        });
    }
}

module.exports.CommandQueryEntry = class CommandQueryEntry extends module.exports.CommandEntry {
    /**
     * Выполняет запрос к mysql
     * 
     * @param {{query: String}} data шаблон
     */
    constructor(data, importer){
        super(data, importer);

        this.base = global.managers.pool.has(data.base) ? data.base : "common";
        this.query = new MessagePattern(data.query, importer, global.common_logger);
        this.as = data.as;
    }

    /**
     * @override
     * @see {@link CommandEntry.exec} для подробной информации
     */
    async exec(data, emitter){
        const query = this.query.result(data.query);

        try {
            if(this.as == null)
                await global.managers.pool.sql(this.base, query);
            else
                data.query.set(this.as, await global.managers.pool.sql(this.base, query))
        } catch(e) {
            global.common_logger.error("Error while excecutiong query:\n\t\t" + query);

            throw e;
        }
    }
}


module.exports.CommandScenarioEntry = class CommandScenarioEntry extends module.exports.CommandEntry {
    /**
     * Генерирует по шаблону завершение сценария
     */
    constructor(data, importer){
        super(data, importer);

        this.order = data.order;

        if(data.target)
            this.target = new ExpressionPattern(data.target, importer, global.common_logger);

        switch(data.order){
            case "end":
                this.ended = true; // Всегда после завершения сценария будет произведен выход из него.
            break;
            case "drop":
                this.break_on = true; // Всегда после переход в другой сценарий будет произведен выход из исходного.
            break;
            case "apply":
                this.break_on = true; // Всегда после переход в другой сценарий будет произведен выход из исходного.
            break;
        }
        
    }

    /**
     * @override
     * @see {@link CommandEntry.exec} для подробной информации
     */
    async exec(data, emitter, manager){
        switch(this.order){
            case "end":
                return await data.user.setTargetScenario(null, 0, null);
            case "drop":
                manager.run(this.target.result(data.query), data, emitter);
            break;
            case "apply":
                manager.apply(this.target.result(data.query), data, emitter);
            break;
        }
    }
}

module.exports.ScenarioChain = class ScenarioChain {
    /**
     * Объект сценрия, при условии что у пользователя установлен сценарий с таим же id как и уэтого объекта
     * запускается этот сценрий
     * 
     * @param {{use_state: Boolean, name: String, id: String, preset: Object, entries: ?Array}} data шаблон сценария
     */
    constructor(data, scenario_m){
        // Если сценарий использует state, то после завершения выполнения команды мы увеличиваем её на 1
        this.use_state      = data.use_state || false;      // Использовать стадии, для сценариев с false state будет -1
        this.use_character  = data.use_character || false;  // Нужно ли использовать персонажа для этого сценария
        this.name           = data.name;                    // Имя сценария
        this.id             = data.id;                      // Идентификатор
        this.preset         = data.preset;                  // прессет для записи в бд
        this.entries        = new Array();
        this.excecutors     = new Map();
        this.notify_error   = data.notify_error != null ? data.notify_error : true;
        this.import         = Array.isArray(data.import) ? data.import : new Array();
        this.condition      = new ExpressionPattern(data.condition, this.import, global.common_logger);
        this.manager        = scenario_m;

        try {
            if(data.entries != null)
                for(let i = 0, leng = data.entries.length;i < leng;i++){
                    this.addEntry(getEntry(data.entries[i], this.import, this));
                }

            if(data.excecutors != null) {
                for(let i = 0, leng = data.excecutors.length;i < leng;i++){
                    if(data.excecutors[i].ident !== undefined) {
                        this.setExcecutor(data.excecutors[i].ident, getEntry(data.excecutors[i], this.import, this));
                    } else {
                        throw new TypeError(`The ident field is required for the excecutors block. for scenario ${this.name}`);
                    }
                }
            }
        } catch (e) {
            global.common_logger.error("Error when loading script " + this.name, e);
        }
    }

    /**
     * Проверяет возможность исполнения сценария
     * 
     * @param {QueryData} data данные для исполнения сценария
     */
    canToExcecute(data){
        return this.condition.result(data);
    }


    setExcecutor(name, entry){
        if(!entry instanceof module.exports.CommandEntry)
            throw new TypeError();

        this.excecutors.set(name, entry);
    }

    /**
     * Добавляет пункт для исполнения в сценарий
     * 
     * @param {CommandEntry} entry данные для исполнения
     */
    addEntry(entry){
        if(!entry instanceof module.exports.CommandEntry)
            throw new TypeError();

        this.entries.push(entry);
    }

    /**
     * Исполняет сценарий
     * 
     * @param {QueryData} data данные для исполнения сценария
     * @param {CouplerEmitter} emitter данные для ответа пользователю
     */
    async exec(data, emitter){
        let state_push = 0, _ = this, start = performance.now(), s; // Число стадий которое будет прибавленно после выполнения команды

        if(this.use_character && data.query.get('character') == null){
            try {
                data.setCharacter(await GetCharacter(data.user.id))
            } catch (e) {
                global.managers.statistics.updateStat('command_av_handle_time', performance.now() - start)

                data.disconnect(); // Убираем задачу из списка

                global.common_logger.error('Error while excecuting scenario ' + this.name + " [" + this.id + "]", e);
                
                emitter.reply(`При обработке команды произошла ошибка, администрация уже работает над решением проблемы.`);

                return;
            }
        }

        let ended = false, b;

        for(let i = 0, leng = _.entries.length;i < leng;i++){
            if(_.entries[i].canToExcecute(data.query)){
                try {
                    s = performance.now();

                    b = await _.entries[i].exec(data, emitter, _.manager) || {};

                    if(!(_.entries[i] instanceof module.exports.CommandExcecuteEntry))
                        global.managers.statistics.updateStat('command_av_handle_unit', performance.now() - s);
                } catch(e) {
                    global.managers.statistics.updateStat('command_av_handle_time', performance.now() - start)

                    data.disconnect(); // Убираем задачу из списка

                    global.common_logger.error(e);
                    
                    if(_.notify_error)
                        emitter.reply(`При обработке команды произошла ошибка, администрация уже работает над решением проблемы.`);    
                
                    return;
                }

                if(_.entries[i] instanceof module.exports.CommandExcecuteEntry && _.entries[i].constructor.name === 'CommandExcecuteEntry'){
                    state_push += b.state;
                } else {
                    state_push += _.entries[i].state;
                }

                if(b.result === 1 || _.entries[i].break_on === true){
                    break;
                } else if (b.result === 2 || _.entries[i].ended === true){
                    ended = true;

                    break;
                } else if(b.result === -1){
                    return;
                }
            }
        }

        if(!_.use_state){
            global.managers.statistics.updateStat('command_av_handle_time', performance.now() - start)

            data.disconnect(); // Убираем задачу из списка

            return;
        }

        if(!ended) {
            try {
                await data.user.scenario.pushState(state_push);
            } catch(e) {
                global.common_logger.error(e);
            }
        }

        global.managers.statistics.updateStat('command_av_handle_time', performance.now() - start)

        data.disconnect(); // Убираем задачу из списка
    }
}