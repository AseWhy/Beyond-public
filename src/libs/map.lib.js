// Интерфейс взаимодействия сценарного движка с картой

const Utils = require("../utils");

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
                    includes = includes.getOptionsForSity(character.map.sity, character);
                } else {
                    return null;
                }

                for(let i = 0, leng = includes.length;i < leng;i++)
                    if(includes[i].id == child_id)
                        return includes[i].toDisplay();
            }
        } else if (character.map.sity !== null) {
            let includes = global.managers.map.getDistrictsForSity(character.map.sity, character);

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
        } else if (character.map.sity !== null) {
            return {
                name: character.map.sity.name,
                description: character.map.sity.description,
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
                    includes = includes.getOptionsForSity(character.map.sity, character);
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
        } else if (character.map.sity !== null) {
            let includes = global.managers.map.getDistrictsForSity(character.map.sity, character);

            if(includes.length > 0){
                for(let i = 0, leng = includes.length;i < leng;i++)
                    out.push(includes[i].name)

                return {
                    source: character.map.sity.name,
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
            buffer = region.provinces.get(province.neighbors[i]) || (() => {
                const regions = [...map.regions.values()];

                for(let i = 0, leng = regions.length;i < leng;i++)
                    if((buffer = regions[i][province.neighbors[i]]) !== null)
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
            case "sity":
                const sitys = global.managers.map.getMap().sitys;

                for(let i = 0, leng = sitys.length;i < leng;i++)
                    if(sitys[i].id === data) {
                        return sitys[i].name;
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
                } else if (character.map.sity != null) {
                    let includes = global.managers.map.getDistrictsForSity(character.map.sity, character);

                    if(includes.length > 0) // Если есть что перебирать
                        for(let i = 0, leng = includes.length;i < leng;i++)
                            if(includes[i].name.toLowerCase() === data)
                                return includes[i].id;
                }
        
                return null;
            case "sity":
                const sitys = global.managers.map.getMap().sitys;

                for(let i = 0, leng = sitys.length;i < leng;i++)
                    if(sitys[i].name.toLowerCase() === data)
                        return sitys[i].id;

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
            case "sity":
                let sity = global.managers.map.getMap().sitys.filter(e => e.id === data)[0];

                return sity ? sity.owner.owner.owner.id + "/" + sity.owner.owner.id + "/" + sity.owner.id + "/" + sity.id : null;
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
        const sitys = global.managers.map.getMap().sitys.filter(e => e.started),
                buffer = new Array();

        for(let i = 0, leng = sitys.length;i < leng;i++)
            buffer.push((sitys[i].capital ? "★" : "&#12288;") + sitys[i].name + " - население: "+ Utils.to_ru_number_value(sitys[i].population));

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

        return parseInt((f_p.distance + t_p.distance * 75) * (2 - speed) * global.params.map.distance_multiplier);
    },
    
    isStartedSity(sity_display){
        sity_display = (typeof sity_display === "object" ? Object.values(sity_display).join(" ") : sity_display).toLowerCase();
        
        const sitys = global.managers.map.getMap().sitys;
        
        for(let i = 0, leng = sitys.length;i < leng;i++)
            if(sitys[i].name.toLowerCase() == sity_display)
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