window.addEntryPage("users", (exports, emitter) => {
    const CommandNumberPattern  = /^[-+]?([0-9]*\.[0-9]+|[0-9]+)$/m;

    function clone(obj){
        return JSON.parse(JSON.stringify(obj));
    }

    exports.set('SelectionArea', class SelectionArea extends React.Component {
        constructor(props){
            super(props)

            this.state = {
                waiting: false,
                users: new Array(),
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

            this.setState({users: (await api.users.get({
                contains: {
                    operator: "or",
                    data: [
                        {
                            name: 'id',
                            value: this.state.search
                        },
                        {
                            name: 'scenario',
                            value: this.state.search
                        },
                    ]
                }
            })).users});

            emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Успешно!', 'tip');
            
            this.setState({waiting: false});
        }

        showInfo(e){
            const index = parseInt(e.target.getAttribute('index'));

            emitter.emit('UPDATE_SELECTION', this.state.users[index]);

            this.setState({current: index})
        }

        setSearch(e){
            this.state.search = e.target.value;

            this.search();
        }

        render(){
            const _ = this;

            return <div class="users-area-selection" disable={_.state.waiting}>
                <input type="text" name="" class='search' placeholder='Поиск...' onChange={_.setSearch.bind(_)}/>

                <ul class='auto-list'>
                    {
                        (function (){
                            if(_.state.users.length > 0){
                                return _.state.users.map((e, i) => 
                                    <li class={"users-row-auto" + (_.state.current == i ? ' selected' : '')} index={i} onClick={_.showInfo.bind(_)}>
                                        <td class='table-unit'>{e.id}</td>
                                        <td class='table-unit'>{e.character != null ? e.character.name : 'Нет персонажа'}</td>
                                        <td class='table-unit'>{e.banned ? 'Забанен' : 'Законопослушный'}</td>
                                        <td class='table-unit'>{e.registered ? 'Игрок' : 'Гость'}</td>
                                        <td class='table-unit'>{e.notify ? 'Уведомления разрешил' : 'Уведомления запретил'}</td>
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

            this.state = { user: null }

            this.state_heap = { user: null }

            this.inited = false;
        }

        async svComp(){
            try {
                if(this.hasChanges()){
                    await api.users.edit(this.state.user.id, { ...this.state.user });

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
            if(
                this.state.user.name != this.state_heap.user.name ||
                this.state.user.scenario != this.state_heap.user.scenario ||
                this.state.user.scenario_state != this.state_heap.user.scenario_state ||
                this.state.user.registered != this.state_heap.user.registered ||
                this.state.user.banned != this.state_heap.user.banned ||
                this.state.user.notify != this.state_heap.user.notify
            )
                return true;
            
            for(let key in this.state.user.scenario_data)
                if (this.state_heap.user.scenario_data[key] == null || this.state_heap.user.scenario_data[key] != this.state.user.scenario_data[key])
                    return true;

            for(let key in this.state_heap.user.scenario_data)
                if (this.state.user.scenario_data[key] == null || this.state_heap.user.scenario_data[key] != this.state.user.scenario_data[key])
                    return true;

            return false;
        }

        componentDidMount(){
            const _ = emitter.addEmitter("UPDATE_SELECTION", async user => {
                if(_.inited)
                    await _.svComp();

                _.state_heap = {
                    user: {
                        id: user.id,
                        name: user.name ?? '',
                        scenario: user.scenario ?? '',
                        scenario_state: user.scenario_state ?? 0,
                        registered: user.registered === true,
                        banned: user.banned === true,
                        notify: user.notify === true,
                        created: new Date(user.created),
                        updated: new Date(user.updated),
                        character: user.character != null ? { ...user.character } : {},
                        scenario_data: user.scenario_data != null ? { ...user.scenario_data } : {}
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

        editUser(e){
            if(e.target.tagName == 'SELECT'){
                this.state.user[e.target.name] = parseInt(e.target.value)
            } else if(e.target.tagName == 'INPUT' && e.target.type == 'checkbox') {
                this.state.user[e.target.name] = e.target.checked
            } else {
                this.state.user[e.target.name] = e.target.value
            }

            this.setState({user: this.state.user});
        }

        editData(e){
            if(e.target.name == 'edit') {
                this.state.user.scenario_data[e.target.value] = this.state.user.scenario_data[e.target.getAttribute("old")];

                delete this.state.user.scenario_data[e.target.getAttribute("old")];

                this.setState({user: this.state.user});

                return;
            }

            if(e.target.value === 'true'){
                this.state.user.scenario_data[e.target.name] = true;
            } else if(e.target.value === 'false'){
                this.state.user.scenario_data[e.target.name] = false;
            } else if(e.target.value === 'null'){
                this.state.user.scenario_data[e.target.name] = null;
            } else if(CommandNumberPattern.test(e.target.value)){
                this.state.user.scenario_data[e.target.name] = parseFloat(e.target.value);
            } else {
                this.state.user.scenario_data[e.target.name] = e.target.value;
            }

            this.setState({user: this.state.user});
        }

        addData(e){
            this.state.user.scenario_data[Date.now().toString()] = '';

            this.setState({user: this.state.user});
        }

        rmData(e){
            delete this.state.user.scenario_data[e.target.getAttribute('target')];

            this.setState({user: this.state.user});
        }

        render(){
            const _ = this;

            return <div class="user-area-editor">
                {React.createElement(exports.get('Message'), null)}

                {
                    (() => {
                        if(_.state.user != null){
                            return [
                                <div class='auto-label' disable='true'>
                                    Id пользователя

                                    <input 
                                        type="number" 
                                        title='Id пользователя' 
                                        min='0' max={Number.MAX_SAFE_INTEGER} 
                                        class="auto-input" 
                                        disabled
                                        value={_.state.user.id ?? ''} 
                                    />
                                </div>,
                                <div class='auto-label'>
                                    Исполняемый сценарий

                                    <textarea ref={e => _.update_needs.push(e)} title='Исполняемый сценарий на данный момент' name='scenario' class="auto_message" value={_.state.user.scenario ?? ''} placeholder='null' onChange={_.editUser.bind(_)}>

                                    </textarea>
                                </div>,
                                <div class='auto-label'>
                                    Стадия выполнения сценария

                                    <input 
                                        type="number" 
                                        title='Стадия выполнения сценария' 
                                        min='0' max={Number.MAX_SAFE_INTEGER} 
                                        class="auto-input" 
                                        name="scenario_state"
                                        value={_.state.user.scenario_state ?? ''} 
                                        onChange={_.editUser.bind(_)} 
                                    />
                                </div>,
                                <div class='includes-base-cont'>
                                    <div class='includes-header'>Данные сценария</div>

                                    {
                                        (() => {
                                            const data = Object.keys(_.state.user.scenario_data);

                                            if(data.length > 0)
                                                return data.map(e => (
                                                    <div class='auto-label'>
                                                        <input type="text" name="edit" class='label-editor-common' old={e} value={e} onChange={_.editData.bind(_)}/>
        
                                                        <textarea ref={e => _.update_needs.push(e)} name={e} class="auto_message" value={_.state.user.scenario_data[e] ?? ''} placeholder='null' onChange={_.editData.bind(_)}>
        
                                                        </textarea>

                                                        <button class='button-danger' target={e} onClick={_.rmData.bind(_)}>
                                                            Удалить {e}
                                                        </button>
                                                    </div>
                                                ))
                                            else
                                                return <div class='includes-no-data'>
                                                    Кажется у текущего исполняемого сценария пользователя нет данных...
                                                </div>
                                        })()
                                    }

                                    <button class='button-statement' onClick={_.addData.bind(_)}>
                                        Добавить данные
                                    </button>
                                </div>,
                                <div class='checkbox-common-cont'>
                                    <input type="checkbox" name="registered" checked={_.state.user.registered} onChange={_.editUser.bind(_)} id="properties-registered"/>
                                    <label for="properties-registered" class='auto-checkbox'></label>
                                        Статус регистрации
                                </div>,
                                <div class='checkbox-common-cont'>
                                    <input type="checkbox" name="notify" checked={_.state.user.notify} onChange={_.editUser.bind(_)} id="properties-notify"/>
                                    <label for="properties-notify" class='auto-checkbox'></label>
                                        Статус уведомлений
                                </div>,
                                <div class='checkbox-common-cont'>
                                    <input type="checkbox" name="banned" checked={_.state.user.banned} onChange={_.editUser.bind(_)} id="properties-banned"/>
                                    <label for="properties-banned" class='auto-checkbox'></label>
                                        Статус бана
                                </div>,
                                (() => {
                                    if(_.hasChanges())
                                        return <button class='button-statement' onClick={_.svComp.bind(_)}>
                                            Сохранить {_.state.user.id}
                                        </button>
                                })()
                            ]
                        } else {
                            return <div>
                                Кажется ничего не выбрано, выберете пользователя (<b>слева</b>) для редактирования его состояния.
                            </div>
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
    console.log("Leave users page")
});