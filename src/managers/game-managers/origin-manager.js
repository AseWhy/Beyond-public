/**
 * @file origin-manager.js
 * @description загружается при старте приложения, получает из базы названия и данные для происхождений
 * @license MIT
 */

const { EventManager } = require("../event-manager"),
      { OriginDefault } = require("../../ccc/ccc.default"),
      sql = require("sql-bricks");

module.exports.OriginManager = class OriginManager extends EventManager {
    constructor(){
        super(["load", "error"])

        const _ = this;

        _.origin_map = new Map();
        _.loaded = false;

        // Подгружаем активные исходные парметры для происхождения
        void async function GetOrigins(){
            try {
                const origins = await global.managers.pool.sql("common", sql.select('*').from('origin_defaults').toString())
            
                global.common_logger.log(`Origin manager starting to loading`);

                global.common_logger.pushIndent();

                for(let i = 0, leng = origins.length; i < leng; i++) {
                    global.common_logger.log(`Origin ${origins[i].pd_origin_name} has been load.`);
    
                    _.origin_map.set(origins[i].pd_origin_name, new OriginDefault(origins[i]));
                }
    
                global.common_logger.popIndent();
    
                global.common_logger.log(`The origin manager has finished loading, load ${_.origin_map.size} origins.`);
    
                _.loaded = true;
    
                _.invoke("load", [_]);
            } catch (e) {
                global.common_logger.error("Error while loading origin manager.", e);

                global.managers.statistics.updateStat('errors_managers', 1)

                _.invoke("error", [e]);
            }
        }();
    }

    async update(){
        try {
            const origins = await global.managers.pool.sql("common", sql.select('*').from('origin_defaults').toString())
                
            global.common_logger.log(`Origin manager starting to updating`);

            global.common_logger.pushIndent();

            for(let i = 0, leng = origins.length; i < leng; i++) {
                global.common_logger.log(`Origin ${origins[i].pd_origin_name} has been updated.`);

                this.origin_map.set(origins[i].pd_origin_name, new OriginDefault(origins[i]));
            }

            global.common_logger.popIndent();

            global.common_logger.log(`The origin manager has finished updating, updated ${this.origin_map.size} origins.`);
        } catch (e) {
            global.managers.statistics.updateStat('errors_managers', 1)
        }
    }
    
    getOrigin(name){
        return this.origin_map.get(name);
    }
}