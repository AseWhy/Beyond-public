window.addEntryPage("logs", window.config.permissions.LOGS, (exports, emitter) => {
    const line_pattern = /^\[(\w+)\]\s*\[?([0-9\sAMP:]+)?\]?(.*)$/m,
          subline_pattern = /^>[^\n]*$/m;

    exports.set('LogViewer', class CountStats extends React.Component {
        constructor(props){
            super(props)

            this.state = {
                time: null,
                seed: null,
                loading: false,
                lines: [],
                parent_width: 0,
                to: -1
            }
        }

        componentDidMount(){
            const _ = emitter.addEmitter("UPDATE_LOG_SELECTION", (time, seed) => {
                _.setState({
                    time,
                    seed
                }, async () => {
                    this.setState({loading: true});

                    await _.loadlogs(true);

                    this.setState({loading: false});
                })
            }) && this;

            setInterval(_.loadlogs.bind(_), 2500);
        }

        async loadlogs(update_to = false){
            if(!exports.get('active') || this.state.time == null || this.state.seed == null)
                return;

            const data = (await api.logs(this.state.time, this.state.seed)).data.split('\n'),
                  lines = new Array();

            for(let i = 0, leng = data.length, buffer; i < leng; i++){
                if(data[i].trim() == '')
                    continue;

                if(subline_pattern.test(data[i])){
                    lines[i] = {
                        level: 'PAD',
                        time: null,
                        content: data[i]
                    }
                } else {
                    buffer = line_pattern.exec(data[i]);

                    lines[i] = {
                        level: buffer[1],
                        time: buffer[2],
                        content: buffer[3]
                    }
                }
            }

            this.setState({
                to: this.state.to == -1 || update_to ? lines.length : this.state.to,
                lines: lines
            })
        }

        parentLines(){
            return Math.round(this.props.parent.offsetHeight / 30);
        }

        scroll(e){
            if(e.deltaY > 0) {
                if(this.state.to + 1 <= this.state.lines.length){
                    this.setState({to: this.state.to + 1});
                }
            } else {
                if(this.state.to - 1 >= this.parentLines()){
                    this.setState({to: this.state.to - 1});
                }
            }
        }

        render(){
            return <div class="logs-cont-rendere" onWheel={this.scroll.bind(this)}>
                {
                    (() => {
                        if(this.state.loading){
                            return <b class='loading_to_do'>Загрузка...</b>
                        } else {
                            const from = this.state.to - this.parentLines();

                            return this.state.lines.slice(from, this.state.to).map(e => 
                                <p class={'log-row ' + e.level.toLowerCase()}>
                                    {
                                        e.level != 'PAD' && <label>{e.level === 'ERROR' || e.level === 'WARNING' ? '⚠' : '»'}</label>
                                    }
                                    {
                                        e.time && <label class='date'>[{e.time}]</label>
                                    }
                                    <label class='content'>{e.content}</label>
                                </p>
                            )
                        }
                    })()
                    
                }
            </div>
        }
    })

    exports.set('LogsList', class CountStats extends React.Component {
        constructor(props){
            super(props)

            this.state = {
                logs: [],
                selected: 0
            }
        }

        async componentDidMount(){
            const _ = this;

            _.setState({
                logs: (await api.logs()).data.sort((a, b) => b.created - a.created)
            }, () => {
                emitter.emit('UPDATE_LOG_SELECTION', _.state.logs[_.state.selected].created, _.state.logs[_.state.selected].seed);
            })
        }

        select(e){
            let selected = parseInt(e.target.getAttribute('index'));

            emitter.emit('UPDATE_LOG_SELECTION', this.state.logs[selected].created, this.state.logs[selected].seed);

            this.setState({selected})
        }

        render(){
            return <ul class="logs-cont auto-list">
                {
                    this.state.logs.map((e, i) => 
                        <li class={'log-selection-unit' + (this.state.selected == i ? ' selected' : '')} index={i} onClick={this.select.bind(this)}>За {new Date(e.created).toLocaleString()}</li>
                    )
                }
            </ul>
        }
    })
}, (data, emitter, elements) => {
    "use strict";
    
    ReactDOM.render(React.createElement(data.get("LogViewer"), {parent: elements.logstarget}), elements.logstarget);
    ReactDOM.render(React.createElement(data.get("LogsList"), null), elements.logchange);
}, (data, emitter) => {
    console.log("Leave logs page")
});