/**
 * @file item-manager.js
 * @description загружается при старте приложения, получает из базы названия и данные для айтемов, фактически менеджер того что есть в игре, его статы, и параметры
 * @license MIT
 */

const sql = require("sql-bricks"),
      { EventManager } = require("../event-manager"),
      { ExpressionPattern, MessagePattern, Heap } = require("../../pattern");

module.exports.ItemEntry = class ItemEntry {
    constructor(data){
        this.import      = data.import || new Array();
        this.id          = data.named_id;
        this.name        = new MessagePattern(data.display, this.import, global.common_logger);
        this.description = data.description;
        this.type        = data.type;
        this.data        = Array.isArray(data = data.data ? JSON.parse(data.data) : null) && data.length > 0 ? new Map(data) : null;

        if(this.data) {
            let heap = new Object()

            for(let entry of this.data){
                this.data.set(entry[1].name, heap[entry[1].name] = ((entry) => {
                    switch(parseInt(entry[1].type)){
                        case 0: // Не определен
                            return null;
                        case 1: // Выражение
                            return new ExpressionPattern(entry[1].value, this.import, global.common_logger);
                        case 2:
                            return entry[1].value;
                        case 3:
                            return parseInt(entry[1].value);
                    }
                })(entry));
            }

            this.name.heap.set('this', heap);
        }
    }

    toDisplay(calldata){
        return this.name.result(calldata);
    }

    toString(){
        return this.name;
    }

    toJSON(){
        return this.id;
    }
}

module.exports.ItemManager = class ItemManager extends EventManager {
    constructor(){
        super(['load', 'error'])

        const _ = this;

        _.items = new Map();
        _.loaded = false;

        // Получаю список всех предметов
        void async function GetItems() {
            try {
                const data = await global.managers.pool.sql("item", sql.select('*').from('items').toString())

                global.common_logger.log(`Equipment manager starting to loading`);

                global.common_logger.pushIndent();

                for(let i = 0, leng = data.length;i < leng;i++){
                    global.common_logger.log(`Item ${data[i].named_id} has been load.`);

                    _.items.set(data[i].named_id, new module.exports.ItemEntry(data[i]));
                }

                global.common_logger.popIndent();

                global.common_logger.log(`The equipment manager has finished loading, load ${_.items.size} items.`);

                _.loaded = true;

                _.invoke("load", [_]);
            } catch (e) {
                global.managers.statistics.updateStat('errors_managers', 1)

                _.invoke("error", [e]);
            }
        }();
    }

    async update(){
        try {
            const data = await global.managers.pool.sql("item", sql.select('*').from('items').toString())

            global.common_logger.log(`Equipment manager starting to updating`);

            global.common_logger.pushIndent();

            for(let i = 0, leng = data.length;i < leng;i++){
                global.common_logger.log(`Item ${data[i].named_id} has been updated.`);

                this.items.set(data[i].named_id, new module.exports.ItemEntry(data[i]));
            }

            global.common_logger.popIndent();

            global.common_logger.log(`The equipment manager has finished updating, updated ${this.items.size} items.`);
        } catch (e) {
            global.managers.statistics.updateStat('errors_managers', 1)
        }
    }

    getItem(id){
        if(this.loaded){
            if(this.items.has(id))
                return this.items.get(id);
            else
                return this.items.get('ident_null');
        } else {
            global.common_logger.warn("Items have not been loaded yet, please wait");

            return null;
        }
    }
}