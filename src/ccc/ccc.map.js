const sql = require('sql-bricks');

module.exports.MapDescriptor = class MapDescriptor {
    constructor(data){
        this.stack = new Array();
        this.map = null;
        this.region = null;
        this.province = null;
        this.city = null;
        this.district = null; // 1031/3123/12331/... В зависимости от числа вхождений
        this.deep = 0;

        this.parsePath(data, false)
    }

    toRaw(){
        let path = this.map.id;

        if(this.region)
            path += "/" + this.region.id;

        if(this.province)
            path += "/" + this.province.id

        if(this.city)
            path += "/" + this.city.id

        if(Array.isArray(this.district) && this.district.length > 0){
            path += '/' + this.district[this.district.length - 1].path;
        }

        return path;
    }

    parsePath(path){
        path = path.split("/");

        this.stack = new Array();
        this.map = null;
        this.region = null;
        this.province = null;
        this.city = null;
        this.district = null;

        for(let i = 0, leng = path.length; i < leng;i++){
            this.stack[i] = path[i] = parseInt(path[i]);
        }

        if(path.length > 0){
            this.map = global.managers.map.getMap(parseInt(path[0]));

            if(path.length > 3) {
                this.region = this.map.regions.get(parseInt(path[1]));
                this.province = this.region.provinces.get(parseInt(path[2]));
                this.city = this.province.city.toDisplay();
                this.province = this.province.toDisplay()
                this.region = this.region.toDisplay()
                
                if(path.length > 4) {
                    let target = global.managers.map.districts;

                    this.district = new Array();

                    for(let i = 4, leng = path.length;i < leng;i++){
                        if((target = target.get(parseInt(path[i]))) != undefined)
                            this.district.push(target.toDisplay());
                    }
                }
            } else if(path.length > 2) {
                this.region = this.map.regions.get(parseInt(path[1]))
                this.province = this.region.provinces.get(parseInt(path[2])).toDisplay();
                this.region = this.region.toDisplay();
            } else if(path.length > 1) {
                this.region = this.map.regions.get(parseInt(path[1])).toDisplay();
            }

            this.map = this.map.toDisplay();
        }
    }
}