'use strict';

const { PushedCommand } = require("./pushed.command"),
      { GetUser, GetCharacter } = require("./ccc/ccc.core"),
      { Heap } = require("./pattern");

module.exports.QueryData = class QueryData {
    constructor(command, user, flags) {
        this.command = command;
        this.user = user;
        this.flags = flags != null ? flags : new Array();

        this.query = new Heap({
            command: {
                prefix: global.params.command_emitter.command_prefix,
                type: command != null ? command.type : null,
                header: command != null ? command.header : null,
                arg: command != null ? command.data : null
            },
            user: user.toDisplay()
        });
    }
    
    /**
     * Разрешает пользователю вновь ипользовать бота. Вызывается когда все команды пользователя обработаны.
     */
    async disconnect(){
        if(this.character && this.character.confirmation != null && !this.character.change_stack.includes('confirmation') && !this.flags.includes('no-edit')){
            this.character.edit("confirmation", null);
        }

        await this.close();

        global.managers.user.removeConnection(this.user.id);
    }

    /**
     * Почте тоже самое что и disonnect, но этот метод вызывает для сохранения изминений вызванных менеджером событий
     */
    async close(){
        if(!this.flags.includes('no-commit')){
            await this.user.commit();

            if(this.character) {
                await this.character.commit();
            }
        }
    }

    /**
     * Устанавливает данные пользователя.
     * 
     * @param {Character} character 
     */
    setUser(user){
        this.user = character;

        this.query.set("user", user.toDisplay());

        return this;
    }

    /**
     * Устанавливает данные персонажа пользователю.
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
        const user = this.query.get('user');

        if(user != null)
            user.set('state', {
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