module.exports.Sity = class Sity {
    constructor(data, province){
        this.level      = data.level != undefined ? data.level : 0x1;
        this.population = province.population;
        this.owner      = province;
        this.cell       = data.cell;
        this.feature    = data.feature;
        this.id         = data.id;
        this.name       = data.name;
        this.started    = data.started;
        this.capital    = data.capital !== 0;
        this.citadel    = data.citadel !== 0;
        this.port       = data.port !== 0;
        this.shanty     = data.shanty !== 0;
        this.state      = data.state !== 0;
        this.temple     = data.temple !== 0;
        this.walls      = data.walls !== 0;
    }
    
    toDisplay(){
        return {
            id:         this.id,
            name:       this.name,
            started:    this.started,
            population: this.population,
            port:       this.port,
            shanty:     this.shanty,
            temple:     this.temple,
            walls:      this.walls,
            citadel:    this.citadel,
            capital:    this.capital
        }
    }
}