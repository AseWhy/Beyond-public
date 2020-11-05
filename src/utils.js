const { createHash } = require("crypto"),
      { readFileSync } = require('fs'),
      { join } = require('path'),
      { parse } = require("jsonc-parser");

let private_data = new Object();

{
    private_data.last_seed = 0n;

    private_data.declensions = parse(readFileSync(join(__dirname, '../data/declensions.jsonc'), 'utf8'));

    private_data.zeros = new Array();

    for(let i = '1000'; i.length <= 100;i += '000'){
        if(i.length >= 19)
            private_data.zeros.push(BigInt(i));
        else
            private_data.zeros.push(Number(i));

        if(i.length == 100){
            private_data.zeros.push(BigInt(i + '0'));
            private_data.zeros.push(BigInt(i + '0000'));
        }
    }

    private_data.get_pad = (i) => {
        if(i === 1){
            return '';
        } else if (i > 1 && i < 5) {
            return 'а'
        } else {
            return 'ов'
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
    
    to_ru_number_value(a, ec = false){
        if(a < 0n)
            return '- ' + this.to_ru_number_value(typeof a === 'bigint' ? a * -1n : a * -1);

        let b = 0;

        if(typeof a === 'bigint'){
            switch(true){
                case a > private_data.zeros[34]:
                    let p = a.toString(), s = BigInt(p.substring(0, p.indexOf('0')) + ''.padEnd(p.length - p.indexOf('0'), '0')), x = a - s;

                    if(x > private_data.zeros[34]) {
                        return '[' + ((x = x.toString()).length > 2 ? x.substring(0, 2) + '... ' + (x.length - 2) + ' скрыто' : x) + '] + ' + (p.indexOf('0') > 5 ? p.substring(0, 5) : p.substring(0, p.indexOf('0'))) + 'e' + (p.length - 1 - x.length);
                    } else
                        return (x != 0 ? '[' + this.to_ru_number_value(x) + '] + ' : '') + (p.indexOf('0') > 5 ? p.substring(0, 5) : p.substring(0, p.indexOf('0'))) + 'e' + (p.length - 1 - x.toString().length);
                case a >= private_data.zeros[33]: return (b = a / private_data.zeros[33]) + (b > 1 ? ' гугл'       + private_data.get_pad(b) : ' гугол') + (a - b * private_data.zeros[33] != 0 ? ' ' +  this.to_ru_number_value(a - b * private_data.zeros[33]) : '')
                case a >= private_data.zeros[32]: return (b = a / private_data.zeros[32]) + ' дуотригинтиллион'    + private_data.get_pad(b) + (a - b * private_data.zeros[32] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[32]) : '')
                case a >= private_data.zeros[31]: return (b = a / private_data.zeros[31]) + ' унтригинтиллион'     + private_data.get_pad(b) + (a - b * private_data.zeros[31] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[31]) : '')
                case a >= private_data.zeros[30]: return (b = a / private_data.zeros[30]) + ' тригинтиллион'       + private_data.get_pad(b) + (a - b * private_data.zeros[30] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[30]) : '')
                case a >= private_data.zeros[29]: return (b = a / private_data.zeros[29]) + ' новемвигинтиллион'   + private_data.get_pad(b) + (a - b * private_data.zeros[29] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[29]) : '')
                case a >= private_data.zeros[28]: return (b = a / private_data.zeros[28]) + ' октовигинтиллион'    + private_data.get_pad(b) + (a - b * private_data.zeros[28] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[28]) : '')
                case a >= private_data.zeros[27]: return (b = a / private_data.zeros[27]) + ' септенвигинтиллион'  + private_data.get_pad(b) + (a - b * private_data.zeros[27] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[27]) : '')
                case a >= private_data.zeros[26]: return (b = a / private_data.zeros[26]) + ' сексвигинтиллион'    + private_data.get_pad(b) + (a - b * private_data.zeros[26] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[26]) : '')
                case a >= private_data.zeros[25]: return (b = a / private_data.zeros[25]) + ' квинвигинтиллион'    + private_data.get_pad(b) + (a - b * private_data.zeros[25] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[25]) : '')
                case a >= private_data.zeros[24]: return (b = a / private_data.zeros[24]) + ' кватуорвигинтиллион' + private_data.get_pad(b) + (a - b * private_data.zeros[24] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[24]) : '')
                case a >= private_data.zeros[23]: return (b = a / private_data.zeros[23]) + ' тревигинтиллион'     + private_data.get_pad(b) + (a - b * private_data.zeros[23] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[23]) : '')
                case a >= private_data.zeros[22]: return (b = a / private_data.zeros[22]) + ' дуовигинтиллион'     + private_data.get_pad(b) + (a - b * private_data.zeros[22] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[22]) : '')
                case a >= private_data.zeros[21]: return (b = a / private_data.zeros[21]) + ' унвигинтиллион'      + private_data.get_pad(b) + (a - b * private_data.zeros[21] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[21]) : '')
                case a >= private_data.zeros[20]: return (b = a / private_data.zeros[20]) + ' вигинтиллион'        + private_data.get_pad(b) + (a - b * private_data.zeros[20] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[20]) : '')
                case a >= private_data.zeros[19]: return (b = a / private_data.zeros[19]) + ' новемдециллион'      + private_data.get_pad(b) + (a - b * private_data.zeros[19] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[19]) : '')
                case a >= private_data.zeros[18]: return (b = a / private_data.zeros[18]) + ' октодециллион'       + private_data.get_pad(b) + (a - b * private_data.zeros[18] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[18]) : '')
                case a >= private_data.zeros[17]: return (b = a / private_data.zeros[17]) + ' септдециллион'       + private_data.get_pad(b) + (a - b * private_data.zeros[17] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[17]) : '')
                case a >= private_data.zeros[16]: return (b = a / private_data.zeros[16]) + ' сексдециллион'       + private_data.get_pad(b) + (a - b * private_data.zeros[16] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[16]) : '')
                case a >= private_data.zeros[15]: return (b = a / private_data.zeros[15]) + ' квиндециллион'       + private_data.get_pad(b) + (a - b * private_data.zeros[15] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[15]) : '')
                case a >= private_data.zeros[14]: return (b = a / private_data.zeros[14]) + ' кваттордециллион'    + private_data.get_pad(b) + (a - b * private_data.zeros[14] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[14]) : '')
                case a >= private_data.zeros[13]: return (b = a / private_data.zeros[13]) + ' тредециллион'        + private_data.get_pad(b) + (a - b * private_data.zeros[13] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[13]) : '')
                case a >= private_data.zeros[12]: return (b = a / private_data.zeros[12]) + ' дуодециллион'        + private_data.get_pad(b) + (a - b * private_data.zeros[12] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[12]) : '')
                case a >= private_data.zeros[11]: return (b = a / private_data.zeros[11]) + ' ундециллион'         + private_data.get_pad(b) + (a - b * private_data.zeros[11] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[11]) : '')
                case a >= private_data.zeros[10]: return (b = a / private_data.zeros[10]) + ' дециллион'           + private_data.get_pad(b) + (a - b * private_data.zeros[10] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[10]) : '')
                case a >= private_data.zeros[9]: return  (b = a / private_data.zeros[9]) + ' нониллион'            + private_data.get_pad(b) + (a - b * private_data.zeros[9] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[9]) : '')
                case a >= private_data.zeros[8]: return  (b = a / private_data.zeros[8]) + ' октиллион'            + private_data.get_pad(b) + (a - b * private_data.zeros[8] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[8]) : '')
                case a >= private_data.zeros[7]: return  (b = a / private_data.zeros[7]) + ' септиллион'           + private_data.get_pad(b) + (a - b * private_data.zeros[7] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[7]) : '')
                case a >= private_data.zeros[6]: return  (b = a / private_data.zeros[6]) + ' секстиллион'          + private_data.get_pad(b) + (a - b * private_data.zeros[6] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[6]) : '')
                case a >= private_data.zeros[5]: return  (b = a / private_data.zeros[5]) + ' квинтиллион'          + private_data.get_pad(b) + (a - b * private_data.zeros[5] != 0 && !ec ? ' ' + this.to_ru_number_value(a - b * private_data.zeros[5]) : '')
                case a <  private_data.zeros[5]: return  this.to_ru_number_value(Number(a));
            }
        } else {
            switch(true){
                case a >= private_data.zeros[4]: return (b = Math.floor(a = a / private_data.zeros[4])) + ' квадриллион'   + private_data.get_pad(b) + (a - b !== 0 && !ec ? ' ' + this.to_ru_number_value((a - b) * private_data.zeros[4]) : '')
                case a >= private_data.zeros[3]: return (b = Math.floor(a = a / private_data.zeros[3])) + ' триллион'      + private_data.get_pad(b) + (a - b !== 0 && !ec ? ' ' + this.to_ru_number_value((a - b) * private_data.zeros[3]) : '')
                case a >= private_data.zeros[2]: return (b = Math.floor(a = a / private_data.zeros[2])) + ' миллиард'      + private_data.get_pad(b) + (a - b !== 0 && !ec ? ' ' + this.to_ru_number_value((a - b) * private_data.zeros[2]) : '')
                case a >= private_data.zeros[1]: return (b = Math.floor(a = a / private_data.zeros[1])) + ' миллион'       + private_data.get_pad(b) + (a - b !== 0 && !ec ? ' ' + this.to_ru_number_value((a - b) * private_data.zeros[1]) : '')
                case a >= private_data.zeros[0]: return (b = Math.floor(a = a / private_data.zeros[0])) + ' ' + (b === 1 ? 'тысяча' : b > 1 && b < 5 ? 'тысячи' : 'тысяч') + (a - b !== 0 && !ec ? ' ' + this.to_ru_number_value((a - b) * private_data.zeros[0]) : '')
                default: return Math.round(a);
            }
        }
    }

    random_id(){
        return createHash('sha256').update((Date.now()) + "~" + (Math.random() * Number.MIN_SAFE_INTEGER) + "~" + (Math.random() * Number.MIN_SAFE_INTEGER)).digest('hex');
    }
}