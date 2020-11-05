const { join } = require("path"),
      { renderFile } = require("pug"),
      { readdirSync } = require("fs");

module.exports.WebPattern = class WebPattern {
    constructor(){
        this.patterns = new Map();
    }

    update(){
        let patterns = readdirSync(join(__dirname, "/patterns")),
            extention = /\.[^.]+$/, av;

        for(let i = 0, leng = patterns.length;i < leng;i++){
            av = patterns[i].replace(extention, "");

            this.patterns.set(av, (renderFile(join(__dirname, "/patterns/", patterns[i]))));
        }
    }

    getPattern(name){
        return this.patterns.get(name);
    }
}