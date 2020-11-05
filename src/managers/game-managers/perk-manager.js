/**
 * @file perk-manager.js
 * @description загружается при старте приложения, менеджер управления перками
 * @license MIT
 */

const { CommonStatsPreset } = require("../../ccc/ccc.stats.preset");
const { EventManager } = require("../event-manager"),
      sql = require("sql-bricks");

class Perk {
    constructor(data){
        this.id = data.named_id;
        this.display = data.display;

        this.stats = new CommonStatsPreset();

        data.stats = JSON.parse(data.stats);

        if(data.stats.skills)
            this.stats.skills.blend(data.stats.skills)

        if(data.stats.stats)
            this.stats.stats.blend(data.stats.stats)
    }

    blend(stat){
        stat.skills.blend(this.stats.skills);
        stat.stats.blend(this.stats.stats);
    }
}

module.exports.PerkManager = class PerkManager extends EventManager {
    constructor(){
        super(["load", "error"])

        const _ = this;

        _.perks = new Map();
        _.loaded = false;

        // Подгружаем активные исходные парметры для происхождения
        void async function GetOrigins(){
            try {
                const perks = await global.managers.pool.sql("common", sql.select('*').from('perks').toString())
            
                global.common_logger.log(`Perks manager starting to loading`);

                global.common_logger.pushIndent();

                for(let i = 0, leng = perks.length; i < leng; i++) {
                    global.common_logger.log(`Perk ${perks[i].named_id} has been load.`);
    
                    _.perks.set(perks[i].named_id, new Perk(perks[i]));
                }
    
                global.common_logger.popIndent();
    
                global.common_logger.log(`The perk manager has finished loading, load ${_.perks.size} perks.`);
    
                _.loaded = true;
    
                _.invoke("load", [_]);
            } catch (e) {
                global.common_logger.error("Error while loading perk manager.", e);

                global.managers.statistics.updateStat('errors_managers', 1)

                _.invoke("error", [e]);
            }
        }();
    }

    async update(){
        try {
            const perks = await global.managers.pool.sql("common", sql.select('*').from('perks').toString())
        
            global.common_logger.log(`Perks manager starting to updating`);

            global.common_logger.pushIndent();

            for(let i = 0, leng = perks.length; i < leng; i++) {
                global.common_logger.log(`Perk ${perks[i].named_id} has been load.`);

                _.perks.set(perks[i].named_id, new Perk(perks[i]));
            }

            global.common_logger.popIndent();

            global.common_logger.log(`The perk manager has finished updating, updated ${_.perks.size} perks.`);

            _.loaded = true;

            _.invoke("load", [_]);
        } catch (e) {
            global.common_logger.error("Error while updating perk manager.", e);

            global.managers.statistics.updateStat('errors_managers', 1)

            _.invoke("error", [e]);
        }
    }
    
    blend(ids, origin){
        let result = new CommonStatsPreset(), buffer, removes = new Array(), health = 50, endurance = 80;

        for(let i = 0, leng = ids.length;i < leng;i++){
            if((buffer = this.perks.get(ids[i])) != null){
                buffer.blend(result);
            } else
                removes.push(ids[i]);
        }

        if((buffer = global.managers.origin.getOrigin(origin)) != null) {
            buffer.blend(result);

            endurance += buffer.endurance + 5 * result.stats.strength.value;
            health += buffer.health + 3 * result.stats.strength.value;
        } else
            throw new Error("Cannot find origin " + origin);

        return { data: result, removes, health, endurance };
    }
}