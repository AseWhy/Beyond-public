window.addEntryPage("users", window.config.permissions.USERS, (exports, emitter) => {
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

            await _.search();

            const target = window.location.hash.split('~');

            if(target[1] != null) {
                const user = this.getUserById(target[1]);

                if(target != null){
                    this.setState({waiting: false, current: user.index});

                    emitter.emit('UPDATE_SELECTION', this.state.users[user.index]);
                } else {
                    emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Не удалось найти персонажа с id ' + target[1], 'error');
                }
            } else
                this.setState({waiting: false});
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
        
        getUserById(id){
            for(let i = 0, leng = this.state.users.length; i < leng; i++){
                if(this.state.users[i].id == id){
                    return {
                        user: this.state.users[i],
                        index: i
                    };
                }
            }
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
                                        <td class='table-unit'>{e.ban != null && e.ban.status ? 'Забанен' : 'Законопослушный'}</td>
                                        <td class='table-unit'>{e.registered ? 'Игрок' : 'Гость'}</td>
                                        <td class='table-unit'>{e.scenario}</td>
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
            return JSON.stringify(this.state.user) != JSON.stringify(this.state_heap.user);
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
                        ban: user.ban ?? {status: false, cause: null, initiator: null},
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
            if(e.target.tagName == 'SELECT' || (e.target.tagName === 'INPUT' && e.target.type === 'number')){
                this.state.user[e.target.name] = parseInt(e.target.value)
            } else if(e.target.tagName == 'INPUT' && e.target.type == 'checkbox') {
                this.state.user[e.target.name] = e.target.checked
            } else {
                this.state.user[e.target.name] = e.target.value
            }

            this.setState({user: this.state.user});
        }

        editBan(e){
            switch(e.target.name){
                case "status":
                    this.state.user.ban.status = e.target.checked;
                break;
                case "cause":
                    this.state.user.ban.cause = e.target.value;
                break;
                case "initiator":
                    this.state.user.ban.initiator = e.target.value;
                break;
            }

            console.log(this.state.user.ban)

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

        async removeUser(){
            if(window.confirm('Вы уверены что хотите удалить ' + this.state.user.id)){
                await api.users.remove(this.state.user.id);

                this.setState({user: null})

                emitter.emit('UPDATE_LIST_ACTION');

                emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Успешно удален!', 'tip');
            }
        }

        async removeUserCharacter(){
            if(window.confirm('Вы уверены что хотите удалить персонажа пользователя ' + this.state.user.id)){
                await api.characters.remove(this.state.user.character.id);

                this.state.user.scenario = 'null';
                this.state.user.scenario_data = {};
                this.state.user.scenario_state = 0;

                await svComp();

                this.setState({user: {...this.state.user, character: {}}})

                emitter.emit('UPDATE_LIST_ACTION');

                emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Успешно удален!', 'tip');
            }
        }

        goToCharacter(){
            if(this.state.user.character && this.state.user.character.id){
                window.location.hash = 'characters~' + this.state.user.character.id;

                window.loadPage('characters');
            } else {
                emitter.emit('DISPLAY_MESSAGE_UPDATE', 'У этого пользователя нет персонажа.', 'tip');
            }
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
                                    (() => {
                                        if(_.state.user.ban.status){
                                            return <div class='includes-base-cont'>
                                                    <div class='checkbox-common-cont'>
                                                        <input type="checkbox" name="status" checked={_.state.user.ban.status} onChange={_.editBan.bind(_)} id="properties-ban-status"/>
                                                        <label for="properties-ban-status" class='auto-checkbox'></label>
                                                            Статус бана
                                                    </div>

                                                    <div class='auto-label' disable='true'>
                                                        Инициатор бана

                                                        <input 
                                                            type="text" 
                                                            title='Инициатор бана' 
                                                            class="auto-input" 
                                                            value={_.state.user.ban.initiator ?? api.session.user.display_name} 
                                                        />
                                                    </div>

                                                    <div class='auto-label'>
                                                        Причина бана (опционально)
                    
                                                        <textarea ref={e => _.update_needs.push(e)} title='Причина, по которой доступ к боту пользователю был закрыт.' name='cause' class="auto_message" value={_.state.user.ban.cause ?? ''} placeholder='...' maxLength='500' onChange={_.editBan.bind(_)}>
    
                                                        </textarea>
                                                    </div>
                                            </div>
                                        } else return <div class='checkbox-common-cont'>
                                            <input type="checkbox" name="status" checked={_.state.user.ban.status} onChange={_.editBan.bind(_)} id="properties-ban-status"/>
                                            <label for="properties-ban-status" class='auto-checkbox'></label>
                                                Статус бана
                                        </div>
                                    })()
                                ,
                                (() => {
                                    if(_.hasChanges())
                                        return <button class='button-statement' onClick={_.svComp.bind(_)}>
                                            Сохранить {_.state.user.id}
                                        </button>
                                })(),
                                (() => {
                                    if(this.state.user.character && _.state.user.character.id != null)
                                        return <button class='button-statement' onClick={_.goToCharacter.bind(_)}>
                                            Перейти к {_.state.user.character.name}
                                        </button>
                                })(),
                                <button class='button-danger' onClick={_.removeUser.bind(_)}>
                                    Удалить {_.state.user.id}
                                </button>,
                                (() => {
                                    if(this.state.user.character && _.state.user.character.id != null)
                                        return <button class='button-danger' onClick={_.removeUserCharacter.bind(_)}>
                                            Удалить {_.state.user.character.name}
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