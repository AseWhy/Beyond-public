const { Region } = require("./map.region");

module.exports.Map = class Map {
    constructor(map, regions){
        this.regions = new global.Map();
        this.sitys = new global.Array();
        this.id = map.id;
        this.seed = map.seed;
        this.width = map.width;
        this.height = map.height;
        
        for(let i = 0, leng = regions.length;i < leng;i++){
            this.regions.set(regions[i].id, new Region(regions[i], this));
        }
    }

    toDisplay(){
        return {
            id: this.id
        }
    }
}