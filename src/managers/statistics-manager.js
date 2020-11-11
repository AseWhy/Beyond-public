module.exports.STAT_TYPE = {
    NUMBER: "NUMBER",
    AVERAGE: "AVERAGE",
    UPDATABLE: "UPDATABLE",
    CUMULATIVE: "CUMULATIVE"
}

class Stat {
    constructor(manager){
        this.type       = module.exports.STAT_TYPE.NUMBER;
        this.display    = '';
        this.color      = '#000000';
        this.interval   = -1;
        this._i         = -1;
        this.count      = 0;
        this.data       = 0;
        this.stack      = new Array();
        this.displayed  = false;
        this.manager    = manager;
        this.update     = () => {};
    }

    setInterval(i){
        if(i < 50)
            i = 50;

        this.interval = i;
        this._i = i;
    }

    setData(data){
        if(this.stack.length + 1 < this.manager.max_stack_length){
            if(this.stack.length !== 0)
                if(this.type === module.exports.STAT_TYPE.AVERAGE)
                    this.stack.push(this.data / this.count);
                else
                    this.stack.push(this.data);
            else
                this.stack.push(this.type === module.exports.STAT_TYPE.AVERAGE ? data / this.count : data);

            this.data = data;
        } else {
            this.stack.splice(0, this.stack.length - this.manager.max_stack_length + 1);

            if(this.type === module.exports.STAT_TYPE.AVERAGE)
                this.stack.push(this.data / this.count);
            else
                this.stack.push(this.data);

            this.data = data;
        }
    }

    trycall(i, m, d){
        if((this._i -= i) <= 0){
            this._i = this.interval - Math.abs(this._i);

            this.setData(this.update.apply(this, [m, d, this]));
        }

        return this._i;
    }
}

module.exports.StatisticsManager = class StatisticsManager { 
    constructor(config){
        const _ = this;

        _.lables = new Map();
        _.loaded = true;
        _.max_stack_length = config.max_stack_length;
        _.updater = this.update.bind(this);
        _.started = Date.now();

        _.update(_.started)
    }

    update(lastcall){
        const common = [...this.lables.values()].filter(e => e.type === module.exports.STAT_TYPE.UPDATABLE),
              timeshot = Date.now(), timings = new Array();

        for(let i = 0, leng = common.length;i < leng;i++)
            timings.push(common[i].trycall(timeshot - lastcall, this, i))

        timings.sort((a, b) => a._i - b._i);

        setTimeout(this.updater, timings[0] != undefined ? timings[0] : this.default_update_interval, timeshot);
    }

    getFinallyValue(data){
        const computed = this.getComputedValue(data);

        this.dropStat(data);

        return computed;
    }

    getComputedValue(data){
        if((data = this.lables.get(data)) != null) {
            switch(data.type){
                case module.exports.STAT_TYPE.NUMBER:

                case module.exports.STAT_TYPE.UPDATABLE:

                case module.exports.STAT_TYPE.CUMULATIVE:
                    return data.data;
                case module.exports.STAT_TYPE.AVERAGE:
                    return data.count !== 0 && data.data !== 0 ? data.data / data.count : 0;
            }
        } else
            throw new Error("Cannot find the " + data + " statistic");
    }

    dropStat(data){
        if((data = this.lables.get(data)) != null) {
            switch(data.type){
                case module.exports.STAT_TYPE.NUMBER:
                case module.exports.STAT_TYPE.UPDATABLE:
                case module.exports.STAT_TYPE.CUMULATIVE:
                    data.data = 0;
                break;
                case module.exports.STAT_TYPE.AVERAGE:
                    data.data = 0;

                    data.count = 0;
                break;
            }
        } else
            throw new Error("Cannot find the " + data + " statistic");
    }

    getData(){
        const result = new Object(),
              values = [...this.lables.entries()];

        for(let i = 0, leng = values.length;i < leng;i++){
            result[values[i][0]] = new Object();

            result[values[i][0]].stack      = [...values[i][1].stack];
            result[values[i][0]].display    = values[i][1].display;
            result[values[i][0]].color      = values[i][1].color;
            result[values[i][0]].displayed  = values[i][1].displayed;
            result[values[i][0]].units      = values[i][1].units

            switch(values[i][1].type){
                case module.exports.STAT_TYPE.NUMBER:

                case module.exports.STAT_TYPE.UPDATABLE:
                    
                case module.exports.STAT_TYPE.CUMULATIVE:
                    result[values[i][0]].stack.push(values[i][1].data); 
                    break;
                case module.exports.STAT_TYPE.AVERAGE:
                    result[values[i][0]].stack.push(values[i][1].count !== 0 && values[i][1].data !== 0 ? values[i][1].data / values[i][1].count : 0);
                    break;
            }
        }

        return {
            started: this.started,
            stack: this.max_stack_length,
            stats: result
        };
    }

    updateStat(data, value){
        if(typeof value !== 'number' && typeof value !== 'bigint')
            throw new TypeError("The value must have a number type");

        if((data = this.lables.get(data)) != null) {
            switch(data.type){
                case module.exports.STAT_TYPE.NUMBER:
                case module.exports.STAT_TYPE.UPDATABLE:
                    data.setData(value);
                break;
                case module.exports.STAT_TYPE.CUMULATIVE:
                    data.setData(data.data + value);
                break;
                case module.exports.STAT_TYPE.AVERAGE:
                    data.setData(data.data + value);

                    data.count++;
                break;
            }
        } else
            global.common_logger.warn("Cannot find the " + data + " statistic")
    }

    registerStat(name, type, interval = 0, value = 0, update = null, display = '', displayed = false, units = null){
        const stat = new Stat(this);

        if(module.exports.STAT_TYPE[type])
            stat.type = type;
        else
            throw new TypeError("Cannot find the " + type + " type of statistic;")

        stat.setData(value);

        if(typeof interval === "number" && interval > 0)
            stat.setInterval(interval);

        if(typeof update === "function")
            stat.update = update;

        stat.display = display;

        stat.displayed = displayed;

        stat.units = units;

        stat.color = `rgb(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)})`;

        this.lables.set(name, stat);
    }
}