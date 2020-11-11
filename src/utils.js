const { createHash } = require("crypto"),
      { readFileSync } = require('fs'),
      { join } = require('path'),
      { parse } = require("jsonc-parser");

let private_data = new Object();

{
    private_data.last_seed = 0n;

    private_data.declensions = parse(readFileSync(join(__dirname, '../data/declensions.jsonc'), 'utf8'));

    private_data.get_format_pad = (i) => {
        if(i === 1){
            return 'ая';
        } else if (i > 1 && i < 5) {
            return 'ые'
        } else {
            return 'ых'
        }
    }
}

module.exports = new class Utils {
    fields(obj){
        const result = new Object(),
              keys = [...Object.getOwnPropertyNames(obj.__proto__).slice(1), ...Object.getOwnPropertyNames(obj)];
            
        for(let i = 0, leng = keys.length;i < leng;i++)
            if(typeof obj[keys[i]] !== "function")
                result[keys[i]] = obj[keys[i]];
            else
                ((key) => result[key] = (...params) => obj[key](...params))(keys[i]); // Очень да, очень красиво, мне тоже нравится

        return result;
    }

    unique_id(){
        return (++private_data.last_seed).toString(16);
    }
    
    /**
     * Форматирует время
     * 
     * @param {Number} ms количество миллисекунд
     * @param {Number} dc падеж `-1` - автоматический падеж
     * @param {Boolean} ec отменить вызовы последующих, после генерации превого, например если true то 61000 вернет только 1 минута, а если false 1 минута 60 секунд
     */
    to_ru_time_value(ms, dc = -1, ec = false){
        let d = 0, cdc = private_data.declensions[0], ddm = dc == -1 ? d => d == 1 ? [0, 0] : d > 1 && d < 5 ? [0, 1] : [1, 1] : d => [d === 1 ? 1 : 0, dc];

        switch(true){
            case ms > 31560000000000: // 10000
                return (d = Math.floor(ms = ms / 31560000000000)) + ' ' + (cdc[0][(ddm = ddm(d))[0]][ddm[1]]) + (ms - d != 1 && !ec ? ' ' + this.to_ru_time_value((ms - d) * 31560000000000) : '')
            case ms > 3156000000000:  // 100
                return (d = Math.floor(ms = ms / 3156000000000)) + ' ' + (cdc[1][(ddm = ddm(d))[0]][ddm[1]]) + (ms - d != 1 && !ec ? ' ' + this.to_ru_time_value((ms - d) * 3156000000000) : '')
            case ms > 315600000000:   // decade
                return (d = Math.floor(ms = ms / 315600000000)) + ' ' + (cdc[2][(ddm = ddm(d))[0]][ddm[1]]) + (ms - d != 1 && !ec ? ' ' + this.to_ru_time_value((ms - d) * 315600000000) : '')
            case ms > 31560000000:    // year
                return (d = Math.floor(ms = ms / 31560000000)) + ' ' + (cdc[3][(ddm = ddm(d))[0]][ddm[1]]) + (ms - d != 1 && !ec ? ' ' + this.to_ru_time_value((ms - d) * 31560000000) : '')
            case ms > 2531520000:     // mounth
                return (d = Math.floor(ms = ms / 2531520000)) + ' ' + (cdc[4][(ddm = ddm(d))[0]][ddm[1]]) + (ms - d != 1 && !ec ? ' ' + this.to_ru_time_value((ms - d) * 2531520000) : '')
            case ms > 604800000:      // week
                return (d = Math.floor(ms = ms / 604800000)) + ' ' + (cdc[5][(ddm = ddm(d))[0]][ddm[1]]) + (ms - d != 1 && !ec ? ' ' + this.to_ru_time_value((ms - d) * 604800000) : '')
            case ms > 86400000:       // day
                return (d = Math.floor(ms = ms / 86400000)) + ' ' + (cdc[6][(ddm = ddm(d))[0]][ddm[1]]) + (ms - d != 1 && !ec ? ' ' + this.to_ru_time_value((ms - d) * 86400000) : '')
            case ms > 3600000:        // mour
                return (d = Math.floor(ms = ms / 3600000)) + ' ' + (cdc[7][(ddm = ddm(d))[0]][ddm[1]]) + (ms - d != 1 && !ec ? ' ' + this.to_ru_time_value((ms - d) * 3600000) : '')
            case ms > 60000:          // minute
                return (d = Math.floor(ms = ms / 60000)) + ' ' + (cdc[8][(ddm = ddm(d))[0]][ddm[1]]) + (ms - d != 1 && !ec ? ' ' + this.to_ru_time_value((ms - d) * 60000) : '')
            case ms > 1000:           // sec
                return (d = Math.floor(ms = ms / 1000)) + ' ' + (cdc[9][(ddm = ddm(d))[0]][ddm[1]]);
            default: return '';
        }
    }
    
    to_game_price_format(a, ed, ec = false){
        if(a < 0n)
            return '- ' + this.to_game_price_format(typeof a === 'bigint' ? a * -1n : a * -1, ed, ec);

        let b = 0;

        if(typeof a === 'bigint'){
                switch(true){
                    case a < Number.MAX_SAFE_INTEGER: return this.to_game_price_format(Number(a), ed, ec);
                    default: return (b = a / 10000n) + ' золотых' + ((a - b) * 10000n !== 0n && !ec ? ' ' + this.to_game_price_format((a - b) * 10000n, ed) : '')
                }
        } else {
            switch(true){
                case a >= 10000: return (b = Math.floor(a = a / 10000)) + ' золотых'        + (a - b !== 0 && !ec ? ' ' + this.to_game_price_format((a - b) * 10000, ed) : '')
                case a >= 100: return (b = Math.floor(a = a / 100))     + ' серебряных'    + (a - b !== 0 && !ec ? ' ' + this.to_game_price_format((a - b) * 100, ed) : '')
                default: return (b = Math.round(a)) + ' бронзовых'      +  (ed != null ? ' (' + ed + ')': '');
            }
        }
    }

    random_id(){
        return createHash('sha256').update((Date.now()) + "~" + (Math.random() * Number.MIN_SAFE_INTEGER) + "~" + (Math.random() * Number.MIN_SAFE_INTEGER)).digest('hex');
    }
}