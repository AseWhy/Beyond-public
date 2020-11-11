/**
 * @file item-manager.js
 * @description загружается при старте приложения, получает из базы названия и данные для айтемов, фактически менеджер того что есть в игре, его статы, и параметры
 * @license MIT
 */

const sql = require("sql-bricks"),
      { EventManager } = require("../event-manager"),
      { performance } = require("perf_hooks"),
      { ExpressionPattern, Heap } = require("../../pattern");

module.exports.BusinessEntry = class BusinessEntry {
    constructor(data, update){
        this.id = data.id;
        this.type = data.type;
        this.condition = new ExpressionPattern(data.condition_data, [], global.common_logger);
        this.display = data.display;
        this.description = data.description;

        if(data.data)
            data.data = JSON.parse(data.data);

        if(data.type === 1){
            this.cost       = typeof data.data.cost === 'object' ? (data.data.cost.bans != null ? data.data.cost.bans : 0) : data.data.cost; // Стоимость в бизнесах только в банах
            this.income     = typeof data.data.income === 'object' ? (data.data.income.bans != null ? data.data.income.bans : 0) : data.data.income; // Доход в бизнесах только в банах
            this.on_hour    = Math.round(this.income / (86400000 / update));
        } else {
            this.work_type  = data.data.type != null ? data.data.type : 0;
            this.cost       = {};
            this.income     = {};
            this.busts      = {stats: {}, skills: {}};
            this.duration   = data.data.duration != null ? data.data.duration : 0;

            if(data.data.cost) {
                for(let key in data.data.cost){
                    data.data.cost[key] = new ExpressionPattern(data.data.cost[key].toString(), [], global.common_logger)
                }

                this.cost = data.data.cost;
            }

            if(data.data.income) {
                for(let key in data.data.income){
                    data.data.income[key] = new ExpressionPattern(data.data.income[key].toString(), [], global.common_logger)
                }

                this.income = data.data.income;
            }

            if(data.data.stats) {
                for(let key in data.data.stats){
                    data.data.stats[key] = new ExpressionPattern(data.data.stats[key].toString(), [], global.common_logger)
                }

                this.busts.stats = data.data.stats;
            }

            if(data.data.skills) {
                for(let key in data.data.skills){
                    data.data.skills[key] = new ExpressionPattern(data.data.skills[key].toString(), [], global.common_logger)
                }

                this.busts.skills = data.data.skills;
            }
        }
    }
}

module.exports.BusinessesManager = class BusinessesManager extends EventManager {
    constructor(config){
        super(['load', 'error'])

        const _ = this;

        _.business                  = new Map();
        _.update                    = config.update                     != null ? config.update : 1000 * 60 * 60;
        _.namespace                 = config.namespace                  != null ? config.namespace : 'dev-businesses-updater';
        _.max_transaction_attempts  = config.max_transaction_attempts   != null ? config.max_transaction_attempts : 5;
        _.loaded                    = false;

        // Получаю список всех предметов
        void async function GetBusinesses() {
            try {
                const data = await global.managers.pool.sql("common", sql.select('*').from('businesses').toString())

                global.common_logger.log(`BusinessesManager manager starting to loading`);

                global.common_logger.pushIndent();

                for(let i = 0, leng = data.length;i < leng;i++){
                    global.common_logger.log(`Business ${data[i].id} has been load.`);

                    _.business.set(data[i].id.toString(), new module.exports.BusinessEntry(data[i], _.update));
                }

                global.common_logger.popIndent();

                global.common_logger.log(`The businesses manager has finished loading, load ${_.business.size} businesses and works.`);

                _.updateWaiter();

                _.loaded = true;

                _.invoke("load", [_]);
            } catch (e) {
                _.invoke("error", [e]);
            }
        }();
    }

    async update(){
        try {
            const data = await global.managers.pool.sql("common", sql.select('*').from('businesses').toString())

            global.common_logger.log(`BusinessesManager manager starting to updating`);

            global.common_logger.pushIndent();

            for(let i = 0, leng = data.length;i < leng;i++){
                global.common_logger.log(`Business ${data[i].id} has been updated.`);

                this.business.set(data[i].id.toString(), new module.exports.BusinessEntry(data[i], this.update));
            }

            global.common_logger.popIndent();

            global.common_logger.log(`The businesses manager has finished updating, updated ${this.business.size} businesses works.`);

            this.updateWaiter();
        } catch (e) {
            global.common_logger.error(e)
            
            global.managers.statistics.updateStat('errors_managers', 1)
        }
    }

    updateWaiter(){
        const _ = this;

        global.managers.update.clear(_.namespace).addUpdater(_.namespace, _.update, e => e[1].businesses.length != 0, (wp, data) => {
            if(data.length > 0){
                let start = performance.now(),
                    businesses, city, business,
                    maxs = new Map();

                for(let i = 0, leng = data.length; i < leng; i++){
                    maxs.clear();
                    
                    businesses = [...data[i][1].businesses];

                    data[i][1].data.data.businesses_bank = data[i][1].data.data.businesses_bank != null ? data[i][1].data.data.businesses_bank : new Object();

                    for(let j = 0, j_leng = businesses.length; j < j_leng; j++){
                        if((businesses[j] = businesses[j].split('/')).length == 0)
                            continue;

                        business = _.business.get(businesses[j][businesses[j].length - 1]); // Получаю целевой бизнес персонажа

                        if(business != null){
                            if(maxs.has((city = businesses[j][3])))
                                maxs.set(city, maxs.get(city) + business.income)
                            else
                                maxs.set(city, business.income)

                            data[i][1].data.data.businesses_bank[city] = data[i][1].data.data.businesses_bank[city] != null ? data[i][1].data.data.businesses_bank[city] + business.on_hour + data[i][1].stats.skills.trade.value * 0.01 * business.on_hour : business.on_hour + data[i][1].stats.skills.trade.value * 0.01 * business.on_hour;
                        } else {
                            global.common_logger.warn("Cannot find business for id " + businesses[j].join('/'));
                        }
                    }

                    for(let entry of maxs){
                        data[i][1].data.data.businesses_bank[entry[0]] = Math.floor(data[i][1].data.data.businesses_bank[entry[0]] < entry[1] ? data[i][1].data.data.businesses_bank[entry[0]] : entry[1]); // Выравниваем значение по максимальному доходу от бизнесов персонажа
                    }

                    data[i][1].addChange('data');
                }

                global.managers.statistics.updateStat('sity_business_av_time', performance.now() - start)
            }
        })
    }

    getBusinessesForSity(city, character){
        return (city = new Heap({city, character})) && [...this.business.values()].filter(e => e.condition.result(city));
    }

    getBusiness(id){
        if(this.loaded)
            if(id != undefined)
                return this.business.get(id);
            else
                return null;
        else {
            global.common_logger.warn("Businesses have not been loaded yet, please wait");

            return null;
        }
    }
}