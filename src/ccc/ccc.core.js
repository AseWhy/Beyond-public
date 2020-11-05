/**
 * @file ccc.core.js
 * @description @see {@link readme.md} to more information
 * @license MIT
 */

const { CharacterStats } = require("./ccc.character.stats"),
      { CharacterInventory } = require("./ccc.character.inventory"),
      { ExcecutionState } = require("./ccc.scenario.excecution.state"),
      { CharacterData } = require("./ccc.character.data"),
      { MapDescriptor } = require("./ccc.map"),
      { Stat } = require("./ccc.stats.preset"),
      sql = require("sql-bricks");

class Character {
    /**
     * предоставляет стандартный интерфейс управления персоонажем
     */
    constructor(character){
        // Записываем изиминения
        this.change_stack   = new Array();
        this.confirmation_request = false;

        // Поля самого персонажа
        this.id             = character.id;
        this.origin         = character.origin;
        this.health         = new Stat(0, 50, character.health); // default
        this.endurance      = new Stat(0, 80, character.endurance); // default
        this.stats          = new CharacterStats(this, character.busts);
        this.inventory      = new CharacterInventory(this, character.inventory);
        this.map            = new MapDescriptor(character.map);
        this.data           = new CharacterData(character.data);
        this.fullname       = character.name + '#' + character.id;
        this.experience     = BigInt(character.experience)
        this.sex            = character.sex[0] === 0 ? "Male" : "Female";
        this.name           = character.name;
        this.confirmation   = JSON.parse(character.confirmation);
        this.own            = character.own != null ? character.own.split(',') : new Array();
        this.businesses     = character.businesses != null ? character.businesses.split(',') : new Array();
    }

    // Передача валидных полей из сценарного движка
    getDisplayData(field){
        switch(field){
            case "id":              return this.id;
            case "origin":          return this.origin;
            case "health":          return this.health;
            case "endurance":       return this.endurance;
            case "stats":           return this.stats;
            case "inventory":       return this.inventory.toDisplay();
            case "map":             return this.map;
            case "experience":      return this.experience;
            case "fullname":        return this.fullname;
            case "data":            return this.data.data;
            case "sex":             return this.sex;
            case "name":            return this.name;
            case "confirmation":    return this.confirmation;
            case "own":             return this.own;
            case "businesses":      return this.businesses;
        }
    }

    // Для редактирования полей из сценарного движка
    edit(field, data){
        switch(field){
            case "sex":
                if(typeof data === "string") {
                    this.sex = sql("b" + (data === "Male" ? 0 : 1));

                    this.change_stack.push(field);

                    return true;
                } else throw new TypeError("The sex field must have a string type.")
            case "origin":
                if(typeof data === "string") {
                    if(global.managers.origin.getOrigin(data) !== null) {
                        this.origin = data;

                        this.change_stack.push(field);
    
                        return true;
                    } else throw new TypeError("The origin field must have only a valid origin.")
                } else throw new TypeError("The origin field must have a string type.")
            case "name":
                if(typeof data === "string") {
                    this.name = data;

                    this.change_stack.push(field);

                    return true;
                } else throw new TypeError("The name field must have a string type.");
            case "data":
                if(typeof data === "object") {
                    this.data.resetdata(data);

                    this.change_stack.push(field);

                    return true;
                } else throw new TypeError("The name field must be a object.");
            case "map":
                if(typeof data === "string") {
                    this.map.parsePath(data);

                    this.change_stack.push(field);

                    return true;
                } else throw new TypeError("The name field must have a string type.");
            case "own":
                if(typeof data === "object" && data instanceof Array) {
                    this.own = data;

                    this.change_stack.push(field);

                    return true;
                } else throw new TypeError("The own field must have a array type.");
            case "businesses":
                if(typeof data === "object" && data instanceof Array) {
                    this.businesses = data;

                    this.change_stack.push(field);

                    return true;
                } else throw new TypeError("The businesses field must have a array type.");
            case "endurance":
                if(typeof data === "number") {
                    this.endurance = Math.floor(data > 0 ? data < this.endurance.max ? data : this.endurance.max : 0);

                    this.change_stack.push(field);

                    return true;
                } else throw new TypeError("The endurance field must have a number type.")
            case "confirmation":
                if(typeof data === "object") {
                    this.confirmation = data;

                    this.confirmation_request = true;

                    this.change_stack.push(field);

                    return true;
                } else throw new TypeError("The confirmation field must have a object type.");
            case "health":
                if(typeof data === "number") {
                    this.health = Math.floor(data > 0 ? data < this.health.max ? data : this.health.max : 0);

                    this.change_stack.push(field);

                    return true;
                } else throw new TypeError("The health field must have a number value.")
            case "inventory":
                if(typeof data === "object" && data instanceof Array) {
                    this.change_stack.push(field);

                    this.inventory.edit(data);

                    return true;
                } else throw new TypeError("The inventory field must have a array type.")
        }

        return false;
    }

    // Данные которые идут в шаблонизатор
    toDisplay(){
        return {
            id:             this.id,
            name:           this.name,
            owner:          this.owner,
            origin:         this.origin,
            stats:          this.stats,
            endurance:      this.endurance,
            health:         this.health,
            map:            this.map,
            data:           this.data.data,
            fullname:       this.fullname,
            confirmation:   this.confirmation,
            businesses:     this.businesses,
            inventory:      this.inventory.toDisplay(),
            own:            this.own
        }
    }

    // Получает текущие изминения
    GetCommitData(){
        if(this.change_stack.length != 0){
            const CommitData = new Object();

            for(let i = 0, leng = this.change_stack.length, buffer;i < leng;i++) {
                if(typeof (buffer = this[this.change_stack[i]]) === 'object')
                    if(buffer == null)
                        CommitData[this.change_stack[i]] = null;
                    else if(typeof buffer.toRaw === 'function')
                        CommitData[this.change_stack[i]] = buffer.toRaw();
                    else if(Array.isArray(buffer))
                        CommitData[this.change_stack[i]] = buffer.join(',');
                    else
                        CommitData[this.change_stack[i]] = JSON.stringify(buffer).replace(/\\/g, '\\\\');
                else
                    CommitData[this.change_stack[i]] = buffer;
            }

            return sql.update('characters', CommitData).where(sql.like('id', this.id)).toString();
        } else {
            return null;
        }
    }

    // Коммит изминений
    async commit(){
        const data = this.GetCommitData();

        if(data != null){
            this.change_stack.splice(0, this.change_stack.length);

            return await global.managers.pool.sql("common", data);
        }
    }
}

class User {
    /**
     * Предоставляет стандартный интерфейс управления пользователем
     */
    constructor(user){
        this.id = user.id;
        this.banned = user.banned === 1;
        this.notify = user.notify === 1;
        this.registered = user.registered === 1;
        this.createdAt = (user.created != null ? user.created : new Date()).getTime();
        this.updatedAt = (user.created != null ? user.created : new Date()).getTime();
        this.scenario = new ExcecutionState(this, user.scenario, user.scenario_state, user.scenario_data); // Стадия исполнения сценария
    }

    /**
     * Устанавливает целевой сценарий для пользователя
     * 
     * @returns {Promise<ExcecutionState|Error>} данные о исполнении сценария или ошибка
     */
    async setTargetScenario(s_id, state = 0, data){
        const _ = this;
        
        if(typeof s_id !== "string" && s_id !== null && typeof state === "number" && typeof data === "object")
            throw new TypeError(JSON.stringify({s_id, state, data}));

        this.scenario.id = s_id;
        this.scenario.state = state;
        this.scenario.data = data;

        return this.scenario.update();
    }
}

module.exports.GetUser = async user_id => {
    // Ищем пользователя в базе
    const users = await global.managers.pool.sql("common", sql.select('*').from('users').where(sql.like('id', user_id)).toString());

    if(users.length > 0){
        return new User(users[0]); 
    } else {
        await global.managers.pool.sql("common", sql.insert('users', {id: user_id, scenario: null, created: sql('CURRENT_TIMESTAMP'), updated: sql('CURRENT_TIMESTAMP')}).toString())

        return new User({id: user_id}); 
    }
}

module.exports.GetCharacter = async user_id => {
    const character = await global.managers.pool.sql("common", sql.select('*').from('characters').where(sql.like('owner', user_id)).toString());

    if(character.length > 0){
        return new Character(character[0]);
    } else {
        return null;
    }
}

module.exports.GetCharacterFromPattern = pattern => {
    if(pattern != null && typeof pattern === 'object'){
        return new Character(pattern);
    } else {
        return null;
    }
}

module.exports.GetUserFromPattern = pattern => {
    if(pattern != null && typeof pattern === 'object'){
        return new User(pattern);
    } else {
        return null;
    }
}