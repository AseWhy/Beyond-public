const { CommonStatsPreset, Feature } = require("./ccc.stats.preset");

/**
 * Прессет стандартных характеристик для происхождения
 */
module.exports.OriginDefault = class OriginDefault {
    constructor(data){
        this.name_id = data.pd_origin_name;
        this.name = data.pd_origin_display;
        this.description = data.pd_origin_desc;

        this.stats = new CommonStatsPreset();

        data = JSON.parse(data.data);

        this.bans = data.pay.bans != null ? data.pay.bans : 0;
        this.health = data.busts.health != null ? data.busts.health : 0;
        this.endurance = data.busts.endurance != null ? data.busts.endurance : 0;

        if(data.skills)
            this.stats.skills.blend(data.skills);

        if(data.stats)
            this.stats.stats.blend(data.stats);
    }

    getBlendData(){
        return this.stats;
    }

    get(key){
        let path = key.split('.'),
            buffer = this;
        
        for(let i = 0, leng = path.length;i < leng;i++)
            buffer = buffer[path[i]];
        
        if(buffer instanceof Feature)
            return buffer.value;
        else
            return buffer;
    }
}