window.addEntryPage("binds", window.config.permissions.BINDS, (exports, emitter) => {
    function clone(obj){
        return JSON.parse(JSON.stringify(obj));
    }

    exports.set('SelectionArea', class SelectionArea extends React.Component {
        constructor(props){
            super(props)

            this.state = {
                waiting: false,
                binds: new Array(),
                current: 0,
                now: Date.now(),
                search: ''
            }

            this.state_heap = {
                binds: new Array()
            }
        }

        componentDidMount(){
            const _ = this;

            _.search();

            setTimeout(() => _.update(0), 1000)
        }

        hasChanges(){
            return JSON.stringify(this.state.binds) != JSON.stringify(this.state_heap.binds);
        }

        async svComp(){
            this.setState({waiting: true});

            try {
                if(this.hasChanges()){
                    for(let i = 0, leng = this.state.binds.length; i < leng; i++)
                        if(JSON.stringify(this.state.binds[i]) != JSON.stringify(this.state_heap.binds[i]))
                            await api.binds.edit(this.state.binds[i].work_ident, { ...this.state.binds[i] });
                    
                    this.state_heap = clone(this.state);

                    emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Успешно сохранено!', 'tip');
                }
            } catch (e) {
                console.error(e);

                emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Обишка при сохранении.', 'error');
            }

            this.setState({waiting: false});
        }

        async update(i){
            if(!exports.get('active'))
                return;

            if(i === 10){
                emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Обновление данных...', 'tip');

                const binds = (await api.binds.get({
                    contains: {
                        operator: "or",
                        data: [
                            {
                                name: 'excecutor',
                                value: this.state.search
                            }
                        ]
                    }
                })).binds,
                    idents = binds.map(e => e.work_ident),
                    current = this.state.binds.map(e => e.work_ident);

                this.state_heap = {binds: [...this.state.binds.filter(e => idents.includes(e.work_ident)), ...binds.filter(e => !current.includes(e.work_ident))]}

                this.setState(this.setState(Object.assign(clone(this.state_heap), {now: Date.now()})));

                emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Успешно обновлено!', 'tip');

                i = 0;
            } else {
                this.setState({now: Date.now()});
            }

            setTimeout(() => this.update(++i), 1000)
        }

        async search(){
            this.setState({waiting: true});

            emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Поиск по запросу...', 'tip');

            this.state_heap = {binds: (await api.binds.get({
                contains: {
                    operator: "or",
                    data: [
                        {
                            name: 'excecutor',
                            value: this.state.search
                        }
                    ]
                }
            })).binds}

            this.setState(clone(this.state_heap));

            emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Успешно!', 'tip');
            
            this.setState({waiting: false});
        }
        
        async select(e){
            const index = parseInt(e.target.getAttribute('index'));

            console.log(index)

            if(!isNaN(index) && this.state.index != index) {
                await this.svComp();

                this.setState({current: index});
            }
        }

        edit(e){
            switch(e.target.name){
                case "fire_after":
                    console.log(new Date(e.target.value).getTime(), e.target.value, utils.date_format(new Date(e.target.value)))
                    this.state.binds[this.state.current].fire_after = (new Date(e.target.value)).getTime();
                break;
                case "excecutor":
                    this.state.binds[this.state.current].excecutor = e.target.value;
                break;
                case "data":
                    try {
                        this.state.binds[this.state.current].data = JSON.parse(e.target.value);
                    } catch (e) {

                    }
                break;
            }

            this.setState({binds: this.state.binds})
        }

        setSearch(e){
            this.state.search = e.target.value;

            this.search();
        }

        async removeBind(e){
            this.setState({waiting: true});

            try {
                if(confirm('Удалить ' + this.state.binds[this.state.current].work_ident + '?')){
                    await api.binds.remove(this.state.binds[this.state.current].work_ident);
                    
                    this.state.binds.splice(this.state.current, 1);

                    this.state_heap = clone(this.state);

                    emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Успешно удалено!', 'tip');

                    this.setState({binds: this.state.binds})
                }
            } catch (e) {
                console.error(e);

                emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Обишка при удалении.', 'error');
            }

            this.setState({waiting: false});
        }

        render(){
            const _ = this, changes = _.hasChanges();

            return <div class="binds-area-selection" disable={_.state.waiting}>
                <div class={"tools-cont" + (changes ? ' changed' : '')}>
                    <input type="text" name="" class='search' placeholder='Поиск...' onChange={_.setSearch.bind(_)}/>

                    {
                        changes && <button class="save" title='Имеются несохраненные изминения, сохранить?' onClick={_.svComp.bind(_)}>Сохранить</button>
                    }

                    {React.createElement(exports.get('Message'), null)}
                </div>

                {
                    _.state.binds.map((e, i) => 
                        <li class={"binds-row-auto" + (_.state.current == i ? ' selected' : '')} index={i} onClick={_.select.bind(_)}>
                            {
                                (() => {
                                    if(i === _.state.current){
                                        let data = JSON.stringify(e.data, null, 4);

                                        return <div class="binds-row-editor">
                                            <button class="button-danger bind-remove" title='Удалить событие' onClick={_.removeBind.bind(_)}>Удалить {e.work_ident.substring(0, 32)}...</button>
                                            <input name="fire_after" class='fire-after' type="datetime-local" value={utils.date_format(new Date(e.fire_after))} onChange={_.edit.bind(_)}/>
                                            <input name="excecutor" class='excecutor-input' type="text" value={e.excecutor} onChange={_.edit.bind(_)}/>
                                            <textarea name="data" class='data-input' value={data} rows={data.split('\n').length} onChange={_.edit.bind(_)}></textarea>
                                        </div>
                                    } else {
                                        return [
                                            <td class='table-unit'>{e.work_ident.substring(0, 32)}...</td>,
                                            <td class='table-unit'>{e.fire_after < _.state.now ? 'Ожидает исполнения' : 'До выполнения осталось ' + utils.to_ru_time_value(e.fire_after - _.state.now)}</td>,
                                            <td class='table-unit'>{e.excecutor}</td>
                                        ]
                                    }
                                })()
                            }
                        </li>
                    )
                }
            </div>
        }
    });
}, (data, emitter, elements) => {
    "use strict";

    ReactDOM.render(React.createElement(data.get("SelectionArea"), null), elements.selectionarea);
}, (data, emitter) => {
    console.log("Leave users page")
});