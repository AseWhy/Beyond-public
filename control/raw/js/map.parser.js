(function(exporter) {
    const sspp = /^\[\С\Т\А\Р\Т\О\В\Ы\Й\]\s*/;

    const q_patt = [[0, 1], [3, 2]];

    const COLOR_PROVINCE = "#222222",
          COLOR_PROV_BOREDER = "#a3823a",
          COLOR_PROVINCE_DROP = "#282828",
          COLOR_MAP_BACKGROUND = "#373737",
          COLOR_MAP_OCEAN = "#368c86",
          COLOR_MAP_SITY_MARKER = "#368c86",
          COLOR_PLAYER_MARKER = "#7a3f2b",
          COLOR_SHADOW_MARKER = "#050505",
          MARKER_SHADOW_OFFSET = 5; // 5 px

    const Icons = new class IconWorker {
        constructor(icon_to_load){
            const _ = this;

            _.loaded = false;
            _.onload = () => {};

            _.icons = new Object();

            for(let i = 0, leng = icon_to_load.length;i < leng;i++){
                _.icons[icon_to_load[i].name] = new Image();

                _.icons[icon_to_load[i].name].src = icon_to_load[i].from;
                
                _.icons[icon_to_load[i].name].onload = () => _.check();
            }
        }

        getIconPresset(){
            return {...this.icons};
        }

        check() {
            for(let key in this.icons){
                if(!this.icons[key].complete)
                    return;
            }

            console.info("Icons successfully loaded.");

            this.loaded = true;
            
            this.onload();
        }
    }([
        {
            name: "SITY_PRESENT_ICON",
            from: "/icons/sity.present.icon.png"
        }
    ])

    async function toData(canvas, type, quality){
        return new Promise((res, rej) => {
            canvas.toBlob(blob => {
                const reader = new FileReader();

                reader.onload = function() {
                    const result = new Uint8Array(reader.result);

                    res({
                        hex: utils.array_to_hex(result)
                    });
                };

                reader.readAsArrayBuffer(blob);
            }, type ?? 'image/jpeg', quality ?? 0.95)
        })
    }

    function pt_in_polygon(point, polygon) {
        if (polygon.length < 3)
            return false;

        point = [...point]; // Защищем массив от изминения

        let pred_pt = [...polygon[polygon.length - 1]]; // Защищем массив от изминения

        pred_pt[0] -= point[0];
        pred_pt[1] -= point[1];

        let pred_q = q_patt[pred_pt[1] < 0 ? 1 : 0][pred_pt[0] < 0 ? 1 : 0];

        let w = 0;

        for(let i = 0, leng = polygon.length; i != leng; i++) {
            const cur_pt = [...polygon[i]]; // Защищем массив от изминения

            cur_pt[0] -= point[0];
            cur_pt[1] -= point[1];

            let q = q_patt[cur_pt[1] < 0 ? 1 : 0][cur_pt[0] < 0 ? 1 : 0];

            switch (q - pred_q) {
                case -3: ++w; break;
                case 3: --w; break;
                case -2: if(pred_pt[0] * cur_pt[1] >= pred_pt[1] * cur_pt[0]) ++w; break;
                case 2: if(!(pred_pt[0] * cur_pt[1] >= pred_pt[1] * cur_pt[0])) --w; break;
            }

            pred_pt = cur_pt;
            pred_q = q;
        }

        return w != 0;
    }
        
    function color_average(cl1, cl2){
        cl1 = [parseInt(cl1.substring(1, 3), 16), parseInt(cl1.substring(3, 5), 16), parseInt(cl1.substring(5, 7), 16)];

        cl2 = [parseInt(cl2.substring(1, 3), 16), parseInt(cl2.substring(3, 5), 16), parseInt(cl2.substring(5, 7), 16)];

        return `rgb(${(cl1[0] + cl2[0]) * 0.5}, ${(cl1[1] + cl2[1]) * 0.5}, ${(cl1[2] + cl2[2]) * 0.5})`
    }

    function distant(x1, y1, x2, y2){
        return (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)
    }

    function findCentroid(dx, dy) {
        let a = 0,
            x = 0,
            y = 0,
            f,
            l = dx.length - 1;
        
        for (let i = 0, j = l - 1; i < l; j = i++) {
            f = (dx[i] - dx[0]) * (dy[j] - dy[0]) - (dx[j] - dx[0]) * (dy[i] - dy[0]);
            
            a += f;

            x += (dx[i] + dx[j] - 2 * dx[0]) * f;
            y += (dy[i] + dy[j] - 2 * dy[0]) * f;
        }

        f = a * 3;

        return [x / f + dx[0], y / f + dy[0]]
    }

    function drawRegion(ctx, data, i, sw, sh, size, ox, oy, ow, oh, delta, focus, icons, draw_root = false, light_borders = false){
        let dx, dy, tx, ty, px, py, buff;

        // Рисую карту региона, без отметок
        ctx.save();

        size *= 0.5;

        ctx.strokeStyle = COLOR_PROV_BOREDER;
        ctx.fillStyle = COLOR_MAP_BACKGROUND;

        ctx.fillRect(0, 0, sw, sh);

        for(let j = 0, leng = data.length;j < leng;j++){
            ctx.fillStyle = COLOR_PROVINCE;
            ctx.beginPath();

            dx = [(data[j].geometry[0][0] - focus[0][0]) / delta[0] * ow + ox];
            dy = [sh - ((data[j].geometry[0][1] - focus[0][1]) / delta[1] * oh + oy)];

            ctx.moveTo(
                dx[0],
                dy[0]
            );

            for(let o = 1, o_leng = data[j].geometry.length;o < o_leng;o++){
                px = (data[j].geometry[o][0] - focus[0][0]) / delta[0] * ow + ox;
                py = sh - ((data[j].geometry[o][1] - focus[0][1]) / delta[1] * oh + oy);

                ctx.lineTo(px, py);

                dx.push(px);
                dy.push(py);
            }

            ctx.closePath();
            
            if(data[j].color)
                ctx.fillStyle = color_average(data[j].color, COLOR_PROVINCE);
            else if(data[j].type === "ocean")
                ctx.fillStyle = COLOR_MAP_OCEAN;
            else if(light_borders && data[i].neighbors.includes(data[j].id))
                ctx.fillStyle = COLOR_PROVINCE_DROP;
            else
                ctx.fillStyle = COLOR_PROVINCE;

            ctx.fill();
            ctx.stroke();

            [dx, dy] = findCentroid(dx, dy);
            
            if(data[j].sity !== null) {
                ctx.fillStyle = COLOR_MAP_SITY_MARKER;
                ctx.drawImage(icons.SITY_PRESENT_ICON, dx - size, dy - size, size * 2, size * 2);

                if(!draw_root || i !== j && draw_root){
                    buff = data[j].id.toString();
                    ctx.fillStyle = COLOR_PROV_BOREDER;
                    ctx.textBaseline = "top";
                    ctx.font = (size * 0.85) + "px monospace";
                    ctx.fillText(buff, dx - ctx.measureText(buff).width * 0.5, dy + size * 0.85);
                    ctx.font = size + "px monospace";
                    ctx.textBaseline = "middle";
                }
            } else {
                if(!draw_root || i !== j && draw_root){
                    buff = data[j].id.toString();
                    ctx.fillStyle = COLOR_PROV_BOREDER;
                    ctx.font = size + "px monospace";
                    ctx.textBaseline = "middle";
                    ctx.fillText(buff, dx - ctx.measureText(buff).width * 0.5, dy)
                }
            }

            if(i == j){
                tx = dx;
                ty = dy;
            }
        }

        ctx.restore();

        return [tx, ty];
    }

    class Region {
        constructor(data, map) {
            // render data
            this.raw            = null;

            this.owner          = map;
            this.id             = parseInt(data.i);
            this.color          = data.color;
            this.name           = data.name;
            this.description    = new String();
            this.spawn          = new Array();
            this.provinces      = new Map();
            this.country        = null;

            // graphical
            this.gfx_buffer     = null;
        }

        toJSON(){
            return {
                id: this.id,
                gfx: this.raw,
                name: this.name,
                intensity: this.intensity,
                country: this.country,
                owner: this.owner.id,
                spawn: this.spawn,
                color: this.color,
                provinces: [...this.provinces.values()]
            }
        }

        addProvince(data){
            this.provinces.set(parseInt(data.properties.id), new Province(data.properties, data.geometry.coordinates, this));
        }

        render(ctx, ox, oy, s){
            const _ = this;

            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            if(_.gfx_buffer != undefined && _.gfx_buffer.complete){
                ctx.drawImage(_.gfx_buffer, ox, oy, _.gfx_buffer.width * s, _.gfx_buffer.height * s);
            } else if(_.gfx_buffer != undefined){
                _.gfx_buffer.onload = () =>
                    ctx.drawImage(_.gfx_buffer, ox, oy, _.gfx_buffer.width * s, _.gfx_buffer.height * s);
            } else {
                _.gfx_buffer = new Image();

                _.gfx_buffer.onload = () =>
                    ctx.drawImage(_.gfx_buffer, ox, oy, _.gfx_buffer.width * s, _.gfx_buffer.height * s);
                
                _.gfx_buffer.src = _.raw[0] === '/' ? _.raw.replace("#token", api.session.token) : 'data:image/jpeg;base64,' + utils.array_to_base64(utils.hex_to_array(_.raw));
            }
        }
 
        /**
         * 
         * @param {CanvasRenderingContext2D} ctx 
         * @param {Number} ow ширина холста
         * @param {Number} oh высота холста
         * @param {Number} scale значение масштаба
         */
        generateGraphical(ow = 1280, oh = 720, scale = 1, progress = (e, next) => next(), done = (region) => {}){
            const _ = this;

            let data = [..._.provinces.values()],
                focus = data[0].toGraphicalData().borders,
                buff, buffer, delta = new Array(), diag,
                ox, oy, sw = ow, sh = oh, md = 1 / 2, tx, ty,
                icons = Icons.getIconPresset();
            
            // Обрабатываю все провинции в регионе
            for(let i = 0, leng = data.length;i < leng;i++){
                buff = data[i].toGraphicalData();
                
                if(buff.borders[0][0] < focus[0][0])
                    focus[0][0] = buff.borders[0][0];
                if(buff.borders[0][1] < focus[0][1])
                    focus[0][1] = buff.borders[0][1];
                if(buff.borders[1][0] > focus[1][0])
                    focus[1][0] = buff.borders[1][0];
                if(buff.borders[1][1] > focus[1][1])
                    focus[1][1] = buff.borders[1][1];

                data[i] = buff;

                delta.push(buff.id);
            }

            // Получаю граничащие регионы
            for(let i = 0, leng = data.length;i < leng;i++){
                buff = data[i].neighbors.filter(e => !delta.includes(e));

                for(let j = 0, j_leng = buff.length;j < j_leng;j++){
                    buffer = _.owner.getProvince(buff[j]);

                    if(buffer && buffer.owner) { 
                        if(buffer.borders[0][0] < focus[0][0])
                            focus[0][0] = buffer.borders[0][0];
                        if(buffer.borders[0][1] < focus[0][1])
                            focus[0][1] = buffer.borders[0][1];
                        if(buffer.borders[1][0] > focus[1][0])
                            focus[1][0] = buffer.borders[1][0];
                        if(buffer.borders[1][1] > focus[1][1])
                            focus[1][1] = buffer.borders[1][1];

                        data.push({...buffer.toGraphicalData(), color: buffer.owner.color});
                    }
                }
            }

            // Выстраиваю границы обрезки
            delta = [focus[1][0] - focus[0][0], focus[1][1] - focus[0][1]];

            // Центрирую изображение
            if(!oh && !ow) {
                ow = 1280 * scale;
                oh = delta[1] / delta[0] * ow;
                sw = 1280;
                sh = oh + (sw - ow);
            } else if(!ow) {
                ow = delta[0] / delta[1] * oh;
                oh *= scale;
                sw = ow + (sh - oh);
            } else if(!oh) {
                ow *= scale;
                oh = delta[1] / delta[0] * ow;
                sh = oh + (sw - ow);
            } else {
                ow *= scale;
                oh = delta[1] / delta[0] * ow;
            }

            if(ow > sw){
                buff = sw / ow;
                ow *= buff;
                oh *= buff;
            }

            if(oh > sh){
                buff = sh / oh;
                ow *= buff;
                oh *= buff;
            }

            oh = parseInt(oh);
            ow = parseInt(ow);

            ox = parseInt((sw - ow) / 2);
            oy = parseInt((sh - oh) / 2);

            let canvas = document.createElement("canvas"),
                ctx = canvas.getContext("2d"),
                leng = data.length,
                size = new Array();

            diag = ((delta[0] + delta[1]) / 2) / ((ow + oh) / 2) * 4;

            canvas.width = sw;
            canvas.height = sh;

            // Получаю средний размер на холсте
            for(let i = 0, leng = data.length;i < leng;i++){
                size.push(data[i].distance / diag);
            }

            size = utils.average(size);

            // Вывожу текущий прессе отрисовки
            console.log("render presset: " + ow + "x" + oh + ' ' + size + 'ef');

            function next(i, leng){
                if(i + 1 < leng){
                    progress({
                        draw: {
                            target: canvas
                        },
                        ident: data[i].id,
                        cur: i,
                        from: leng
                    }, () => handle(i + 1))
                } else {
                    drawRegion(ctx, data, null, sw, sh, size, ox, oy, ow, oh, delta, focus, icons);

                    toData(canvas).then(r_data => {
                        _.raw = r_data.hex;

                        done(_);
                    })
                }
            }

            // Запускаю цикл обработки
            function handle(i) {
                //#region Draw root
                [tx, ty] = drawRegion(ctx, data, i, sw, sh, size, ox, oy, ow, oh, delta, focus, icons, true, true);
                //#endregion

                //#region Draw marker
                ctx.fillStyle = COLOR_SHADOW_MARKER;
                ctx.beginPath();
                ctx.moveTo(tx - size * md + MARKER_SHADOW_OFFSET, ty - size - MARKER_SHADOW_OFFSET);
                ctx.lineTo(tx + MARKER_SHADOW_OFFSET, ty - MARKER_SHADOW_OFFSET);
                ctx.lineTo(tx + size * md + MARKER_SHADOW_OFFSET, ty - size - MARKER_SHADOW_OFFSET);
                ctx.closePath();
                ctx.fill();
                ctx.fillStyle = COLOR_PLAYER_MARKER;
                ctx.beginPath();
                ctx.moveTo(tx - size * md, ty - size);
                ctx.lineTo(tx, ty);
                ctx.lineTo(tx + size * md, ty - size);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                //#endregion

                //Saves
                if(_.provinces.has(data[i].id)) {
                    toData(canvas).then(r_data => {
                        _.provinces.get(data[i].id).raw = r_data.hex;
                        
                        next(i, leng);
                    });
                } else {
                    next(i, leng);
                }
            }

            // Запускаю отрисовку
            handle(0);
        }

        static fromJSON(json, map){
            const r = new Region({}, map);

            r.color = json.color;
            r.country = json.country;
            r.description = json.description;
            r.raw = `/api/v1.0/?function=web.map&token=#token&region=${json.id}`;
            r.id = json.id;
            r.name = json.name;

            for(let i = 0, leng = json.provinces.length;i < leng;i++)
                r.provinces.set(json.provinces[i].id, Province.fromJSON(json.provinces[i], r));

            return r;
        }
    }

    class Province {
        constructor(data, [ geometry ], region){
            this.raw        = null;

            this.geometry   = geometry;
            this.id         = parseInt(data.id);
            this.biome      = parseInt(data.biome);
            this.type       = data.type;
            this.population = parseInt(data.population);
            this.neighbors  = data.neighbors;
            this.owner      = region;
            this.sity       = null;

            // Получаю границы
            this.borders = [[Infinity, Infinity], [-Infinity, -Infinity]];

            for(let i = 0, leng = geometry.length;i < leng;i++){
                if(geometry[i][0] < this.borders[0][0])
                    this.borders[0][0] = geometry[i][0];
                if(geometry[i][1] < this.borders[0][1])
                    this.borders[0][1] = geometry[i][1];
                if(geometry[i][0] > this.borders[1][0])
                    this.borders[1][0] = geometry[i][0];
                if(geometry[i][1] > this.borders[1][1])
                    this.borders[1][1] = geometry[i][1];
            }

            this.distance = distant(this.borders[0][1], this.borders[0][0], this.borders[1][1], this.borders[1][0]);
        }

        toJSON(){
            return {
                id: this.id,
                geometry: JSON.stringify(this.geometry),
                borders: JSON.stringify(this.borders),
                biome: this.biome,
                type: this.type,
                gfx: this.raw,
                distance: this.distance,
                population: this.population,
                neighbors: this.neighbors,
                owner: this.owner ? this.owner.id : null,
                sity: this.sity
            }
        }

        toGraphicalData(){
            return {
                id: this.id,
                geometry: this.geometry,
                distance: this.distance,
                neighbors: [...this.neighbors],
                owner: this.owner !== null,
                type: this.type,
                sity: this.sity ? {
                    name: this.sity.name,
                    capital: this.sity.capital
                } : null,
                borders: [[...this.borders[0]], [...this.borders[1]]]
            }
        }

        setSity({capital, cell, citadel, culture, feature, i, name, port, shanty, state, temple, walls}){
            this.sity = {
                capital,
                citadel,
                culture,
                feature,
                port,
                shanty,
                state,
                temple,
                walls,
                id: parseInt(i),
                started: sspp.test(name),
                name: name.replace(sspp, ""),
                cell: parseInt(cell)
            };
        }

        static fromJSON(json, region){
            const province = new Province(json, json.geometry, region);
            
            province.raw = `/api/v1.0/?function=web.map&token=#token&province=${json.id}`
            province.sity = json.sity;

            return province;
        }
    }

    class MapData {
        constructor(ident){
            this.regions    = new Map();
            this.id         = parseInt(ident) ?? Date.now();
            this.gfx        = null;
            this.width      = 0;
            this.height     = 0;
        }
        
        toJSON(){
            return {
                regions: [...this.regions.values()],
                id: this.id,
                width: this.width,
                height: this.height
            };
        }

        getProvince(id){
            let region, ident = parseInt(id);

            for(region of this.regions)
                if(region[1].provinces.has(ident))
                    return region[1].provinces.get(ident)

            return null
        }

        addRegion(data){
            if(!data.removed)
                this.regions.set(parseInt(data.i), new Region(data, this));
            else
                console.warn("Удаленый регион пропущен " + data.name)
        }

        addProvince(data){
            const culture = parseInt(data.properties.culture);
            // Костыль - культура это регион
            if(this.regions.has(culture)){
                this.regions.get(culture).addProvince(data);
            }
        }

        addSity(info){
            if(!info.cell)
                return;

            let cell = parseInt(info.cell), region;

            if(!info.removed)
                for(region of this.regions){
                    if(region[1].provinces.has(cell)) {
                        region[1].provinces.get(cell).setSity(info);
                        
                        return;
                    }
                }
            else {
                console.warn("Удаленый город пропущен " + info.cell);

                return;
            }

            console.warn("Не найдена провинция", cell, 'для города', info.name)
        }

        /**
         * 
         * @param {CanvasRenderingContext2D} ctx 
         * @param {Number} ow ширина холста
         * @param {Number} oh высота холста
         * @param {Number} scale значение масштаба
         */
        generateGraphical(ow = 1280, oh = 720, scale = 1, progress = (e, next) => next(), done = (region) => {}){
            const regions = [...this.regions.values()],
                  raw_data = new Array();

            // Собираем точки
            for(let i = 0, leng = regions.length;i < leng;i++){
                const provinces = [...regions[i].provinces.values()],
                      dump = new Array();

                for(let j = 0, j_leng = provinces.length; j < j_leng; j++){
                    dump.push(...provinces[j].geometry.map(e => [Math.round(e[0] * ow), Math.round(e[1] * oh)]))
                }

                raw_data.push(dump);
            }

            console.log(raw_data);
        }
    }

    exporter.MapRestore = (json) => {
        const map = new MapData(0);

        map.id = parseInt(json.seed);
        map.width = parseInt(json.width);
        map.height = parseInt(json.height);
        map.gfx = `/api/v1.0/?function=web.map&token=#token&world=${json.id}`;

        for(let i = 0, leng = json.regions.length;i < leng;i++)
            map.regions.set(json.regions[i].id, Region.fromJSON(json.regions[i], map));

        return map;
    }

    exporter.MapParser = (tm, progress = (data, next) => next(), done = () => {}, data, provinces, roads) => {
        if(data)
            data = data.split("\r\n");

        const m = tm ?? new MapData(data[0].split("|")[0] ?? data[0]);

        if(data) {
            void function parseParameters() {
                const params = data[0].split("|");

                if (params[4])
                    m.width = parseInt(params[4]);

                if (params[5])
                    m.height = parseInt(params[5]);

                m.id = params[3] ? parseInt(params[3]) : Date.now();
            }();

            void function parseRegions(){
                data[13] = JSON.parse(data[13]);

                m.regions.clear();

                for(let i = 0, leng = data[13].length;i < leng;i++)
                    if(data[13][i].i !== 0)
                        m.addRegion(data[13][i]);
                    else
                        console.warn("Region with empty name is skipped")
            }();
        }

        if(provinces)
            void function ParseProvinces(){
                provinces = JSON.parse(provinces).features;

                for(let i = 0, leng = provinces.length;i < leng;i++)
                    m.addProvince(provinces[i]);
            }();
            
        if(data) {
            void function ParseSitys(){
                data[15] = JSON.parse(data[15]);

                for(let i = 0, leng = data[15].length;i < leng;i++)
                    m.addSity(data[15][i]);
            }();
        }

        const regions = [...m.regions.values()];

        function handleRegion(i){
            regions[i].generateGraphical(null, null, 0.95, (e, next) => {
                progress({...e, message: "Processing region graphics: " + (i + 1) + "/" + regions.length}, next);
            }, p => {
                if(i + 1 < regions.length)
                    progress({cur: 1, from: 1, message: "Processing region graphics: " + (i + 1) + "/" + regions.length, data: regions[i]}, () => handleRegion(i + 1));
                else {
                    progress({cur: 1, from: 1, message: "Processing region graphics: " + (i + 1) + "/" + regions.length, data: regions[i]}, () => handleRegion(i + 1));

                    done({map: m});
                    //handleMap(0);
                }
            })
        }

        /*
            function handleMap(i){
                m.generateGraphical(1280, 720, 0.95, (e, next) => {

                }, p => {
                    done({map: m});
                })
            }
        */

        //if(provinces != undefined){
        handleRegion(0);
        //} else {
        //     handleMap(0);
        //}
    }
})(typeof module === "object" && typeof module.exports === "object" && module.exports || window);