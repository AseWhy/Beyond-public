const sql = require("sql-bricks"),
      { API } = require("../../web_api_interface");

module.exports = class Api extends API {
    constructor(manager){
        super(manager, false, "POST");

        this.max_writes_per_request = 5;
        this.is_occupied = false;
        this.update_waiter = null;
        this.waiter_timeout = 1000 * 60 * 15 // 15 minutes
    }

    update(){
        const _ = this;

        if(_.update_waiter)
            clearTimeout(_.update_waiter)

        _.update_waiter = setTimeout(() => {
            _.update_waiter = null;

            _.manager.requestUpdate('map');
        }, _.waiter_timeout)
    }

    async handle(req, res, user){
        let _ = this, data;

        if(_.is_occupied){
            res.status(403).end(JSON.stringify({
                status: "error",
                message: "Working with maps is impossible interface is busy."
            }));

            return;
        }
        
        req.body.function.splice(0, 1);

        switch(req.body.function[0]){
            case "set":
                req.body.function.splice(0, 1);

                switch(req.body.function[0]){
                    case undefined:
                        try {
                            _.is_occupied = true;

                            _.manager.addAction(user.id, "Server map operation. Map has been installed");

                            data = await _.setMap(req.body.map, data => res.write(JSON.stringify(data)));

                            if(data.status !== "ok") {
                                res.status(500);
                                
                                data.code = undefined;
                            }

                            res.end(JSON.stringify(data));

                            _.is_occupied = false;

                            _.update();
                        } catch(e){
                            global.web_logger.error("Error when setting map", e);

                            _.is_occupied = false;

                            res.status(500).end(JSON.stringify({
                                status: "error",
                                message: "Internal server error."
                            }));
                        }
                    break;
                    case "provinces":
                        try {
                            _.is_occupied = true;

                            _.manager.addAction(user.id, "Server map operation. Provinces has been installed");

                            data = await _.setProvinces(req.body.provinces, req.body.owner, data => res.write(JSON.stringify(data)));

                            if(data.status !== "ok") {
                                res.status(500);
                                
                                data.code = undefined;
                            }

                            res.end(JSON.stringify(data));

                            _.is_occupied = false;

                            _.update();
                        } catch(e){
                            global.web_logger.error("Error when setting provinces", e);

                            _.is_occupied = false;

                            res.status(500).end(JSON.stringify({
                                status: "error",
                                message: "Internal server error."
                            }));
                        }
                    break;
                    case "districts":
                        try {
                            _.is_occupied = true;

                            _.manager.addAction(user.id, "Server map operation. Districts has been installed.");

                            if(req.body.districts)
                                data = await _.setDistricts(req.body.districts, data => res.write(JSON.stringify(data)));
                            else
                                data = {
                                    status: 'error',
                                    code: -0x1,
                                    message: 'No district data transfered.'
                                }

                            if(data.status !== "ok") {
                                if(data.code !== 0xD)
                                    res.status(403);
                                else
                                    res.status(500);
                                
                                data.code = undefined;
                            }

                            res.end(JSON.stringify(data));

                            _.is_occupied = false;

                            _.update();
                        } catch(e){
                            global.web_logger.error("Error when setting districts", e);

                            _.is_occupied = false;

                            res.status(500).end(JSON.stringify({
                                status: "error",
                                message: "Internal server error."
                            }));
                        }
                    break;
                }
            break;
            case "get":
                req.body.function.splice(0, 1);

                switch(req.body.function[0]){
                    case undefined:
                        data = await _.getMap(req.body.id || global.config.map.common_id);

                        if(data.status !== "ok"){
                            res.status(500);
                            
                            data.code = undefined;
                        }

                        res.end(JSON.stringify(data));
                    break;
                    case "provinces":
                        data = await _.getProvinces(req.body.owner);
                        
                        if(data.status !== "ok"){
                            res.status(500);
                            
                            data.code = undefined;
                        }

                        res.end(JSON.stringify(data));
                    break;
                    case "districts":
                        data = await _.getDistricts();
                        
                        if(data.status !== "ok"){
                            res.status(500);
                            
                            data.code = undefined;
                        }

                        res.end(JSON.stringify(data));
                    break;
                }
            break;
        }
    }

    async setDistricts(districts, progress){
        progress({
            state: "Preparing for recording districts.",
            code: 0,
            step: 1,
            total: 2
        });

        let foramted = new Array(), result, _ = this;

        function check(data, to, fc = true){
            let cur, err, idents = new Array(), size;

            for(let i = 0, leng = data.length;i < leng;i++){
                cur = new Object();

                if(typeof data[i].id === 'number' && data[i].id >= 0 && data[i].id <= Number.MAX_SAFE_INTEGER)
                    if(!idents.includes(data[i].id)) {
                        cur.id = data[i].id;

                        idents.push(data[i].id);
                    } else
                        return {
                            status: 'error',
                            code: 0x0,
                            message: 'id must have a unique value, but the passed value is not unique for id ' + data[i].id
                        }
                else
                    return {
                        status: 'error',
                        code: 0x1,
                        message: 'The id must be of type number and must be between 0 and ' + Number.MAX_SAFE_INTEGER + ' (inclusive), but give ' + data[i].id
                    }

                if(!fc) {
                    if(data[i].use_scenario){
                        if(typeof data[i].scenario === 'string' && data[i].name.length > 0 && data[i].name.length <= 255)
                            cur.scenario = data[i].scenario;
                        else
                            return {
                                status: 'error',
                                code: 0x2,
                                message: 'The scenario field must be of string type and its length must be less than 255 and not equal to zero, but give ' + data[i].use_scenario
                            }
                    }

                    if(data[i].use_cost){
                        if(typeof data[i].cost === 'number' && data[i].cost >= 0 && data[i].cost <= Number.MAX_SAFE_INTEGER)
                            cur.cost = data[i].cost;
                        else
                            return {
                                status: 'error',
                                code: 0x3,
                                message: 'The id must be of type number and must be between 0 and ' + Number.MAX_SAFE_INTEGER + ' (inclusive), but give ' + data[i].cost
                            }
                    }

                    if(data[i].use_entrance){
                        if(typeof data[i].entrance === 'number' && data[i].entrance >= 0 && data[i].entrance <= Number.MAX_SAFE_INTEGER)
                            cur.entrance = data[i].entrance;
                        else
                            return {
                                status: 'error',
                                code: 0x4,
                                message: 'The entrance must be of type number and must be between 0 and ' + Number.MAX_SAFE_INTEGER + ' (inclusive), but give ' + data[i].entrance
                            }
                    }
                    
                    if(data[i].use_fire_time){
                        if(typeof data[i].fire_time === 'number' && data[i].fire_time >= 1000 && data[i].fire_time <= Number.MAX_SAFE_INTEGER)
                            cur.fire_time = data[i].fire_time;
                        else
                            return {
                                status: 'error',
                                code: 0x5,
                                message: 'The id must be of type number and must be between 1000 and ' + Number.MAX_SAFE_INTEGER + ' (inclusive), but give ' + data[i].fire_time
                            }
                    }

                    if(data[i].use_custom_fields){
                        if(typeof data[i].custom_fields === 'object' && (size = _.manager.roughSizeOfObject(data[i].editor_data)) < 10240)
                            cur.custom_fields = data[i].custom_fields;
                        else
                            return {
                                status: 'error',
                                code: 0x6,
                                message: 'The custom_fields object must have maximum weight of 10 Kib(10240 bytes), but give ' + size
                            }
                    }

                    if(typeof data[i].type === 'number' && data[i].type >= 0 && data[i].type <= Number.MAX_SAFE_INTEGER)
                        cur.type = data[i].type;
                    else
                        return {
                            status: 'error',
                            code: 0x7,
                            message: 'The type must be of type number and must be between 0 and ' + Number.MAX_SAFE_INTEGER + ' (inclusive), but give ' + data[i].type
                        }
                }

                if(typeof data[i].editor_data === 'object' && (size = _.manager.roughSizeOfObject(data[i].editor_data)) < 51200) // 50 Kib max
                    cur.editor_data = fc ? JSON.stringify(data[i].editor_data).replace(/\\/g, '\\\\') : data[i].editor_data;
                else if(data[i].editor_data != undefined)
                    return {
                        status: 'error',
                        code: 0x8,
                        message: 'The editor_data object must have maximum weight of 50 Kib(51200 bytes), but give ' + size
                    }
                else data[i].editor_data = null;

                if(typeof data[i].description === 'string')
                    cur.description = data[i].description;
                else if(data[i].description !== undefined)
                    return {
                        status: 'error',
                        code: 0x9,
                        message: 'The name description must be of string type, but give ' + data[i].description
                    }

                if(typeof data[i].name === 'string' && data[i].name.length > 0 && data[i].name.length <= 255)
                    cur.name = data[i].name;
                else
                    return {
                        status: 'error',
                        code: 0xA,
                        message: 'The name field must be of string type and its length must be less than 255 and not equal to zero, but give ' + data[i].name
                    }

                if(typeof data[i].condition === 'string' && data[i].condition.length > 0 && data[i].condition.length <= 255)
                    cur.condition_data = data[i].condition;
                else
                    return {
                        status: 'error',
                        code: 0xB,
                        message: 'The condition field must be of string type and its length must be less than 255 and not equal to zero, but give' + data[i].condition
                    }

                
                if(!Array.isArray(data[i].includes)){
                    if(data[i].includes !== undefined)
                        return {
                            status: 'error',
                            code: 0xC,
                            message: 'The includes field must be an array instance'
                        }
                    else
                        cur.includes = fc ? '[]' : [];
                } else if(data[i].includes.length > 0) {
                    if((err = check(data[i].includes, cur.includes = new Array(), false)).status === 'error')
                        return err;
                    else
                        cur.includes = fc ? JSON.stringify(cur.includes).replace(/\\/g, '\\\\') : cur.includes;
                } else {
                    cur.includes = fc ? '[]' : [];
                }

                to.push(cur);
            }

            return {
                status: 'ok'
            }
        }

        if((result = check(districts, foramted)).status === 'error'){
            return result;
        } else {
            try {
                await this.manager.query('map', sql.delete('districts').where(1).toString())

                progress({
                    state: "Writing final changes",
                    code: 1,
                    step: 2,
                    total: 2
                });

                if(foramted.length > 0)
                    await this.manager.query('map', sql.insert('districts', foramted).toString());

                return {
                    status: 'ok'
                }
            } catch (e) {
                console.error(e);

                return {
                    status: 'error',
                    code: 0xD,
                    message: 'Error while excecuting request'
                }
            }
        }
    }

    async setProvinces(info, reg_id, progress){
        const _ = this;

        let query = new Array(), b, l;

        progress({
            state: "Preparing for recording provinces.",
            code: 0,
        })

        if(reg_id === null || typeof reg_id !== 'number' && typeof reg_id !== "bigint")
            return {
                status: "error",
                code: 0x0,
                message: "Format error. The owner field must have a string type."
            }

        try {
            await _.manager.query('map', sql.delete('provinces').where(sql.like('owner', reg_id)).toString())

            for (let i = 0, leng = info.length; i < leng; i += this.max_writes_per_request) {
                b = info.slice(i, i + this.max_writes_per_request);

                for(let j = 0, j_leng = b.length;j < j_leng;j++) {
                    b[j].owner = reg_id;

                    if(b[j].neighbors != null && b[j].neighbors instanceof Array)
                        b[j].neighbors = '[' + b[j].neighbors.join(",") + ']';
                    else
                        return {
                            status: "error",
                            code: 0x1,
                            message: "Format error. The neighbors field must be an array instance."
                        }

                    if(b[j].sity)
                        b[j].sity = JSON.stringify(b[j].sity);
                    else
                        b[j].sity = null;

                    if(b[j].gfx != null && typeof b[j].gfx === 'string')
                        b[j].gfx = sql(b[j].gfx.substring(0, 2) != '0x' ? '0x' + b[j].gfx : b[j].gfx);
                    else
                        return {
                            status: "error",
                            code: 0x2,
                            message: "Format error. The gfx field must have a string type."
                        }
                }

                query.push(sql.insertInto("provinces", b).toString());
            }
            
            try {
                for(b = 0, l = query.length;b < l;b++){
                    if(progress)
                        progress({
                            state: "Provinces record - record",
                            code: 0x1,
                            cur: b,
                            total: l
                        });

                    await _.manager.query('map', query[b]);
                }
            } catch (e) {
                return {
                    status: "error",
                    code: 0x3,
                    message: "Error while writing provinces"
                }
            }

            return {
                status: "ok"
            }
        } catch (e) {
            return {
                status: "error",
                code: 0x4,
                message: "Error while executing request"
            }
        }
    }

    async setRegions(info, map_id, progress){
        const _ = this;

        progress({
            state: "Preparing for recording regions.",
            code: 0,
        })

        try {
            await _.manager.query('map', sql.delete('regions').where(sql.like('owner', map_id)).toString())

            for(let i = 0, leng = info.length; i < leng;i++){
                if(progress)
                    progress({
                        state: "Regions record - record",
                        code: 1,
                        cur: i,
                        total: leng
                    });
                
                await _.setProvinces(info[i].provinces, info[i].id, progress);
                
                await _.manager.query('map', sql.insert('regions', { id: info[i].id, country: info[i].country, name: info[i].name, color: info[i].color, spawn: JSON.stringify(info[i].spawn), description: info[i].description != undefined ? info[i].description : null, owner: map_id, gfx: info[i].gfx != undefined ? sql(info[i].gfx.substring(0, 2) !== '0x' ? '0x' + info[i].gfx : info[i].gfx) : null }).toString());
            }

            return {
                status: "ok"
            }
        } catch (e) {
            console.error(e);

            return {
                status: "error",
                code: 0x0,
                message: "Error while executing request"
            }
        }
    }

    async setMap(info, progress){
        const _ = this;

        try {
            await _.manager.query('map', sql.delete("worlds").where(sql.like("id", info.id)).toString())

            await _.manager.query('map', sql.insert("worlds", { id: info.id, width: info.width, height:	info.height, gfx: info.gfx ? sql(info.gfx) : null }).toString());
            
            return await _.setRegions(info.regions, info.id, progress);
        } catch(e) {
            return {
                status: "error",
                code: 0x0,
                message: "Error while executing request"
            }
        }
    }

    async getDistricts(){
        const _ = this;

        try {
            const data = await _.manager.query('map', sql.select('*').from('districts').toString());

            for(let i = 0, leng = data.length; i < leng;i++) {
                data[i].editor_data = JSON.parse(data[i].editor_data);
                data[i].includes = JSON.parse(data[i].includes);
            }

            return {
                status: "ok",
                data: data
            };
        } catch (e) {
            console.error(e);

            return {
                status: "error",
                code: 0x0,
                message: "Error while executing request"
            }
        }
    }

    async getProvinces(reg_id){
        const _ = this;

        try {
            const results = await _.manager.query('map', sql.select('id', 'type', 'neighbors', 'geometry', 'borders', 'sity').from('provinces').where(sql.like('owner', reg_id)).toString())

            for(let i = 0, leng = results.length;i < leng;i++) {
                results[i].neighbors = JSON.parse(results[i].neighbors);
                results[i].geometry = JSON.parse(results[i].geometry);
                results[i].borders = JSON.parse(results[i].borders);
                results[i].sity = results[i].sity ? JSON.parse(results[i].sity) : null;
            }

            return {
                status: "ok",
                data: results
            };
        } catch (e) {
            return {
                status: "error",
                code: 0x0,
                message: "Error while executing request"
            }
        }
    }

    async getRegions(map_id){
        const _ = this;

        try {
            const results = await _.manager.query('map', sql.select('spawn', 'id', 'name').from('regions').where(sql.like('owner', map_id)).toString());
        
            for(let i = 0, leng = results.length;i < leng;i++){
                results[i].provinces = (await _.getProvinces(results[i].id)).data;

                results[i].spawn = JSON.parse(results[i].spawn);
            }

            return {
                status: "ok",
                data: results
            }
        } catch (e) {
            return {
                status: "error",
                code: 0x0,
                message: "Error while executing request"
            }
        }
    }

    async getMap(id){
        const _ = this;

        try {
            const result = (await _.manager.query('map', sql.select('*').from('worlds').where(sql.like('id', id)).toString()))[0];
                
            if(result){
                result.regions = (await _.getRegions(id)).data;
            }

            return {
                status: "ok",
                map: result || null
            }
        } catch (e) {
            return {
                status: "error",
                code: 0x0,
                message: "Error while executing request"
            }
        }
    }
}