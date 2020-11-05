const { PushedCommand } = require("./pushed.command");
const { QueryData } = require("./querydata");

global.common_logger.log("Starting to load command emitter");

module.exports.CommandEmitter = class CommandEmitter {
    constructor(secenario_manager){
        this.secenario_manager = secenario_manager;
    }

    /**
     * Обрабатывает команду пользователя, обработчиком `target`
     * 
     * @param {String} target целевой обработчик команды
     * @param {String} command Команда в текстовом виде
     * @param {QueryData} user данные пользователя отправившего команду
     * @param {CouplerEmitter} emitter данные для ответа
     * 
     * Ничего не возвращает, обрабатывает команду пользователя, послывая ответ в Emitter;
     * @see {@link CouplerEmitter.reply} для просмотра вариаций ответа
     */
    call(target, command, user, emitter){
        command = typeof command === "string" && command.substring(0, global.params.command_emitter.command_prefix.length) === global.params.command_emitter.command_prefix ? new PushedCommand(command) : command != null ? PushedCommand.fromPattern(command) : null;

        if (target != null){
            this.secenario_manager.apply(target, new QueryData(command, user, user.state), emitter);
        } else {
            global.common_logger.warn(`target cannot be null or empty`)
        }
    }

    /**
     * Обрабатывает команду пользователя
     * 
     * @param {String} command Команда в текстовом виде
     * @param {QueryData} user данные пользователя отправившего команду
     * @param {CouplerEmitter} emitter данные для ответа
     * 
     * Ничего не возвращает, обрабатывает команду пользователя, послывая ответ в Emitter;
     * @see {@link CouplerEmitter.reply} для просмотра вариаций ответа
     */
    handleCommand(command, user, emitter) {
        global.managers.statistics.updateStat('messages_received', 1)

        if (typeof command === "string" && command.substring(0, global.params.command_emitter.command_prefix.length) === global.params.command_emitter.command_prefix && command.trim() != global.params.command_emitter.command_prefix){
            global.managers.statistics.updateStat('commands_handled', 1)

            this.secenario_manager.exec(new PushedCommand(command.substring(global.params.command_emitter.command_prefix.length)), user, emitter); // Передаем управление менеджеру сценариев
        } else if(typeof command === "object"){
            global.managers.statistics.updateStat('commands_handled', 1)

            this.secenario_manager.exec(PushedCommand.fromPattern(command), user, emitter); // Передаем управление менеджеру сценариев
        } else {
            global.managers.user.removeConnection(user.id);
        }
    }
}

global.common_logger.log("Command emitter loaded and started successfully");