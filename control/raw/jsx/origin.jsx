window.addEntryPage("origin", window.config.permissions.ORIGINS, (exports, emitter) => {
    function clone(obj){
        return JSON.parse(JSON.stringify(obj));
    }

    exports.set('AddRow', class AddRow extends React.Component {
        constructor(props){
            super(props);

            this.state = {
                handling: false,
                ident: ""
            };
        }

        handleInputChange(e){
            this.setState({[e.target.name]: e.target.value});
        }

        async handleAction(e){
            this.setState({handling: true});

            
            if(this.state.ident.trim() === '') {
                emitter.emit('DISPLAY_MESSAGE_UPDATE', '"Идентификатор" не может быть пустым', 'error');

                return;
            }

            await window.api.origins.add({pd_origin_name: this.state.ident});
            
            this.setState({ident: ""})

            this.setState({handling: false});

            if(this.props.onRowAdd())
                this.props.onRowAdd();
        }

        render(){
            return <td class="add-cont bi" disable={this.state.handling.toString()}>
                <input 
                    type="text"
                    name="ident"
                    size={this.state.ident.length != 0 ? this.state.ident.length : 12}
                    value={this.state.ident}
                    placeholder="Идентификатор"
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

    exports.set('LabelAdd', class SelectionArea extends React.Component {
        constructor(props){
            super(props);

            this.state = {
                name: '',
                value: 0
            }
        }

        edit(e){
            this.setState({[e.target.name]: e.target.value})
        }

        render(){
            return <div class="label-add">
                <input type="text" placeholder='field name' class='label-edit-name' name='name' value={this.state.name} onChange={this.edit.bind(this)}/>

                <input type="number" placeholder='value' class='value' name='value' value={this.state.value} onChange={this.edit.bind(this)}/>

                <button class="away" onClick={e => this.props.onAddComp && this.props.onAddComp(this.state.name, this.state.value)}>Добавить</button>
            </div>
        }
    });

    exports.set('LabelEditor', class SelectionArea extends React.Component {
        constructor(props){
            super(props);
        }

        render(){
            return <div class="label-editor">
                <input type="text" placeholder='field name' class='label-edit-name' value={this.props.field} onChange={this.props.onEditLabel}/>

                <button class="away" onMouseDown={this.props.onAwayValue}>-</button>
                    <input type="number" placeholder='field value' class='value' value={this.props.value} onChange={this.props.onEditValue}></input>
                <button class="add" onMouseDown={this.props.onAddValue}>+</button>
                <button class="rem" onMouseDown={this.props.onRemLabel}>✕</button>
            </div>
        }
    });

    exports.set('SelectionArea', class SelectionArea extends React.Component {
        constructor(props){
            super(props)

            this.state = {
                waiting: false,
                origins: new Array(),
                current: 0,
                search: ''
            }

            this.state_heap = {
                origins: new Array()
            }
        }

        componentDidMount(){
            this.search();
        }

        hasChanges(){
            return JSON.stringify(this.state.origins) != JSON.stringify(this.state_heap.origins);
        }

        async svComp(){
            this.setState({waiting: true});

            try {
                if(this.hasChanges()){
                    for(let i = 0, leng = this.state.origins.length; i < leng; i++)
                        if(JSON.stringify(this.state.origins[i]) != JSON.stringify(this.state_heap.origins[i]))
                            await api.origins.edit(this.state.origins[i].pd_origin_name, { ...this.state.origins[i] });
                    
                    this.state_heap = clone(this.state);

                    emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Успешно сохранено!', 'tip');
                }
            } catch (e) {
                console.error(e);

                emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Обишка при сохранении.', 'error');
            }

            this.setState({waiting: false});
        }

        async search(){
            this.setState({waiting: true});

            emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Поиск по запросу...', 'tip');

            this.state_heap = {origins: (await api.origins.get({
                contains: {
                    operator: "or",
                    data: [
                        {
                            name: 'pd_origin_name',
                            value: this.state.search
                        },
                        {
                            name: 'pd_origin_display',
                            value: this.state.search
                        },
                        {
                            name: 'pd_origin_desc',
                            value: this.state.search
                        },
                    ]
                }
            })).origins}

            this.setState(clone(this.state_heap));

            emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Успешно!', 'tip');
            
            this.setState({waiting: false});
        }

        editOrigin(e){
            this.state.origins[this.state.current][e.target.name] = e.target.value;

            this.setState({origins: this.state.origins});
        }

        setSearch(e){
            this.state.search = e.target.value;

            this.search();
        }

        remLabel(type, key, e){
            try {
                if(confirm("Удалить поле " + key + '?')){
                    delete this.state.origins[this.state.current].data[type][key];

                    this.setState({origins: this.state.origins});
                }
            } catch (e) {
                console.error(e)
            }
        }

        editLabel(type, key, e){
            try {
                this.state.origins[this.state.current].data[type] = utils.renameProperty(this.state.origins[this.state.current].data[type], key, e.target.value)

                this.setState({origins: this.state.origins});
            } catch (e) {
                console.error(e)
            }
        }

        addLabel(type, key, value){
            try {
                if(key.trim() != '') {
                    this.state.origins[this.state.current].data[type][key] = value;

                    this.setState({origins: this.state.origins});
                } else {
                    emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Название поля, не может быть пустым.', 'error');
                }
            } catch (e) {
                console.error(e)
            }
        }

        editValue(type, key, e){
            try {
                this.state.origins[this.state.current].data[type][key] = parseInt(e.target.value);

                this.setState({origins: this.state.origins});
            } catch (e) {
                console.error(e)
            }
        }

        addValue(type, key, e){
            try {
                this.state.origins[this.state.current].data[type][key] += 1;

                this.setState({origins: this.state.origins});
            } catch (e) {
                console.error(e)
            }
        }

        awayValue(type, key, e){
            try {
                this.state.origins[this.state.current].data[type][key] -= 1;

                this.setState({origins: this.state.origins});
            } catch (e) {
                console.error(e)
            }
        }

        async select(e){
            const index = parseInt(e.target.getAttribute('index'));

            if(!isNaN(index) && this.state.index != index) {
                await this.svComp();

                this.setState({current: index});
            }
        }

        async removeOrigin(e){
            this.setState({waiting: true});

            try {
                if(confirm('Удалить ' + this.state.origins[this.state.current].pd_origin_display + '?')){
                    await api.origins.remove(this.state.origins[this.state.current].pd_origin_name);
                    
                    this.state.origins.splice(this.state.current, 1);

                    this.state_heap = clone(this.state);

                    emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Успешно удалено!', 'tip');

                    this.setState({origins: this.state.origins})
                }
            } catch (e) {
                console.error(e);

                emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Обишка при удалении.', 'error');
            }

            this.setState({waiting: false});
        }

        render(){
            const _ = this, changes = _.hasChanges();

            return <div class="origins-area-selection" disable={_.state.waiting}>
                <div class={"tools-cont" + (changes ? ' changed' : '')}>
                    <input type="text" name="" class='search' placeholder='Поиск...' onChange={_.setSearch.bind(_)}/>
                    {
                        changes && <button class="save" title='Имеются несохраненные изминения, сохранить?' onClick={_.svComp.bind(_)}>Сохранить</button>
                    }
                    {React.createElement(exports.get('Message'), null)}
                </div>

                <ul class='auto-list'>
                    {
                        (function (){
                            if(_.state.origins.length > 0){
                                return _.state.origins.map((e, i) => 
                                    <li class={"origins-row-auto" + (_.state.current == i ? ' selected' : '')} index={i} onClick={_.select.bind(_)}>
                                        {
                                            (() => {
                                                if(_.state.current == i && e.data != null){
                                                    return [
                                                        <div class="text-info-editor-cont">
                                                            <div class="section">
                                                                <input type="text" placeholder='id происхождения' class='common-input' name="pd_origin_name" value={e.pd_origin_name} onChange={_.editOrigin.bind(_)}/>
                                                                <input type="text" placeholder='Название происхождения' class='common-input' name="pd_origin_display" value={e.pd_origin_display} onChange={_.editOrigin.bind(_)}/>
                                                                <button class="button-danger" title='Удалить происхождение' onClick={_.removeOrigin.bind(_)}>Удалить {e.pd_origin_name}</button>
                                                            </div>
                                                            <div class="section">
                                                                <textarea name="pd_origin_desc" placeholder='Описание происхождения' class='common-desc' value={e.pd_origin_desc} onChange={_.editOrigin.bind(_)}></textarea>
                                                            </div>
                                                        </div>,
                                                        <div class="editor-origin-cont">
                                                            <dis class="stat-section">
                                                                <div class="stat-descriptor">Стартовый капитал</div>

                                                                <div class="stat-editor">
                                                                    {
                                                                        Object.keys(e.data.pay).map(f => React.createElement(exports.get('LabelEditor'), {
                                                                            onEditLabel: _.editLabel.bind(_, 'pay', f),
                                                                            onAwayValue: _.awayValue.bind(_, 'pay', f),
                                                                            onAddValue: _.addValue.bind(_, 'pay', f),
                                                                            onEditValue: _.editValue.bind(_, 'pay', f),
                                                                            onRemLabel: _.remLabel.bind(_, 'pay', f),
                                                                            field: f,
                                                                            value: e.data.pay[f]
                                                                        }, null))
                                                                    }
                                                                    {
                                                                        React.createElement(exports.get('LabelAdd'), {onAddComp: _.addLabel.bind(_, 'pay')}, null)
                                                                    }
                                                                </div>
                                                            </dis>
                                                            <dis class="stat-section">
                                                                <div class="stat-descriptor">Бусты</div>

                                                                <div class="stat-editor">
                                                                    {
                                                                        Object.keys(e.data.busts).map(f => React.createElement(exports.get('LabelEditor'), {
                                                                            onEditLabel: _.editLabel.bind(_, 'busts', f),
                                                                            onAwayValue: _.awayValue.bind(_, 'busts', f),
                                                                            onAddValue: _.addValue.bind(_, 'busts', f),
                                                                            onEditValue: _.editValue.bind(_, 'busts', f),
                                                                            onRemLabel: _.remLabel.bind(_, 'busts', f),
                                                                            field: f,
                                                                            value: e.data.busts[f]
                                                                        }, null))
                                                                    }
                                                                    {
                                                                        React.createElement(exports.get('LabelAdd'), {onAddComp: _.addLabel.bind(_, 'busts')}, null)
                                                                    }
                                                                </div>
                                                            </dis>
                                                            <dis class="stat-section">
                                                                <div class="stat-descriptor">Статы</div>

                                                                <div class="stat-editor">
                                                                    {
                                                                        Object.keys(e.data.stats).map(f => React.createElement(exports.get('LabelEditor'), {
                                                                            onEditLabel: _.editLabel.bind(_, 'stats', f),
                                                                            onAwayValue: _.awayValue.bind(_, 'stats', f),
                                                                            onAddValue: _.addValue.bind(_, 'stats', f),
                                                                            onEditValue: _.editValue.bind(_, 'stats', f),
                                                                            onRemLabel: _.remLabel.bind(_, 'stats', f),
                                                                            field: f,
                                                                            value: e.data.stats[f]
                                                                        }, null))
                                                                    }
                                                                    {
                                                                        React.createElement(exports.get('LabelAdd'), {onAddComp: _.addLabel.bind(_, 'stats')}, null)
                                                                    }
                                                                </div>
                                                            </dis>
                                                            <dis class="stat-section">
                                                                <div class="stat-descriptor">Умения</div>

                                                                <div class="stat-editor">
                                                                    {
                                                                        Object.keys(e.data.skills).map(f => React.createElement(exports.get('LabelEditor'), {
                                                                            onEditLabel: _.editLabel.bind(_, 'skills', f),
                                                                            onAwayValue: _.awayValue.bind(_, 'skills', f),
                                                                            onAddValue: _.addValue.bind(_, 'skills', f),
                                                                            onEditValue: _.editValue.bind(_, 'skills', f),
                                                                            onRemLabel: _.remLabel.bind(_, 'skills', f),
                                                                            field: f,
                                                                            value: e.data.skills[f]
                                                                        }, null))
                                                                    }
                                                                    {
                                                                        React.createElement(exports.get('LabelAdd'), {onAddComp: _.addLabel.bind(_, 'skills')}, null)
                                                                    }
                                                                </div>
                                                            </dis>
                                                        </div>
                                                ]
                                            } else
                                                return [
                                                    <td class='table-unit'>{e.pd_origin_name}</td>,
                                                    <td class='table-unit'>{e.pd_origin_display}</td>,
                                                    <td class='table-unit'>{e.pd_origin_desc != null ? e.pd_origin_desc.length > 64 ? e.pd_origin_desc.substring(0, 64) + '...' : e.pd_origin_desc : ''}</td>                
                                                ]
                                            })()
                                        }
                                    </li>
                                )
                            } else {
                                return <li class="empty-cont">
                                    Тут определенно пусто...
                                </li>
                            }
                        })()
                    }
                    
                    {React.createElement(exports.get('AddRow'), {onRowAdd: _.search.bind(_)})}
                </ul>
            </div>
        }
    });
}, (data, emitter, elements) => {
    "use strict";

    ReactDOM.render(React.createElement(data.get("SelectionArea"), null), elements.selectionarea);
}, (data, emitter) => {
    console.log("Leave users page")
});