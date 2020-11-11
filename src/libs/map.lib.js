// Интерфейс взаимодействия сценарного движка с картой

const utils = require("../utils");

module.exports.name = 'map';

module.exports.lib = {
    /**
     * Возвращает информацию о дочерней области
     */
    getChildAreaInfo(character, child_id){
        if(character.map.district != null){
            const values = Object.values(character.map.district);

            if(values.length > 0){
                let source = values[values.length - 1],
                    includes = global.managers.map.getDistrictByUId(source.uid);

                if(includes != null){
                    includes = includes.getOptionsForCity(character.map.city, character);
                } else {
                    return null;
                }

                for(let i = 0, leng = includes.length;i < leng;i++)
                    if(includes[i].id == child_id)
                        return includes[i].toDisplay();
            }
        } else if (character.map.city !== null) {
            let includes = global.managers.map.getDistrictsForCity(character.map.city, character);

            if(includes.length > 0){
                for(let i = 0, leng = includes.length;i < leng;i++)
                    if(includes[i].id == child_id)
                        return includes[i].toDisplay();
            }
        }

        return null;
    },
    
    getCurrentAreaInfo(character){
        if(character.map.district != null){
            const values = Object.values(character.map.district);

            if(values.length > 0){
                let source = values[values.length - 1];

                return {
                    name: source.name,
                    description: source.description,
                    subtype: source.type,
                    type: 1
                };
            }
        } else if (character.map.city !== null) {
            return {
                name: character.map.city.name,
                description: character.map.city.description,
                subtype: null,
                type: 0
            };
        }

        return null
    },

    getCurrentDistrictOptions(character){
        const out = new Array(),
              buy = new Array();

        if(character.map.district != null){
            const values = character.map.district,
                  owned = character.own,
                  stack = character.map.stack.join('/') + '/';

            if(values.length > 0){
                let source = values[values.length - 1],
                    includes = global.managers.map.getDistrictByUId(source.uid);

                if(includes != null){
                    includes = includes.getOptionsForCity(character.map.city, character);
                } else {
                    return null;
                }

                for(let i = 0, leng = includes.length;i < leng;i++)
                    if(includes[i].cost == null || owned.includes(stack + includes[i].id))
                        out.push(includes[i].name)
                    else
                        buy.push(includes[i].name)

                return {
                    source: source.name,
                    includes: out.length != 0 ? out : null,
                    buy: buy.length != 0 ? buy : null,
                    type: 1
                };
            }
        } else if (character.map.city !== null) {
            let includes = global.managers.map.getDistrictsForCity(character.map.city, character);

            if(includes.length > 0){
                for(let i = 0, leng = includes.length;i < leng;i++)
                    out.push(includes[i].name)

                return {
                    source: character.map.city.name,
                    includes: out.length != 0 ? out : null,
                    buy: buy.length != 0 ? buy : null,
                    type: 0
                };
            }
        }

        return null;
    },

    getProvincePaths(location){
        let map = global.managers.map.getMap(),
            region = map.regions.get(location.region.id),
            province = region.provinces.get(location.province.id),
            fullnames = new Array(), names = new Array(), buffer;

        for(let i = 0, leng = province.neighbors.length; i < leng;i++){
            // если в текущей провинции персонажа мы не находим провинцию то ищем в других
            buffer = region.provinces.get(province.neighbors[i]) != null ? region.provinces.get(province.neighbors[i]) : (() => {
                for(let region of map.regions.values())
                    if((buffer = region.provinces.get(province.neighbors[i])) != null)
                        return buffer;
            })();

            if(Array.isArray(buffer))
                buffer = buffer[0];

            if(buffer != null) {
                fullnames.push("> " + province.neighbors[i] + " региона " + buffer.owner.name);

                names.push(province.neighbors[i].toString());
            }
        }

        return {
            fullnames,
            names
        };
    },

    getNameByIdent(type, data){
        switch(type){
            case "city":
                const citys = global.managers.map.getMap().citys;

                for(let i = 0, leng = citys.length;i < leng;i++)
                    if(citys[i].id === data) {
                        return citys[i].name;
                    }

                return null;
        }
    },

    getIdentByName(type, data, character){
        data = (typeof data === "object" ? Object.values(data).join(" ") : data).toLowerCase();

        switch(type){
            case "district":
                if(character.map.district != null){
                    const values = Object.values(character.map.district);

                    if(values.length > 0){
                        const includes = Object.values(values[values.length - 1].includes);
            
                        for(let i = 0, leng = includes.length;i < leng;i++)
                            if(includes[i].name.toLowerCase() === data)
                                return includes[i].id;
                    }
                } else if (character.map.city != null) {
                    let includes = global.managers.map.getDistrictsForCity(character.map.city, character);

                    if(includes.length > 0) // Если есть что перебирать
                        for(let i = 0, leng = includes.length;i < leng;i++)
                            if(includes[i].name.toLowerCase() === data)
                                return includes[i].id;
                }
        
                return null;
            case "city":
                const citys = global.managers.map.getMap().citys;

                for(let i = 0, leng = citys.length;i < leng;i++)
                    if(citys[i].name.toLowerCase() === data)
                        return citys[i].id;

                return null;
        }
    },

    detachCharacterPath(path){
        let stack = Object.values(path.stack);

        stack.pop();

        return stack.join('/');
    },

    appendCharacterPath(path, data){
        let stack = Object.values(path.stack);

        stack.push(data);

        return stack.join('/');
    },

    getMapCharacterPathBy(type, data){
        if(data === null)
            return null;

        switch(type){
            case "city":
                let city = global.managers.map.getMap().citys.filter(e => e.id === data)[0];

                return city ? city.owner.owner.owner.id + "/" + city.owner.owner.id + "/" + city.owner.id + "/" + city.id : null;
            case "province":
                let regions = [...global.managers.map.getMap().regions.values()],
                    province = null;

                for(let i = 0, leng = regions.length;i < leng;i++){
                    if((province = regions[i].provinces.get(data)) != null)
                        return province.owner.owner.id + "/" + province.owner.id + "/" + province.id;
                }

                return null;
            case "region":
                let region = [...global.managers.map.getMap().regions.values()].filter(e => e.id = data)[0];

                return region ? region.owner.id + "/" + region.id : null;
        }
    },

    getStartedListEntryes(splitter){
        const citys = global.managers.map.getMap().citys.filter(e => e.started),
                buffer = new Array();

        for(let i = 0, leng = citys.length;i < leng;i++)
            buffer.push((citys[i].capital ? "★" : "&#12288;") + citys[i].name + " - население: "+ citys[i].population.toLocaleString('ru-RU'));

        return buffer.join(splitter);
    },

    getMoveArrivalTime(from_p, to_p, speed = 1){
        let regions = [...global.managers.map.getMap().regions.values()], f_p, t_p;

        for(let i = 0, leng = regions.length;i < leng;i++){
            if(!f_p)
                f_p = regions[i].provinces.get(from_p);

            if(!t_p)
                t_p = regions[i].provinces.get(to_p);

            if(t_p && f_p)
                break;
        }

        return parseInt(Math.sqrt(Math.abs(f_p.position.x - t_p.position.x) ** 2 + Math.abs(f_p.position.y - t_p.position.y) ** 2) * 100 * (2 - speed) * global.params.map.distance_multiplier);
    },
    
    getShipCostFor(city1, city2){
        return parseInt(700 + (Math.sqrt(Math.abs(city1.owner.position.x - city2.owner.position.x) ** 2 + Math.abs(city1.owner.position.y - city2.owner.position.y) ** 2) / global.managers.map.getMap().max_distance_beetwen_citys) * 700);
    },

    getShipTimeFor(city1, city2){
        return parseInt(2400000 + (Math.sqrt(Math.abs(city1.owner.position.x - city2.owner.position.x) ** 2 + Math.abs(city1.owner.position.y - city2.owner.position.y) ** 2) / global.managers.map.getMap().max_distance_beetwen_citys) * 4800000);
    },

    getShippingListFor(character){
        const citys = global.managers.map.getMap().citys,
              out = new Array(),
              names = new Array();

        for(let i = 0, leng = citys.length;i < leng;i++){
            if(citys[i].port && character.map.city.id != citys[i].id) {
                out.push('> город ' + citys[i].name + ' прибытие через ' + utils.to_ru_time_value(module.exports.lib.getShipTimeFor(character.map.city, citys[i])))

                names.push(citys[i].name);
            }
        }

        return {
            out: out.join('\n'),
            names
        }
    },

    getSityByName(city_display){
        city_display = (typeof city_display === "object" ? Object.values(city_display).join(" ") : city_display).toLowerCase();
        
        const citys = global.managers.map.getMap().citys;
        
        for(let i = 0, leng = citys.length;i < leng;i++)
            if(citys[i].name.toLowerCase() == city_display)
                return citys[i];
        
        return false;
    },

    isStartedСity(city_display){
        city_display = (typeof city_display === "object" ? Object.values(city_display).join(" ") : city_display).toLowerCase();
        
        const citys = global.managers.map.getMap().citys;
        
        for(let i = 0, leng = citys.length;i < leng;i++)
            if(citys[i].name.toLowerCase() == city_display && citys[i].started)
                return true;
        
        return false;
    },

    isBoindaryProvince(position, prov_id){
        const buffer = global.managers.map.getMap().regions.get(position.region.id);

        if(!buffer)
            return false;
        else
            return buffer.provinces.get(position.province.id).neighbors.includes(prov_id)
    }
}