// Максимальное время исполнения команды, по истечении этого времени пользователю гарантированно будет открыт доступ к управлению ботом
const MAX_TIME_TO_COMMAND_EXCECUTE = global.params.command_emitter.max_time_to_command_excecute;


module.exports.UserEntry = class UserEntry {
    constructor(){
        this.connections = 1;
        this.limitation = Date.now() + MAX_TIME_TO_COMMAND_EXCECUTE;
    }

    /**
     * @returns {Number} число активных обрабатываемых команд
     */
    getConnections(){
        if(Date.now() > this.limitation){
            return this.drop();
        } else
            return this.connections;
    }

    /**
     * Добавляет к исполнению ещё одну команду
     * 
     * @void
     */
    push(){
        this.limitation = Date.now() + MAX_TIME_TO_COMMAND_EXCECUTE;

        return ++this.connections;
    }

    /**
     * Уберает из списка команд конкретную команду
     * 
     * @void
     */
    drop(){
        if(this.connections > 0) {
            this.limitation = Date.now() + MAX_TIME_TO_COMMAND_EXCECUTE;

            return --this.connections;
        } else
            global.common_logger.warn("Error in the logic of counting active connections, the number of connections cannot be negative", new Error().stack);
    }
}

/**
 * Дабы избежать ситуации, когда пользователь по кд спамит бота командами,
 * и бот долго обрабатывает команды других пользователей. Существует этот класс.
 * UserManager будет следить сколько команд на пользователя в данный момент обрабатываются,
 * и не обрабатывать новые в момент когда предыдущие ещё не обработаны.
 */
module.exports.UserManager = class UserManager {
    constructor(do_max){
        this.do_max = do_max;
        this.loaded = true;
        this.users = new Array();
        this.connections = new Object();
    }

    /**
     * Возвращает число активных соединений
     * 
     * @param {Number} user id пользователя, для которого получаем число активных соединений
     * @returns {Number} Число активных соединений
     */
    getUserConnections(user){
        return this.connections[user].getConnections();
    }

    /**
     * Добавляет активное содинение пользователю, или не добавляет, если превышен лимит на подключения
     * 
     * @param {Number} user id пользователя
     * @returns {Boolean} `true`, если все прошло успешно. `false`, если число подключений привысило максимальное
     */
    addUserConnection(user){
        if(this.users.indexOf(user) !== -1)
            if(this.connections[user].getConnections() < this.do_max)
                this.connections[user].push();
            else
                return false;
        else {
            this.users.push(user);

            this.connections[user] = new module.exports.UserEntry();
        }

        return true;
    }
    
    /**
     * Удаляет активное соединение с пользователем
     * 
     * @param {Number} user id пользователя
     * @void
     */
    removeConnection(user){
        if(this.users.indexOf(user) !== -1)
            if(this.connections[user].drop() === 0){
                this.users.splice(this.users.indexOf(user), 1);

                this.connections[user] = undefined;
            }
        else 
            global.common_logger.warn("Error in the logic of counting active connections, the number of connections cannot be negative", new Error().stack);
    }
}