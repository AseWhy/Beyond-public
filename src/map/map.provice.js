const { City } = require("./map.city");

module.exports.Province = class Province {
    constructor(data, region){
        this.id          = data.id;
        this.type        = data.type;
        this.speed_mult  = data.speed_mult;
        this.population  = data.population;
        this.distance    = data.distance;
        this.owner       = region;
        this.position    = JSON.parse(data.position);
        this.neighbors   = JSON.parse(data.neighbors);
        this.city        = data.city != null ? new City(JSON.parse(data.city), this) : null;

        this.owner.population += this.population;

        if(this.city !== null) {
            region.owner.citys.push(this.city);

            if(this.position)
                for(let i = 0, leng = region.owner.citys.length, buffer;i < leng;i++){
                    buffer = Math.sqrt(Math.abs(this.position.x - region.owner.citys[i].owner.position.x) ** 2 + Math.abs(this.position.y - region.owner.citys[i].owner.position.y) ** 2)
                    
                    if(buffer > region.owner.max_distance_beetwen_citys)
                        region.owner.max_distance_beetwen_citys = buffer;
                    else if(buffer < region.owner.min_distance_beetwen_citys)
                        region.owner.min_distance_beetwen_citys = buffer;
                }
        }
    }

    toDisplay(){
        return {
            id: this.id,
            ocean: this.type !== "island",
            population: this.population,
            distance: this.distance,
            speed_mult: this.speed_mult,
            city: this.city != null ? this.city.toDisplay() : null
        }
    }
}