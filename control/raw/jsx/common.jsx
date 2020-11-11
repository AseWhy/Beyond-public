window.addEntryPage("common", window.config.permissions.STATISTICS, (exports, emitter) => {
    // Update interval 1 min
    exports.set("updateInterval", 60000);

    class Attachment {
        constructor(blob){
            const _ = this,
                  reader = new FileReader()

            _.display = document.createElement('canvas');
            _.loaded = false;
            _.name = blob.name;
            _.mime = blob.type;
            _.hex = new String();

            reader.onload = function() {
                const result = new Uint8Array(reader.result),
                      image = new Image();

                _.hex = utils.array_to_hex(result);

                image.src = 'data:image/png;base64,' + utils.array_to_base64(result);

                _.display.width = 150;
                _.display.height = 150;

                image.onload = () => {
                    let ctx = _.display.getContext('2d'), scale = 1, nh = image.height, nw = image.width;

                    if(nh > 150){
                        scale = 150 / image.height;

                        nh *= scale;
                        nw *= scale;
                    }

                    ctx.drawImage(image, image.width / 2 - (scale != 1 ? image.height / 150 : 1) * 75, 0, image.width, image.height, 0, 0, nw, nh)

                    if(_.loadto)
                        _.loadto.src = _.display.toDataURL('image/jpeg', 95);

                    _.loaded = true;
                }
            };

            reader.readAsArrayBuffer(blob);
        }

        toJSON(){
            return {
                data: this.hex,
                mime: this.mime
            };
        }
        
        load(e){
            if(e !== null)
                if(this.loaded){
                    e.src = this.display.toDataURL('image/jpeg', 95);
                } else {
                    this.loadto = e;
                }
        }
    }

    // Ui variables
    exports.set('Actions', class Actions extends React.Component {
        constructor(props){
            super(props);

            this.state = {
                actions: [],
                from: 0,
                to: 10,
                total: 0,
                step: 10,
                next: false,
                prev: false
            };
        }

        async componentDidMount(){
            const _ = emitter.addEmitter("UPDATE_STATS", e => {
                _.update();
            }) && this;

            /**
             * Перекидываем на последнюю страницу
             */

            const data = (await api.actions(this.state.from, this.state.to)).data;

            let from = data.total - (data.total % this.state.step);

            _.setState({ from: from, to: from + this.state.step });

            _.update()
        }

        async update(){
            const data = (await api.actions(this.state.from, this.state.to)).data;

            this.setState({
                actions: data.actions,
                total: data.total,
                next: data.next,
                prev: data.prev
            });
        }

        next(){
            if(this.state.next){
                this.state.to += this.state.step;
                this.state.from += this.state.step;

                this.update();
            }
        }

        prev(){
            if(this.state.prev){
                this.state.to -= this.state.step;
                this.state.from -= this.state.step;

                this.update();
            }
        }

        render(){
            return <div class="table-common-cont" disable={(window.api.session.user == null || (window.api.session.user.permissions & window.config.permissions.ACTIONS) == 0).toString()}>
                <table class='auto-table'>
                    <tr>
                        <th>№</th>
                        <th>Пользователь</th>
                        <th>Описание</th>
                    </tr>
                    {
                        this.state.actions.map((e, i) => 
                            <tr>
                                <td>{e.id}</td>
                                <td title={e.owner.role}>{e.owner.display_name}</td>
                                <td>{e.description}</td>
                            </tr>
                        )
                    }
                </table>
                    <div class={"button-control-cont" + (this.state.next && this.state.prev ? '' : ' ones')}>
                        {
                            (() => {
                                if(this.state.prev)
                                    return <button class='button-statement' onClick={this.prev.bind(this)}>
                                        Назад
                                    </button>
                            })()
                        }
                        {
                            (() => {
                                if(this.state.next)
                                    return <button class='button-statement' onClick={this.next.bind(this)}>
                                        Дальше
                                    </button>
                            })()
                        }
                    </div>
            </div>
        }
    })

    exports.set('MessageSender', class MessageSender extends React.Component {
        constructor(props){
            super(props);

            this.state = {
                send_to_type: 0,
                waiting: false,
                send_data: {
                    content: "",
                    attachments: new Array(),
                    after: utils.now_date_format(),
                    type: "notify"
                }
            };
        }

        async commit(){
            if(this.state.send_data.content.trim() == ''){
                emitter.emit('DISPLAY_MESSAGE_UPDATE', "Невозможно отправить пустое сообщение.", 'error');

                return;
            }

            this.setState({waiting: true});

            const delta = new Date(this.state.send_data.after).getTime() - Date.now();

            await api.mailing(this.state.send_data.type, this.state.send_to_type == 0 ? 0 : delta > 0 ? delta : 0, this.state.send_data.content, this.state.send_data.attachments)
        
            if(this.state.send_to_type === 0)
                await api.update('bind');

            this.setState({
                send_to_type: 0,
                waiting: false,
                send_data: {
                    content: "",
                    attachments: new Array(),
                    after: utils.now_date_format(),
                    type: this.state.send_data.type
                }
            });

            emitter.emit('DISPLAY_MESSAGE_UPDATE', "Успешно отправллено", 'tip');
        }

        selectChange(e){
            this.setState({[e.target.name]: e.target.value});
        }

        changeSendData(e){
            this.state.send_data[e.target.name] = e.target.value;

            this.setState({send_data: this.state.send_data});
        }

        setSendData(e){
            this.state.send_data.after = e.target.value;

            this.setState({send_data: this.state.send_data});
        }

        addAttachment(e){
            let file = e.target.files[0];

            if(file == null)
                return;

            if(file.type.substring(0, 5) !== 'image'){
                emitter.emit('DISPLAY_MESSAGE_UPDATE', "Невозможно прикрепить файл, не являющийся изображением.", 'error');

                return;
            }

            if(this.state.send_data.attachments.length >= 10){
                emitter.emit('DISPLAY_MESSAGE_UPDATE', "Невозможно прикрепить файл, больше 10 вложений", 'error');

                return;
            }

            file = new Attachment(file);

            this.state.send_data.attachments.push(file);

            this.setState({send_data: this.state.send_data});
        }

        render(){
            const _ = this;

            return <div class='sender-form-data' disable={(window.api.session.user == null || (window.api.session.user.permissions & window.config.permissions.MAILING) == 0).toString()}>
                <div className="form-section-container" view={_.state.send_after_type}>
                    <select name="type" class='auto-select' value={_.state.send_data.type} onChange={_.changeSendData.bind(_)} disable={_.state.waiting.toString()}>
                        <option value="system" title='Будет разослано всем людям, когда-либо писавшим боту'>Системное сообщение</option>
                        <option value="notify" title='Будет разослано всем людям, у которых разрешены уведомления'>Сообщение уведомление</option>
                        <option value="game" title='Будет разослано всем зарегистрированным людям, у которых разрешены уведомления'>Внутриигровое сообщение</option>
                    </select>

                    <select name="send_after_type" class='auto-select' value={_.state.send_after_type} onChange={_.selectChange.bind(_)} disable={_.state.waiting.toString()}>
                        <option value="0">Отправить сейчас</option>
                        <option value="1">Отправить после</option>
                    </select>

                    {
                        function (){
                            switch(_.state.send_after_type){
                                case '0': return;
                                case '1': return <input class='auto-datetime' onChange={_.setSendData.bind(_)} ref={e => e && e.setNow} type="datetime-local" value={_.state.send_data.after} name="after"/>
                            }
                        }()
                    }
                </div>
                <textarea disable={_.state.waiting.toString()} name="content" class='auto-message' placeholder='Сообщение' value={_.state.send_data.content} onChange={_.changeSendData.bind(_)}>

                </textarea>
                <div className="bottom-option-container">
                    <div className="attachments-container">
                        {
                            _.state.send_data.attachments.map(e => {
                                return <img class='attachment-image' title={e.name} src='./images/loader.imager.icon.svg' ref={e.load.bind(e)}></img>
                            })
                        }
                        <input type="file" id='add-attachment-statement' style={{display: 'none'}} onChange={_.addAttachment.bind(_)} accept='image/*' disable={_.state.waiting.toString()}/>
                        <label htmlFor="add-attachment-statement" class='message-contant-attachment-add' disable={_.state.waiting.toString()}>
                            <img src="./images/upload.image.icon.png" class='attachment-image'/>
                        </label>
                    </div>
                    <button name='submit' class='button-statement' onClick={_.commit.bind(_)} disable={_.state.waiting.toString()}>Готово</button>
                </div>
            </div>
        }
    })

    exports.set('Time', class Time extends React.Component {
        constructor(props){
            super(props);

            this.state = {
                started: 0
            };
        }

        componentDidMount(){
            const _ = emitter.addEmitter("UPDATE_STATS", (stats) => {
                _.setState({
                    started: stats.started,
                    cur: Date.now()
                })
            }) && this;

            setInterval(() => {
                if(exports.get('active'))
                    _.setState({
                        cur: Date.now()
                    })
            }, 500)
        }

        render(){
            return <div class="timetarget">{this.state.started !== 0 ? 'Время работы сервера: ' + utils.to_ru_time_value(this.state.cur - this.state.started) : 'Ожидание...'}</div>
        }
    })

    exports.set('CountStats', class CountStats extends React.Component {
        constructor(props){
            super(props)

            this.state = {
                table_stats: []
            }
        }

        componentDidMount(){
            const _ = emitter.addEmitter("UPDATE_STATS", (stats) => {
                this.setState({table_stats: stats.table_stats});
            }) && this;
        }

        render(){
            return <div class="table-common-cont">
                <table class='auto-table'>
                    <tr>
                        <th>Параметр</th>
                        <th>Последнее значение</th>
                        <th>Среднее значение</th>
                    </tr>
                    {
                        this.state.table_stats instanceof Array &&  this.state.table_stats.map(e => 
                            <tr>
                                <td>{e.label}</td>
                                <td>{e.data[e.data.length - 1].toFixed(2) + ' ' + (e.units ?? '')}</td>
                                <td>{utils.average(e.data).toFixed(2) + ' ' + (e.units ?? '')}</td>
                            </tr>
                        )
                    }
                </table>
            </div>
        }
    })
}, (data, emitter, elements) => {
    "use strict";

    let labels = [...Array(50).keys()], chart = null;

    if(data.has('updater'))
        clearInterval(data.get('updater'));

    if(data.has('server_state'))
        data.get('server_state').destroy()

    data.set('server_state', chart = new Chart(elements.loadgraph.getContext('2d'), {
        type: 'line',

        options: {
            legend: {
                position: 'left',
                align: 'start',

                labels: {
                    usePointStyle: true,
                    fontFamily: "'JetBrains Mono'",
                    fontColor: 'wheat'
                }
            },

            onResize: (e) => {
                e.aspectRatio = elements.loadgraph.parentElement.innerWidth / elements.loadgraph.parentElement.innerWidth;
            }
        }
    }));

    chart.aspectRatio = elements.loadgraph.parentElement.innerWidth / elements.loadgraph.parentElement.innerWidth;

    function drawStatistics(set, labels){
        try {
            chart.data.labels = labels;
            chart.data.datasets = set;

            chart.update();
        } catch (e) {
            console.warn(e);
        }
    }

    void async function UpdateStats(){
        if(!data.get("active"))
            return;

        emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Синхронизация', 'tip')

        try {
            const started = Date.now(),
                  result = await api.statistics()

            if(!data.get("active"))
                  return;

            labels.splice(0, labels.length, ...[...Array(result.stats.stack).keys()]);

            drawStatistics(result.stats.displayed, labels);
            
            emitter.emit('UPDATE_STATS', {
                started: result.stats.started,
                table_stats: result.stats.stats,
            });

            emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Успешно синхронизировано: ' + (Date.now() - started) + ' (мс)', 'tip')

            setTimeout(UpdateStats, data.get('updateInterval'))
        } catch (e) {
            console.error(e);

            emitter.emit('DISPLAY_MESSAGE_UPDATE', 'Ошибка при подключении к серверу, попытка повторного подключения...', 'error');

            emitter.emit('UPDATE_STATS', {
                started: 0,
                table_stats: {}
            });

            setTimeout(UpdateStats, data.get('updateInterval'))
        }
    }();

    ReactDOM.render(React.createElement(data.get("Actions"), null), elements.lastactionscont);
    ReactDOM.render(React.createElement(data.get("MessageSender"), null), elements.sendmessagetarget);
    ReactDOM.render(React.createElement(data.get("Time"), null), elements.timetarget);
    ReactDOM.render(React.createElement(data.get("Message"), null), elements.infotarget);
    ReactDOM.render(React.createElement(data.get("CountStats"), null), elements.loadcount);
}, (data, emitter) => {
    console.log("Leave statistics page")
});