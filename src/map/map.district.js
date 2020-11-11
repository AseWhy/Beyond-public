const { ExpressionPattern, Heap, MessagePattern } = require("../pattern"),
        utils = require("../utils");

module.exports.UpdateEntry = class UpdateEntry {
    constructor(scenario, interval, target){
        this.scenario = scenario;
        this.interval = interval;
        this.paths = [target.path];
        this.targets = [target];
        this.data = [target.toDisplay()];
    }

    addTarget(target){
        this.paths.push(target.path);
        this.data.push(target.toDisplay());
        this.targets.push(target);
    }
}

module.exports.District = class District {
    constructor(data, owner = false, request_paths){
        try {
            this.uid            = utils.unique_id();
            this.includes       = new Array();
            this.description    = data.description != null && data.description.trim().length != 0 ? new MessagePattern(data.description, [], global.common_logger) : null;
            this.cost           = data.cost != null ? data.cost : null;
            this.entrance       = data.entrance != null ? data.entrance : null;
            this.name           = data.name;
            this.id             = data.id;
            this.path           = (owner ? owner.path + '/' : '') + data.id;
            this.handler        = data.handler;
            this.condition      = new ExpressionPattern(data.condition_data, [], global.common_logger);

            if(data.includes != null && Array.isArray(data.includes)){
                for(let i = 0, leng = data.includes.length;i < leng;i++)
                    this.includes.push(new module.exports.DistrictData(data.includes[i], this, request_paths));
            }
        } catch (e) {
            global.common_logger.error('Error while handling district ' + (owner ? ':' : 'data: ') + this.name, e);

            throw e;
        }
    }

    getOptionsForCity(city, character){
        return (city = new Heap({city, character})) && this.includes.filter(e => e.condition.result(city));
    }

    get(id){
        for(let i = 0, leng = this.includes.length;i < leng;i++)
            if(this.includes[i].id === id)
                return this.includes[i];

        return null;
    }

    toString(){
        return this.id;
    }

    toDisplay(){
        return {
            id: this.id,
            uid: this.uid,
            name: this.name,
            path: this.path,
            cost: this.cost != null ? this.cost : null,
            type: this.type != null ? this.type : 0,
            entrance: this.entrance != null ? this.entrance : null,
            includes: this.includes.map(e => e.toDisplay()),
            fire_time: this.fire_time != null ? this.fire_time : null,
            scenario: this.scenario != null ? this.scenario : null,
            description: this.description != null ? this.description : null,
            custom_fields: this.custom_fields != null ? this.custom_fields : null
        }
    }
}

module.exports.DistrictData = class DistrictData extends module.exports.District {
    constructor(data, owner, request_paths){
        super(data, owner, request_paths);

        this.type = data.type;
        this.fire_time = data.fire_time;
        this.scenario = data.scenario;

        // Handle custom fields
        if(data.custom_fields != null && data.custom_fields instanceof Array && data.custom_fields.length != 0){
            this.custom_fields = new Object();

            for(let i = 0, leng = data.custom_fields.length;i < leng;i++)
                switch(data.custom_fields[i].type){
                    case 0:
                        this.custom_fields[data.custom_fields[i].label] = new MessagePattern(data.custom_fields[i].data, [], global.common_logger)
                    break;
                    case 1:
                        this.custom_fields[data.custom_fields[i].label] = new ExpressionPattern(data.custom_fields[i].data, [], global.common_logger)
                    break;
                    case 2:
                        this.custom_fields[data.custom_fields[i].label] = parseFloat(data.custom_fields[i].data)
                    break;
                    case 3:
                        this.custom_fields[data.custom_fields[i].label] = data.custom_fields[i].data;
                    break;
                }
        } else {
            this.custom_fields = null;
        }

        // Если тип - это здание, или повторяющиеся действие, установлено время исполнения, и целевой сценарий задан, то добавляем в очередь.
        if([2, 3].includes(this.type) && this.fire_time != null && this.scenario != null){
            const tname = (this.type + this.fire_time + this.scenario).toString();

            if(request_paths.has(tname)){
                request_paths.get(tname).addTarget(this);
            } else {
                request_paths.set(tname, new module.exports.UpdateEntry(this.scenario, this.fire_time, this))
            }
        }

        if([0, 1].includes(this.type) && this.scenario != null){
            this.scenario = this.scenario;
        }
    }

    getOwners(){
        let owners = new Array(),
            co = this;

        while(true){
            if(!co)
                return owners

            owners.push(co = co.owner);
        }
    }
}