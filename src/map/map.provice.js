const { Sity } = require("./map.sity");

module.exports.Province = class Province {
    constructor(data, region){
        this.id          = data.id;
        this.type        = data.type;
        this.speed_mult  = data.speed_mult;
        this.population  = data.population;
        this.distance    = data.distance;
        this.owner       = region;
        this.neighbors   = JSON.parse(data.neighbors);
        this.sity        = data.sity != null ? new Sity(JSON.parse(data.sity), this) : null;

        this.owner.population += this.population;

        if(this.sity !== null)
            region.owner.sitys.push(this.sity);
    }

    toDisplay(){
        return {
            id: this.id,
            ocean: this.type !== "island",
            population: this.population,
            distance: this.distance,
            speed_mult: this.speed_mult,
            sity: this.sity != null ? this.sity.toDisplay() : null
        }
    }
}