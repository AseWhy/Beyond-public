const sql = require("sql-bricks");

/**
 * Стадия исполнения сценария
 * 
 * @see {@link ./ccc.core.js} для подробной инфрмации где хранится
 * @see {@link ../managers/scenario-manager.js} для подробной информации где используется
 */
module.exports.ExcecutionState = class ExcecutionState {
    constructor(user, id, state, data){
        this.user = user;
        this.id = id;
        this.state = state;
        this.data = data != null ? JSON.parse(data) : data;
    }

    editLabels(data){
        for(let key in data)
            if(this.data[key] !== undefined)
                this.data[key] = data[key];
            else
                throw new Error("The key " + key + " not a found!");

        return this.update();
    }

    setScenario(scenario){
        this.id = scenario;

        return this.update();
    }

    setData(key, value){
        this.data[key] = value;

        return this.update();
    }

    pushState(state){
        this.state += state !== undefined ? state : 1;

        return this.update();
    }

    async update(){
        await global.managers.pool.sql( "common", sql.update('users', { scenario: this.id, scenario_state: this.state, scenario_data: JSON.stringify(this.data)}).where(sql.like('id', this.user.id)).toString())

        return this;
    }
}