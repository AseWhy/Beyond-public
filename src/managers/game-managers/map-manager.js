const { GetCharacterFromPattern, GetUserFromPattern } = require("../../ccc/ccc.core"),
      { District } = require("../../map/map.district"),
      { Heap } = require("../../pattern"),
      { EventManager } = require("../event-manager"),
      { Map } = require("../../map/map.main"),
      { QueryData } = require("../../querydata"),
      { CouplerEmitter } = require("../../coupler.emitter"),
      { performance } = require("perf_hooks"),
      { PushedCommand } = require("../../pushed.command"),
        sql = require("sql-bricks");

/// NOTICE!!!
/// Вместо map(карта) я спользую название world(мир), никакого смысла это не несет
/// Просто мне так легче понимать, прошу не бить палками за это.

module.exports.MapManager = class MapManager extends EventManager {
    constructor(config){
        super(['load', 'error']);

        const _ = this;

        _.common_map        = config.common_id;
        _.updater_namespace = config.updater_namespace || 'iua_common_districts';
        _.maps              = new global.Map();
        _.districts         = new global.Map();
        _.loaded            = false;

        global.common_logger.log("Loading the map manager");

        // Получаю список всех миров
        void async function GetWorlds(){
            try {
                const worlds = await global.managers.pool.sql("map", sql.select('*').from('worlds').toString());
            
                global.common_logger.log("Initialization of " + worlds.length + " maps started");

                global.common_logger.pushIndent();

                for(let i = 0, leng = worlds.length;i < leng;i++){
                    const regions = await global.managers.pool.sql("map", sql.select('*').from('regions').where(sql.like('owner', worlds[i].id)).toString())
                
                    global.common_logger.log("Initialization of " + worlds[i].id + " world started - it has " + regions.length + " regions");

                    global.common_logger.pushIndent();

                    for(let j = 0, j_leng = regions.length;j < j_leng;j++){
                        regions[j].provinces = await global.managers.pool.sql("map", sql.select('*').from('provinces').where(sql.like('owner', regions[j].id)).toString())
                    
                        global.common_logger.log(regions[j].id + " successfully initialized - it has " + regions[j].provinces.length + " provinces");
                    }

                    _.maps.set(worlds[i].id, new Map(worlds[i], regions));

                    global.common_logger.popIndent();

                    global.common_logger.log("World " + worlds[i].id + " successfully initialized");
                }

                global.common_logger.popIndent();

                const districts = await global.managers.pool.sql("map", sql.select('*').from('districts').toString()),
                      events = new global.Map();

                global.common_logger.log("Initialization of " + districts.length + " districts started");
    
                global.common_logger.pushIndent();
    
                for(let i = 0, leng = districts.length;i < leng;i++){
                    districts[i].includes = JSON.parse(districts[i].includes);

                    _.districts.set(districts[i].id, new District(districts[i], false, events))

                    global.common_logger.log(districts[i].id + " successfully initialized");
                }

                _.updateWaiter(_.updater_namespace, events);
    
                global.common_logger.popIndent();

                global.common_logger.log("MapManager loaded successfully");

                _.loaded = true;

                _.invoke("load", [_]);
            } catch (e) {
                global.managers.statistics.updateStat('errors_managers', 1)

                _.invoke("error", [e]);
            }
        }();
    }

    updateWaiter(namespace, events){
        global.managers.update.clear(namespace);

        for(let event of events.values())
            (event => {
                global.managers.update.addUpdater(namespace, event.interval, e => e[1].map.stack.length > 4 && event.paths.includes(e[1].map.stack.slice(4).join('/')), async (wp, data) => {
                    if(data.length != 0) {
                        let start = performance.now();
        
                        for(let i = 0, leng = data.length, current;i < leng;i++){
                            current = new QueryData(PushedCommand.getEmpty(), data[i][0], null, ['no-commit', 'no-edit']).setCharacter(data[i][1]);

                            for(let j = 0, j_leng = event.targets.length;j < j_leng;j++){
                                if(event.targets[j].path === data[i][1].map.district[data[i][1].map.district.length - 1].path){
                                    current.query.set('zone', event.data[j])

                                    break;
                                }
                            }
        
                            try {
                                await global.managers.scenario.run(event.scenario, current, new CouplerEmitter(global.managers.scenario.vk, data[i][0].id)); // Запукаем для пользователя...
                            } catch (e) {
                                global.common_logger.error(`Update iteration skipped for character ${data[i][0].id} by mistake`, e);
                            }
                        }
            
                        global.managers.statistics.updateStat('sity_handler_av_time', performance.now() - start)
                    }
                })
            })(event);

        global.managers.statistics.updateStat('sity_handler_launched', events.size)
    }

    async update(){
        try {
            const worlds = await global.managers.pool.sql("map", sql.select('*').from('worlds').toString());
                
            global.common_logger.log("Updating of " + worlds.length + " maps started");

            global.common_logger.pushIndent();

            for(let i = 0, leng = worlds.length;i < leng;i++){
                const regions = await global.managers.pool.sql("map", sql.select('*').from('regions').where(sql.like('owner', worlds[i].id)).toString())
            
                global.common_logger.log("Updating of " + worlds[i].id + " world started - he has " + regions.length + " regions");

                global.common_logger.pushIndent();

                for(let j = 0, j_leng = regions.length;j < j_leng;j++){
                    regions[j].provinces = await global.managers.pool.sql("map", sql.select('*').from('provinces').where(sql.like('owner', regions[j].id)).toString())
                
                    global.common_logger.log(regions[j].id + " successfully updated - it has " + regions[j].provinces.length + " provinces");
                }

                this.maps.set(worlds[i].id, new Map(worlds[i], regions));

                global.common_logger.popIndent();

                const districts = await global.managers.pool.sql("map", sql.select('*').from('districts').toString()),
                      events = new global.Map();

                global.common_logger.log("Updating of " + districts.length + " districts started");

                global.common_logger.pushIndent();

                for(let i = 0, leng = districts.length;i < leng;i++){
                    districts[i].includes = JSON.parse(districts[i].includes);

                    this.districts.set(districts[i].id, new District(districts[i], false, events))

                    global.common_logger.log(districts[i].id + " successfully initialized");
                }

                _.updateWaiter(this.updater_namespace, events);

                global.common_logger.popIndent();

                global.common_logger.log("World " + worlds[i].id + " successfully updated");
            }

            global.common_logger.popIndent();

            global.common_logger.log("MapManager updated successfully");

        } catch (e) {
            global.managers.statistics.updateStat('errors_managers', 1)
        }
    }

    getDistrictByUId(uid){
        let stack = [...this.districts.values()], ln = 0;

        while((ln = stack.length - 1) + 1){
            if(stack[ln].uid == uid)
                return stack[ln];

            if(stack[ln].includes.length > 0){
                stack.push(...stack[ln].includes);

                stack.splice(ln, 1);

                continue;
            }

            stack.pop();
        }

        return null;
    }

    getDistrictsForSity(sity, character){
        return (sity = new Heap({sity, character})) && [...this.districts.values()].filter(e => e.condition.result(sity));
    }

    getMap(id){
        if(this.loaded)
            if(id != undefined)
                return this.maps.get(id);
            else
                return this.getCommon();
        else {
            global.common_logger.warn("Maps have not been loaded yet, please wait");

            return null;
        }
    }

    getCommon(){
        return this.getMap(this.common_map);
    }
}