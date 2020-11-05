module.exports.name = "inventory";

module.exports.lib = {
    getInfoFieldById(id, field){
        return global.managers.item.getItem(id).get(field);
    } 
    //...
}