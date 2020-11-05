window.addEntryPage("items", (exports, emitter) => {
    // Ui variables
    exports.set('AddRow', class AddRow extends React.Component {
        constructor(props){
            super(props);

            this.default_width_pl = 26;
            
            this.state = {
                handling: false,
                display: "",
                ident: ""
            };
        }

        handleInputChange(e){
            this.setState({[e.target.name]: e.target.value});
        }

        async handleAction(e){
            this.setState({handling: true});

            if(this.state.ident.trim() === ''){
                emitter.emit('DISPLAY_MESSAGE_UPDATE', '"Идентификатор" не может быть пустой', 'error');

                return;
            }
            
            if(this.state.display.trim() === '') {
                emitter.emit('DISPLAY_MESSAGE_UPDATE', '"Имя" не может быть пустым', 'error');

                return;
            }

            await window.api.item.set({named_id: this.state.ident, display: this.state.display});
            
            this.setState({display: "", ident: ""})

            this.setState({handling: false});

            emitter.emit('UPDATE_FILTERED_LIST');
        }

        render(){
            return <li class="add-cont" disable={this.state.handling}>
                <input 
                    type="text"
                    name="display"
                    size={this.state.display.length != 0 ? this.state.display.length : 26}
                    value={this.state.display}
                    placeholder="то, что видит пользователь"
                    class="add-inputs-name"
                    onChange={e => this.handleInputChange(e)}
                />
                <input 
                    type='text'
                    name='ident'
                    placeholder='идентификатор'
                    class="add-inputs-ident"
                    size={this.state.ident.length != 0 ? this.state.ident.length : 13}
                    value={this.state.ident}
                    onChange={e => this.handleInputChange(e)}
                />
                <input
                    type='submit'
                    name='submit'
                    value='добавить'
                    className='add-inputs-submit'
                    onClick={e => this.handleAction(e)}
                />
            </li>
        }
    })

    exports.set('List', class List extends React.Component {
        constructor(props){
            super(props);

            this.state = {
                items: [],
                types: [],
                active: 0
            };
        }

        componentDidMount(){
            const _ = emitter.addEmitter("LIST_UPDATE_ACTION", (data) => {
                _.setState({
                    items: data.items,
                    types: data.types,
                    active: data.active ? data.active : data.items[_.state.active] != null ? _.state.active : 0
                })
            }) && this;
        }

        handleClick(e){
            this.setState({
                active: parseInt(e.target.getAttribute("target"))
            })
        }

        render(){
            const Lines = new Array(),
                    active = this.state.items[this.state.active] ? this.state.active : 0;

            for(let i = 0, leng = this.state.items.length;i < leng;i++)
                Lines.push(
                    <li target={i} class={active === i ? 'active' : ''} onClick={e => this.handleClick(e)}>
                        <label>{this.state.items[i].display.replace(/\{[^}{}]*\}/g, '{exp...}')}</label>
                        <label class="sell-ident">{this.state.items[i].named_id}</label>
                    </li>
                );

            if(this.state.items.length > 0)
                emitter.emit('INFO_UPDATE_ACTION', { types: this.state.types, ...this.state.items[active] });

            return  <ul id="sell-lables">
                {Lines}
                {React.createElement(exports.get('AddRow'))}
            </ul>;
        }
    });

    exports.set('TypeInfo', class TypeInfo extends React.Component {
        constructor(props){
            super(props);

            this.save_dump = new Object();

            this.type_name = React.createRef();

            this.state = {
                editor: 0,
                types: new Map()
            };
        }

        componentDidMount(){
            const _ = emitter.addEmitter("INFO_TYPE_UPDATE_ACTION", (data) => {
                _.setState({
                    types: data.types instanceof Map ? data.types : new Map(),
                    editor: typeof data.type === 'number' && data.type >= 0 ? data.type : 0
                })
            }) && this;
        }

        async save(){
            try {
                await window.api.item.types.edit(c, _.state.types.get(c));

                emitter.emit('UPDATE_FILTERED_LIST');

                emitter.emit('DISPLAY_MESSAGE_UPDATE', "Успешно сохранено!", 'tip');
            } catch (e) {
                console.error(e);

                emitter.emit('DISPLAY_MESSAGE_UPDATE', "При сохранении произошла ошибка...!", 'error');
            }
        }

        handleRowInputChange(e){
            this.state.types.get(this.state.editor).fields[e.target.getAttribute('ident')][e.target.name] = e.target.name === 'type' ? parseInt(e.target.value) : e.target.value;

            this.setState({types: this.state.types});

            save();
        }

        addRow(){
            this.state.types.get(this.state.editor).fields.push({name: "", type: -1});

            this.setState({types: this.state.types});

            save();
        }

        async addType(){
            let name;

            if(this.type_name.current && (name = this.type_name.current.value.trim()) != "") {
                const s = await window.api.item.types.add({ display: name });

                this.state.types.set(s.ident, { id: s.ident, display: name, description: "", fields: [] })

                this.setState({types: this.state.types, editor: s.ident}, () => {
                    emitter.emit('INFO_UPDATE_ACTION', { type: s.ident, types: this.state.types }, true)
                })
            } else {
                emitter.emit('DISPLAY_MESSAGE_UPDATE', '"Наименование типа" не может быть пустым', 'error');
            }
        }
    
        async rmRow(i){
            if (confirm("Удалить " + this.state.types.get(i).display + "?")) {
                await window.api.item.types.remove(i);

                emitter.emit('UPDATE_FILTERED_LIST') 
            }
        }

        render(){
            const target = this.state.types.get(this.state.editor);

            if(target)
                return <div class='formated-properties-container'>
                    <div class="auto-header">Редактор типа: {target.display}</div>

                    <p>
                        Здесь вы можете отредактировать созданный вами тип. У типа есть поля, поля можно будет редактировать в редакторе самого предмета,
                        обратите венимание на типы: константные значения подаются <b>без обработки</b>, обработчиком же является тип формулы. За значениями
                        переменных у формул смотрим <a href='https://discord.com/channels/755394428390080583/757692247314661446'>тут</a>
                    </p>

                    {
                        target.fields.map((e, i) => 
                            <div class="item-editable-row-type">
                                <input ident={i} title="Название поля" value={e.name} type="text" name="name" placeholder="Название поля" onChange={e => this.handleRowInputChange(e)}/>
                                
                                <select ident={i} name="type" title="Тип поля" value={e.type} onChange={e => this.handleRowInputChange(e)}>
                                    <option value='0'>Не выбрано</option>
                                    <option value='1'>Формула</option>
                                    <option value='2'>Строковая константа</option>
                                    <option value='3'>Числовая константа</option>
                                </select>

                                <button class="button-danger" title="Удалить поле" ident={i} onClick={e => this.rmRow(e.target.getAttribute('ident'))}>🗑</button>
                            </div>
                        )
                    }
                    {
                        this.state.editor != 0 ? (
                            [
                                <button class='button-statement' onClick={e => this.addRow()}>
                                    Добавить поле
                                </button>,
                                <button class='button-danger' target={target.id} onClick={e => this.rmRow(parseInt(e.target.getAttribute('target')))}>
                                    Удалить {target.display}
                                </button>
                            ]
                        ) : []
                    }
                </div>
            else
                return <div class='formated-properties-container'>
                    <div class="auto-header">Создать тип</div>

                    <p>
                        Здесь вы можете создать свой тип. Типы помогают контролировать параметры каждого предмета.
                    </p>

                    <input ref={this.type_name} class="add-type-input" title="Наименование типа" type="text" name="name" placeholder="Наименование типа"/>

                    <button class='button-statement' onClick={e => this.addType()}>
                        Создать
                    </button>
                </div>
        }
    })

    exports.set('Info', class Info extends React.Component {
        constructor(props){
            super(props);

            this.initial = false;

            this.state_heap = {
                types: new Map(),
                named_id: "",
                type: "",
                display: "",
                description: "",
                data: new Map()
            };

            this.update_needs = new Array();

            this.state = {...this.state_heap};
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

        componentDidMount(){
            const _ = emitter.addEmitter("INFO_UPDATE_ACTION", async (data, appends) => {
                if(_.initial) {
                    await _.save();
                }

                if(!appends) {
                    _.state_heap = { 
                        types: data.types ?? new Map(),
                        named_id: data.named_id ?? '',
                        type: data.type ?? 0,
                        display: data.display ?? '',
                        description: data.description ?? '',
                        data: data.data ?? new Map()
                    };

                    _.setState({ ..._.state_heap, data: new Map(_.state_heap.data) }, () => {
                        emitter.emit('INFO_TYPE_UPDATE_ACTION', {types: this.state.types, type: this.state.type})
                    });
                } else {
                    _.setState({ ...data }, () => {
                        emitter.emit('INFO_TYPE_UPDATE_ACTION', {types: this.state.types, type: this.state.type})
                    });
                }

                _.initial = true;
            }) && this;
        }

        hasChanges(){
            if(
                this.state.named_id != this.state_heap.named_id ||
                this.state.type != this.state_heap.type ||
                this.state.display != this.state_heap.display ||
                this.state.description != this.state_heap.description
            )
                return true;
            
            for(let key of this.state.data.keys()){
                if(
                    this.state_heap.data.get(key) == null || (
                        this.state_heap.data.get(key).name != this.state.data.get(key).name ||
                        this.state_heap.data.get(key).value != this.state.data.get(key).value ||
                        this.state_heap.data.get(key).type != this.state.data.get(key).type
                    )
                )
                    return true;
            }

            return false;
        }

        async save(){
            try {
                if(this.hasChanges()) {
                    if(this.state.named_id.trim() == ''){
                        emitter.emit('DISPLAY_MESSAGE_UPDATE', "Идентификатор не может быть пустым.", 'error');

                        return;
                    }

                    if(this.state.display.trim() == ''){
                        emitter.emit('DISPLAY_MESSAGE_UPDATE', "Отображаемое имя не может быть пустым.", 'error');

                        return;
                    }

                    await window.api.item.edit(this.state_heap.named_id, {
                        named_id: this.state.named_id,
                        type: this.state.type,
                        display: this.state.display,
                        description: this.state.description,
                        data: [...this.state.data]
                    });

                    emitter.emit('UPDATE_FILTERED_LIST');

                    emitter.emit('DISPLAY_MESSAGE_UPDATE', "Успешно сохранено!", 'tip');
                }
            } catch (e) {
                console.error(e);

                emitter.emit('DISPLAY_MESSAGE_UPDATE', "При сохранении произошла ошибка...!", 'error');
            }
        }
        
        handleInputChange(e) {
            e.target.style.height = '0px';
            e.target.style.height = e.target.scrollHeight + 'px'

            const value = e.target.value;

            this.setState({[e.target.name]: value});
        }

        handleSelectChange(e){
            this.setState({[e.target.name]: parseInt(e.target.value)}, () => {
                emitter.emit('INFO_TYPE_UPDATE_ACTION', {types: this.state.types, type: this.state.type})
            });
        }

        handleData(e){
            this.state.data.set(e.target.name, {
                name: e.target.name,
                value: e.target.value,
                type: e.target.getAttribute("data_type")
            });

            this.setState({data: this.state.data});
        }

        async removeInfo(e){
            if (confirm("Удалить " + this.state.display + "?")) {
                await window.api.item.remove(this.state.named_id);

                emitter.emit('UPDATE_FILTERED_LIST');
            }
        }

        render(){
            const type = this.state.types.get(this.state.type) ? this.state.type : 0, _ = this;

            return <div class='formated-properties-container'>
                <div class='auto-label'>
                    Иденцификатор
                    <textarea maxLength="255" ref={e => this.update_needs.push(e)} class="auto_message" name="named_id" value={_.state.named_id} onChange={_.handleInputChange.bind(_)}>

                    </textarea>
                </div>
                <div class='auto-label'>
                    Тип
                    <select 
                        class="auto-select" 
                        name="type" 
                        value={type}
                        onChange={e => _.handleSelectChange(e)
                    }>
                        <option value="0">Не выбрано</option>
                        {
                            _.state.types instanceof Map ?
                                [..._.state.types.values()].map(e => <option value={e.id} title={e.description}>{e.display}</option>) :
                                []
                        }
                    </select>
                </div>
                <div class='auto-label'>
                    Отображаемое название
                    <textarea maxLength="255" ref={e => this.update_needs.push(e)} class="auto_message" name="display" value={_.state.display} onChange={_.handleInputChange.bind(_)}>

                    </textarea>
                </div>
                <div class='auto-label'>
                    Описание
                    <textarea maxLength="255" ref={e => this.update_needs.push(e)} class="auto_message" name="description" value={_.state.description} onChange={_.handleInputChange.bind(_)}>

                    </textarea>
                </div>
                <div class="types-contents-editor">
                    {_.state.data.size !== 0 ? 'Данные предмета' : ''}
                    {
                        type !== 0 ?
                            _.state.types.get(_.state.type).fields.map(
                                e => <div class='property-editor'>
                                        {e.name + (e.type === 0 ? " - тип не выбран" : "")}
                                        {
                                            (() => {
                                                const value = _.state.data.has(e.name) ? _.state.data.get(e.name).value : "";

                                                switch(e.type){
                                                    case 0:
                                                        return <input class='property-input-target' type='text' data_type={e.type} name={e.name} disabled placeholder='Выбирите тип для этого поля' value={value}/>
                                                    case 1:
                                                        return <input class='property-input-target' type='text' data_type={e.type} name={e.name} placeholder={e.name} value={value} onChange={_.handleData.bind(_)}/>
                                                    case 2:
                                                        return <input class='property-input-target' type='text' data_type={e.type} name={e.name} placeholder={e.name} value={value} onChange={_.handleData.bind(_)}/>
                                                    case 3:
                                                        return <input class='property-input-target' type='number' data_type={e.type} name={e.name} placeholder={e.name} value={value} onChange={_.handleData.bind(_)}/>
                                                }
                                            })()
                                        }
                                    </div>
                            ) : []
                    }
                </div>
                <button target={_.state.named_id} class='button-danger' onClick={_.removeInfo.bind(_)}>
                    удалить {_.state.named_id}
                </button>
                {
                    (() => {
                        if(_.hasChanges()){
                            return <button class='button-statement' onClick={_.save.bind(_)}>
                                Сохранить изменения
                            </button>
                        }
                    })()
                }
            </div>
        }
    });
}, (data, emitter, elements) => {
    "use strict";

    const message = (msg, level = 'tip', percent) => {
        emitter.emit('DISPLAY_MESSAGE_UPDATE', msg, level, percent);
    }, render = p => {
        let dump = new Map();

        for(let i = 0, leng = p.types.length;i < leng;i++)
            dump.set(p.types[i].id, p.types[i]);

        p.types = dump;

        for(let i = 0, leng = p.items.length;i < leng;i++) {
            p.items[i].data = p.items[i].data != null ? new Map(p.items[i].data) : new Map();
        }

        emitter.emit('LIST_UPDATE_ACTION', p);
    }, update = async e => {
        try {
            render(
                await window.api.item.get({
                    contains: {
                        operator: "or",
                        data: [
                            {
                                name: 'display',
                                value: elements.search.value
                            },
                            {
                                name: 'description',
                                value: elements.search.value
                            },
                            {
                                name: 'named_id',
                                value: elements.search.value
                            }
                        ]
                    }
                })
            );

            message("Готово!", "tip")
        } catch (err) {
            message(err.message, "error")
        }
    };

    elements.search.oninput = e => {
        message("Поиск по запросу...", "tip");

        update();
    }

    emitter.addEmitter("UPDATE_FILTERED_LIST", e => update()) && update();

    actions.children[0].onclick = () => {
        bodycont.setAttribute('action', bodycont.getAttribute('action') === '0' ? 1 : 0)
    }

    ReactDOM.render(React.createElement(data.get("TypeInfo"), null), elements.type_properties);
    ReactDOM.render(React.createElement(data.get("Message"), null), elements.infocont);
    ReactDOM.render(React.createElement(data.get("List"), null), elements.serchresultstarget);
    ReactDOM.render(React.createElement(data.get("Info"), null), elements.properties);
}, (data, emitter) => {
    console.log("Leave items page")
});