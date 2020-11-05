const { performance } = require('perf_hooks'),
      { GetUserFromPattern, GetCharacterFromPattern } = require('../ccc/ccc.core');

class Updater{
    constructor(filter, interval, callback, namespace){
        this.interval   = interval;
        this.filter     = filter.bind(this);
        this.namespace  = namespace;
        this.callback   = callback;
        this._lastcall  = interval;
    }

    async trycall(timedata, data){
        if((this._lastcall -= timedata) <= 0){
            let next_call = await this.callback.call(null, Math.abs(this._lastcall), data.filter(this.filter))

            this._lastcall = next_call != null ? next_call : this.interval - Math.abs(this._lastcall); // next_call - время в мс до следующего вызова
        }

        return this._lastcall;
    }
}

module.exports.UpdateManager = class UpdateManager {
    constructor(config){
        const _ = this;

        _._updaters = new Array();
        _.default_update_interval = config.default_update_interval || 60000;
        _.updater = this.update.bind(this);
        _.date = new Date();

        setTimeout(_.updater, _.default_update_interval, performance.now());
    }

    async update(lastcall){
        let timeshot = performance.now(),
            // Тайминги
            timings = new Array(),
            // Получаю всех пользователей, чья активность была как максимум неделю назад
            data = await global.managers.pool.sql('common', 'SELECT users.id as u_id, users.registered as u_registred, users.banned as u_banned, users.scenario as u_scenario, users.notify as u_notify, users.created as u_created, users.updated as u_updated, characters.* FROM users, characters WHERE users.id LIKE characters.owner AND characters.updated >= \'' + (this.date.setTime(Date.now() - 604800000) && this.date.toISOString().slice(0, 19).replace('T', ' ')) + '\'')

        // Начинаю цикл обновления пользователей
        global.common_logger.log("Starts next update iteration. Overdue by " + (timeshot - lastcall).toFixed(2) + 'ms');

        // Фасовка пользователей
        for(let i = 0, leng = data.length, user, character; i < leng; i++){
            character = new Object();
            user = new Object();

            for(let key in data[i]){
                if(key.substring(0, 2) === 'u_'){
                    user[key.substring(2)] = data[i][key];
                } else {
                    character[key] = data[i][key];
                }
            }

            data[i] = [GetUserFromPattern(user), GetCharacterFromPattern(character)]
        }

        // Перебор последовательностей цикла
        for(let i = 0, leng = this._updaters.length, buffer;i < leng;i++) {
            buffer = await this._updaters[i].trycall((timeshot = performance.now()) - lastcall, data);

            for(let j = 0, j_leng = timings.length; j < j_leng; j++){
                if(buffer < timings[i]){
                    timings.splice(j, 0, buffer)

                    break;
                }
            }
        }
        
        // Получаем изминения в текущих персонажах.
        data = data.map(e => e[1].GetCommitData()).filter(e => e != null);

        if(data.length > 0)
            // В случае, если транзакция прошла неудачно, мы её повторяем.
            await (async function RetryTransaction(step){
                if(step > global.params.max_transaction_attempts){
                    global.common_logger.ward("The number of attempts to overwrite users has exceeded the maximum allowed. Transfer failed.");

                    global.managers.statistics.updateStat('errors_managers', 1)
                } else {
                    try {
                        // Записываем изминения
                        await global.managers.pool.sql('common', 'START TRANSACTION;' + data.join(';') + ';COMMIT;');
                    } catch (e) {
                        global.common_logger.error(e);

                        // Увеличиваю количество ошибок менеджера на 1
                        global.managers.statistics.updateStat('errors_managers', 1)

                        // Повторяем запрос, если тот прошел неудачно
                        RetryTransaction(step + 1);
                    }
                }
            })(0);

        // Бинд следующего обновления
        setTimeout(this.updater,  timings[0] != undefined ? timings[0] - (performance.now() - timeshot) : this.default_update_interval  - (performance.now() - timeshot), performance.now());
    }

    clear(namespace){
        return (this._updaters = this._updaters.filter(e => e.namespace != namespace)) && this;
    }

    addUpdater(namespace, interval, filter, callback){
        this._updaters.push(new Updater(filter, interval, callback, namespace));

        global.managers.statistics.updateStat('iterations_launched', this._updaters.length)
    }
}