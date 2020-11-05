class Stat{
    constructor(min, max, initial){
        this.min = min;
        this.max = max;
        this.value = initial != null ? initial : 0;
    }

    blend(value){
        value = this.value + value;

        if(value >= this.min && value <= this.max){
            this.value = value;
        } else {
            if(value > this.max){
                this.value = this.max;
            } else {
                this.value = this.min;
            }
        }
    }
}

class Preset {
    blend(preset_d){
        for(let key in preset_d)
            if(this[key] != undefined)
                if(preset_d[key] instanceof Stat){
                    this[key].blend(preset_d[key].value);
                } else {
                    this[key].blend(preset_d[key]);
                }
            else
                throw new TypeError(`Unable to apply character parameters ${key}, may require interface update`)
    }
}

class StatPreset extends Preset {
    constructor(){
        super();

        this.strength = new Stat(1, 30);
        this.intelligence = new Stat(1, 30);
        this.agility = new Stat(1, 30);
    }
}

class SkillsPreset extends Preset {
    constructor(){
        super();

        this.command = new Stat(1, 80);
        this.trade = new Stat(1, 80);
        this.battle = new Stat(1, 80);
        this.control = new Stat(1, 80);
        this.craft = new Stat(1, 80);
    }
}

class CommonStatsPreset {
    constructor(){
        this.stats = new StatPreset();
        this.skills = new SkillsPreset();
    }
}

module.exports.CommonStatsPreset = CommonStatsPreset;
module.exports.Stat = Stat;