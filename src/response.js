'use strict';

const { readFile } = require("fs");

const ButtonColorTypes = {
    GREEN : "positive",
    RED   : "negative",
    BLUE  : "primary",
    WHITE : "secondary"
};

function Drobe(data, part){
    return data.match(new RegExp('.{1,' + part + '}', 'g'));
}

module.exports.Response = class Response {  
    constructor(params = null){
        const _ = this;

        _.content = null;
        _.keyboard = null;
        _.attachments = new Array();

        _.params = typeof params === "object" && params !== null ? params : null;

        Object.defineProperties(_, {
            hasParams: {
                get: () => _.params !== null
            },
            hasContent: {
                get: () => _.content != null
            },
            hasKeyboard: {
                get: () => _.keyboard != null
            },
            hasAttachments: {
                get: () => _.attachments.length > 0
            }
        })
    }

    getData() {
        return {
            content     : this.content,
            keyboard    : this.keyboard,
            attachments : this.attachments,
            params      : this.params
        }
    }

    /**
     * Sets Response content
     * @param {String} content Content of the response
     */
    setContent(content){
        if (typeof content !== "string")
            throw new TypeError("Content's type must be string");
        else if (content.trim().length === 0) {
            throw new TypeError("Content's length cannot be zero");
        }
     
        this.content = content.length > 2048 ? Drobe(content, 2048) : content;
    }

    /**
     * Sets Response keyboard
     * @param {Keyboard} keyboard Keyboard of the response
     */
    setKeyboard(keyboard) {
        if (!keyboard instanceof module.exports.Keyboard)
            throw new TypeError("Keyboard must be a Keyboard instance");

        this.keyboard = keyboard;
    }

    /**
     * Adds attachment to Response
     * @param {Attachment} attachment Attachment of the response
     */
    addAttachment(attachment) {
        if (!attachment instanceof module.exports.Attachment)
            throw new TypeError("Attachment must be an Attachment instance");

        if (this.attachments.length >= 10)
            return false;

        this.attachments.push(attachment);
    }

    addAttachments(...attachments){
        for(let i = 0, leng = attachments.length;i < leng;i++)
            this.addAttachment(attachments[i]);
    }

    deleteKeyboard() {
        this.keyboard = null;
    }

    deleteAttachments() {
        this.attachments.splice(0, this.attachments.length);
    }
}

module.exports.Attachment = class Attachment {
    /**
     * 
     * @param {Buffer} buffer 
     * @param {String} uploader 
     */
    constructor(data, uploader = "message", type = 'photo', mime = 'image/jpeg') {
        if(typeof uploader !== "string")
            throw new TypeError("the uploader must be String.");
        if(!(data instanceof Buffer) && typeof data !== "string")
            throw new TypeError("the buffer must be an Buffer instance or string path.");

        this.data = data;

        this.type = type;

        this.mime = mime;

        this.uploader = uploader;
    }

    async getData(){
        if(this.data instanceof Buffer)
            return {
                data: this.data,
                uploader: this.uploader
            };
        else {
            return await new Promise((res, rej) => {
                readFile(this.data, (error, data) => {
                    if(error)
                        rej(error);
                    else
                        res({
                            data: data,
                            uploader: this.uploader
                        });
                })
            })
        }
    }
}

module.exports.SQLAttachment = class SQLAttachment {
    /**
     * Забирает файлы из mysql таблицы, и позволяет их загружать на сервера вк одинм запросом
     * 
     * @param {String} basename название базы
     * @param {String} sql запрос для получения полей
     * @param {String} uploader название для ссылки сервера загрузки, например: `message`
     */
    constructor(basename, sql, uploader = "message", type = 'photo', mime = 'image/jpeg') {
        if(typeof basename !== "string")
            throw new TypeError("the basename must be String.");
        if(typeof sql !== "string")
            throw new TypeError("the sql must be String.");
        if(typeof uploader !== "string")
            throw new TypeError("the uploader must be String.");

        const _ = this;

        _.type = type;
        _.mime = mime;
        _._basename = basename;
        _._sql = sql;
        _._uploader = uploader;

        Object.defineProperties(_, {
            basename: {
                set: (basename) => typeof basename === "string" ? _._basename = basename : null,
                get: () => _.basename.slice()
            },
            sql: {
                set: (sql) => typeof sql === "string" ? _._sql = sql : null,
                get: () => _._sql.slice()
            },
            uploader: {
                set: (uploader) => typeof uploader === "string" ? _._uploader = uploader : null,
                get: () => _._uploader.slice()
            }
        })
    }

    /**
     * @returns {Promise<Array<Attachment>|null>} обещание ответа с приложением.
     */
    async getData(){
        const data = new Array();

        const responce = (await global.managers.pool.sql(this._basename, this._sql));

        if(responce != null){
            for(let i = 0, leng = responce.length;i < leng;i++){
                for(let key in responce[i]){
                    data.push({
                        data: responce[i][key],
                        uploader: this._uploader
                    });
                }
            }

            return data;
        } else {
            return null;
        }
    }
}

module.exports.Keyboard = class Keyboard {
    /**
     * @param {Boolean} inline Will keyboard be shown inside message text
     * @param {Boolean} oneTime Will keyboard hide after button press
     */
    constructor(inline = false, oneTime = false) {
        this.buttons = [];
        this.inline = inline;
        this.oneTime = oneTime;
    }

    /**
     * Removes button from selected row of keyboard array
     * @param {Number} row Index of row
     * @param {Number} index Index of Button object
     */
    deleteButton(row, index) {
        this.buttons[row].splice(index, 1);
    }

    /**
     * Removes row in keyboard array
     * @param {Number} index Index of row
     */
    deleteRow(index) {
        this.buttons.splice(index, 1);
    }

    /**
     * Creates row from Button objects and returns it
     * @param {Button} buttons Button objects
     * @returns {Response} Row of Buttons
     * @private
     */
    createRow(...buttons) {
        const row = new Array();

        for(let i = 0, leng = 4 > buttons.length ? buttons.length : 4; i < leng;i++){
            row.push(buttons[i]);
        }
        
        return row;
    }

    /**
     * Unshifts row of Button objects to keyboard array.
     * @param {Button} buttons Buttons in the row
     * @private
     */
    unshiftRow(...buttons) {
        this.buttons.unshift(this.createRow(...buttons));
    }

    /**
     * Pushes row of Button objects to keyboard array.
     * @param {Button} buttons Buttons in the row
     * @private
     */
    pushRow(...buttons) {
        this.buttons.push(this.createRow(...buttons));
    }

    /**
     * Автоматически раполагает кнопки на панели
     * 
     * @param  {...Button} buttons массив добавляемых кнопок
     * @param {Number} method при `method` = 0, будет добавлять кнопки сверху, иначе снизу
     */
    rowAuto(b_o_r = 4, ...buttons){
        b_o_r = b_o_r < 4 ? b_o_r : 4;
        
        for (let i = 0, leng = buttons.length, buffer, j = 0, j_leng; i < leng; i += j) {
            buffer = buttons.slice(i, i + b_o_r);

            for(j = 0, j_leng = buffer.length; j < j_leng; j++) {
                if(buffer[j].own_line){
                    if(j !== 0)
                        buffer = buttons.slice(i, i + j);
                    else
                        buffer = buttons.slice(i, i + ++j);

                    break;
                }
            }

            this.pushRow(...buffer)
        }

        return this;
    }

    /**
     * Pushes rows of Button objects to keyboard array.
     * @param {Array<Button>} rows Rows of Button objects
     */
    pushRows(...rows) {
        for (let i = 0, len = rows.length < 10 ? rows.length : 10; i < len; i++) {

            row = rows[i];

            if (typeof row !== "object" || row === null)
                throw new TypeError("Rows contain invalid items");
            
            this.buttons.push(row);
        }
    }

    toJSON() {
        return {
            one_time : this.oneTime,
            inline   : this.inline,
            buttons  : this.buttons
        }
    }
}

module.exports.Button = class Button {
    /**
     * @param {String} label Text to be displayed on button
     * @param {Object} payload (optional) Object to be returned on button press 
     * @param {String} color (optional) Color of the button ["RED"|"GREEN"|"BLUE"|"WHITE"]
     * @param {Boolean} own_line (optional) Whether the button spans the entire row or will it be treated like a regular button
     */
    constructor(label, payload = {}, color = "WHITE", own_line = false) {
        if (typeof payload !== "object" || payload === null) 
            throw new TypeError("Payload must be defined object")
        
        if (!ButtonColorTypes[color.toUpperCase()])
            throw new TypeError(`Button color ${color} doesn't exists`);

        this.label = label;
        this.payload = payload;
        this.color = ButtonColorTypes[color.toUpperCase()];
        this.own_line = own_line;
    }

    toJSON() {
        return {
            action : {
                type    : "text",
                payload : this.payload,
                label   : this.label
            },
            color : this.color
        } 
    }
}
