(function (exporter){
    let private_data = new Object();

    BigInt.prototype.toJSON = function() { return this.toString() }

    {
        const

        sq_notation = ['d', 'h', 'm', 's'],

        dc_notation = [
            [ // Обозначение времени
                {
                    d: "дней",
                    h: "часов",
                    m: "минут",
                    s: "секунд",
                },
                {
                    d: "день",
                    h: "час",
                    m: "минута",
                    s: "секунда",
                },
                {
                    d: "дня",
                    h: "часа",
                    m: "минуты",
                    s: "секунды",
                }
            ], // Прибытие через...
            [
                {
                    d: "дней",
                    h: "часов",
                    m: "минут",
                    s: "секунд",
                },
                {
                    d: "день",
                    h: "час",
                    m: "минуту",
                    s: "секунду",
                },
                {
                    d: "дня",
                    h: "часа",
                    m: "минуты",
                    s: "секунды",
                }
            ]
        ]

        private_data.byte_to_hex = new Array();

        private_data.byte_to_base64 = new Array();

        for (let n = 0; n <= 0xff; ++n) {
            private_data.byte_to_hex.push(n.toString(16).padStart(2, "0"));

            private_data.byte_to_base64.push(String.fromCharCode(n))
        }

        private_data.ru = {
            'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 
            'е': 'e', 'ё': 'e', 'ж': 'j', 'з': 'z', 'и': 'i', 
            'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 
            'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 
            'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 
            'щ': 'ch', 'ы': 'y', 'э': 'e', 'ю': 'u', 'я': 'ya'
        };

        private_data.getAppends = (i, c, dc = 0) => {
            c = parseInt(c);

            if(c > 10 && c < 20)
                return dc_notation[dc][0][i];

            c = c.toString();

            c = parseInt(c[c.length - 1]);

            if(c == 0 || c >= 5 && c <= 9)
                return dc_notation[dc][0][i];
            if(c == 1)
                return dc_notation[dc][1][i];
            if(c >= 2 && c <= 4)
                return dc_notation[dc][2][i];
        }

        private_data.toFormat = (o, dc = 0) => {
            let returns = new Array(), f = false;

            for(let i = 0, leng = sq_notation.length;i < leng;i++){
                if(o[sq_notation[i]] !== undefined){
                    if(
                        !f && o[sq_notation[i]] !== 0 ||
                        f
                    ) {
                        returns.push(o[sq_notation[i]], private_data.getAppends(sq_notation[i], o[sq_notation[i]], dc));
        
                        f = true;
                    }
                }
            }

            return returns.join(" ");
        }

        private_data.unique_counter = 0n;
    }

    exporter.utils = {
        to_url_safe(str){
            let n_str = [];
            
            str = str.replace(/[ъь]+/g, '').replace(/й/g, 'i').replace(/\s/g, "_");
            
            for (let i = 0, leng = str.length; i < leng; ++i ) {
                n_str.push(
                    private_data.ru[ str[i] ]
                    || private_data.ru[ str[i].toLowerCase() ] == undefined && str[i]
                    || private_data.ru[ str[i].toLowerCase() ].toUpperCase()
                );
            }
            
            return n_str.join('');
        },
        
        unique_id(){
            return exporter.utils.array_to_hex(exporter.utils.string_to_array(Date.now().toString(16) + (++private_data.unique_counter).toString(16)))
        },

        random_id(){
            return exporter.utils.array_to_hex(exporter.utils.string_to_array(Date.now() + "~" + (Math.random() * Number.MIN_SAFE_INTEGER) + "~" + (Math.random() * Number.MIN_SAFE_INTEGER)));
        },
        
        to_ru_time_value(ms, dc = 0){
            let dd = ms / 86400000,
                d = Math.floor(dd),
                hd = (dd - d) * 24,
                h = Math.floor(hd),
                hm = (hd - h) * 60,
                m = Math.floor(hm),
                s = Math.floor((hm - m) * 60);
          
            return private_data.toFormat({
                d: d,
                h: h,
                m: m,
                s: s
            }, dc); 
        },
        
        hex_to_array(hex){
            const bytes = new Array();

            for(let i = 0, leng = hex.length; i < leng; i += 2) {
                bytes.push(parseInt(hex.substring(i, i + 2), 16))
            }

            return bytes
        },

        string_to_array(str) {
            const bytes = new Array();

            for(let i = 0, leng = str.length, char; i < leng; i++) {
                bytes.push((char = str.charCodeAt(i)) >>> 8, char & 0xFF);
            }

            return bytes;
        },

        to_ru_number_value(a){
            return (a = Math.abs(Number(a))) >= 1.0e+9
                    ? a / 1.0e+9 + " млрд."
                    : a >= 1.0e+6
                    ? a / 1.0e+6 + " млн."
                    : a >= 1.0e+3
                    ? a / 1.0e+3 + " тыс."
                    : a;
        },
    
        array_to_hex(raw) {
            let result = '';
    
            for (let i = 0, leng = raw.length; i < leng; i++) {
              result += private_data.byte_to_hex[raw[i]];
            }
    
            return result;
        },

        array_to_base64(buffer) {
            let binary = '';

            for (let i = 0, len = buffer.length; i < len; i++) {
                binary += private_data.byte_to_base64[buffer[i]];
            }

            return window.btoa(binary);
        },
        
        average(n){
            let out = 0,
                l = n.length,
                d = l;

            while(d--){
                out += n[d];
            }

            return out / l;
        },

        conv_size(b){
            let fsize,
                fsizekb = b / 1024,
                fsizemb = fsizekb / 1024,
                fsizegb = fsizemb / 1024,
                fsizetb = fsizegb / 1024;
        
            if (fsizekb <= 1024) {
                fsize = fsizekb.toFixed(3) + ' кб';
            } else if (fsizekb >= 1024 && fsizemb <= 1024) {
                fsize = fsizemb.toFixed(3) + ' мб';
            } else if (fsizemb >= 1024 && fsizegb <= 1024) {
                fsize = fsizegb.toFixed(3) + ' гб';
            } else {
                fsize = fsizetb.toFixed(3) + ' тб';
            }
        
            return fsize;
        },

        getRandomIntInclusive(min, max) {
            return Math.floor(Math.random() * (Math.floor(max) - (min = Math.ceil(min)) + 1)) + min;
        },

        now_date_format(){
            const date = new Date();

            return date.getFullYear() + '-' + date.getMonth().toString().padStart(2, '0') + '-' + date.getDay().toString().padStart(2, '0') + 'T' + date.toLocaleTimeString().substring(0, 5)
        }
    }
})(typeof module === "object" && typeof module.exports === "object" && module.exports || window)