const { Province } = require("./map.provice");

module.exports.Region = class Region {
    constructor(data, map){
        this.id          = data.id;
        this.country     = data.country;
        this.name        = data.name;
        this.color       = data.color;
        this.population  = 0;
        this.spawn       = JSON.parse(data.spawn);
        this.description = data.description;
        this.provinces   = new Map();
        this.owner       = map;

        for(let i = 0, leng = data.provinces.length;i < leng;i++){
            this.provinces.set(data.provinces[i].id, new Province(data.provinces[i], this));
        }
    }

    toDisplay(){
        return {
            id: this.id,
            name: this.name,
            population: this.population,
            provc: this.provinces.size,
            description: this.description
        }
    }
}