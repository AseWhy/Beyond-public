'use strict';

const { PushedCommand } = require("./pushed.command"),
      { GetUser, GetCharacter } = require("./ccc/ccc.core"),
      { Heap } = require("./pattern");

module.exports.QueryData = class QueryData {
    constructor(command, user, state, flags) {
        this.command = command;
        this.user = user;
        this.flags = flags != null ? flags : new Array();

        this.query = new Heap({
            command: {
                prefix: global.params.command_emitter.command_prefix,
                type: command ? command.type : null,
                header: command ? command.header : null,
                arg: command ? command.data : null
            },
            user: {
                id: user.id,
                registered: user.registered,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                scenario: {
                    id: user.scenario.id,
                    state: user.scenario.state,
                    data: user.scenario.data
                }
            }
        });

        if(state)
            this.setState(state);
    }
    
    /**
     * Разрешает пользователю вновь ипользовать бота. Вызывается когда все команды пользователя обработаны.
     */
    async disconnect(){
        if(this.character) {
            if(this.character.confirmation != null && !this.character.confirmation_request && !this.flags.includes('no-edit')){
                this.character.edit("confirmation", null);
            }

            if(!this.flags.includes('no-commit')) {
                await this.character.commit();
            }
        }

        global.managers.user.removeConnection(this.user.id);
    }

    /**
     * Почте тоже самое что и disonnect, но этот метод вызывает для сохранения изминений вызванных менеджером событий
     */
    async close(){
        if(this.character && !this.flags.includes('no-commit')) {
            await this.character.commit();
        }
    }

    /**
     * Добавляет данные персонажа пользователю.
     * 
     * @param {Character} character 
     */
    setCharacter(character){
        this.character = character;

        this.query.set("character", character.toDisplay());

        return this;
    }

    /**
     * Кстанавливает текущую стадию исполнения для сценария, в данных пользователя.
     * 
     * @param {ExcecutionState} state Стадия исполнения сценария
     */
    setState(state){
        this.state = state;

        this.query.set("state", {
            state: state.state,
            data: state.data
        });

        return this;
    }

    /**
     * Преобразует данные запроса в шаблон, по которому их можно будет восстановить.
     */
    toPattern(){
        const query = this.query.result();

        if(query.command)
            delete query.command;
        if(query.character)
            delete query.character;
        if(query.user)
            delete query.user;
        if(query.state)
            delete query.state;

        return {
            user_id: this.user.id,
            character: this.query.get("character") !== null,
            command: this.command,
            data: query
        }
    }

    /**
     * Восстанавливает данные запроса из шаблона.
     * 
     * @param {any} data данные для восстановления
     */
    static async fromPattern(data, character = null){
        const user = await GetUser(data.user_id);

        let r_data = new module.exports.QueryData(PushedCommand.fromPattern(data.command != undefined ? data.command : {header: '', data: []}), user);
        
        if(data.character || character != null){
            r_data.setCharacter(character != null ? character : await GetCharacter(data.user_id));
        }

        if(data.data)
            r_data.query.append(data.data);

        return r_data;
    }
}