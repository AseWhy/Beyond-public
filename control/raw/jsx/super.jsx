window.addEntryPage("super", -0x2, (exports, emitter) => {
    function clone(obj){
        return JSON.parse(JSON.stringify(obj));
    }

    exports.set('RolesAddRow', class AddRow extends React.Component {
        constructor(props){
            super(props);

            this.state = {
                handling: false,
                rolename: ""
            };
        }

        handleInputChange(e){
            this.setState({[e.target.name]: e.target.value});
        }

        async handleAction(e){
            this.setState({handling: true});

            
            if(this.state.rolename.trim() === '') {
                emitter.emit('DISPLAY_MESSAGE_UPDATE', '"Наименование" не может быть пустым', 'error');

                return;
            }

            await window.api.super.roles.add({rolename: this.state.rolename});
            
            this.setState({rolename: ""})

            this.setState({handling: false});

            emitter.emit('UPDATE_LIST_ACTION');
        }

        render(){
            return <td class="add-cont bi" disable={this.state.handling.toString()}>
                <input 
                    type="text"
                    name="rolename"
                    size={this.state.rolename.length != 0 ? this.state.rolename.length : 12}
                    value={this.state.rolename}
                    placeholder="Наименование"
                    class="add-input"
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

    exports.set('RolesSelectionArea', class SelectionArea extends React.Component {
        constructor(props){
            super(props)

            this.state = {
                waiting: false,
                roles: new Array(),
                current: 0,
                search: ''
            }
        }

        async componentDidMount(){
            const _ = emitter.addEmitter("UPDATE_LIST_ACTION", () => {
                _.search();
            }) && this;

            _.search();
        }

        async search(){
            this.setState({waiting: true});

            emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Поиск по запросу...', 'tip');

            this.setState({roles: (await api.super.roles.get({
                contains: {
                    operator: "or",
                    data: [
                        {
                            name: 'ident',
                            value: this.state.search
                        },
                        {
                            name: 'rolename',
                            value: this.state.search
                        },
                    ]
                }
            })).roles});

            emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Успешно!', 'tip');
            
            this.setState({waiting: false});
        }

        showInfo(e){
            const index = parseInt(e.target.getAttribute('index'));

            emitter.emit('UPDATE_SELECTION', this.state.roles[index]);

            this.setState({current: index})
        }

        setSearch(e){
            this.state.search = e.target.value;

            this.search();
        }

        render(){
            const _ = this;

            return <div class="roles-area-selection" disable={_.state.waiting.toString()}>
                <input type="text" name="" class='search' placeholder='Поиск...' onChange={_.setSearch.bind(_)}/>

                <ul class='auto-list'>
                    {
                        (function (){
                            if(_.state.roles.length > 0){
                                return _.state.roles.map((e, i) => 
                                    <li class={"roles-row-auto" + (_.state.current == i ? ' selected' : '')} index={i} onClick={_.showInfo.bind(_)}>
                                        <td class='table-unit'>{e.ident}</td>
                                        <td class='table-unit'>{e.rolename}</td>
                                        <td class='table-unit'>{e.permissions == -1 ? 'ALL' : Object.keys(window.config.permissions).filter(f => (window.config.permissions[f] & e.permissions) != 0).join(', ')}</td>
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

                {React.createElement(exports.get('RolesAddRow'), null)}
            </div>
        }
    });

    exports.set('RolesPropertiesArea', class PropertiesArea extends React.Component {
        constructor(props){
            super(props)

            this.update_needs = new Array();

            this.state = { role: null }

            this.state_heap = { role: null }

            this.inited = false;
        }

        async svComp(){
            try {
                if(this.hasChanges() && this.state.role != null){
                    await api.super.roles.edit(this.state.role.ident, { ...this.state.role });

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
            return JSON.stringify(this.state.role) != JSON.stringify(this.state_heap.role);
        }

        componentDidMount(){
            const _ = emitter.addEmitter("UPDATE_SELECTION", async role => {
                if(_.inited)
                    await _.svComp();

                _.state_heap = {
                    role: {
                        ident: role.ident,
                        rolename: role.rolename,
                        permissions: role.permissions
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

        editRole(e){
            if(e.target.tagName == 'INPUT' && e.target.type == 'checkbox') {
                if(e.target.name != 'all-privilegies'){
                    this.state.role.permissions = e.target.checked ? this.state.role.permissions | parseInt(e.target.getAttribute('value')) : this.state.role.permissions ^ parseInt(e.target.getAttribute('value'));
                } else {
                    this.state.role.permissions = e.target.checked ? -1 : 0;
                }
            } else {
                this.state.role[e.target.name] = e.target.value
            }

            this.setState({role: this.state.role})
        }

        async removeRole(){
            if(window.confirm('Вы уверены что хотите удалить ' + this.state.role.rolename)){
                await api.super.roles.remove(this.state.role.ident);

                this.setState({role: null})

                emitter.emit('UPDATE_LIST_ACTION');

                emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Успешно удален!', 'tip');
            }
        }

        render(){
            const _ = this;

            return <div class="user-area-editor">
                {React.createElement(exports.get('Message'), null)}

                {
                    (() => {
                        if(_.state.role != null){
                            return [
                                <div class='auto-label' disable='true'>
                                    Id роли

                                    <input 
                                        type="number" 
                                        title='Id роли' 
                                        min='0' max={Number.MAX_SAFE_INTEGER} 
                                        class="auto-input" 
                                        value={_.state.role.ident ?? ''} 
                                    />
                                </div>,
                                <div class='auto-label' disable='true'>
                                    Название роли

                                    <input 
                                        type="text" 
                                        title='Название' 
                                        class="auto-input" 
                                        name='rolename'
                                        value={_.state.role.rolename ?? ''}
                                        onChange={_.editRole.bind(_)}
                                    />
                                </div>,
                                <div class='checkbox-common-cont'>
                                    <input type="checkbox" name='all-privilegies' checked={(_.state.role.permissions === -1)} onChange={_.editRole.bind(_)} id='properties-all-privilegies'/>
                                    <label for='properties-all-privilegies' class='auto-checkbox'></label>
                                        Выдать все привилегии
                                </div>,
                                <div class='includes-base-cont'>
                                    {
                                        (() => {
                                            if(_.state.role.permissions !== -1)
                                                return Object.keys(window.config.permissions).map(e => 
                                                    <div class='checkbox-common-cont'>
                                                        <input type="checkbox" name={e} checked={(_.state.role.permissions & window.config.permissions[e]) != 0} value={window.config.permissions[e]} onChange={_.editRole.bind(_)} id={"properties-" + e}/>
                                                        <label for={"properties-" + e} class='auto-checkbox'></label>
                                                            {e}
                                                    </div>
                                                )
                                            else
                                                return <p>Вы выдали все привилегии для этой роли.</p>
                                        })()
                                    }
                                </div>,
                                (() => {
                                    if(_.hasChanges())
                                        return <button class='button-statement' onClick={_.svComp.bind(_)}>
                                            Сохранить роль {_.state.role.rolename}
                                        </button>
                                })(),
                                <button class='button-danger' onClick={_.removeRole.bind(_)}>
                                    Удалить роль {_.state.role.rolename}
                                </button>
                            ]
                        } else {
                            return <div>
                                Кажется ничего не выбрано, выберете роль (<b>слева</b>) для редактирования её состояния.
                            </div>
                        }
                    })()
                }
            </div>
        }
    })

    exports.set('UsersAddRow', class AddRow extends React.Component {
        constructor(props){
            super(props);

            this.state = {
                handling: false,
                login: "",
                password: ""
            };
        }

        handleInputChange(e){
            this.setState({[e.target.name]: e.target.value});
        }

        async handleAction(e){
            this.setState({handling: true});

            if(this.state.login.trim() === '') {
                emitter.emit('DISPLAY_MESSAGE_UPDATE', '"Логин" не может быть пустым', 'error');

                return;
            }

            if(this.state.password.trim() === '') {
                emitter.emit('DISPLAY_MESSAGE_UPDATE', '"Пароль" не может быть пустым', 'error');

                return;
            }

            await window.api.super.users.add({login: this.state.login, password: this.state.password});
            
            this.setState({display: ""})

            this.setState({handling: false});

            emitter.emit('UPDATE_LIST_ACTION');
        }

        render(){
            return <td class="add-cont" disable={this.state.handling.toString()}>
                <input 
                    type="text"
                    name="login"
                    size={this.state.login.length != 0 ? this.state.login.length : 5}
                    value={this.state.login}
                    placeholder="Логин"
                    class="add-input"
                    onChange={e => this.handleInputChange(e)}
                />
                <input 
                    type="password"
                    name="password"
                    size={this.state.password.length != 0 ? this.state.password.length : 5}
                    value={this.state.password}
                    placeholder="Пароль"
                    class="add-input"
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

    exports.set('UsersSelectionArea', class SelectionArea extends React.Component {
        constructor(props){
            super(props)

            this.state = {
                waiting: false,
                users: new Array(),
                roles: new Array(),
                current: 0,
                search: ''
            }
        }

        async componentDidMount(){
            const _ = emitter.addEmitter("UPDATE_LIST_ACTION", () => {
                _.search();
            }) && this;

            _.search();
        }

        async search(){
            this.setState({waiting: true});

            emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Поиск по запросу...', 'tip');

            const data = await api.super.users.get({
                contains: {
                    operator: "or",
                    data: [
                        {
                            name: 'id',
                            value: this.state.search
                        },
                        {
                            name: 'role',
                            value: this.state.search
                        },
                    ]
                }
            });

            this.setState({users: data.users, roles: data.roles});

            emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Успешно!', 'tip');
            
            this.setState({waiting: false});
        }

        showInfo(e){
            const index = parseInt(e.target.getAttribute('index'));

            emitter.emit('UPDATE_SELECTION', this.state.users[index], this.state.roles);

            this.setState({current: index})
        }

        setSearch(e){
            this.state.search = e.target.value;

            this.search();
        }

        render(){
            const _ = this;

            return <div class="users-area-selection" disable={_.state.waiting.toString()}>
                <input type="text" name="" class='search' placeholder='Поиск...' onChange={_.setSearch.bind(_)}/>

                <ul class='auto-list'>
                    {
                        (function (){
                            if(_.state.users.length > 0){
                                return _.state.users.map((e, i) => 
                                    <li class={"users-row-auto" + (_.state.current == i ? ' selected' : '')} index={i} onClick={_.showInfo.bind(_)}>
                                        <td class='table-unit'>{e.id}</td>
                                        <td class='table-unit'>{e.display_name}</td>
                                        <td class='table-unit'>{e.role}</td>
                                    </li>
                                )
                            } else {
                                return <li class="empty-cont">
                                    Тут определенно пусто...
                                </li>
                            }
                        })()
                    }

                    {React.createElement(exports.get('UsersAddRow'), null)}
                </ul>
            </div>
        }
    });

    exports.set('UsersPropertiesArea', class PropertiesArea extends React.Component {
        constructor(props){
            super(props)

            this.update_needs = new Array();

            this.state = { user: null, loading: false }

            this.state_heap = { user: null, loading: false }

            this.inited = false;
        }

        async svComp(){
            try {
                if(this.hasChanges() && this.state.user != null){
                    await api.super.users.edit(this.state.user.id, { ...this.state.user });

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
            const _ = emitter.addEmitter("UPDATE_SELECTION", async (user, roles) => {
                if(_.inited)
                    await _.svComp();

                _.state_heap = {
                    user: {
                        id: user.id,
                        display_name: user.display_name,
                        avatar: user.avatar,
                        role: user.role
                    },

                    roles: roles
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
            const _ = this;

            if(e.target.tagName === 'INPUT' && e.target.type === 'file'){
                const reader = new FileReader();

                reader.onload = () => {
                    _.state.user.avatar = utils.array_to_hex(new Uint8Array(reader.result));

                    _.setState({loading: false, user: _.state.user});
                }

                if(e.target.files[0] != null) {
                    _.setState({loading: true});

                    reader.readAsArrayBuffer(e.target.files[0]);
                } else
                    emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Файл не выбран!', 'error');
            } else {
                console.log(e.target.value)

                if(e.target.tagName === 'INPUT' && e.target.type === 'number'){
                    _.state.user[e.target.name] = parseInt(e.target.value)
                } else if(e.target.tagName == 'INPUT' && e.target.type == 'checkbox') {
                    _.state.user[e.target.name] = e.target.checked
                } else {
                    _.state.user[e.target.name] = e.target.value
                }

                _.setState({user: _.state.user});
            }
        }

        async removeUser(){
            if(window.confirm('Вы уверены что хотите удалить ' + this.state.user.display_name)){
                await api.super.users.remove(this.state.user.id);

                this.setState({user: null})

                emitter.emit('UPDATE_LIST_ACTION');

                emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Успешно удален!', 'tip');
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
                                        value={_.state.user.id ?? ''} 
                                    />
                                </div>,
                                <div class='auto-label'>
                                    Изменить имя

                                    <input 
                                        type="text" 
                                        title='имя' 
                                        class="auto-input" 
                                        name='display_name'
                                        value={_.state.user.display_name ?? ''}
                                        onChange={_.editUser.bind(_)}
                                    />
                                </div>,
                                <div class='auto-label'>
                                    Изменить логин

                                    <input 
                                        type="text" 
                                        title='Логин' 
                                        class="auto-input" 
                                        name='login'
                                        value={_.state.user.login ?? ''}
                                        onChange={_.editUser.bind(_)}
                                    />
                                </div>,
                                <div class='auto-label'>
                                    Изменить пароль

                                    <input 
                                        type="text" 
                                        title='Пароль' 
                                        class="auto-input" 
                                        name='password'
                                        value={_.state.user.password ?? ''}
                                        onChange={_.editUser.bind(_)}
                                    />
                                </div>,
                                <div class='auto-label'>
                                    Изменить роль

                                    <select name="role" class='auto-select' value={_.state.user.role} onChange={_.editUser.bind(_)}>
                                        {
                                            _.state.roles.map(e => <option value={e.rolename}>{e.rolename}</option>)
                                        }
                                    </select>
                                </div>,
                                <div class='includes-base-cont' disable={_.state.loading.toString()}>
                                    <div class="avatarcont">
                                        <input type="file" name='avatar' id='user-avatar' onChange={_.editUser.bind(_)}/>
                                        <label class='change-avatar' for="user-avatar">
                                            <img class='super-avatar' src={_.state.user.avatar != null ? 'data:image/jpeg;base64,' + utils.array_to_base64(utils.hex_to_array(_.state.user.avatar)) : ''} alt=""/>

                                            <div class="tiptext">
                                                Изменить изображение <br/>
                                                {'<-'}
                                            </div>
                                        </label>
                                    </div>
                                </div>,
                                (() => {
                                    if(_.hasChanges())
                                        return <button class='button-statement' onClick={_.svComp.bind(_)}>
                                            Сохранить пользователя {_.state.user.display_name}
                                        </button>
                                })(),
                                <button class='button-danger' onClick={_.removeUser.bind(_)}>
                                    Удалить пользователя {_.state.user.display_name}
                                </button>
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

    (elements.users.onclick = () => {
        ReactDOM.render(React.createElement(data.get("UsersSelectionArea"), null), elements.selectionarea);
        ReactDOM.render(React.createElement(data.get("UsersPropertiesArea"), null), elements.propertiesarea);
    })()

    elements.roles.onclick = () => {
        ReactDOM.render(React.createElement(data.get("RolesSelectionArea"), null), elements.selectionarea);
        ReactDOM.render(React.createElement(data.get("RolesPropertiesArea"), null), elements.propertiesarea);
    }
}, (data, emitter) => {
    console.log("Leave super page")
});