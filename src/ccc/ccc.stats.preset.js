let scale = Symbol('scale'),
    initial = Symbol('initial');

class Feature {
    constructor(min, max, initial){
        this.min = min;
        this.max = max;
        this.value = initial != null ? initial : 0;
    }

    /**
     * Смешивает характиеристику со сторонними характиристиками
     */
    blend(value){
        const new_value = this.value + value;

        if(new_value >= this.min && new_value <= this.max){
            this.value = new_value;
        } else {
            if(new_value > this.max){
                this.value = this.max;
            } else {
                this.value = this.min;
            }
        }
    }

    /**
     * Проверяет состояние характристики, не позволяя ей опустится ниже минимума и поднятся выше максимума
     */
    check(){
        if(this.value > this.max){
            this.value = this.max;
        } else if(this.value < this.min) {
            this.value = this.min;
        }
    }

    toJSON(){
        return this.value;
    }
}

class Stat extends Feature {
    constructor(min, max, scale_v = 1, init = 1000){
        super(min, max);

        this.next           = init;
        this.value          = 0;
        this.experience     = 0;
        this.full           = 0;
        this[initial]       = init;
        this[scale]         = scale_v;
    }
    
    /**
     * Увеличивает или уменьшает опыт текущего персонажа
     * 
     * @param {Number} value количество опыта которое нужно зачислить текущей характеристике
     */
    exp(value){
        // Поулчаем новое значение
        let new_value = Math.round(this.experience + value);
        // Записываю общее количество опыта
        this.full = new_value;
        // Считаю уровень за опыт
        while(new_value > this.next && this.value < this.max){
            // Уменьшаю буффер опыта
            new_value -= this.next;
            // Увеличиваю текущее значение уровня
            this.value++;
            // Считаю количество опыта необходимое для переход на следующий уровень
            this.next = this.value != 1 ? Math.round(this[initial] * this[scale] ** (this.value - 1)) : this[initial];
        }
        // Записываю остаток
        this.experience = new_value > this.next ? this.next : new_value;
    }

    /**
     * Смешивает текущую характеристику увеличивая или уменьшая её в соответствии с `value`
     * 
     * @param {Number} value количество уровней на которое вы хотите изменить текущую характеристику
     */
    blend(value){
        let prev = Math.floor(this.value),
            new_value = prev + Math.floor(value);

        // Проверяею входит ли новое значение в рамки максимума и минимума
        if(new_value >= this.min && new_value <= this.max){
            // Устанавливаю новое значение
            this.value = new_value;
        } else {
            // Проверяем новое значение больше максимум, если нет то значит новое значение меньше минимума
            if(new_value > this.max){
                // Ставим максимальное значение
                this.value = this.max;
            } else {
                // Ставим минимальное значение
                this.value = this.min;
            }
        }

        // Отрезаю все после запятой
        this.next = this.value != 1 ? Math.round(this[initial] * this[scale] ** (this.value - 1)) : this[initial];
    }

    toJSON(){
        return this.full;
    }
}

class Preset {
    /**
     * Базовая функция общего смешивания характеристик
     * 
     * @param {StatPreset|SkillsPreset|any} preset_d прессет для смешивания
     */
    blend(preset_d){
        for(let key in preset_d)
            if(this[key] != undefined)
                if(preset_d[key] instanceof Stat || preset_d[key] instanceof Feature){
                    this[key].blend(preset_d[key].value);
                } else {
                    this[key].blend(preset_d[key]);
                }
            else
                global.common_logger.warn(`Unable to apply character parameters ${key}, may require interface update`)
    }

    /**
     * Базовая функция общего смешивания опыта характеристик
     * 
     * @param {StatPreset|SkillsPreset|any} preset_d прессет для смешивания
     */
    exp(preset_d){
        for(let key in preset_d)
            if(this[key] != undefined)
                if(preset_d[key] instanceof Stat || preset_d[key] instanceof Feature){
                    this[key].exp(preset_d[key].full);
                } else {
                    this[key].exp(preset_d[key]);
                }
            else
                global.common_logger.warn(`Unable to apply character experience ${key}, may require interface update`)
    }
}

class StatPreset extends Preset {
    constructor(){
        super();

        this.strength       = new Stat(1, 30, 1.2, 300);
        this.intelligence   = new Stat(1, 30, 1.2, 300);
        this.agility        = new Stat(1, 30, 1.2, 300);
    }
}

class SkillsPreset extends Preset {
    constructor(){
        super();

        this.command    = new Stat(1, 100, 1.1, 300);
        this.trade      = new Stat(1, 100, 1.1, 300);
        this.battle     = new Stat(1, 100, 1.1, 300);
        this.control    = new Stat(1, 100, 1.1, 300);
        this.craft      = new Stat(1, 100, 1.1, 300);
    }
}

class CommonStatsPreset {
    constructor(){
        this.stats = new StatPreset();
        this.skills = new SkillsPreset();
    }

    exp(exp){
        if(typeof exp.getExpData === 'function')
            exp = exp.getExpData();
        
        if(typeof exp === 'object' && exp != null) {
            this.skills.exp(exp.skills);
            this.stats.exp(exp.stats);
        }
        
        return this;
    }

    blend(stat){
        if(typeof stat.getBlendData === 'function')
            stat = stat.getBlendData();

        if(typeof stat === 'object' && stat != null) {
            this.skills.blend(stat.skills);
            this.stats.blend(stat.stats);
        }

        return this;
    }
}

module.exports.StatPreset = StatPreset;
module.exports.SkillsPreset = SkillsPreset;
module.exports.CommonStatsPreset = CommonStatsPreset;
module.exports.Feature = Feature;
module.exports.Stat = Stat;