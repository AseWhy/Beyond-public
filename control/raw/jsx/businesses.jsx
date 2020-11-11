window.addEntryPage("businesses", window.config.permissions.BUSINESSES, (exports, emitter) => {
    function clone(obj){
        return JSON.parse(JSON.stringify(obj));
    }

    // Ui variables
    exports.set('AddRow', class AddRow extends React.Component {
        constructor(props){
            super(props);

            this.state = {
                handling: false,
                display: ""
            };
        }

        handleInputChange(e){
            this.setState({[e.target.name]: e.target.value});
        }

        async handleAction(e){
            this.setState({handling: true});

            
            if(this.state.display.trim() === '') {
                emitter.emit('DISPLAY_MESSAGE_UPDATE', '"Наименование" не может быть пустым', 'error');

                return;
            }

            await window.api.businesses.add({display: this.state.display});
            
            this.setState({display: ""})

            this.setState({handling: false});

            emitter.emit('UPDATE_LIST_ACTION');
        }

        render(){
            return <td class="add-cont" disable={this.state.handling.toString()}>
                <input 
                    type="text"
                    name="display"
                    size={this.state.display.length != 0 ? this.state.display.length : 8}
                    value={this.state.display}
                    placeholder="Наименование"
                    class="add-inputs-name"
                    onChange={e => this.handleInputChange(e)}
                />
                <input
                    type='submit'
                    name='submit'
                    value='добавить'
                    className='add-inputs-submit'
                    onClick={e => this.handleAction(e)}
                />
            </td>
        }
    })
    
    exports.set('PriceData', class PriceData extends React.Component {
        constructor(props){
            super(props);

            this.state = {
                addtype: null
            }
        }

        setAddType(e){
            this.setState({addtype: e.target.value});
        }

        addField(e, addvalues){
            if(typeof this.props.onAddPrice === 'function') {
                this.props.onAddPrice(e, this.state.addtype || addvalues[0]);

                this.setState({addtype: null});
            }
        }

        render(){
            if(typeof this.props.price === 'number')
                this.props.price = {[this.props.default]: this.props.price};

            let buffer = null
              , _ = this
              , defaults = _.props.defaults ?? {
                  bans: 'Баны',
                  backpack: "Стройматериалы"
              }
              , addvalues = Object.keys(defaults).filter(e => _.props.price[e] == null);

            return <div class="income-cont">
                {
                    (() => {
                        if(_.props.price != null && (buffer = Object.entries(_.props.price)).length != 0) {
                            return buffer.map(e => 
                                <div class="price-row-data">
                                    <div class="price-name-data">{defaults[e[0]]}</div>
                                    <input type="text" class='price-input-data' name={e[0]} value={e[1]} onChange={_.props.onPriceEnter}/>
                                    <button class="price-rem-data" name={e[0]} onMouseDown={this.props.onRemPrice}>✕</button>
                                </div>
                            )
                        }
                    })()
                }

                {
                    (() => {
                        if(addvalues.length > 0) {
                            return <div class="add-price-cont">
                                <select class='add-price-select' onChange={_.setAddType.bind(_)} value={_.state.addtype || addvalues[0]}>
                                    {
                                        addvalues.map((e, i) => 
                                            <option value={e}>{defaults[e]}</option>
                                        )
                                    }
                                </select>
            
                                <button class="button-statement" onClick={e => _.addField(e, addvalues)}>
                                    Добавить
                                </button>
                            </div>
                        }
                    })()
                }
            </div>
        }
    })

    exports.set('SelectionArea', class SelectionArea extends React.Component {
        constructor(props){
            super(props)

            this.state = {
                waiting: false,
                businesses: new Array(),
                current: 0,
                search: ''
            }
        }

        async componentDidMount(){
            const _ = emitter.addEmitter("UPDATE_LIST_ACTION", (stats) => {
                _.search();
            }) && this;

            _.search();
        }

        async search(){
            this.setState({waiting: true});

            emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Поиск по запросу...', 'tip');

            this.setState({businesses: (await api.businesses.get({
                contains: {
                    operator: "or",
                    data: [
                        {
                            name: 'display',
                            value: this.state.search
                        },
                        {
                            name: 'id',
                            value: this.state.search
                        },
                    ]
                }
            })).businesses});

            emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Успешно!', 'tip');
            
            this.setState({waiting: false});
        }

        showInfo(e){
            const index = parseInt(e.target.getAttribute('index'));

            emitter.emit('UPDATE_SELECTION', this.state.businesses[index]);

            this.setState({current: index})
        }

        setSearch(e){
            this.state.search = e.target.value;

            this.search();
        }

        render(){
            const _ = this;

            return <div class="buisneses-area-selection" disable={_.state.waiting}>
                <input type="text" name="" class='search' placeholder='Поиск...' onChange={_.setSearch.bind(_)}/>

                <ul class='auto-list'>
                    {
                        (function (){
                            if(_.state.businesses.length > 0){
                                return _.state.businesses.map((e, i) => 
                                    <li class={"businesses-row-auto" + (_.state.current == i ? ' selected' : '')} index={i} onClick={_.showInfo.bind(_)}>
                                        <td class='table-unit'>{e.id}</td>
                                        <td class='table-unit'>{e.type == 0 ? 'Работа' : 'Бизнес'}</td>
                                        <td class='table-unit'>{e.display}</td>
                                    </li>
                                )
                            } else {
                                return <div class="empty-cont">
                                    Тут определенно пусто...
                                </div>
                            }
                        })()
                    }
                </ul>

                {React.createElement(exports.get('AddRow'), null)}
            </div>
        }
    })

    exports.set('PropertiesArea', class PropertiesArea extends React.Component {
        constructor(props){
            super(props)

            this.update_needs = new Array();

            this.state = { comp: null }

            this.state_heap = { comp: null }

            this.inited = false;
        }

        async rmComp(){
            try {
                if (confirm("Удалить " + this.state.comp.display + "?")) {
                    await api.businesses.remove(this.state.comp.id);

                    emitter.emit('UPDATE_LIST_ACTION');

                    emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Успешно!', 'tip');
                }
            } catch (e) {
                console.error(e);

                emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Обишка при удалении.', 'error');
            }
        }

        async svComp(){
            try {
                if(this.hasChanges()){
                    await api.businesses.edit(this.state.comp.id, {...this.state.comp, id: undefined});

                    this.state_heap = clone(this.state);

                    this.forceUpdate();

                    emitter.emit('UPDATE_LIST_ACTION');

                    emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Успешно сохранено!', 'tip');
                }
            } catch (e) {
                console.error(e);

                emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Обишка при сохранении.', 'error');
            }
        }

        hasChanges(){
            return JSON.stringify(this.state.comp) != JSON.stringify(this.state_heap.comp);
        }

        componentDidMount(){
            const _ = emitter.addEmitter("UPDATE_SELECTION", async comp => {
                if(_.inited)
                    await _.svComp();

                _.state_heap = {
                    comp: {
                        id: comp.id,
                        type: comp.type ?? 0,
                        display: comp.display ?? '',
                        description: comp.description ?? '',
                        condition_data: comp.condition_data ?? 'true',
                        data: comp.data != null ? { ...comp.data } : {}
                    }
                }

                _.setState(clone(_.state_heap))
                
                _.inited = true;
            }) && this;
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

        editComp(e){
            if(e.target.tagName == 'SELECT'){
                this.state.comp[e.target.name] = parseInt(e.target.value)
            } else {
                this.state.comp[e.target.name] = e.target.value
            }

            this.setState({comp: this.state.comp});
        }

        editData(e){
            if(e.target.tagName == 'SELECT' || e.target.tagName == 'INIPUT' || e.target.type == 'number'){
                this.state.comp.data[e.target.name] = parseInt(e.target.value)
            } else {
                try {
                    this.state.comp.data[e.target.name] = JSON.parse(e.target.value)
                } catch (err) {
                    emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Ошибка при парсинге вашего JSON в поле: ' + e.target.name, 'error');

                    this.state.comp.data[e.target.name] = e.target.value;
                }
            }

            this.setState({comp: this.state.comp});
        }

        editPrice(type, target, e, data){
            switch(type){
                case "edit":
                    if(typeof this.state.comp.data[target] === 'object'){
                        this.state.comp.data[target][e.target.name] = e.target.value;
                    } else {
                        this.state.comp.data[target] = {[e.target.name]: e.target.value};
                    }
                break;
                case "rem":
                    if(typeof this.state.comp.data[target] === 'object'){
                        delete this.state.comp.data[target][e.target.name];
                    } else {
                        this.state.comp.data[target] = {};
                    }
                break;
                case "add":
                    if(typeof this.state.comp.data[target] === 'object'){
                        this.state.comp.data[target][data] = 0;
                    } else {
                        this.state.comp.data[target] = {[data]: 0};
                    }
                break;
            }

            this.setState({comp: this.state.comp})
        }

        render(){
            const _ = this;

            return <div class="buisneses-area-editor">
                {React.createElement(exports.get('Message'), null)}

                {
                    (() => {
                        if(_.state.comp != null) {
                            return [
                                <div class='auto-label'>
                                    Тип

                                    <select name="type" onChange={_.editComp.bind(_)} class='auto-select' value={_.state.comp.type}>
                                        <option value="0">Работа</option>
                                        <option value="1">Бизнес</option>
                                    </select>
                                </div>,

                                <div class='auto-label'>
                                    Отображаемое имя

                                    <textarea ref={e => _.update_needs.push(e)} name='display' maxLength="255" class="auto_message" value={_.state.comp.display} onChange={_.editComp.bind(_)}>
                
                                    </textarea>
                                </div>,

                                <div class='auto-label'>
                                    Описание

                                    <textarea ref={e => _.update_needs.push(e)} name='description' class="auto_message" value={_.state.comp.description} onChange={_.editComp.bind(_)}>
                
                                    </textarea>
                                </div>,

                                <div class='auto-label'>
                                    Условие присутствия

                                    <textarea ref={e => _.update_needs.push(e)} name='condition_data' class="auto_message" value={_.state.comp.condition_data} onChange={_.editComp.bind(_)}>

                                    </textarea>
                                </div>,

                                ...(() => {
                                    switch(_.state.comp.type){
                                        case 0:
                                            return [
                                                <div class='auto-label'>
                                                    Тип

                                                    <select name="type" onChange={_.editData.bind(_)} class='auto-select' value={_.state.comp.data.type}>
                                                        <option value="0">Кликер</option>
                                                        <option value="1">Долгосрочная</option>
                                                    </select>
                                                </div>,
                                                (() => {
                                                    if(this.state.comp.data.type === 1)
                                                        return <div class='auto-label'>
                                                            Продолжителньость (мс)
                    
                                                            <input 
                                                                type="number" 
                                                                title='Время работы.' 
                                                                min='0' max={Number.MAX_SAFE_INTEGER} 
                                                                class="auto-input" 
                                                                name="duration" 
                                                                value={_.state.comp.data.duration ?? ''} 
                                                                onChange={_.editData.bind(_)} 
                                                            />
                                                        </div>
                                                })(),
                                                <div class='auto-label'>
                                                    Стоимость

                                                    {
                                                        React.createElement(exports.get('PriceData'), {
                                                            onPriceEnter: _.editPrice.bind(_, 'edit', 'cost'),
                                                            onRemPrice: _.editPrice.bind(_, 'rem', 'cost'),
                                                            onAddPrice: _.editPrice.bind(_, 'add', 'cost'),
                                                            price: _.state.comp.data.cost ?? {},
                                                            default: 'endurance',
                                                            defaults: {endurance: 'Выносливость'}
                                                        })
                                                    }
                                                </div>,
                                                <div class='auto-label'>
                                                    Доходность

                                                    {
                                                        React.createElement(exports.get('PriceData'), {
                                                            onPriceEnter: _.editPrice.bind(_, 'edit', 'income'),
                                                            onRemPrice: _.editPrice.bind(_, 'rem', 'income'),
                                                            onAddPrice: _.editPrice.bind(_, 'add', 'income'),
                                                            price: _.state.comp.data.income ?? {},
                                                            default: 'bans'
                                                        })
                                                    }
                                                </div>,

                                                <div class='auto-label'>
                                                    Прокачивает статы

                                                    {
                                                        React.createElement(exports.get('PriceData'), {
                                                            onPriceEnter: _.editPrice.bind(_, 'edit', 'stats'),
                                                            onRemPrice: _.editPrice.bind(_, 'rem', 'stats'),
                                                            onAddPrice: _.editPrice.bind(_, 'add', 'stats'),
                                                            price: _.state.comp.data.stats ?? {},
                                                            default: 'strength',
                                                            defaults: {
                                                                strength: 'Сила',
                                                                aglity: 'Ловкость',
                                                                intelligence: 'Интеллект'
                                                            }
                                                        })
                                                    }
                                                </div>,

                                                <div class='auto-label'>
                                                    Прокачивает умения

                                                    {
                                                        React.createElement(exports.get('PriceData'), {
                                                            onPriceEnter: _.editPrice.bind(_, 'edit', 'skills'),
                                                            onRemPrice: _.editPrice.bind(_, 'rem', 'skills'),
                                                            onAddPrice: _.editPrice.bind(_, 'add', 'skills'),
                                                            price: _.state.comp.data.skills ?? {},
                                                            default: 'strength',
                                                            defaults: {
                                                                craft: 'Крафт',
                                                                trade: 'Торговля',
                                                                battle: 'Сражение',
                                                                command: 'Командование',
                                                                control: 'Управление',
                                                            }
                                                        })
                                                    }
                                                </div>
                                            ]
                                        case 1:
                                            return [
                                                <div class='auto-label'>
                                                    Стоимость

                                                    <input 
                                                        type="number" 
                                                        title='Сумма необходимая для приобретения бизнеса.' 
                                                        min='0' max={Number.MAX_SAFE_INTEGER} 
                                                        class="auto-input" 
                                                        name="cost" 
                                                        value={_.state.comp.data.cost ?? ''}
                                                        onChange={_.editData.bind(_)} 
                                                    />
                                                </div>,

                                                <div class='auto-label'>
                                                    Доход в день

                                                    {
                                                        React.createElement(exports.get('PriceData'), {
                                                            onPriceEnter: _.editPrice.bind(_, 'edit', 'income'),
                                                            onRemPrice: _.editPrice.bind(_, 'rem', 'income'),
                                                            onAddPrice: _.editPrice.bind(_, 'add', 'income'),
                                                            price: _.state.comp.data.income ?? {},
                                                            default: 'bans',
                                                            defaults: {
                                                                bans: 'Баны'
                                                            }
                                                        })
                                                    }
                                                </div>
                                            ]
                                        default: return [];
                                    }
                                })(),
                                <button class='button-danger' onClick={_.rmComp.bind(_)}>
                                    Удалить {_.state.comp.display}
                                </button>,
                                (() => {
                                    if(_.hasChanges())
                                        return <button class='button-statement' onClick={_.svComp.bind(_)}>
                                            Сохранить {_.state.comp.display}
                                        </button>
                                })()
                            ]
                        } else
                            return <div>
                                Кажется ничего не выбрано, выберете бизнес или работу (<b>слева</b>) для редактирования состояния элемента.
                            </div>
                    })()
                }
            </div>
        }
    })
}, (data, emitter, elements) => {
    "use strict";

    ReactDOM.render(React.createElement(data.get("SelectionArea"), null), elements.selectionarea);
    ReactDOM.render(React.createElement(data.get("PropertiesArea"), null), elements.propertiesarea);
}, (data, emitter) => {
    console.log("Leave businesses page")
});