window.addEntryPage("characters", window.config.permissions.CHARACTERS, (exports, emitter) => {
    const CommandNumberPattern  = /^[-+]?([0-9]*\.[0-9]+|[0-9]+)$/m;

    function clone(obj){
        return JSON.parse(JSON.stringify(obj));
    }

    exports.set('SelectionArea', class SelectionArea extends React.Component {
        constructor(props){
            super(props)

            this.state = {
                waiting: true,
                characters: new Array(),
                current: 0,
                search: ''
            }
        }

        async componentDidMount(){
            const _ = emitter.addEmitter("UPDATE_LIST_ACTION", (stats) => {
                _.search();
            }) && this;

            await _.search();

            const target = window.location.hash.split('~');

            if(target[1] != null) {
                const character = this.getCharacterById(target[1]);

                if(target != null){
                    this.setState({waiting: false, current: character.index});

                    emitter.emit('UPDATE_SELECTION', this.state.characters[character.index]);
                } else {
                    emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Не удалось найти персонажа с id ' + target[1], 'error');
                }
            } else
                this.setState({waiting: false});
        }

        async search(){
            this.setState({waiting: true});

            emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Поиск по запросу...', 'tip');

            this.setState({characters: (await api.characters.get({
                contains: {
                    operator: "or",
                    data: [
                        {
                            name: 'id',
                            value: this.state.search
                        },
                        {
                            name: 'owner',
                            value: this.state.search
                        },
                        {
                            name: 'name',
                            value: this.state.search
                        },
                        {
                            name: 'map',
                            value: this.state.search
                        },
                    ]
                }
            })).characters});

            emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Успешно!', 'tip');
            
            this.setState({waiting: false});
        }

        getCharacterById(id){
            for(let i = 0, leng = this.state.characters.length; i < leng; i++){
                if(this.state.characters[i].id == id){
                    return {
                        character: this.state.characters[i],
                        index: i
                    };
                }
            }
        }

        showInfo(e){
            const index = parseInt(e.target.getAttribute('index'));

            emitter.emit('UPDATE_SELECTION', this.state.characters[index]);

            this.setState({current: index})
        }

        setSearch(e){
            this.state.search = e.target.value;

            this.search();
        }

        render(){
            const _ = this;

            return <div class="character-area-selection" disable={_.state.waiting}>
                <input type="text" name="" class='search' placeholder='Поиск...' onChange={_.setSearch.bind(_)}/>

                <ul class='auto-list'>
                    {
                        (function (){
                            if(_.state.characters.length > 0){
                                return _.state.characters.map((e, i) => 
                                    <li class={"characters-row-auto" + (_.state.current == i ? ' selected' : '')} index={i} onClick={_.showInfo.bind(_)}>
                                        <td class='table-unit'>{e.id}</td>
                                        <td class='table-unit'>{e.name}</td>
                                        <td class='table-unit'>{e.sex === 'Male' ? 'Мужчина' : 'Женщина'}</td>
                                        <td class='table-unit'>{e.health}</td>
                                        <td class='table-unit'>{e.endurance}</td>
                                    </li>
                                )
                            } else {
                                return <li class="empty-cont">
                                    Тут определенно пусто...
                                </li>
                            }
                        })()
                    }
                </ul>
            </div>
        }
    });

    exports.set('PropertiesArea', class PropertiesArea extends React.Component {
        constructor(props){
            super(props)

            this.update_needs = new Array();

            this.state = { character: null }

            this.state_heap = { character: null }

            this.inited = false;
        }

        async svComp(){
            try {
                if(this.hasChanges()){
                    await api.characters.edit(this.state.character.id, { ...this.state.character });

                    this.state_heap = clone(this.state);

                    this.forceUpdate();

                    emitter.emit('UPDATE_LIST_ACTION');

                    emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Успешно сохранено!', 'tip');
                }
            } catch (e) {
                console.error(e);

                emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Ошибка при сохранении.', 'error');
            }
        }

        hasChanges(){
            return JSON.stringify(this.state.character) != JSON.stringify(this.state_heap.character);
        }

        componentDidMount(){
            const _ = emitter.addEmitter("UPDATE_SELECTION", async character => {
                if(_.inited)
                    await _.svComp();

                _.state_heap = {
                    character: clone(character)
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

        editInventory(e){
            switch(e.target.name){
                case "bans":
                    this.state.character.inventory.bans = BigInt(e.target.value);
                break;
                case "backpack":
                    this.state.character.inventory.backpack = parseInt(e.target.value);
                break;
            }

            this.setState({character: this.state.character});
        }

        editExperience(e){
            const buffer = parseInt(e.target.value);

            if(!isNaN(buffer) || e.target.value === '') {
                this.state.character.experience[e.target.getAttribute('subtype')][e.target.name] = buffer;

                this.setState({character: this.state.character});
            } else
                emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Значение опыта для ' + e.target.name + " должно быть числом", 'error');
        }

        editCharacter(e){
            switch(e.target.name){
                case 'map':
                    this.state.character[e.target.name] = e.target.value.split('/');
                break;
                case 'health':
                    this.state.character[e.target.name] = parseInt(e.target.value)
                break;
                case 'endurance':
                    this.state.character[e.target.name] = parseInt(e.target.value)
                break;
                case 'name':
                    this.state.character[e.target.name] = e.target.value;
                break;
            }

            this.setState({character: this.state.character});
        }

        editData(e){
            if(e.target.name == 'edit') {
                this.state.character.data[e.target.value] = utils.renameProperty(this.state.character.data, e.target.getAttribute("old"), e.target.value);
            } else {
                switch(e.target.value){
                    case "true":
                        this.state.character.data[e.target.name] = true;
                    break;
                    case "false":
                        this.state.character.data[e.target.name] = false;
                    break;
                    case "null":
                        this.state.character.data[e.target.name] = null;
                    break;
                    default:
                        if(CommandNumberPattern.test(e.target.value)){
                            this.state.character.data[e.target.name] = parseFloat(e.target.value);
                        } else {
                            this.state.character.data[e.target.name] = e.target.value;
                        }
                    break;
                }
            }

            this.setState({character: this.state.character});
        }

        addData(e){
            this.state.character.data[''] = '';

            this.setState({character: this.state.character});
        }

        rmData(e){
            delete this.state.character.data[e.target.getAttribute('target')];

            this.setState({character: this.state.character});
        }

        async removeCharacter(){
            if(window.confirm('Вы уверены что хотите удалить ' + this.state.character.name)){
                await api.characters.remove(this.state.character.id);

                this.setState({character: null})

                emitter.emit('UPDATE_LIST_ACTION');

                emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Успешно удален!', 'tip');
            }
        }

        goToUser(){
            window.location.hash = 'users~' + this.state.character.owner;

            window.loadPage('users');
        }

        render(){
            const _ = this;

            return <div class="character-area-editor">
                {React.createElement(exports.get('Message'), null)}

                {
                    (() => {
                        if(_.state.character != null){
                            return [
                                <div class='auto-label' disable='true'>
                                    Id персонажа

                                    <input 
                                        type="number" 
                                        title='Id персонажа' 
                                        min='0' max={Number.MAX_SAFE_INTEGER} 
                                        class="auto-input" 
                                        disabled
                                        value={_.state.character.id ?? 0} 
                                    />
                                </div>,
                                <div class='auto-label'>
                                    Имя персонажа

                                    <textarea ref={e => _.update_needs.push(e)} title='Имя персонажа' name='name' class="auto_message" value={_.state.character.name ?? ''} placeholder='Пустота...' onChange={_.editCharacter.bind(_)}>

                                    </textarea>
                                </div>,
                                <div class='auto-label'>
                                    Текущее местоположение

                                    <textarea ref={e => _.update_needs.push(e)} title='Текущее местоположение' name='map' class="auto_message" value={_.state.character.map.join('/') ?? ''} placeholder='В бесконечном пространстве вселенной...' onChange={_.editCharacter.bind(_)}>

                                    </textarea>

                                    <img class='map-tip' src={window.api.getPathToApiResource('map', {province: _.state.character.map[2]})}/>
                                </div>,
                                <div class='auto-label'>
                                    Здоровье персонажа

                                    <input 
                                        type="number" 
                                        title='Id персонажа' 
                                        min='0' max={Number.MAX_SAFE_INTEGER} 
                                        class="auto-input" 
                                        name="health"
                                        value={_.state.character.health ?? 0} 
                                        onChange={_.editCharacter.bind(_)} 
                                    />
                                </div>,
                                <div class='auto-label'>
                                    Выносливость персонажа

                                    <input 
                                        type="number" 
                                        title='Id персонажа' 
                                        min='0' max={Number.MAX_SAFE_INTEGER} 
                                        class="auto-input" 
                                        name="endurance"
                                        value={_.state.character.endurance ?? 0} 
                                        onChange={_.editCharacter.bind(_)} 
                                    />
                                </div>,(() => {
                                    if(_.state.character.inventory != null){
                                        return <div class='includes-base-cont'>
                                            <div class='includes-header'>Инвентарь персонажа</div>
        
                                            <div class='auto-label'>
                                                Баны персонажа
        
                                                <input 
                                                    type="number"
                                                    title='Баны персонажа'
                                                    min='0'
                                                    class="auto-input"
                                                    name="bans"
                                                    value={_.state.character.inventory.bans.toString() ?? 0} 
                                                    onChange={_.editInventory.bind(_)} 
                                                />
                                            </div>
                                            <div class='auto-label'>
                                                Стройматериалы персонажа
        
                                                <input 
                                                    type="number"
                                                    title='Стройматериалы персонажа'
                                                    min='0'
                                                    class="auto-input"
                                                    name="backpack"
                                                    value={_.state.character.inventory.backpack ?? 0} 
                                                    onChange={_.editInventory.bind(_)} 
                                                />
                                            </div>
                                        </div>
                                    }
                                })(),
                                <div class='includes-base-cont'>
                                    <div class='includes-header'>Данные персонажа</div>

                                    {
                                        (() => {
                                            if(_.state.character.data != null){
                                                const data = Object.keys(_.state.character.data);

                                                if(data.length > 0)
                                                    return data.map(e => {
                                                        if(typeof _.state.character.data[e] != 'object')
                                                            return <div class='auto-label'>
                                                                <input type="text" name="edit" class='label-editor-common' old={e} value={e} placeholder='Дайте название полю' onChange={_.editData.bind(_)}/>
                
                                                                <textarea ref={e => _.update_needs.push(e)} name={e} class="auto_message" value={_.state.character.data[e] ?? ''} placeholder='null' onChange={_.editData.bind(_)}>
                
                                                                </textarea>

                                                                <button class='button-danger' target={e} onClick={_.rmData.bind(_)}>
                                                                    Удалить {e}
                                                                </button>
                                                            </div>
                                                        else
                                                            return <div class='auto-label'>
                                                                <input type="text" name="edit" class='label-editor-common' old={e} value={e} placeholder='Дайте название полю' onChange={_.editData.bind(_)}/>
                
                                                                <textarea disable='true' ref={e => _.update_needs.push(e)} name={e} class="auto_message" value={JSON.stringify(_.state.character.data[e], null, 4) ?? ''} placeholder='null'>
                
                                                                </textarea>

                                                                <button class='button-danger' target={e} onClick={_.rmData.bind(_)}>
                                                                    Удалить {e}
                                                                </button>
                                                            </div>
                                                    })
                                                else
                                                    return <div class='includes-no-data'>
                                                        Кажется этот персонаж не имеет данных
                                                    </div>
                                            } else {
                                                return <div class='includes-no-data'>
                                                    Кажется этот персонаж не имеет данных
                                                </div>
                                            }
                                        })()
                                    }

                                    <button class='button-statement' onClick={_.addData.bind(_)}>
                                        Добавить данные
                                    </button>
                                </div>,
                                <div class='includes-base-cont'>
                                    <div class='includes-header'>Данные опыта</div>

                                    {
                                        (() => {
                                            if(_.state.character.experience != null){
                                                const experience = Object.entries(_.state.character.experience);

                                                if(experience.length > 0)
                                                    return experience.map(e => 
                                                        [
                                                            <div class="sub-header">{e[0]}</div>,
                                                            <div class="sub-section">
                                                                {
                                                                    Object.keys(e[1]).map(d => 
                                                                        <div class='auto-label'>
                                                                            {d}
            
                                                                            <input type="number" class='auto-number' value={_.state.character.experience[e[0]][d] ?? '0'} subtype={e[0]} name={d} onChange={_.editExperience.bind(_)}/>
                                                                        </div>    
                                                                    )
                                                                }
                                                            </div>
                                                        ]
                                                    )
                                                else
                                                    return <div class='includes-no-data'>
                                                        Кажется этот персонаж не опытен ни в чем
                                                    </div>
                                            } else {
                                                return <div class='includes-no-data'>
                                                    Кажется этот персонаж не опытен ни в чем
                                                </div>
                                            }
                                        })()
                                    }
                                </div>,
                                (() => {
                                    if(_.hasChanges())
                                        return <button class='button-statement' onClick={_.svComp.bind(_)}>
                                            Сохранить {_.state.character.name + "#" + _.state.character.id}
                                        </button>
                                })(),
                                (() => {
                                    return <button class='button-statement' onClick={_.goToUser.bind(_)}>
                                        Перейти к владельцу персонажа
                                    </button>
                                })(),
                                <button class='button-danger' onClick={_.removeCharacter.bind(_)}>
                                    Удалить {_.state.character.name}
                                </button>
                            ]
                        }
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
    console.log("Leave characters page")
});