const { CommonStatsPreset } = require("./ccc.stats.preset");

/**
 * Параметры персонажа
 */
module.exports.CharacterStats = class CharacterStats extends CommonStatsPreset {
    constructor(character, data, experience){
        super();

        const result = global.managers.perk.blend(data != null ? data.split(',') : [], character.origin);

        this
            .blend(result.data)
            .exp(experience);

        character.health.max    = result.health + 5 * this.stats.strength.value
        character.endurance.max = result.endurance + 3 * this.stats.strength.value

        character.endurance.check(); // Запускаем проверку состояния характеристик
        character.health.check();    // Запускаем проверку состояния характеристик
    }

    toSubFields(){
        return {
            experience: JSON.stringify(this)
        }
    }
}