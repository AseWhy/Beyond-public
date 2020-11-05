const { CommonStatsPreset } = require("./ccc.stats.preset");

/**
 * Параметры персонажа
 */
module.exports.CharacterStats = class CharacterStats extends CommonStatsPreset {
    constructor(character, data){
        super();
        
        const result = global.managers.perk.blend(data != null ? data.split(',') : [], character.origin);

        this.stats.blend(result.data.stats);
        this.skills.blend(result.data.skills);

        character.health.max = result.health;
        character.endurance.max = result.endurance;
    }
}