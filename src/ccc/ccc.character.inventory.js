let i_null, i_free;

function streamline(data) {
    return data.filter(e => e.id !== "ident_null" && e.id !== "ident_free");
}

/**
 * Инвентарь персонажа
 */
module.exports.CharacterInventory = class CharacterInventory {
    constructor(character, data){
        if(!i_null)
            i_null = global.managers.item.getItem('ident_null');
        if(!i_free)
            i_free = global.managers.item.getItem('ident_free');

        this.equipment          = new Array();
        this.bags               = new Array();

        if(data == null){
            this.bans               = BigInt(global.managers.origin.getOrigin(character.origin).get("bans"));
            this.bags_count         = 0x5;
            this.slots_count        = 0x4;
            this.backpack_modifier  = 0x1;
            this.clothes            = i_null;
            this.weapon             = i_null;
            this.transport          = i_null;

            this.equipment.push(i_null, i_null, i_null, i_null);
            this.bags.push(i_free, i_free, i_free, i_free, i_free);

            this.backpack = [
                0x0,
                100 * Math.round(1 + 0.1 * character.stats.stats.strength.value) * this.backpack_modifier
            ];

            character.change_stack.push('inventory');
        } else {
            data                    = JSON.parse(data);

            this.bans               = BigInt(data.bans);
            this.bags_count         = data.bags_count;
            this.slots_count        = data.slots_count;
            this.backpack_modifier  = data.backpack_modifier;

            this.clothes            = global.managers.item.getItem(data.clothes);
            this.weapon             = global.managers.item.getItem(data.weapon);
            this.transport          = global.managers.item.getItem(data.transport);

            this.backpack = [
                data.backpack,
                100 * Math.round(1 + 0.1 * character.stats.stats.strength.value) * this.backpack_modifier
            ];

            while(data.slots_count--){
                this.equipment.push(data.bags[data.slots_count] != null ?
                    global.managers.item.getItem(data.bags[data.slots_count]) : i_null);
            }

            while(data.bags_count--){
                this.bags.push(data.bags[data.bags_count] != null ?
                    global.managers.item.getItem(data.bags[data.bags_count]) : i_free);
            }
        }
    }

    edit(orders){
        for(let i = 0, leng = orders.length; i < leng; i++){
            if(orders[i].data == 0)
                continue;

            switch(orders[i].type){
                case 'set_bans':
                    if(typeof orders[i].data === 'number' || typeof orders[i].data === 'bigint')
                        this.bans = BigInt(Math.floor(orders[i].data));
                    else
                        throw new TypeError("The count of bans must have a number type.")
                break;
                case 'add_bans':
                    if(typeof orders[i].data === 'number' || typeof orders[i].data === 'bigint')
                        this.bans += BigInt(Math.floor(orders[i].data));
                    else
                        throw new TypeError("The count of bans must have a number type.")
                break;
                case 'take_away_bans':
                    if(typeof orders[i].data === 'number' || typeof orders[i].data === 'bigint')
                        this.bans -= BigInt(Math.floor(orders[i].data));
                    else
                        throw new TypeError("The count of bans must have a number type.")
                break;
                case 'set_backpack':
                    if(typeof orders[i].data === 'number' || typeof orders[i].data === 'bigint')
                        this.backpack = BigInt(Math.floor(orders[i].data));
                    else
                        throw new TypeError("The count of backpack must have a number type.")
                break;
                case 'add_backpack':
                    if(typeof orders[i].data === 'number' || typeof orders[i].data === 'bigint')
                        this.backpack += BigInt(Math.floor(orders[i].data));
                    else
                        throw new TypeError("The count of backpack must have a number type.")
                break;
                case 'take_away_backpack':
                    if(typeof orders[i].data === 'number' || typeof orders[i].data === 'bigint')
                        this.backpack -= BigInt(Math.floor(orders[i].data));
                    else
                        throw new TypeError("The count of backpack must have a number type.")
                break;
            }
        }
    }

    toDisplay(){
        return {
            bans: this.bans,
            backpack: this.backpack,
            clothes: this.clothes,
            weapon: this.weapon,
            transport: this.transport,
            equipment: this.equipment.map(e => e.name),
            bags_count: this.bags_count,
            slots_count: this.slots_count,
            backpack_modifier: this.backpack_modifier,
            bags: this.bags.map(e => e.name)
        }
    }

    toJSON(){
        return {
            bans: this.bans,
            backpack: this.backpack[0],
            clothes: this.clothes,
            weapon: this.weapon,
            transport: this.transport,
            backpack_modifier: this.backpack_modifier,
            equipment: streamline(this.equipment),
            slots_count: this.slots_count,
            bags_count: this.bags_count,
            bags: streamline(this.bags)
        }
    }
}