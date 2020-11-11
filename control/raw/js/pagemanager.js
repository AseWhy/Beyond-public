(function(exporter){
    let Pages       = new Map(),
        Exporters   = new Array(),
        Active      = null;

    class Emitter {
        constructor() {
            this._updaters = new Map();
        }

        clear(){
            const entries = [...this._updaters.entries()];

            for(let i = 0, leng = entries.length;i < leng;i++){
                let removed = true;

                for(let j = 0, j_leng = entries[i][1].length;j < j_leng;j++){
                    if(!entries[i][1][j].can_be_removed) {
                        removed = false;

                        break;
                    }
                }

                if(removed)
                    this._updaters.delete(entries[i][0]);
            }
        }
    
        addEmitter(name, handler, can_be_removed = true){
            if(typeof handler === "function") {
                if(this._updaters.has(name))
                    this._updaters.get(name).push({
                        handler,
                        can_be_removed
                    });
                else
                    this._updaters.set(name, [{
                        handler,
                        can_be_removed
                    }]);
    
                return true;
            } else throw new TypeError("Handler must be an function");
        }
    
        emit(name, ...params){
            if(this._updaters.has(name)) {
                let data = this._updaters.get(name);

                for(let i = 0, leng = data.length;i < leng;i++)
                    data[i].handler.apply(null, params)
    
                return true;
            } else
                console.warn("Can't find updater " + name)
        }
    }

    class PageEntry {
        constructor(content, permissions, callback, data, onleave){
            if(typeof data !== "function" && data !== null && typeof data !== "undefined")
                throw new TypeError("Dataset must be a function!");

            this.contents = new DOMParser().parseFromString(content, "text/html").body.getElementsByClassName("imbedded");
            this.callback = callback;
            this.permissions = 0x1 | (permissions ?? 0x0);
            this.onleave = onleave;
            this.data = data;
            this.emitter = null;
            this.fired = false;
        }
    }

    function load(name){
        const page = Pages.get(name),
              s = document.getElementById("bodytarget"),
              buttons = document.getElementsByClassName("button");

        for(let i = 0, leng = buttons.length;i < leng;i++){
            for(let j = 0;j < leng;j++){
                buttons[j].classList.remove("active");

                if(buttons[j].getAttribute('data-page') === name)
                    buttons[j].classList.add("active")
            }
        }

        for(let i = 0, leng = s.children.length;i < leng;i++)
            s.removeChild(s.children[i]);

        if(page.permissions !== -0x1 && (window.api.session.user === null || window.api.session.user.permissions !== -0x1)) {
            if(
                window.api.session.user == null ||
                page.permissions === -0x2 && window.api.session.user.permissions !== -1 ||
                (window.api.session.user.permissions & page.permissions) != page.permissions
            ){
                load('denied');

                return;
            }
        }

        for(let i = 0, leng = page.contents.length;i < leng;i++)
            s.append(page.contents[i].cloneNode(true));
            
        if(!page.fired){
            page.emitter = new Emitter();

            const data = new Map();

            page.import = [...page.contents].map(e => [...e.querySelectorAll('*')]).flat().filter(e => e.id != "").map(e => e.id);
            
            if(typeof page.data === "function") {
                page.data.apply(null, [ data, page.emitter ]);

                for(let i = 0, leng = Exporters.length; i < leng; i++) {
                    Exporters[i].apply(null, [ data, page.emitter ])
                }
            }

            page.data = data;
            page.fired = true;
        }

        if(Active instanceof PageEntry && typeof Active.onleave === 'function') {
            Active.onleave.apply(null, [Active.data, Active.emitter])

            Active.data.set("active", false);
            // Очищаем буфер событий
            Active.emitter.clear();
        }

        const elements = new Object();

        for(let i = 0, leng = page.import.length;i < leng;i++)
            elements[page.import[i]] = s.querySelector(`#${page.import[i]}`);

        page.data.set("active", true);

        if(typeof page.callback === 'function')
            page.callback.apply(null, [page.data, page.emitter, elements]);

        Active = page;
    }

    exporter.setGlobalExporter = (exporter) => {
        Exporters.push(exporter);
    }

    exporter.addEntryPage = (name, permissions = 0x1, datainit = () => {}, callback = () => true, onleave = () => {}) => {
        fetch("/subpages/" + name)
            .then(data => data.text())
            .then(data => {
                Pages.set(name, new PageEntry(data, permissions, callback, datainit, onleave));
            });
    }

    exporter.removeEntryPage = (name) => {
        Pages.delete(name);
    }

    exporter.loadPage = name => {
        return new Promise((res, rej) => {
            if(!Pages.has(name))
                fetch("/subpages/" + name)
                    .then(data => data.text())
                    .then(data => {
                        if(!Pages.has(name)){
                            Pages.set(name, new PageEntry(data, () => true));
                            
                            load(name);

                            res(data);
                        } else {
                            load(name);
            
                            res(Pages.get(name));
                        }
                    });
            else {
                load(name);

                res(Pages.get(name));
            }
        })
    }
})(typeof module === "object" && typeof module.exports === "object" && module.exports || window);