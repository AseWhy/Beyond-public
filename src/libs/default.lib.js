const utils = require("../utils");

const Utils = require("../utils"),
      date = new Date();

// Стандартная либа

module.exports = {
    log(...args){
        global.common_logger.log(...args)
    },

    gamedata: {
        get(key){
            return global.managers.data.getData(key) || new Object();
        },

        set(key, value){
            global.managers.data.setData(key, value);
        }
    },

    math: {
        ceil(n) {
            if(typeof n === 'number' && !isNaN(n))
                return Math.ceil(n);
            return null;
        },

        floor(n) {
            if(typeof n === 'number' && !isNaN(n))
                return Math.floor(n);
            return null;
        },

        round(n){
            if(typeof n === 'number' && !isNaN(n))
                return Math.round(n);
            return null;
        },

        abs(n){
            if(typeof n === 'number' && !isNaN(n))
                return Math.abs(n);
            return null;
        }
    },

    keyboard: {
        createKeyboard(namespace, buttons, color, concat_names = true, unregister_command = true, own_line = false){
            if(buttons != null && buttons instanceof Array){
                return buttons.map(e => ({
                        title: e,
                        color: color != null ? color : null,
                        own_line: own_line,
                        payload: {
                            type: 'command',
                            data: (namespace + (concat_names ? ' ' + e : ''))[unregister_command ? 'toLowerCase' : 'trim']()
                        }
                    })
                );
            } else if(typeof buttons === 'string') {
                return [
                        {
                        title: buttons,
                        color: color != null ? color : null,
                        own_line: own_line,
                        payload: {
                            type: 'command',
                            data: (namespace + (concat_names ? ' ' + buttons : ''))[unregister_command ? 'toLowerCase' : 'trim']()
                        }
                    }
                ]
            } else {
                return null;
            }
        }
    },

    app: {
        name: global.params.app.name,

        dev_version: global.params.app.dev_version,

        public_version: global.params.app.public_version,

        description: global.params.app.description,

        getUptime(){
            return Date.now() - global.managers.statistics.started;
        }
    },

    regexp: {
        test (expression, flags, string) {
            return new RegExp(expression, flags ? flags : undefined).test(string);
        },
        replace (expression, flags, string, to) {
            return string.replace(new RegExp(expression, flags ? flags : undefined), to);
        }
    },

    strings: {
        getUniqueIdent(){
            return Utils.unique_id() + Utils.random_id();
        },

        substring (input, from, to) {
            if(typeof input === "string")
                return input.substring(from, to);
            else
                return null
        },

        trim(str){
            if(typeof str === 'string')
                return str.trim();
            else
                return str;
        },

        length(string){
            return string.length;
        },

        split(input, splitter){
            if(typeof input === "string")
                return input.split(splitter);
            else
                return null
        },

        unregister(input){
            if(typeof input === "string")
                return input.toLowerCase();
            else
                return null
        },

        join(arr, p, s){
            if(arr != null){
                s = s || "";

                if(p !== null){
                    const o = new Array(),
                        l = arr.length,
                        r = [/#/g, /&/g];
                    
                    if(p.indexOf("&") === -1)
                        for(let i = 0; i < l; i++) 
                            o.push(arr[i], p.replace(r[0], i + 1));
                    else
                        for(let i = 0; i < l; i++) 
                            o.push(p.replace(r[0], i + 1).replace(r[1], arr[i]));

                    return o.join(s);
                } else {
                    return arr.join(s);
                }
            } else {
                return null;
            }
        }
    },
    arrays: {
        from(...defs){
            return defs;
        },

        includes(arr, target){
            if(arr != null){
                return arr.includes(target);
            } else {
                return false;
            }
        },

        remove(arr, from, to){
            const rest = arr.slice((to || from) + 1 || arr.length);

            arr.length = from < 0 ? arr.length + from : from;

            arr.push.apply(arr, rest);

            return arr;
        },

        indexOf(arr, value){
            return arr.indexOf(value);
        },
        
        includes_command(arr, command){
            if(arr != null) {
                arr = module.exports.arrays.unregister(arr);

                for(let i = command.length - 1, buffer = ''; i >= 0; i--)
                    if(arr.includes(buffer = command.slice(0, i + 1).join(' ').toLowerCase()))
                        return buffer;
            }

            return null;
        },

        length(array){
            return array.length;
        },

        append(arr, value){
            if(arr != null){
                arr.push(value);

                return arr;
            } else {
                return null;
            }
        },

        concat(...args){
            return [].concat(...args);
        },

        slice(arr, ...args){
            if(arr != null){
                return arr.slice(...args);
            } else {
                return null;
            }
        },

        pop(arr){
            if(arr != null){
                arr.pop();

                return arr;
            } else {
                return null;
            }
        },

        unregister(arr){
            if(arr != null){
                for(let i = 0, leng = arr.length;i < leng;i++)
                    arr[i] = arr[i] != null ? arr[i].toString().toLowerCase() : 'null';
                
                return arr;
            } else {
                return null;
            }
        },
    },
    objects: {
        keys(obj){
            return Object.keys(obj);
        },

        values(obj){
            return Object.values(obj);
        },

        assign(obj, ...args){
            if(typeof obj === 'object')
                return Object.assign(obj, ...args);
            else
                return null;
        },

        set(obj, key, value){
            obj[key] = value;

            return obj;
        },

        get(obj, key){
            return obj[key];
        },

        create(){
            return new Object();
        },

        remove(obj, key){
            delete obj[key];

            return obj;
        }
    },
    numbers: {
        random(f, t){
            if(f == null || t == null)
                return Math.random()
            else
                return Math.round(f + Math.random() * (t - f));
        },

        isNumber(o){
            return typeof o === 'number';
        },

        to_game_price_format(numb, ed, ec = false) {
            if(typeof numb === 'number' || typeof numb === 'bigint')
                return utils.to_game_price_format(numb, ed, ec);
            else
                return '0';
        },

        to_locale_format(numb){
            if(typeof numb === 'number' || typeof numb === 'bigint')
                return numb.toLocaleString('ru-RU');
            else
                return '0';
        },

        to_ru_time_value(numb, dc = -1) {
            if(typeof numb === 'number' || typeof numb === 'bigint')
                return numb > 1000 ? Utils.to_ru_time_value(numb > 0 ? numb : 0, dc) : 'Всего ничего...';
            else
                return '0';
        },

        parseInt(numb){
            return isNaN(numb = parseInt(numb)) ? null : numb;
        }
    },
    date: {
        year(){
            return date.getUTCFullYear();
        },

        month(){
            return date.getUTCMonth();
        },

        day(){
            return date.getUTCDay();
        },

        hours(){
            return date.getUTCHours();
        },

        minutes(){
            return date.getUTCMinutes();
        },

        seconds(){
            return date.getUTCSeconds();
        },

        now(){
            return Date.now()
        }
    }
}