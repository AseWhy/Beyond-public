/**
 * @file item-manager.js
 * @description загружается при старте приложения, получает из базы названия и данные для айтемов, фактически менеджер того что есть в игре, его статы, и параметры
 * @license MIT
 */

const sql = require('sql-bricks'),
      { EventManager } = require('../event-manager');

module.exports.GameDataManager = class GameDataManager extends EventManager {
    constructor(config){
        super(['load', 'error'])

        const _ = this;

        _.data = new Map();
        _.changes = new Array();
        _.loaded = false;
        _.interval = config.update_interval != null ? config.update_interval : 60000;

        void async function Init(){
            await _.update();

            _.invoke('load');

            _.loaded = true;
        }();

        setInterval(this.push.bind(_), _.interval);
    }

    async update(){
        const data = await global.managers.pool.sql('common', sql.select('*').from('data').toString());

        for(let i = 0, leng = data.length; i < leng; i++){
            this.data.set(data[i].field_name, JSON.parse(data[i].data));
        }

        global.common_logger.log('Synchronization of game data. ' + this.data.size + ' pieces synchronized');
    }

    async push(){
        const transaction = new Array();

        for(let i = 0, leng = this.changes.length; i < leng; i++){
            if(this.changes[i].type === 0)
                transaction.push(sql.update('data', {data: JSON.stringify(this.data.get(this.changes[i].label)).replace(/\\/g, '\\\\')}).where('field_name', this.changes[i].label).toString())
            else
                transaction.push(sql.insert('data', {field_name: this.changes[i].label, data: JSON.stringify(this.data.get(this.changes[i].label)).replace(/\\/g, '\\\\')}).toString())
        }

        if(transaction.length > 0) {
            global.common_logger.log('Commit game data changes. ' + transaction.length + ' pieces has been changed.');

            this.changes.splice(0, this.changes.length);

            await (async function RetryTransaction(step){
                if(step > global.params.max_transaction_attempts){
                    global.common_logger.warn("The number of attempts to overwrite game-data has exceeded the maximum allowed. Transfer failed.");

                    global.managers.statistics.updateStat('errors_managers', 1)
                } else {
                    try {
                        await global.managers.pool.sql('common', 'START TRANSACTION;' + transaction.join(';') + ';COMMIT;');
                    } catch (e) {
                        global.common_logger.error(e);

                        // Увеличиваю количество ошибок менеджера на 1
                        global.managers.statistics.updateStat('errors_managers', 1)

                        // Повторяем запрос, если тот прошел неудачно
                        await RetryTransaction(step + 1);
                    }
                }
            })(0);
        }
    }

    setData(key, value){
        this.changes.push({type: this.data.has(key) ? 0 : 1, label: key})

        this.data.set(key, value);
    }

    getData(key){
        if(this.loaded){
            if(this.data.has(key))
                return this.data.get(key);
            else
                return null
        } else {
            global.common_logger.warn('Data have not been loaded yet, please wait');

            return null;
        }
    }
}