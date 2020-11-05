const utils = require("../utils"),
      sql = require("sql-bricks");

module.exports.BindManadger = class BindManadger {
    constructor(config){
        const _ = this;

        _.excecutors = new Map();
        _.interval = config.udates_per_minute ? 1000 * (60 / config.udates_per_minute) : 30000;
        _.loaded = true;

        global.common_logger.log(`The scheduling manager started with an update interval of ${_.interval} ms`);

        setInterval(this.update.bind(this), _.interval);
    }

    async update(){
        let dteq = sql.lte('fire_after', Date.now()), _ = this,
            binds = await global.managers.pool.sql("common", sql.select('*').from('binds').where(dteq).toString()),
            b;

        if(binds.length > 0){
            for(let i = 0, leng = binds.length;i < leng;i++){
                try {
                    b = _.excecutors.get(binds[i].excecutor);

                    if(typeof b === "function")
                        await b(JSON.parse(binds[i].data));
                    else
                        global.common_logger.warn("error while excecuting order. can't find excecutor for ident: " + binds[i].excecutor);
                } catch(e){
                    global.common_logger.error("error while excecuting order " + binds[i].work_ident, e);

                    global.managers.statistics.updateStat('errors_managers', 1)
                }
            }

            await global.managers.pool.sql("common", sql.deleteFrom('binds').where(dteq).toString())
        
            global.common_logger.log(`Event scheduler triggered by ${binds.length} events`);
        }
    }

    addExcecutor(ident, handler){
        this.excecutors.set(ident, handler);
    }

    bind(ident, after, data){
        return global.managers.pool.sql("common", sql.insert('binds', {
            work_ident: utils.random_id(),
            fire_after: after,
            excecutor: ident,
            data: JSON.stringify(data)
        }).toString())
    }
}