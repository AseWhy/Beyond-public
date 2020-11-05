window.addEntryPage("districts", (exports, emitter) => {
    class GraphNode {
        constructor(x, y, data, drawer){
            this.id             = utils.unique_id();
            this.label          = 'node name';
            this.connections    = new Array();
            this.node           = data != null ? {...data} : new Object();
            this.parent         = null;
            this.selected       = false;
            this.root           = true;
            this.draggable      = false;

            if(drawer) {
                this.position = {
                    x: (x + -drawer.options.offset.x) * (1 / drawer.options.scale),
                    y: (y + -drawer.options.offset.y) * (1 / drawer.options.scale)
                }

                this.setDrawer(drawer);
            } else
                this.position = { x, y };
        }

        setDrawer(drawer){
            this.drawer = drawer;
        }
    }

    // Context variables
    exports.set("context_options", {
        default: [
            {tag: 'create_new', label: 'создать узел'}
        ],
        node: [
            {tag: 'remove_cur', label: 'удалить узел'}
        ],
        connect: [
            {tag: 'connect_to_cur', label: 'соединить с этим узлом'}
        ],
        rmconnect: [
            {tag: 'remove_connection', label: 'удалить соединение'}
        ]
    });

    // Ui variables
    exports.set("graph_drawer", new class GraphDrawer {
        constructor(){
            const _ = this;
            
            _.graphs = new Array();

            _.target_ctx = null;

            _.selection = null;

            _.options = {
                renderer: {
                    fillStyle: '#373737',
                    strokeStyle: '#474747',
                    strokeSelectColor: 'wheat',
                    textColor: 'wheat',
                    textFont: 'JetBrains Mono',
                    text_size_ed: 'em',
                    text_size_p: 1
                },
                render: {
                    grid: true,
                    internals: true
                },
                grid: true,
                grid_gap: {
                    x: 50,
                    y: 50
                },
                min_offset_to_drag: 10,
                scale: 1,
                min_scale: 0.05,
                max_scale: 5,
                scale_step: 0.05,
                offset: {
                    x: 0,
                    y: 0
                },
                blocksize: {
                    width: 200,
                    height: 50
                }
            }

            _._event_buffer = {}

            emitter.addEmitter('ACTION_DRAWER_DATA_UPDATED', _.update.bind(_), false);
        }

        setCtx(ctx){
            const _ = this;

            if(ctx instanceof CanvasRenderingContext2D) {
                if(_.target_ctx) {
                    _.target_ctx.canvas.onclick = undefined;
                    _.target_ctx.canvas.onmousedown = undefined;
                    _.target_ctx.canvas.onmousemove = undefined;
                    _.target_ctx.canvas.onmouseup = undefined;
                    _.target_ctx.canvas.onmousewheel = undefined;
                }

                _.target_ctx = ctx;

                if('onmousewheel' in window)
                    _.target_ctx.canvas.onmousewheel = _.scaleTrigger.bind(_, 'chrome');
                else
                    _.target_ctx.canvas.onwheel = _.scaleTrigger.bind(_, 'moz');

                _.target_ctx.canvas.onclick = _.clickTrigger.bind(_);

                _.target_ctx.canvas.onmousedown = _.mdTrigger.bind(_);
            } else
                throw new TypeError('The ctx must be an CanvasRenderingContext2D instance.')
        }

        getById(id){
            const _ = this;

            for(let i = 0, leng = _.graphs.length;i < leng;i++)
                if(id === _.graphs[i].id)
                    return _.graphs[i];
            
            return null;    
        }

        disconnect(node1, node2){
            const _ = this;

            node1 = typeof node1 === 'string' ? _.getById(node1) : node1;
            node2 = typeof node2 === 'string' ? _.getById(node2) : node2;

            if(node1 && node2){
                let parent, child;

                if(node1.connections.includes(node2.id)){
                    parent = node1;
                    child = node2;
                } else if(node2.connections.includes(node1.id)) {
                    parent = node2;
                    child = node1;
                } else {
                    throw new Error("The node " + node1.id + " not includes " + node2.id + "(disconnect node). Cannot disconnect node.")
                }

                parent.connections.splice(parent.connections.indexOf(child.id), 1);

                child.parent = null;

                child.root = true;

                emitter.emit("ACTION_DRAWER_REGISTER_CHANGES")
            } else {
                throw new Error("Bad target " + node1 + " " + node2);
            }
        }

        /**
         * Соединяет узел `from` с узлом `to`, оставляя `from` как родительский
         * 
         * @param {GraphNode|String} from узел который соединяем или его идентификатор
         * @param {GraphNode|String} to узел с которым соединяем, или его id
         */
        connect(from, to){
            const _ = this;

            from = typeof from === 'string' ? _.getById(from) : from;
            to = typeof to === 'string' ? _.getById(to) : to;

            if(from && to){
                if(to.parent === null) {
                    from.connections.push(to.id);

                    to.parent = from.id;

                    to.root = false;

                    emitter.emit("ACTION_DRAWER_REGISTER_CHANGES")
                } else 
                    console.warn("Cannot connect node " + _.selection.id + " with node " + to.id + ". Already connected.")
            } else {
                throw new Error("Bad target " + from + " " + to);
            }
        }

        remove(node){
            const _ = this, 
                  id = typeof node === 'string' ? node : node.id;

            for(let i = 0, leng = _.graphs.length; i < leng; i++)
                if(_.graphs[i].id === id) {
                    if(_.graphs[i].selected)
                        _.selection = null;

                    for(let j = 0; j < leng; j++) {
                        if(_.graphs[j].connections.includes(id))
                            _.graphs[j].connections = _.graphs[j].connections.filter(e => e !== id);

                        if(_.graphs[i].connections.includes(_.graphs[j].id)){
                            _.graphs[j].parent = null;

                            _.graphs[j].root = true;
                        }
                    }

                    _.graphs.splice(i, 1);

                    emitter.emit("ACTION_DRAWER_REGISTER_CHANGES")

                    return true;
                }

            return false;
        }

        scaleTrigger(type, e){
            let _ = this, dd = this.options.scale, dp;

            if(type === 'chrome')
                _.options.scale -= _.options.scale_step * e.deltaY / 100;
            else
                _.options.scale -= _.options.scale_step * e.deltaY / 2;

            if(_.options.scale < _.options.min_scale || _.options.scale > _.options.max_scale){
                _.options.scale = dd;

                return;
            }

            dp = this.options.scale / dd;

            _.options.offset.x = _.options.offset.x * dp + (1 - dp) * e.layerX;

            _.options.offset.y = _.options.offset.y * dp + (1 - dp) * e.layerY;

            _.update();
        }

        // Мышку отпустили
        muTrigger(e){
            const _ = this, d = _._event_buffer.dragger;

            _.target_ctx.canvas.onmousemove = undefined;
            _.target_ctx.canvas.onmouseup = undefined;

            if(d.target !== null) {
                const px = Math.round((e.layerX - d.offset_x) * (1 / _.options.scale)),
                      py = Math.round((e.layerY - d.offset_y) * (1 / _.options.scale));

                if(_.options.grid) {
                    const tx = Math.round(px / _.options.grid_gap.x),
                          ty = Math.round(py / _.options.grid_gap.y);

                    d.target.position.x = tx * _.options.grid_gap.x;
                    d.target.position.y = ty * _.options.grid_gap.y;

                    d.last_grid_x = tx;
                    d.last_grid_y = ty;

                    d.target.draggable = false;

                    if(d.start_grid_x !== tx || d.start_grid_y !== ty)
                        emitter.emit("ACTION_DRAWER_REGISTER_CHANGES");
                } else if(
                    d.target.draggable || Math.sqrt(Math.abs(d.start_x - e.layerX) ** 2 + Math.abs(d.start_y - e.layerY) ** 2) > _.options.min_offset_to_drag
                ){
                    d.target.position.x = px;
                    d.target.position.y = py;

                    d.target.draggable = false;

                    emitter.emit("ACTION_DRAWER_REGISTER_CHANGES")
                }
            } else {
                _.options.offset.x = d.init_x + e.layerX - d.start_x;
                _.options.offset.y = d.init_y + e.layerY - d.start_y;
            }

            _.update();
        }

        // Перетаскивают
        mmTrigger(e){
            const _ = this, d = _._event_buffer.dragger;

            if(d.target !== null) {
                const px = Math.round((e.layerX - d.offset_x) * (1 / _.options.scale)),
                      py = Math.round((e.layerY - d.offset_y) * (1 / _.options.scale));

                if(_.options.grid) {
                    const tx = Math.round(px / _.options.grid_gap.x),
                          ty = Math.round(py / _.options.grid_gap.y);

                    if(d.last_grid_x !== tx || d.last_grid_y !== ty){
                        d.target.position.x = tx * _.options.grid_gap.x;
                        d.target.position.y = ty * _.options.grid_gap.y;

                        d.last_grid_x = tx;
                        d.last_grid_y = ty;

                        d.target.draggable = true;
                    }
                } else if(
                    d.target.draggable || Math.sqrt(Math.abs(d.start_x - e.layerX) ** 2 + Math.abs(d.start_y - e.layerY) ** 2) > _.options.min_offset_to_drag
                ){
                    d.target.position.x = px;
                    d.target.position.y = py;

                    d.target.draggable = true;
                }
            } else {
                _.options.offset.x = d.init_x + e.layerX - d.start_x;
                _.options.offset.y = d.init_y + e.layerY - d.start_y;
            }

            _.update();
        }

        // Наджатие мыши
        mdTrigger(e){
            const _ = this, target = _.getTarget(e);

            if(target !== null){
                _._event_buffer.dragger = {
                    offset_x: e.layerX - target.position.x * this.options.scale,
                    offset_y: e.layerY - target.position.y * this.options.scale,
                    start_x: e.layerX,
                    start_y: e.layerY,
                    last_grid_x: Math.round(target.position.x / this.options.grid_gap.x),
                    last_grid_y: Math.round(target.position.y / this.options.grid_gap.y),
                    start_grid_x: Math.round(target.position.x / this.options.grid_gap.x),
                    start_grid_y: Math.round(target.position.y / this.options.grid_gap.y),
                    target: target
                }
            } else {
                _._event_buffer.dragger = {
                    init_x: this.options.offset.x,
                    init_y: this.options.offset.y,
                    start_x: e.layerX,
                    start_y: e.layerY,
                    target: null
                }
            }

            _.target_ctx.canvas.onmousemove = e => _.mmTrigger(e);
            _.target_ctx.canvas.onmouseup = e => _.muTrigger(e);
        }

        getTarget(e){
            const _ = this, blocksize = _.options.blocksize;

            for(let i = _.graphs.length; i > 0; i--) {
                if(
                    e.layerX > _.options.offset.x + _.graphs[i - 1].position.x * _.options.scale &&
                    e.layerX < _.options.offset.x + (_.graphs[i - 1].position.x + blocksize.width) * _.options.scale &&
                    e.layerY > _.options.offset.y + _.graphs[i - 1].position.y * _.options.scale &&
                    e.layerY < _.options.offset.y + (_.graphs[i - 1].position.y + blocksize.height) * _.options.scale
                ) {
                    return _.graphs[i - 1];
                }
            }

            return null;
        }

        clickTrigger(e){
            const _ = this, blocksize = _.options.blocksize;

            for(let i = _.graphs.length; i > 0; i--) {
                if(
                    e.layerX > _.options.offset.x + _.graphs[i - 1].position.x * _.options.scale &&
                    e.layerX < _.options.offset.x + (_.graphs[i - 1].position.x + blocksize.width) * _.options.scale &&
                    e.layerY > _.options.offset.y + _.graphs[i - 1].position.y * _.options.scale &&
                    e.layerY < _.options.offset.y + (_.graphs[i - 1].position.y + blocksize.height) * _.options.scale
                ) {
                    const t_index = i - 1;

                    (_.selection = _.graphs[t_index]).selected = true;
                    
                    emitter.emit("ACTION_DRAWER_NODE_SELECT", _.graphs[t_index]);

                    while(--i > 0){
                        _.graphs[i - 1].selected = false;
                    }

                    if(t_index !== _.graphs.length - 1)
                        _.graphs[_.graphs.length - 1] = [_.graphs[t_index], _.graphs[t_index] = _.graphs[_.graphs.length - 1]][0]; // Перемещаем выделенный элемент вверх

                    _.update();

                    return;
                } else {
                    _.graphs[i - 1].selected = false;
                }
            }

            emitter.emit("ACTION_DRAWER_NODE_SELECT", null);
        }

        addGraph(x, y, data){
            this.graphs.push(new GraphNode(x, y, data, this));

            emitter.emit("ACTION_DRAWER_REGISTER_CHANGES")
        }

        update(){
            requestAnimationFrame(() => this.render());
        }

        render(){
            if(!(this.target_ctx instanceof CanvasRenderingContext2D))
                return;

            const formated = new Object(), _ = this, metrix = {
                width: _.options.blocksize.width * _.options.scale,
                height: _.options.blocksize.height * _.options.scale,
                w_half: _.options.blocksize.width / 2,
                h_half: _.options.blocksize.height / 2,
                text_s: _.options.renderer.text_size_p * _.options.scale
            }, ox = _.options.offset.x, oy = _.options.offset.y;
            
            let key, buffer, mxw = 0;

            _.target_ctx.save();

            _.target_ctx.clearRect(0, 0, _.target_ctx.canvas.width, _.target_ctx.canvas.height)

            _.target_ctx.textBaseline = 'top';

            _.target_ctx.font = metrix.text_s + _.options.renderer.text_size_ed + ' ' + _.options.renderer.textFont;

            if(_.options.render.grid){
                _.target_ctx.strokeStyle = _.options.renderer.strokeStyle;

                let bx = _.target_ctx.canvas.width,
                    by = _.target_ctx.canvas.height,
                    px = _.options.grid_gap.x * _.options.scale,
                    py = _.options.grid_gap.y * _.options.scale,
                    sx = Math.ceil(bx / px), 
                    sy = Math.ceil(by / py),
                    cs = 0, ts, dx, dy;

                ts = Math.max(sx, sy);

                while(cs < ts){
                    dx = cs * px + (ox % px);
                    dy = cs * py + (oy % py);

                    if(dx <= bx){
                        _.target_ctx.beginPath();
                        _.target_ctx.moveTo(dx, 0);
                        _.target_ctx.lineTo(dx, by);
                        _.target_ctx.stroke();
                    }

                    if(dy <= by) {
                        _.target_ctx.beginPath();
                        _.target_ctx.moveTo(0, dy);
                        _.target_ctx.lineTo(bx, dy);
                        _.target_ctx.stroke();
                    }

                    cs++;
                }
            }

            for(let i = 0, leng = _.graphs.length;i < leng; i++) {
                if(mxw < (buffer = _.target_ctx.measureText(_.graphs[i].label).width + 20 * _.options.scale))
                    mxw = buffer;

                formated[_.graphs[i].id] = _.graphs[i];
            }

            metrix.width = mxw;

            // Рисую линии
            for(key in formated) {
                if(formated[key].connections.length !== 0){
                    _.target_ctx.strokeStyle = _.options.renderer.textColor;

                    for(let j = 0, j_leng = formated[key].connections.length;j < j_leng;j++){
                        _.target_ctx.beginPath();

                        _.target_ctx.moveTo(
                            (formated[key].position.x + metrix.w_half) * _.options.scale + ox,
                            (formated[key].position.y + metrix.h_half) * _.options.scale +oy
                        );
                        
                        _.target_ctx.lineTo(
                            (formated[formated[key].connections[j]].position.x + metrix.w_half) * _.options.scale + ox,
                            (formated[formated[key].connections[j]].position.y + metrix.h_half) * _.options.scale + oy
                        )
                        
                        _.target_ctx.stroke();
                    }
                }
            }

            // Рисую блоки
            for(key in formated) {
                if(formated[key].draggable)
                    _.target_ctx.globalAlpha = 0.5;
                else
                    _.target_ctx.globalAlpha = 1;

                _.target_ctx.fillStyle = _.options.renderer.fillStyle;

                if(formated[key].selected){
                    _.target_ctx.strokeStyle = _.options.renderer.strokeSelectColor;
                } else {
                    _.target_ctx.strokeStyle = _.options.renderer.strokeStyle;
                }
                
                _.target_ctx.fillRect(
                    formated[key].position.x * _.options.scale + ox,
                    formated[key].position.y * _.options.scale + oy,
                    metrix.width,
                    metrix.height
                );
                
                
                _.target_ctx.strokeRect(
                    formated[key].position.x * _.options.scale + ox,
                    formated[key].position.y * _.options.scale + oy,
                    metrix.width,
                    metrix.height
                )
                    

                if(formated[key].label){
                    _.target_ctx.fillStyle = _.options.renderer.textColor;

                    _.target_ctx.fillText(
                        formated[key].label.toUpperCase(),
                        (formated[key].position.x + 10) * _.options.scale + ox,
                        (formated[key].position.y + 10) * _.options.scale + oy
                    )
                }
            }

            if(_.options.render.internals){
                let string = Math.round(_.options.scale * 100) + '% | ⇆ ' + Math.round(_.options.offset.x) + ' | ⇵ ' + Math.round(_.options.offset.y);

                if(_.options.render.grid)
                    string += ' | # ' + Math.round(_.options.grid_gap.x * _.options.scale) + ' ' + Math.round(_.options.grid_gap.y * _.options.scale);

                _.target_ctx.font = _.options.renderer.text_size_p + _.options.renderer.text_size_ed + ' ' + _.options.renderer.textFont;
                _.target_ctx.fillStyle = '#ffffffaa'
                _.target_ctx.fillRect(0, 0, _.target_ctx.measureText(string).width + 20, parseInt(_.target_ctx.font) + 20);
                _.target_ctx.fillStyle = '#000000';
                _.target_ctx.fillText(string, 10, 10)
            }

            _.target_ctx.restore();
        }
    });

    exports.set("TargetProperties", class ContextMenu extends React.Component {
        constructor(props){
            super(props);

            const drawer = exports.get("graph_drawer");

            this.update_needs = new Array();

            this.state = {
                target: null,
                waiting: false,
                editor: {
                    grid_x: drawer.options.grid_gap.x,
                    grid_y: drawer.options.grid_gap.y,
                    grid_draw: drawer.options.render.grid,
                    grid_use: drawer.options.grid,
                    internals: drawer.options.render.internals
                }
            }
        }

        async componentDidMount(){
            const _ = emitter.addEmitter("ACTION_DRAWER_NODE_SELECT", (node) => {
                _.setState({
                    target: node
                });
            }) && this;

            await _.load();

            emitter.addEmitter("ACTION_DRAWER_REGISTER_CHANGES", _.save.bind(_))
        }

        componentDidUpdate(){
            for(let i = 0, leng = this.update_needs.length;i < leng;i++){
                if(this.update_needs[i] != null && 
                    parseInt(this.update_needs[i].style.height) != this.update_needs[i].scrollHeight
                ) {
                    this.update_needs[i].style.height = '0px';

                    this.update_needs[i].style.height = this.update_needs[i].scrollHeight + 'px';
                }
            }

            this.update_needs.splice(0, this.update_needs.length)
        }

        editData(e){
            if(e.target.tagName === 'TEXTAREA') {
                e.target.style.height = '0px';
                e.target.style.height = e.target.scrollHeight + 'px'
            } 
            
            if(e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
                this.state.target.data[e.target.name] = e.target.checked;
            } else {
                this.state.target.data[e.target.name] = e.target.value;
            }

            this.setState({ target: this.state.target });

            emitter.emit('ACTION_DRAWER_DATA_UPDATED')
        }

        editTarget(e){
            if(e.target.tagName === 'TEXTAREA') {
                e.target.style.height = '0px';
                e.target.style.height = e.target.scrollHeight + 'px'

                this.state.target[e.target.name] = e.target.value;

                this.setState({ target: this.state.target });

                emitter.emit('ACTION_DRAWER_DATA_UPDATED')
            }
        }

        editNode(e){
            if(e.target.tagName === 'TEXTAREA') {
                e.target.style.height = '0px';
                e.target.style.height = e.target.scrollHeight + 'px'
            }
            
            if(e.target.tagName === 'INPUT' && e.target.type === 'checkbox') {
                this.state.target.node[e.target.name] = e.target.checked;
            } else if(e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT' && e.target.type === 'number'){
                if(e.target.name === 'id'){
                    let buffer = null;

                    const drawer = exports.get("graph_drawer"),
                          parent = drawer.getById(this.state.target.parent);

                    for(let i = 0, leng = parent.connections.length;i < leng;i++){
                        if((buffer = drawer.getById(parent.connections[i])) != null && buffer.id != this.state.target.id){
                            if(buffer.node.id == e.target.value){
                                emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Идентификатор ' + e.target.value + ' уже используется на этом уровне дерева.', 'error')

                                return false;
                            }
                        }
                    }
                    
                    this.state.target.node[e.target.name] = parseInt(e.target.value);
                } else {
                    this.state.target.node[e.target.name] = parseInt(e.target.value);
                }
            }else {
                this.state.target.node[e.target.name] = e.target.value;
            }

            this.setState({ target: this.state.target });

            emitter.emit('ACTION_DRAWER_DATA_UPDATED')
        }

        async load(){
            const _ = this;

            _.setState({waiting: true})

            try {
                const data = await api.map.districts.get(),
                      drawer = exports.get("graph_drawer"), buffer = new Array();

                (function parseObject(arr, parent) {
                    let includes = new Array(), cur;

                    for(let i = 0, leng = arr.length;i < leng;i++){
                        cur = new GraphNode();

                        cur.id                      = arr[i].editor_data.editor_id;
                        cur.position                = arr[i].editor_data.position;
                        cur.label                   = arr[i].name ?? '';
                        cur.parent                  = parent !== 'root' ? parent : null;

                        cur.node.type               = arr[i].type                   != null ? arr[i].type : 0 ;
                        cur.node.description        = arr[i].description            || '';
                        cur.node.condition_data     = arr[i].condition_data         || '';
                        cur.node.use_fire_time      = arr[i].fire_time              != null;
                        cur.node.use_cost           = arr[i].cost                   != null;
                        cur.node.use_scenario       = arr[i].scenario               != null;
                        cur.node.use_entrance       = arr[i].entrance               != null;
                        cur.node.use_custom_fields  = arr[i].custom_fields          != null;
                        cur.node.fire_time          = cur.node.use_fire_time        ? arr[i].fire_time : '';
                        cur.node.cost               = cur.node.use_cost             ? arr[i].cost : '';
                        cur.node.scenario           = cur.node.use_scenario         ? arr[i].scenario : '';
                        cur.node.entrance           = cur.node.use_entrance         ? arr[i].entrance : '';
                        cur.node.custom_fields      = cur.node.use_custom_fields    ? arr[i].custom_fields : [];
                        cur.node.id                 = arr[i].id                     != null ? arr[i].id : 0;

                        cur.buffer = { parent };

                        if(parent === 'root')
                            cur.root = true;
                        else
                            cur.root = false;

                        if(arr[i].includes !== undefined && Array.isArray(arr[i].includes)) {
                            cur.connections = parseObject(arr[i].includes, cur.id)
                        } else {
                            cur.connections = new Array()
                        }

                        buffer.push(cur);
                        includes.push(cur.id);
                        cur.setDrawer(drawer);
                    }

                    return includes;
                })(data.data, 'root');

                drawer.graphs = buffer;

                drawer.update();

                emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Данные районов успешно загружены!', 'tip');

                _.setState({waiting: false})
            } catch (e) {
                console.error(e)

                emitter.emit('DISPLAY_MESSAGE_UPDATE', 'При загрузке данных произошла ошибка!', 'error')

                _.setState({waiting: false})
            }
        }
        
        save(){
            const _ = this;

            _.setState({waiting: true});

            api.map.districts.set((() => {
                let drawer = exports.get("graph_drawer"),
                    formated = new Object(), cur, out = new Array();

                function MakeUniqueId(p, ids, entry){
                    if(
                        entry.buffer.id &&
                        !ids.includes(entry.buffer.id)
                    ) {
                        entry.id = entry.buffer.id;
                    } else {
                        while(ids.includes(p))
                            p++;

                        entry.id = p;
                    }

                    ids.push(entry.id);

                    return p;
                }

                for(let i = 0, leng = drawer.graphs.length; i < leng; i++){
                    cur = drawer.graphs[i].id;

                    cur = formated[cur] = new Object();

                    cur.includes            = [...drawer.graphs[i].connections]
                    
                    cur.name                = drawer.graphs[i].label;
                    cur.buffer              = { id: drawer.graphs[i].node.id };
                    cur.condition           = drawer.graphs[i].node.condition_data;
                    cur.use_scenario        = drawer.graphs[i].node.use_scenario;
                    cur.use_cost            = drawer.graphs[i].node.use_cost;
                    cur.use_fire_time       = drawer.graphs[i].node.use_fire_time;
                    cur.use_entrance        = drawer.graphs[i].node.use_entrance
                    cur.use_custom_fields   = drawer.graphs[i].node.use_custom_fields;
                    cur.scenario            = drawer.graphs[i].node.scenario;
                    cur.description         = drawer.graphs[i].node.description;

                    cur.custom_fields       = [...drawer.graphs[i].node.custom_fields];
                    cur.type                = parseInt(drawer.graphs[i].node.type);
                    cur.entrance            = parseInt(drawer.graphs[i].node.entrance);
                    cur.cost                = parseInt(drawer.graphs[i].node.cost);
                    cur.fire_time           = parseInt(drawer.graphs[i].node.fire_time);

                    cur.type = isNaN(cur.type) ? 0 : cur.type;

                    switch(cur.type){
                        default:
                            cur.use_entrance        = false;
                            cur.use_fire_time       = false;
                            cur.use_cost            = false;
                            cur.use_custom_fields   = false;
                        break;
                        case 1:
                            cur.use_cost            = false;
                            cur.use_entrance        = false;
                            cur.use_custom_fields   = false;
                        break;
                        case 2: 
                            cur.use_custom_fields   = false;
                        break;
                        case 3: 
                            cur.use_entrance        = false;
                        break;
                        case 4: 
                            cur.use_cost            = false;
                            cur.use_entrance        = false;
                            cur.use_custom_fields   = false;
                        break;
                    }

                    if(cur.use_scenario && (cur.scenario === undefined || cur.scenario.trim() === '')){
                        emitter.emit('DISPLAY_MESSAGE_UPDATE', `Значение обработчки не может быть пустым для ${cur.name}`, 'error'); 

                        _.setState({waiting: false}); 

                        throw new Error(`User Displayed Input Exception`);
                    }
                    
                    if(cur.use_cost && (cur.cost < 0 || cur.cost > Number.MAX_SAFE_INTEGER)){
                        emitter.emit('DISPLAY_MESSAGE_UPDATE', `Значение стоимости должно содержать только цифры, значением от 0 до ${Number.MAX_SAFE_INTEGER} для ${cur.name}`, 'error');
                                                
                        _.setState({waiting: false}); 

                        throw new Error(`User Displayed Input Exception`);
                    }

                    if(cur.use_fire_time && (cur.fire_time < 1000 || cur.fire_time > Number.MAX_SAFE_INTEGER)){
                        emitter.emit('DISPLAY_MESSAGE_UPDATE', `Значение интервала обработки должно быть от 1000 до ${Number.MAX_SAFE_INTEGER} для ${cur.name}`, 'error');
                                                
                        _.setState({waiting: false}); 

                        throw new Error(`User Displayed Input Exception`);
                    }

                    if(cur.use_entrance && (cur.entrance < 0 || cur.entrance > Number.MAX_SAFE_INTEGER)){
                        emitter.emit('DISPLAY_MESSAGE_UPDATE', `Значение цены за вход должно быть от 0 до ${Number.MAX_SAFE_INTEGER} для ${cur.name}`, 'error');
                                                
                        _.setState({waiting: false}); 

                        throw new Error(`User Displayed Input Exception`);
                    }

                    if(cur.use_custom_fields){
                        for(let i = 0, leng = cur.custom_fields.length; i < leng; i++){
                            if(
                                cur.custom_fields[i].label == null || cur.custom_fields[i].label.trim() == ''
                            ) {
                                emitter.emit('DISPLAY_MESSAGE_UPDATE', `Значение названия кастомного поля не может быть пустым для ${cur.name}`, 'error');

                                _.setState({waiting: false}); 

                                throw new Error(`User Displayed Input Exception`);
                            }

                            if(
                                cur.custom_fields[i].type == null || typeof cur.custom_fields[i].type !== 'number'
                            ) {
                                emitter.emit('DISPLAY_MESSAGE_UPDATE', `Значение типа кастомного должно иметь числовой тип для ${cur.name}.${cur.custom_fields[i].label}`, 'error');

                                _.setState({waiting: false}); 

                                throw new Error(`User Displayed Input Exception`);
                            }

                            if(
                                cur.custom_fields[i].data == null || cur.custom_fields[i].data.toString().trim() == ''
                            ) {
                                emitter.emit('DISPLAY_MESSAGE_UPDATE', `Содержание кастомного поля не может быть пустым для ${cur.name}.${cur.custom_fields[i].label}`, 'error');

                                _.setState({waiting: false}); 

                                throw new Error(`User Displayed Input Exception`);
                            }
                        }
                    }

                    cur.editor_data = {
                        position: drawer.graphs[i].position,
                        editor_id: drawer.graphs[i].id
                    };
                }

                // Форматирую зависимые ветки
                for(let key in formated){
                    if(formated[key].includes.length > 0){
                        for(let i = 0, p = 0, ids = new Array(), leng = formated[key].includes.length;i < leng;i++){
                            formated[key].includes[i] = {...formated[formated[key].includes[i]]};

                            formated[formated[key].includes[i].editor_data.editor_id].useless = true;

                            p = MakeUniqueId(p, ids, formated[key].includes[i]);

                            ids.push(formated[key].includes[i].id);
                        }
                    }
                }

                let ids = new Array(), p = 0;

                for(let key in formated){
                    if(formated[key].useless) {
                        delete formated[key].buffer;

                        delete formated[key];

                        continue;
                    }

                    p = MakeUniqueId(p, ids, formated[key]);

                    delete formated[key].fire_time;   
                    delete formated[key].buffer;

                    out.push(formated[key]);
                }

                return out;
            })(), data => {
                emitter.emit('DISPLAY_MESSAGE_UPDATE', data.state, 'tip', data.step / data.total * 100);
            }).then(data => {
                emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Успешно сохранено', 'tip')

                _.setState({waiting: false})
            }).catch(err => {
                console.error(err);

                emitter.emit('DISPLAY_MESSAGE_UPDATE', 'При сохранении произошла ошибка.', 'error');

                _.setState({waiting: false})
            })
        }

        addCustomField(e){
            this.state.target.node.custom_fields.push(
                {
                    label: '', // name
                    type: 0, // string-data
                    data: '' // content
                }
            )

            this.setState({target: this.state.target})
        }

        editCustomField(e){
            const ident = parseInt(e.target.getAttribute('index'));

            if(e.target.tagName != 'SELECT')
                this.state.target.node.custom_fields[ident][e.target.name] = e.target.value;
            else
                this.state.target.node.custom_fields[ident][e.target.name] = parseInt(e.target.value);
                
            this.setState({target: this.state.target})
        }

        rmCustomField(e){
            this.state.target.node.custom_fields.splice(parseInt(e.target.getAttribute('index')), 1);

            this.setState({target: this.state.target})
        }

        setEditor(e){
            let drawer = exports.get("graph_drawer"), value;

            switch(e.target.name){
                case "grid_draw":
                    this.state.editor[e.target.name] = drawer.options.render.grid = e.target.checked;
                break;
                case "grid_use":
                    this.state.editor[e.target.name] = drawer.options.grid = e.target.checked;

                    if(!e.target.checked){
                        this.state.editor.grid_draw = drawer.options.render.grid = e.target.checked;
                    }
                break;
                case "internals":
                    this.state.editor[e.target.name] = drawer.options.render.internals = e.target.checked;
                break;
                case "grid_x":
                    value =  parseInt(e.target.value);

                    if(value > 0 && value < 1000)
                        this.state.editor[e.target.name] = drawer.options.grid_gap.x = value;
                    else
                        emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Шаг сетки должен быть больше 0 и меньше 1000', 'error');
                break;
                case "grid_y":
                    value =  parseInt(e.target.value);

                    if(value > 0 && value < 1000)
                        this.state.editor[e.target.name] = drawer.options.grid_gap.y = value;
                    else
                        emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Шаг сетки должен быть больше 0 и меньше 1000', 'error');
                break;
            }

            this.setState({editor: this.state.editor})

            drawer.update();
        }

        render(){
            const _ = this;

            return <div class="properties-target-container" disable={_.state.waiting.toString()}>
                <div class="properties-message-container">
                    {React.createElement(exports.get('Message'), null)}
                </div>
                <div class="properties-renderer">
                    <div class='checkbox-common-cont'>
                        <input type="checkbox" name="grid_draw" checked={_.state.editor.grid_draw} onChange={_.setEditor.bind(_)} id="properties-draw-grid"/>
                        <label for="properties-draw-grid" class='auto-checkbox'></label>
                            Рисовать сетку
                    </div>
                    <div class='checkbox-common-cont'>
                        <input type="checkbox" name="grid_use" checked={_.state.editor.grid_use} onChange={_.setEditor.bind(_)} id="properties-use-grid"/>
                        <label for="properties-use-grid" class='auto-checkbox'></label>
                            Использовать сетку
                    </div>
                    <div class='checkbox-common-cont'>
                        <input type="checkbox" name="internals" checked={_.state.editor.internals} onChange={_.setEditor.bind(_)} id="properties-render-inner"/>
                        <label for="properties-render-inner" class='auto-checkbox'></label>
                            Рисовать внутринние свойства
                    </div>
                    <div class='auto-label'>
                        Размер сетки

                        <div className="double-inputs-inline-cont">
                            <input type="number" name="grid_x" value={_.state.editor.grid_x} min='1' max='999' onChange={_.setEditor.bind(_)} id="" placeholder='x'/>
                            <input type="number" name="grid_y" value={_.state.editor.grid_y} min='1' max='999' onChange={_.setEditor.bind(_)} id="" placeholder='y'/>
                        </div>
                    </div>
                </div>
                {
                    (() => {
                        if(_.state.target === null){
                            return <p class='auto-tip'>Текущий редактируемый элемент не выбран, кликните по пространству справа правой кнопкой мыши и нажмите <b>'создать узел'</b></p>
                        } else {
                            return [
                                <p class='auto-tip'>
                                    Вы можете перетаскивать, удалять и соединять узлы как захотите. <b>В зависимости от того как они соеденены, будут выстраиваться последовательности вывода их на экран пользователю.</b>
                                </p>,
                                <div class="auto-edable-container">
                                    <div class='auto-label'>
                                        тип

                                        <select class="auto-select" name='type' value={_.state.target.node.type != null ? _.state.target.node.type : 2} onChange={_.editNode.bind(_)}>
                                            <option value='0'>Область</option>
                                            {
                                                (() => {
                                                    if(!_.state.target.root)
                                                        return [
                                                            <option value='1'>Действие</option>,
                                                            <option value='2'>Здание</option>,
                                                            <option value='3'>Повторяющееся действие</option>,
                                                            <option value='4'>Генератор</option>
                                                         ]
                                                })()
                                            }
                                        </select>
                                    </div>
                                    <div class='auto-label'>
                                        {
                                            (() => {
                                                switch(_.state.target.node.type){
                                                    default: return 'наименование области';
                                                    case 1: return 'наименование действия';
                                                    case 2: return 'наименование здания';
                                                    case 3: return 'наименование действия';
                                                    case 4: return 'наименование генератора';
                                                }
                                            })()
                                        }

                                        <textarea ref={e => this.update_needs.push(e)} name='label' maxLength="255" class="auto_message" value={_.state.target.label} onChange={_.editTarget.bind(_)}>
                    
                                        </textarea>
                                    </div>
                                    <div class='auto-label'>
                                        {
                                            (() => {
                                                switch(_.state.target.node.type){
                                                    default: return 'id области'
                                                    case 1: return 'id действия';
                                                    case 2: return 'id здания';
                                                    case 3: return 'id действия';
                                                    case 4: return 'id генератора';
                                                }
                                            })()
                                        }

                                        <input 
                                            type="number" 
                                            title='Идентификатор' 
                                            min='0' max={Number.MAX_SAFE_INTEGER} 
                                            class="auto-input" 
                                            name="id" 
                                            value={_.state.target.node.id} 
                                            onChange={_.editNode.bind(_)} 
                                        />
                                    </div>
                                    <div class='auto-label'>
                                        условие присутствия

                                        <textarea ref={e => this.update_needs.push(e)} name='condition_data' maxLength="255" class="auto_message" value={_.state.target.node.condition_data} onChange={this.editNode.bind(this)}>
                    
                                        </textarea>
                                    </div>
                                    <div class='auto-label'>
                                        {
                                            (() => {
                                                switch(_.state.target.node.type){
                                                    default: return 'описание области (Опционально)';
                                                    case 1: return 'описание действия (Опционально)';
                                                    case 2: return 'описание здания (Опционально)';
                                                    case 3: return 'описание действия (Опционально)';
                                                    case 3: return 'описание генератора (Опционально)';
                                                }
                                            })()
                                        }

                                        <textarea ref={e => this.update_needs.push(e)} placeholder='' title='Можно не заполнять.' name='description' maxLength="255" class="auto_message" value={_.state.target.node.description || ''} onChange={_.editNode.bind(_)}>

                                        </textarea>
                                    </div>
                                    {
                                        (() => {
                                            switch(_.state.target.node.type){
                                                default:
                                                    return null;
                                                case 1:
                                                    return (<div class='includes-base-cont'>
                                                            <div class='checkbox-common-cont'>
                                                                <input type="checkbox" name="use_scenario" checked={_.state.target.node.use_scenario} onChange={_.editNode.bind(_)} id="target-use_scenario"/>
                                                                <label for="target-use_scenario" class='auto-checkbox'></label>
                                                                    использовать сценарий
                                                            </div>
                                                            {
                                                                (() => {
                                                                    if(_.state.target.node.use_scenario)
                                                                        return <div class='auto-label'>
                                                                            id сценария
                                    
                                                                            <textarea ref={e => _.update_needs.push(e)} title='Id обработчика который вызвается постоянно, спустя n миллисекунд нахождения в здании' name='scenario' maxLength="255" class="auto_message" value={_.state.target.node.scenario || ''} onChange={_.editNode.bind(_)}>
                                                        
                                                                            </textarea>
                                                                        </div>
                                                                })()
                                                            }
                                                        </div>)
                                                case 2:
                                                    return [
                                                        <div class='includes-base-cont'>
                                                            <div class='checkbox-common-cont'>
                                                                <input type="checkbox" name="use_scenario" checked={_.state.target.node.use_scenario} onChange={_.editNode.bind(_)} id="target-use_scenario"/>
                                                                <label for="target-use_scenario" class='auto-checkbox'></label>
                                                                    использовать сценарий
                                                            </div>
                                                            {
                                                                (() => {
                                                                    if(_.state.target.node.use_scenario)
                                                                        return <div class='auto-label'>
                                                                            id сценария
                                    
                                                                            <textarea ref={e => _.update_needs.push(e)} title='Id обработчика который вызвается постоянно, спустя n миллисекунд нахождения в здании' name='scenario' maxLength="255" class="auto_message" value={_.state.target.node.scenario || ''} onChange={_.editNode.bind(_)}>
                                                        
                                                                            </textarea>
                                                                        </div>
                                                                })()
                                                            }
                                                        </div>,
                                                        <div class='includes-base-cont'>
                                                            <div class='checkbox-common-cont'>
                                                                <input type="checkbox" name="use_entrance" checked={_.state.target.node.use_entrance} onChange={_.editNode.bind(_)} id="target-use_entrance"/>
                                                                <label for="target-use_entrance" class='auto-checkbox'></label>
                                                                    брать плату за вход
                                                            </div>
                                                            {
                                                                (() => {
                                                                    if(_.state.target.node.use_entrance)
                                                                        return <div class='auto-label'>
                                                                            цена за вход (банов)
                                    
                                                                            <input 
                                                                                type="number" 
                                                                                title='Если был выбран тип здание, то это цена за вход в это здание в банах.' 
                                                                                min='0' max={Number.MAX_SAFE_INTEGER} 
                                                                                class="auto-input" 
                                                                                name="entrance" 
                                                                                value={_.state.target.node.entrance} 
                                                                                onChange={_.editNode.bind(_)} 
                                                                            />
                                                                        </div>
                                                                })()
                                                            }
                                                        </div>,
                                                        <div class='includes-base-cont'>
                                                            <div class='checkbox-common-cont'>
                                                                <input type="checkbox" name="use_fire_time" checked={_.state.target.node.use_fire_time} onChange={_.editNode.bind(_)} id="target-use_fire_time"/>
                                                                <label for="target-use_fire_time" class='auto-checkbox'></label>
                                                                    использовать интервал вызова
                                                            </div>
                                                            {
                                                                _.state.target.node.use_fire_time && <div class='auto-label'>
                                                                    интервал вызова (mc)
                            
                                                                    <input 
                                                                        type="number" 
                                                                        title='Если был выбран тип здание, то это интервал, в n миллисекунд, можду вызовами обработчика.' 
                                                                        min='0' max={Number.MAX_SAFE_INTEGER} 
                                                                        class="auto-input" 
                                                                        name="fire_time" 
                                                                        value={_.state.target.node.fire_time} 
                                                                        onChange={_.editNode.bind(_)} 
                                                                    />
                                                                </div>
                                                            }
                                                        </div>,
                                                        <div class='includes-base-cont'>
                                                            <div class='checkbox-common-cont'>
                                                                <input type="checkbox" name="use_cost" checked={_.state.target.node.use_cost} onChange={_.editNode.bind(_)} id="target-use_cost"/>
                                                                <label for="target-use_cost" class='auto-checkbox'></label>
                                                                    возможность покупки
                                                            </div>
                                                            {
                                                                (() => {
                                                                    if(_.state.target.node.use_cost)
                                                                        return <div class='auto-label'>
                                                                            цена (банов)
                                    
                                                                            <input type="number" class="auto-input" name="cost" value={_.state.target.node.cost} min='0' max={Number.MAX_SAFE_INTEGER} onChange={_.editNode.bind(_)} id=""/>
                                                                        </div>
                                                                })()
                                                            }
                                                        </div>
                                                    ]
                                                case 3:
                                                    return [
                                                        <div class='includes-base-cont'>
                                                            <div class='checkbox-common-cont'>
                                                                <input type="checkbox" name="use_scenario" checked={_.state.target.node.use_scenario} onChange={_.editNode.bind(_)} id="target-use_scenario"/>
                                                                <label for="target-use_scenario" class='auto-checkbox'></label>
                                                                    использовать сценарий
                                                            </div>
                                                            {
                                                                (() => {
                                                                    if(_.state.target.node.use_scenario)
                                                                        return <div class='auto-label'>
                                                                            id сценария
                                    
                                                                            <textarea ref={e => _.update_needs.push(e)} title='Id обработчика который вызвается постоянно, спустя n миллисекунд нахождения в здании' name='scenario' maxLength="255" class="auto_message" value={_.state.target.node.scenario} onChange={_.editNode.bind(_)}>
                                                        
                                                                            </textarea>
                                                                        </div>
                                                                })()
                                                            }
                                                        </div>,
                                                        <div class='includes-base-cont'>
                                                            <div class='checkbox-common-cont'>
                                                                <input type="checkbox" name="use_fire_time" checked={_.state.target.node.use_fire_time} onChange={_.editNode.bind(_)} id="target-use_fire_time"/>
                                                                <label for="target-use_fire_time" class='auto-checkbox'></label>
                                                                    использовать интервал вызова
                                                            </div>
                                                            {
                                                                (() => {
                                                                    if(_.state.target.node.use_fire_time)
                                                                        return <div class='auto-label'>
                                                                        интервал вызова (mc)
                                
                                                                        <input 
                                                                            type="number" 
                                                                            title='Если был выбран тип здание, то это интервал, в n миллисекунд, можду вызовами обработчика.' 
                                                                            min='0' max={Number.MAX_SAFE_INTEGER} 
                                                                            class="auto-input" 
                                                                            name="fire_time" 
                                                                            value={_.state.target.node.fire_time} 
                                                                            onChange={_.editNode.bind(_)} 
                                                                        />
                                                                    </div>
                                                                })()
                                                            }
                                                        </div>,
                                                        <div class="includes-base-cont">
                                                            <div class='checkbox-common-cont'>
                                                                <input type="checkbox" name="use_custom_fields" checked={_.state.target.node.use_custom_fields} onChange={_.editNode.bind(_)} id="target-use_custom_fields"/>
                                                                <label for="target-use_custom_fields" class='auto-checkbox'></label>
                                                                    использовать кастомные поля
                                                            </div>

                                                            {
                                                                _.state.target.node.use_custom_fields && _.state.target.node.custom_fields.map((e, i) => (
                                                                    <div class="custom-field-container">
                                                                        <div class="custom-field-header">
                                                                            <input placeholder='Название' class='custom-input-label' type="text" name="label" index={i} value={e.label} onChange={_.editCustomField.bind(_)}/>
                                                                            <select class='custom-field-type' name="type" index={i} value={e.type} onChange={_.editCustomField.bind(_)}>
                                                                                <option value="0">Шаблонная строка</option>
                                                                                <option value="1">Формула</option>
                                                                                <option value="2">Числовая константа</option>
                                                                                <option value="3">Строковая константа</option>
                                                                            </select>
                                                                        </div>
                                                                        {
                                                                            (e.type == 0 || e.type == 1 || e.type == 3) && <textarea placeholder='Содержание' ref={e => _.update_needs.push(e)} index={i} title='Содержание кастомного поля' name='data' maxLength="255" class="auto_message cutom-field-data" value={e.data} onChange={_.editCustomField.bind(_)}>
                                                    
                                                                            </textarea> ||
                                                                            (e.type == 2) && <input type="number" index={i} placeholder='Содержание' title='Содержание кастомного поля' name='data' maxLength="255" class="cutom-field-data-number" value={e.data} onChange={_.editCustomField.bind(_)}/>
                                                                        }
                                                                        <button index={i} class="button-danger custom-field-button-remove" onClick={_.rmCustomField.bind(_)}>{'Удалить ' + e.label}</button>
                                                                    </div>
                                                                ))
                                                            }
                                                            {
                                                                _.state.target.node.use_custom_fields && <button class="button-statement" onClick={_.addCustomField.bind(_)}>Добавить поле</button>
                                                            }
                                                        </div>
                                                    ]
                                                case 4:
                                                    return (<div class='includes-base-cont'>
                                                            <div class='checkbox-common-cont'>
                                                                <input type="checkbox" name="use_scenario" checked={_.state.target.node.use_scenario} onChange={_.editNode.bind(_)} id="target-use_scenario"/>
                                                                <label for="target-use_scenario" class='auto-checkbox'></label>
                                                                    использовать сценарий
                                                            </div>
                                                            {
                                                                (() => {
                                                                    if(_.state.target.node.use_scenario)
                                                                        return <div class='auto-label'>
                                                                            id сценария
                                    
                                                                            <textarea ref={e => _.update_needs.push(e)} title='Id обработчика который вызвается постоянно, спустя n миллисекунд нахождения в здании' name='scenario' maxLength="255" class="auto_message" value={_.state.target.node.scenario || ''} onChange={_.editNode.bind(_)}>
                                                        
                                                                            </textarea>
                                                                        </div>
                                                                })()
                                                            }
                                                        </div>)
                                            }
                                        })()
                                    }
                                </div>,
                                <div className="action-buttons-container">
                                    <button className="button-statement" onClick={_.save.bind(_)}>Сохранить текущее состояние</button>
                                </div>
                            ]
                        }
                    })()
                }
            </div>
        }
    });

    exports.set("ContextMenu", class ContextMenu extends React.Component {
        constructor(props){
            super(props);

            this.state = {
                labels: new Array(),
                x: 0,
                y: 0,
                show: false
            }
        }

        componentDidMount(){
            const _ = emitter.addEmitter("UPDATE_CONTEXT_MENU", (x, y, labels) => {
                _.setState({
                    show: true,
                    x: x || 0,
                    y: y || 0,
                    labels: labels || new Array()
                });
            }) && emitter.addEmitter("HIDE_CONTEXT_MENU", e => {
                this.setState({
                    show: false,
                    x: 0,
                    y: 0,
                    labels: new Array()
                });
            }) && this;
        }

        select(e){
            const index = parseInt(e.target.getAttribute('index'));

            emitter.emit('SELECT_CONTEXT_MENU_FIRE', index, this.state.labels[index], this.state.x, this.state.y, e);

            this.setState({show: false, x: 0, y: 0, labels: new Array()});
        }

        render(){
            if(this.state.show)
                return <table class='context' style={{top: this.state.y, left: this.state.x}}>
                    {
                        this.state.labels.map((e, i) => 
                            <tr>
                                <td index={i} onClick={this.select.bind(this)}>
                                    {
                                        e.label
                                    }
                                </td>
                            </tr>
                        )
                    }
                </table>
            else
                return <table class='context hidden'></table>
        }
    });
}, (data, emitter, elements) => {
    "use strict";

    void function (){
        void function updateCanvas(){
            elements.targetdrawer.width = elements.targetdrawer.parentElement.offsetWidth;
            elements.targetdrawer.height = elements.targetdrawer.parentElement.offsetHeight;

            data.get("graph_drawer").update()

            window.onresize = updateCanvas;
        }();

        data.get("graph_drawer").setCtx(elements.targetdrawer.getContext('2d'));

        elements.targetdrawer.oncontextmenu = e => {
            const target = data.get("graph_drawer").getTarget(e);

            const context = [...data.get('context_options').default];

            if(target !== null){
                context.push(...data.get('context_options').node);
            
                if(!target.selected && data.get("graph_drawer").selection !== null && data.get("graph_drawer").selection != target)
                    if(data.get("graph_drawer").selection.connections.includes(target.id)){
                        context.push(...data.get('context_options').rmconnect);
                    } else if( target.parent === null ){
                        context.push(...data.get('context_options').connect);
                    }
            }

            emitter.emit('UPDATE_CONTEXT_MENU', e.pageX, e.pageY, context);

            e.preventDefault()
        }

        emitter.addEmitter('SELECT_CONTEXT_MENU_FIRE', (index, option, x, y, e) => {
            let rect, target;

            switch(option.tag){
                case "create_new":
                    rect = elements.targetdrawer.getBoundingClientRect();

                    data.get("graph_drawer").addGraph(x - rect.x, y - rect.y, {condition: 'true', id: 0, custom_fields: [], type: 0, description: '', name: ''});

                    data.get("graph_drawer").update()
                break;
                case "remove_cur":
                    rect = elements.targetdrawer.getBoundingClientRect();

                    target = data.get("graph_drawer").getTarget({layerX: x - rect.x, layerY: y - rect.y});

                    if(target !== null){
                        data.get("graph_drawer").remove(target);

                        data.get("graph_drawer").update()
                    }
                break;
                case "connect_to_cur":
                    rect = elements.targetdrawer.getBoundingClientRect();

                    target = data.get("graph_drawer").getTarget({layerX: x - rect.x, layerY: y - rect.y});

                    if(target !== null){
                        data.get("graph_drawer").connect(data.get("graph_drawer").selection, target);

                        data.get("graph_drawer").update()
                    }
                break;
                case "remove_connection":
                    rect = elements.targetdrawer.getBoundingClientRect();

                    target = data.get("graph_drawer").getTarget({layerX: x - rect.x, layerY: y - rect.y});

                    if(target !== null){
                        data.get("graph_drawer").disconnect(data.get("graph_drawer").selection, target);

                        data.get("graph_drawer").update()
                    }
                break;
            }
        })

        window.onclick = e => emitter.emit('HIDE_CONTEXT_MENU');
    }()
    
    ReactDOM.render(React.createElement(data.get("TargetProperties"), null), elements.targetproperties);
    ReactDOM.render(React.createElement(data.get("ContextMenu"), null), elements.guitarget);
}, (data, emitter) => {
    window.onresize = null;

    window.onclick = null;

    console.log("Leave statistics page")
});