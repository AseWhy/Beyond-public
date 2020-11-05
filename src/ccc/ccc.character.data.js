const sql = require("sql-bricks");

/**
 * Параметры персонажа
 */
module.exports.CharacterData = class CharacterData {
    constructor(data){
        this.data = data != null ? JSON.parse(data) : {};
    }

    resetdata(data){
        for(let key in data)
            this.data[key] = data[key];
    }

    toRaw(){
        return JSON.stringify(this.data).replace(/\\/g, '\\\\');
    }
}