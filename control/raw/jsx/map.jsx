window.addEntryPage("map", window.config.permissions.MAP, (exports, emitter) => {
    // Offset variables
    exports.set('mousestep', 0.025);
    exports.set('mousemax', 0.025);
    exports.set('mousemin', 10);
    exports.set('scale', 1);
    exports.set('ox', 0);
    exports.set('oy', 0);

    // Ui variables
    exports.set('Regions', class Regions extends React.Component {
        constructor(params){
            super(params);

            this.state = {
                data: []
            }
        }

        componentDidMount(){
            const _ = emitter.addEmitter("REGION_UPDATER_ACTION", (mode = 'set', data) => {
                if(mode === "set")
                    _.setState({data});
                else if(mode === "append")
                    _.setState({data: [...this.state.data, data]});
                else if(mode === "clear")
                    _.setState({data: []});
            }) && this;
        }

        handleClick(e){
            emitter.emit("update", this.state.data[parseInt(e.target.getAttribute("ident"))]);
        }

        render(){
            return  <div class='drop-regions-cont'>
                {
                    this.state.data.map((e, i) => 
                        <div class='auto-props-label' ident={i} onClick={e => this.handleClick(e)}>
                            регион
                            <label class='auto-message'>
                                {e.name}
                            </label>
                        </div>
                    )
                }
            </div>
        }
    })
}, (data, emitter, elements) => {
    "use strict";

    let map = null,
        render_data = {
            context: renderer.getContext("2d"),
            renderdata: null,
        };

    //#region ui functions
    const update = () => render_data.renderdata && requestAnimationFrame(() =>
                render_data.renderdata.render(
                    render_data.context,
                    data.get('ox'),
                    data.get('oy'),
                    data.get('scale')
                )
            ),
          
          message = (msg, level = 'tip', percent = 0) =>
            emitter.emit('DISPLAY_MESSAGE_UPDATE', msg, level, percent),

          updateMap = map => 
            emitter.emit('REGION_UPDATER_ACTION', 'set', [...map.regions.values()]),

          disable = value =>
            [...document.getElementsByClassName("disableing")]
                .forEach(e => e.classList[value ? "add" : "remove"]('disable'));
    
    //#endregion
    emitter.addEmitter("update", data => {
        render_data.renderdata = data;

        update();
    });

    (window.onresize = () => {
        elements.renderer.width = elements.renderer.parentElement.offsetWidth;
        elements.renderer.height = elements.renderer.parentElement.offsetHeight;

        update();
    })();

    void function MapMoving(){
        let sx, sy, dx, dy;

        const mousewheel = (t, e) => {
            let delta = e.deltaY,
                dd = data.get('scale'), dp;

            if(t === 'chrome')
                data.set('scale', dd - data.get('mousestep') * (delta / 100));
            else
                data.set('scale', dd - data.get('mousestep') * (delta / 2));

            dp = data.get('scale') / dd;

            data.set('ox', data.get('ox') * dp + (1 - dp) * e.layerX);
            data.set('oy', data.get('oy') * dp + (1 - dp) * e.layerY);

            update();
        }

        const mozwheel = mousewheel.bind(null, 'moz'),
              webkitwheel = mousewheel.bind(null, 'chrome');

        const mouseup = e => {
            renderer.removeEventListener("mousemove", mousemove);
            renderer.removeEventListener("mouseup", mouseup);
            renderer.removeEventListener("mouseout", mouseup);
        }

        const mousemove = e => {
            data.set('ox', dx + e.layerX - sx);
            data.set('oy', dy + e.layerY - sy);

            update();
        }

        const mousedown = e => {
            sx = e.layerX;
            sy = e.layerY;
            dx = data.get('ox');
            dy = data.get('oy');

            renderer.addEventListener("mousemove", mousemove);
            renderer.addEventListener("mouseup", mouseup);
            renderer.addEventListener("mouseout", mouseup);
        }

        if('onmousewheel' in window)
            renderer.addEventListener("mousewheel", webkitwheel);
        else
            renderer.addEventListener("wheel", mozwheel);

        renderer.addEventListener("mousedown", mousedown);
    }();

    elements.save_map.onclick = e => {
        let percent = 0;

        disable(true);

        window.api.map.map.set(map, progress => {
            if(progress.code > 0){
                percent = parseInt(progress.cur / progress.total * 100);

                message(progress.state + " " + percent + "%", "tip", percent);
            } else {
                message(progress.state);
            }
        }).then(res => {
            message("Карта успешно установлена!");

            disable(false);
        }).catch(err => {
            console.error(err);

            message("При установке карты произошла ошибка!", "error");

            disable(false);
        });
    }

    elements.load_map.onclick = e => {
        let map_data = new Array();
            map_data[0] = elements.importer_map.files[0];
            map_data[1] = elements.importer_prov.files[0];
            map_data[2] = elements.importer_road.files[0];
        
        let reader = null;

        disable(true);

        function each(i, results) {
            reader = new FileReader();

            if(i >= map_data.length){
                message("Парсинг карты", 'tip');

                emitter.emit('REGION_UPDATER_ACTION', 'clear')

                window.MapParser(map, (r_data, next) => {
                    message(r_data.message, "tip", parseInt(r_data.cur / r_data.from * 100))

                    if(r_data.draw){
                        render_data.context.clearRect(0, 0, render_data.context.canvas.width, render_data.context.canvas.height);

                        const dx = render_data.context.canvas.width / r_data.draw.target.width,
                              dy = render_data.context.canvas.height / r_data.draw.target.height,
                              delta = dx < dy ? dx : dy,
                              ox = (render_data.context.canvas.width - r_data.draw.target.width * delta) * 0.5,
                              oy = (render_data.context.canvas.height - r_data.draw.target.height * delta) * 0.5;

                        render_data.context.drawImage(r_data.draw.target, 0, 0, r_data.draw.target.width, r_data.draw.target.height, ox, oy, r_data.draw.target.width * delta, r_data.draw.target.height * delta)
                    }

                    if(r_data.data) // Если есть данные для отображения региона
                        emitter.emit('REGION_UPDATER_ACTION', 'append', r_data.data)

                    requestAnimationFrame(next);
                }, r_data => {
                    message("Готово!", "tip");

                    if(r_data.data) // Если есть данные для отображения региона
                        emitter.emit('REGION_UPDATER_ACTION', 'append', r_data.data)

                    data.set('last_map', map = r_data.map);

                    disable(false);
                }, ...results);

                return;
            }

            message("Читаю файл " + i, "tip", i / map_data.length * 100);

            if(map_data[i] != null){
                reader.addEventListener("load", () => {
                    results.push(reader.result);

                    requestAnimationFrame(() => each(i + 1, results));
                });

                reader.readAsText(map_data[i]);
            } else {
                results.push(reader.result);

                requestAnimationFrame(() => each(i + 1, results));
            }
        }

        if(map_data[0] != null || map != null)
            each(0, new Array());
        else
            message("Нет целевой карты для обработки, добавте новую (.map)!", "error")
    }

    const importers = document.getElementsByClassName("importer"),
          fns       = document.getElementsByClassName("filename");

    for(let i = 0, leng = importers.length;i < leng;i++)
        (i => {
            importers[i].onchange = e => {
                fns[i].innerText = e.target.files[0] != null ? " " + e.target.files[0].name + "" : "Не выбрано";
            }
        })(i);
        
    ReactDOM.render(React.createElement(data.get("Message"), null), elements.infocont);
    ReactDOM.render(React.createElement(data.get("Regions"), null), elements.properties_renderer);

    void async function LoadMap(){
        if(data.has('last_map')) {
            map = data.get('last_map');

            updateMap(map);

            message("Текущая карта успешно загружена!");
        } else {
            message("Получаю текущую карту");

            disable(true);

            const r_data = await window.api.map.map.get(null, progress => {
                message("Загружаю текущую карту " + utils.conv_size(progress.loaded) + " из " + utils.conv_size(progress.from), "tip", parseInt(progress.loaded / progress.from * 100));
            })

            try {
                if(r_data.map !== null) {
                    message("Загружаю текущую карту");
                    
                    map = window.MapRestore(r_data.map);

                    data.set('last_map', map);

                    updateMap(map);

                    message("Текущая карта успешно загружена!");
                } else {
                    message("Кажется текущая карта не установлена");
                }

                disable(false);
            } catch (err) {
                console.error(err);
                    
                message("При установке карты произошла ошибка!", "error");

                disable(false);
            }
        }
    }();
}, (data, emitter) => {
    console.log("Leave map page")
});