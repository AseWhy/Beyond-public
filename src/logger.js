'use strict';

const { createWriteStream, readdirSync, unlinkSync, mkdirSync, existsSync } = require("fs"),
      { join } = require("path");

const logpath = global.params && global.params.paths.logs_path || "./logs/",

      tables = [
          ['┌', '─', '───', '┐'],  // Header
          ['│ ',           ' │'], // Row
          ['┌', '─', '─┬─', '┐'], // Start
          ['│',      ' │ ', '│'], // Row
          ['├', '─', '─┼─', '┤'], // Separator
          ['└', '─', '─┴─', '┘']  // End
      ];

function spaces(l, c = " "){
    let buffer = "";

    for(let i = 0;i < l;i++)
        buffer += c;

    return buffer;
}

function toFormat(s, l){
    if(s && s.length < l){
        s += spaces(l - s.length);
    }

    return s || spaces(l);
}

function createPattern(inp, border_r, body_r){
    let body = spaces(inp[0], tables[body_r][1]);

    for(let i = 1, leng = inp.length;i < leng;i++)
        body += tables[body_r][2] + spaces(inp[i], tables[body_r][1])

    return tables[border_r][0] + tables[border_r][1] + body + tables[border_r][1] + tables[border_r][3]
}

module.exports.Logger = class Logger {
    constructor(name) {
        if(name != undefined && typeof name !== "string")
            throw new TypeError();

        this.seed = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
        
        this.name = name != undefined ? 
                name + "." + Date.now() + "." + this.seed + ".log" :
                'custom' + "." + Date.now() + "." + this.seed + ".log";

        if(!existsSync(logpath)) {       
            mkdirSync(logpath);
        }

        this.logfile = createWriteStream(join(logpath, this.name));

        if(global.params && global.params.std_out)
            this.std_logger = process.stdout;

        this.std_out = global.params && global.params.std_out
        this.log_time = global.params && global.params.log_time;

        this.indent = 0;

        this.table_log("The logger is initialized with parameters", 
            ['console out', this.std_out],
            ['logging time', this.log_time]
        );
    }

    /**
     * Удаляет старые файлы
     */
    static checkLogFilesLimit() {
        let fc = 0,
            file, rmf = 0;

        global.common_logger.log("Deletion of old logs started");

        const series = readdirSync(logpath),
              files = new Array();

        for(let i = 0, leng = series.length;i < leng;i++){
            file = join(logpath, series[i])
            
            fc++;

            files.push([file, parseInt(series[i].split(".")[1])]); // logger_name~time_ms~.log
        }

        files.sort(
            (a, b) =>
                a[1] - b[1]
        );

        for(let i = 0, leng = fc - global.params.logger.file_count_limit; i < leng;i++) {
            unlinkSync(files[i][0]);

            rmf++;
        }

        global.common_logger.log(`Deletion of old logs completed, ${rmf} pieces removed`);
    }

    /**
     * Печатает сообщение
     * 
     * @param {Array<String>} messages сообщения которые нужно вывести в лог
     * @param {String} level уровень логирования
     * @private
     */
    log_suff(level, color = "[33m", messages){
        let message = null,
            md = new Date().toLocaleTimeString(),
            common_indent = spaces(this.indent * 2 + level.length + (this.log_time ? md.length + 3 : 0) + 2);

        for(let i = 0, leng = messages.length; i < leng; i++){
            if(messages[i] instanceof Error)
                messages[i] = messages[i].stack;

            else if(typeof messages[i] === 'object')
                messages[i] = JSON.stringify(messages[i], null, 4);
            
            else if(typeof messages[i] !== "string")
                throw new TypeError();

            message = spaces(this.indent * 2) + messages[i].replace(/\n/g, '\n>' + common_indent);
            
            if(this.std_out)
                this.std_logger.write(`\x1b${color}[${level}]${(this.log_time ? ` [${md}]` : "")} ${message}\x1b[0m\n`);

            this.logfile.write(`[${level}]${(this.log_time ? ` [${md}]` : "")} ${message}\n`);
        }
    }

    /**
     * Выводит таблицу в лог
     * 
     * @param {String} header заголовки таблицы
     * @param {Array<String>} rows строки таблицы
     * @private
     */
    table_suff(level, color, header, rows){
        let Row = new Array(), Mc = 2, Mr = new Array(), Builder = new Array();

        for(let i = 0, leng = rows.length;i < leng;i++){
            for(let j = 0, j_leng = rows[i].length;j < j_leng;j++) {
                rows[i][j] = rows[i][j].toString().trim();

                if(Mr[j] === undefined || rows[i][j].length > Mr[j])
                    Mr[j] = rows[i][j].length;
            }
        }

        for(let i = 0, leng = Mr.length;i < leng;i++)
            Mc += Mr[i];

        if(header) {
            if(header.length % 2 !== 0)
                header += " ";

            if (header.length > Mc){
                Mr[Mr.length - 1] += header.length - Mc - (Mr.length - 1) * tables[4][1].length;
    
                Mc = header.length;
            }

            const HeaderPrev = Math.ceil(Mc / 2 - header.length / 2)

            Builder.push(createPattern(Mr, 0, 0));
            Builder.push(tables[1][0] + (HeaderPrev != 0 ? spaces(HeaderPrev) : '') + header + (HeaderPrev != 0 ? spaces(HeaderPrev) : '') + tables[1][1]);
            Builder.push(createPattern(Mr, 4, 2));
        } else 
            Builder.push(createPattern(Mr, 2, 2));

        for(let i = 0, leng = rows.length, j_leng = Mr.length;i < leng;i++){
            Row.splice(0, Row.length)

            for(let j = 0;j < j_leng;j++)
                Row.push(toFormat(rows[i][j], Mr[j]))

            Builder.push(tables[3][0] + ' ' + Row.join(tables[3][1]) + ' ' + tables[3][2]);

            if(i + 1 !== leng){
                Builder.push(createPattern(Mr, 4, 4))
            }
        }

        Builder.push(createPattern(Mr, 5, 5));

        this.log_suff(level, color, [Builder.join("\n")]);
    }

    log(...messages){
        this.log_suff("LOG", "[36m", messages);

        return messages[0];
    }

    warn(...messages){
        this.log_suff("WARNING", "[33m", messages);

        return messages[0];
    }

    error(...messages){
        this.log_suff("ERROR", "[31m", messages);

        return messages[0];
    }

    table_log(header, ...rows){
        this.table_suff("LOG", "[36m", header, rows);

        return header;
    }

    table_warn(header, ...rows){
        this.table_suff("WARNING", "[33m", header, rows);

        return header;
    }

    table_error(header, ...rows){
        this.table_suff("ERROR", "[31m", header, rows);
        
        return header;
    }

    pushIndent(){
        if(this.indent < Number.MAX_SAFE_INTEGER)
            this.indent++;
    }

    popIndent(){
        if(this.indent > 0)
            this.indent--;
    }
}