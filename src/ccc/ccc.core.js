/**
 * @file ccc.core.js
 * @description @see {@link readme.md} to more information
 * @license MIT
 */

const { CharacterStats } = require('./ccc.character.stats'),
      { CharacterInventory } = require('./ccc.character.inventory'),
      { ExcecutionState } = require('./ccc.scenario.excecution.state'),
      { CharacterData } = require('./ccc.character.data'),
      { MapDescriptor } = require('./ccc.map'),
      { Feature } = require('./ccc.stats.preset'),
      sql = require('sql-bricks');

class Character {
    /**
     * предоставляет стандартный интерфейс управления персоонажем
     */
    constructor(character){
        // Записываем изиминения
        this.change_stack   = new Array();

        // Поля самого персонажа
        this.id             = character.id;
        this.origin         = character.origin;
        this.fullname       = character.name + '#' + character.id;
        this.sex            = character.sex[0] === 0 ? 'Male' : 'Female';
        this.name           = character.name;

        this.health         = new Feature(0, 50, character.health); // default
        this.endurance      = new Feature(0, 80, character.endurance); // default
        this.stats          = new CharacterStats(this, character.busts, character.experience ? JSON.parse(character.experience) : new Object());
        this.inventory      = new CharacterInventory(this, character.inventory);
        this.map            = new MapDescriptor(character.map);
        this.data           = new CharacterData(character.data);

        this.confirmation   = JSON.parse(character.confirmation);
        this.own            = character.own        ? character.own.split(',')           : new Array();
        this.businesses     = character.businesses ? character.businesses.split(',')    : new Array();
    }

    // Передача валидных полей из сценарного движка
    getDisplayData(field){
        switch(field){
            case 'id':              return this.id;
            case 'origin':          return this.origin;
            case 'health':          return this.health;
            case 'endurance':       return this.endurance;
            case 'stats':           return this.stats;
            case 'inventory':       return this.inventory.toDisplay();
            case 'map':             return this.map;
            case 'fullname':        return this.fullname;
            case 'data':            return this.data.data;
            case 'sex':             return this.sex;
            case 'name':            return this.name;
            case 'confirmation':    return this.confirmation;
            case 'own':             return this.own;
            case 'businesses':      return this.businesses;
        }
    }

    // Для редактирования полей из сценарного движка
    edit(field, data){
        switch(field){
            case 'sex':
                if(typeof data === 'string') {
                    const sex = this.sex;

                    this.sex = sql('b' + (data === 'Male' ? 0 : 1));

                    if(this.sex != sex)
                        this.addChange(field);

                    return true;
                } else throw new TypeError('The sex field must have a string type.')
            case 'origin':
                if(typeof data === 'string') {
                    if(global.managers.origin.getOrigin(data) !== null) {
                        this.origin = data;

                        this.addChange(field);
    
                        return true;
                    } else throw new TypeError('The origin field must have only a valid origin.')
                } else throw new TypeError('The origin field must have a string type.')
            case 'name':
                if(typeof data === 'string') {
                    this.name = data;

                    this.addChange(field);

                    return true;
                } else throw new TypeError('The name field must have a string type.');
            case 'data':
                if(typeof data === 'object') {
                    this.data.resetdata(data);

                    this.addChange(field);

                    return true;
                } else throw new TypeError('The data field must be a object.');
            case 'map':
                if(typeof data === 'string') {
                    this.map.parsePath(data);

                    this.addChange(field);

                    return true;
                } else throw new TypeError('The map field must have a string type.');
            case 'own':
                if(typeof data === 'object' && data instanceof Array) {
                    this.own = data;

                    this.addChange(field);

                    return true;
                } else throw new TypeError('The own field must have a array type.');
            case 'businesses':
                if(typeof data === 'object' && data instanceof Array) {
                    this.businesses = data;

                    this.addChange(field);

                    return true;
                } else throw new TypeError('The businesses field must have a array type. but give ' + JSON.stringify(data));
            case 'endurance':
                if(typeof data === 'number') {
                    const endurance = this.endurance;

                    this.endurance = Math.floor(data > 0 ? data < this.endurance.max ? data : this.endurance.max : 0);

                    if(endurance != this.endurance)
                        this.addChange(field);

                    return true;
                } else throw new TypeError('The endurance field must have a number type.')
            case 'stats':
                if(typeof data === 'object') {
                    this.stats.exp(data);

                    this.addChange(field);

                    return true;
                } else throw new TypeError('The stats field must have a object type.');
            break;
            case 'confirmation':
                if(typeof data === 'object') {
                    this.confirmation = data;

                    this.addChange(field);

                    return true;
                } else throw new TypeError('The confirmation field must have a object type.');
            case 'health':
                if(typeof data === 'number') {
                    const health = this.health;

                    this.health = Math.floor(data > 0 ? data < this.health.max ? data : this.health.max : 0);

                    if(health != this.health)
                        this.addChange(field);

                    return true;
                } else throw new TypeError('The health field must have a number value.')
            case 'inventory':
                if(typeof data === 'object' && data instanceof Array) {
                    this.addChange(field);

                    this.inventory.edit(data);

                    return true;
                } else throw new TypeError('The inventory field must have a array type.')
        }

        return false;
    }

    addChange(change){
        if(!this.change_stack.includes(change))
            this.change_stack.push(change);
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
                    else if(typeof buffer.toSubFields === 'function')
                        Object.assign(CommitData, buffer.toSubFields())
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
            return await global.managers.pool.sql('common', data);
        }
    }
}

class User {
    /**
     * Предоставляет стандартный интерфейс управления пользователем
     */
    constructor(user){
        this.change_stack = new Array();

        this.id = user.id;
        this.banned = user.banned === 1;
        this.notify = user.notify === 1;
        this.registered = user.registered === 1;
        this.createdAt = (user.created != null ? user.created : new Date()).getTime();
        this.updatedAt = (user.created != null ? user.created : new Date()).getTime();
        this.state = new ExcecutionState(user.scenario, user.scenario_state, user.scenario_data, this); // Стадия исполнения сценария
        this.keyboard = user.keyboard != null ? JSON.parse(user.keyboard) : null;
    }

    // Передача валидных полей из сценарного движка
    getDisplayData(field){
        switch(field){
            case 'id':          this.id;
            case 'banned':      this.banned;
            case 'notify':      this.notify;
            case 'registered':  this.registered;
            case 'createdAt':   this.createdAt;
            case 'updatedAt':   this.updatedAt;
            case 'state':       this.state;
            case 'keyboard':    this.keyboard;
        }
    }

    edit(field, data){
        switch(field){
            case 'keyboard':
                if(typeof data === 'object') {
                    this.addChange(field);

                    this.keyboard = data;

                    return true;
                } else throw new TypeError('The keyboard field must have a object type.')
            case 'registered':
                if(typeof data === 'boolean') {
                    this.addChange(field);

                    this.registered = data;

                    return true;
                } else throw new TypeError('The registered field must have a boolean type.');
            case 'notify':
                if(typeof data === 'boolean') {
                    this.addChange(field);

                    this.notify = data;

                    return true;
                } else throw new TypeError('The notify field must have a boolean type.');
            case 'banned':
                if(typeof data === 'boolean') {
                    this.addChange(field);

                    this.banned = data;

                    return true;
                } else throw new TypeError('The banned field must have a boolean type.');
            case 'state':
                if(typeof data === 'object') {
                    if(typeof data.id !== 'string' && data.id !== null && typeof data.state === 'number' && typeof data.data === 'object')
                        throw new TypeError('Bad state format: ' + JSON.stringify({data}));
                    
                    this.addChange(field);

                    this.state.id = data.id;
                    this.state.state = data.state;
                    this.state.data = data.data;

                    return true;
                } else throw new TypeError('The keyboard field must have a object type.')
        }
    }

    addChange(change){
        if(!this.change_stack.includes(change))
            this.change_stack.push(change);
    }

    toDisplay(){
        return {
            id:         this.id,
            banned:     this.banned,
            notify:     this.notify,
            registered: this.registered,
            createdAt:  this.createdAt,
            updatedAt:  this.updatedAt,
            state:      this.state,
            keyboard:   this.keyboard
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
                    else if(typeof buffer.toSubFields === 'function')
                        Object.assign(CommitData, buffer.toSubFields())
                    else if(typeof buffer.toRaw === 'function')
                        CommitData[this.change_stack[i]] = buffer.toRaw();
                    else
                        CommitData[this.change_stack[i]] = JSON.stringify(buffer).replace(/\\/g, '\\\\');
                else
                    CommitData[this.change_stack[i]] = buffer;
            }

            return sql.update('users', CommitData).where(sql.like('id', this.id)).toString();
        } else {
            return null;
        }
    }

    // Коммит изминений
    async commit(){
        const data = this.GetCommitData();

        if(data != null){
            return await global.managers.pool.sql('common', data);
        }
    }

    async getBanStatus(){
        return (await global.managers.pool.sql('common', sql.select('*').from('ban_list').where('owner', this.id).toString()))[0];
    }
}

module.exports.GetUser = async user_id => {
    // Ищем пользователя в базе
    const users = await global.managers.pool.sql('common', sql.select('*').from('users').where(sql.like('id', user_id)).toString());

    if(users.length > 0){
        return new User(users[0]); 
    } else {
        await global.managers.pool.sql('common', sql.insert('users', {id: user_id, scenario: null, created: sql('CURRENT_TIMESTAMP'), updated: sql('CURRENT_TIMESTAMP')}).toString())

        return new User({id: user_id}); 
    }
}

module.exports.GetCharacter = async user_id => {
    const character = await global.managers.pool.sql('common', sql.select('*').from('characters').where(sql.like('owner', user_id)).toString());

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