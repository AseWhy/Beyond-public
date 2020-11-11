const utils = require("../utils");

// Интерфейс взаимодействия сценарного движка с бизнесами
module.exports.name = 'businesses';

module.exports.lib = {
    getOwnedBusinessesForCharacter(character){
        let source = global.managers.businesses.getBusinessesForSity(character.map.sity, character),
            businesses = new Array(),
            total = 0,
            stack = character.map.stack.slice(0, 4).join('/') + '/' ;

        for(let i = 0, leng = source.length, inc; i < leng;i++){
            if(source[i].type === 1){
                if(character.businesses.includes(stack + source[i].id)) {
                    businesses.push(source[i].display + ': ' + utils.to_game_price_format(inc = source[i].income + character.stats.skills.trade.value * 0.01 * source[i].income) + ' (банов) в сутки');
                    
                    total += inc;
                }
            }
        }

        return {
            businesses,
            total
        };
    },

    getBuisnesesForCharacter(character){
        const source = global.managers.businesses.getBusinessesForSity(character.map.sity, character),
              businesses = new Array(),
              businesses_display = new Array(),
              businesses_owned = new Array(),
              stack = character.map.stack.slice(0, 4).join('/') + '/' ;

        for(let i = 0, leng = source.length; i < leng;i++){
            if(source[i].type === 1){
                if(!character.businesses.includes(stack + source[i].id)) {
                    businesses.push(source[i].display);

                    businesses_display.push(source[i].display + ', стоимостью ' + utils.to_game_price_format(source[i].cost - source[i].cost * character.stats.skills.trade.value * 0.004) + ' (банов)')
                } else {
                    businesses_display.push(source[i].display + ' (уже приобретено)');

                    businesses_owned.push(source[i].display);
                }
            }
        }

        return {
            businesses,
            businesses_display,
            businesses_owned
        };
    },

    getWorksForCharacter(character){
        const source = global.managers.businesses.getBusinessesForSity(character.map.sity, character),
              works = new Array(),
              works_display = new Array();

        for(let i = 0, leng = source.length; i < leng;i++){
            if(source[i].type === 0){
                works.push(source[i].display);

                works_display.push(source[i].display + ' [' + (source[i].work_type == 0 ? 'Кликер' : 'Долгосрочная') + ']')
            }
        }

        return {
            works,
            works_display
        };
    },

    addIncome(income, data){
        for(let key in data){
            switch(key){
                case 'bans':
                    income[key] = income[key] != null ? income[key] + data[key] : data[key];
                    break;
                case 'backpack':
                    income[key] = income[key] != null ? income[key] + data[key] : data[key];
                    break;
            }
        }

        return income;
    },

    haveCost(data, character){
        if(typeof data.endurance === 'number')
            if(character.endurance.value <= data.endurance)
                return false;

        if(typeof data.bans === 'number')
            if(character.inventory.bans.value <= data.bans)
                return false;

        if(typeof data.backpack === 'number')
            if(character.backpack.value <= data.backpack)
                return false;
    },

    parseCost(data){
        const buffer = new Array();

        for(let key in data){
            switch(key){
                case 'endurance':
                    buffer.push(data[key].toLocaleString('ru-RU') + ' (выносливости)');
                    break;
                case 'bans':
                    buffer.push(utils.to_game_price_format(data[key]) + ' (банов)');
                    break;
                case 'backpack':
                    buffer.push(data[key].toLocaleString('ru-RU') + ' (стройматериалов)');
                    break;
            }
        }

        return buffer.join(' ');
    },

    parseIncome(data){
        const buffer = new Array();

        for(let key in data){
            switch(key){
                case 'bans':
                    buffer.push(utils.to_game_price_format(data[key]) + ' (банов)');
                    break;
                case 'backpack':
                    buffer.push(data[key].toLocaleString('ru-RU') + ' (стройматериалов)');
                    break;
            }
        }

        return buffer.join(' ');
    },

    getWorkFullInfoBy(field, value, character){
        const source = global.managers.businesses.getBusinessesForSity(character.map.sity, character);

        for(let i = 0, leng = source.length; i < leng;i++){
            if(source[i].type === 0 && (typeof source[i][field] === 'string' ? source[i][field].toLowerCase() : source[i][field]) === value)
                return source[i];
        }

        return null;
    },

    getBusinessFullInfoBy(field, value, character){
        const source = global.managers.businesses.getBusinessesForSity(character.map.sity, character);

        for(let i = 0, leng = source.length; i < leng;i++){
            if(source[i].type === 1 && (typeof source[i][field] === 'string' ? source[i][field].toLowerCase() : source[i][field]) === value)
                return {...source[i], cost: source[i].cost - source[i].cost * character.stats.skills.trade.value * 0.004, income: source[i].income + character.stats.skills.trade.value * 0.01 * source[i].income};
        }

        return null;
    }
}