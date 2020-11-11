/**
 * Стадия исполнения сценария
 * 
 * @see {@link ./ccc.core.js} для подробной инфрмации где хранится
 * @see {@link ../managers/scenario-manager.js} для подробной информации где используется
 */
module.exports.ExcecutionState = class ExcecutionState {
    constructor(id, state, data, user){
        this.id = id;
        this.state = state;
        this.data = data != null ? JSON.parse(data) : data;
        this.user = user;
    }

    pushState(c){
        this.state += c != undefined ? c : 1;

        this.user.addChange('state');
    }

    editLabels(data){
        for(let key in data)
            if(this.data[key] !== undefined)
                this.data[key] = data[key];
            else
                throw new Error("The key " + key + " not a found!");

        this.user.addChange('state');
    }

    toSubFields(){
        return {
            scenario: this.id,
            scenario_state: this.state,
            scenario_data: JSON.stringify(this.data).replace(/\\/g, '\\\\')
        }
    }
}