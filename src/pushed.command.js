const CommandSplitterRegExp = /[\s\n]+/g,
      CommandNumberPattern  = /^[-+]?([0-9]*\.[0-9]+|[0-9]+)$/m;

module.exports.PushedCommand = class PushedCommand {
    /**
     * Parses command alike "!registration trader"
     * 
     * @param {String} string Command string
     */
    constructor(string, type = 'message'){
        this.header = null;
        this.data = new Array();
        this.type = type;

        Object.defineProperties(this, {
            hasHeader: {
                get: () => typeof this.header === "string" && this.header.trim().length > 0
            },
            hasData: {
                get: () => Object.keys(this.data).length > 0
            },
        })

        if(type === 'message')
            if(string != null && (string = string.trim()) !== '' && (string = string.split(CommandSplitterRegExp)).length > 0){
                this.header = string[0].toLowerCase();

                for(let i = 1, leng = string.length; i < leng;i++){
                    if(CommandNumberPattern.test(string[i])){
                        this.data.push(parseFloat(string[i]));
                    } else {
                        this.data.push(string[i])
                    }
                }
            } else {
                throw TypeError("The input string cannot be empty.");
            }
    }

    /**
     * Returns Command data
     * 
     * @param {Number|String} index (optional) Index of data element to be returned
     * @returns {Array|String|Number|Boolean} Data
     */
    getData(index = null){
        if (typeof index === "number" || typeof index === "string") {
            return this.data[index];
        } else {
            return this.data;
        }
    }

    /**
     * Returns Command header
     * 
     * @returns {String} Header of the command
     */
    getHeader(){
        return this.header;
    }

    static getEmpty(){
        return new PushedCommand('', 'empty')
    }

    /**
     * Восстанавливает сообщение по шаблону `pattern`
     * 
     * @param {{message: String, data: Object}} pattern шаблон восстановления сообщения
     * @returns {PushedCommand} восстановленная команда
     */
    static fromPattern(pattern){
        switch(pattern.type){
            case "command":
                return new PushedCommand(pattern.data, 'message')
            default:
                const command = new PushedCommand(null, 'repaired');

                if(typeof pattern.header === 'string'){
                    command.header = pattern.header;
                }

                if(pattern.data && Array.isArray(pattern.data) && pattern.data.length !== 0){
                    command.data = pattern.data;
                }

                return command
        }
    }
}