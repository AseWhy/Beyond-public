module.exports.name = 'origin';

module.exports.lib = {
    getOriginParameter(o_ident, paramenter) {
        let origin = global.managers.origin.getOrigin(o_ident);

        if(origin)
            return origin.get(paramenter);
        else
            return null;
    },

    getDefaultsOriginList(){
        let buffer = new Array(),
            origins = [...global.managers.origin.origin_map.values()];

        for(let i = 0, leng = origins.length;i < leng;i++){
            buffer.push(origins[i].name);
        }

        return buffer;
    },
    
    getOriginIdByName(o_name){
        o_name = (typeof o_name === "object" ? Object.values(o_name).join(" ") : o_name).toLowerCase();

        const origins = [...global.managers.origin.origin_map.values()];

        if(origins.length > 0){
            for(let i = 0, leng = origins.length;i < leng;i++)
                if(origins[i].name.toLowerCase() === o_name)
                    return origins[i].name_id;
        }

        return null;
    }
}