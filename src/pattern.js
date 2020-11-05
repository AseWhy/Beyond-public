'use strict';

const { readdirSync } = require("fs"),
      { join } = require('path');

const CHARTYPE = {
    START: "START",
    NUMBER: "NUMBER",     // 0 - 9
    WORD: "WORD",         // all
    SPACE: "SPACE",
    POINT: "POINT",       // .
    STRING: "STRING",     // ` ' "
    NEWLINE: "NEWLINE",   // \n
    OPERATOR: "OPERATOR"  // < = > - * + / ( ) !
}

const OPERATOR = {
    PLUS:       "PLUS",
    MINUS:      "MINUS",
    MULT:       "MULT",
    DIVIDE:     "DIVIDE",
    EQUAL:      "EQUAL",
    NEQUAL:     "NEQUAL",
    LARGER:     "LARGER",
    LESS:       "LESS",
    ELARGER:    "ELARGER",
    ELESS:      "ELESS",
    AND:        "AND",
    OR:         "OR"
}

function toFixed(d, l){
    return "0x" + d.toString(16).padStart(l - 2, '0');
}

class TheSequenceException extends Error {
    constructor(entry){
        super(`Wrong order: condition operator: '${entry.toString()}'`);
    }
}

class ParserException extends Error {
    constructor(){
        super("Error when processing raw data")
    }
}

class UnexpectedTokenException extends Error {
    constructor(token, expected){
        super(`Unexpected token '${token.toString()}' when expected '${expected.toString()}'`);
    }
}

class ParserLogicException extends Error {
    constructor(){
        super("The expression has incorrect logic.")
    }
}

class ParserEmtyArgumentException extends Error {
    constructor(){
        super("It is not possible to pass an empty argument to a function, use null to denote an empty value.")
    }
}

let Import = () => {};

(() => {
    const ExcPatt = /\.[^.]*$/m,
          Modules = new Map(),
          Paths = readdirSync(join(__dirname, "libs"));

    for(let i = 0, leng = Paths.length;i < leng;i++){
        Modules.set(Paths[i].replace(ExcPatt, ''), require(join(__dirname, "libs", Paths[i])))
    }

    Import = (import_statements, logger) => {
        if(!(import_statements instanceof Array))
            throw new TypeError("import_statements must be Array");

        let mod, modules = new Object();

        for(let i = 0, leng = import_statements.length;i < leng;i++){
            if((mod = Modules.get(import_statements[i])) !== null)
                if(mod.name !== undefined)
                    Object.assign(modules, {[mod.name]: mod.lib});
                else
                    Object.assign(modules, mod);
            else
                logger.warn(`Can't find module ${import_statements[i]}, check the spelling of the library name`);
        }

        return modules;
    }
})()

module.exports.Heap = class Heap extends Map {
    /**
     * Модуль памяти, может использоваться для манипульций с памятью.
     * 
     * @param {Object} data 
     */
    constructor(data){
        super();

        if(data !== undefined)
            this.append(data);
    }

    append(data){
        if(typeof data === "object"){
            if(Array.isArray(data)){
                for(let i = 0, leng = data.length;i < leng;i++)
                    this.set(i, data[i], data);
            } else {
                const keys = Object.getOwnPropertyNames(data)

                for(let i = 0, leng = keys.length;i < leng;i++)
                    this.set(keys[i], data[keys[i]], data);
            }
        } else {
            throw new TypeError();
        }
    }

    get(key){
        return super.get(key);
    }

    set(key, data, subj = null, parents_three = new Array()){
        if(typeof key !== "string" && typeof key !== "number")
            throw new TypeError();

        try {
            switch(typeof data){
                case "bigint":
                    super.set(key, new Integer(new LexerEntry(CHARTYPE.NUMBER, Buffer.from(data.toString()), 0)));
                break;
                case "number":
                    super.set(key, new Number(new LexerEntry(CHARTYPE.NUMBER, Buffer.from(data.toString()), 0)));
                break;
                case "string":
                    super.set(key, new String(new LexerEntry(CHARTYPE.STRING, Buffer.from(data.toString()), 0)));
                break;
                case "boolean":
                    super.set(key, new Boolean(new LexerEntry(CHARTYPE.WORD, Buffer.from(data.toString()), 0)));
                break;
                case "object":
                    if(data == null) {
                        super.set(key, data);
                    } else if(data instanceof module.exports.ExpressionPattern || data instanceof module.exports.MessagePattern) {
                        super.set(key, new PatternData(data));
                    } else {
                        parents_three.push(data);
    
                        if(data instanceof Array) {
                            const sub = new module.exports.HeapIndexed();
    
                            for(let i = 0, leng = data.length;i < leng;i++)
                                if(!parents_three.includes(data[i]))
                                    sub.set(i, data[i], data, [...parents_three]);
    
                            super.set(key, sub);
                        } else {
                            const sub = new module.exports.Heap(),
                                  keys = Object.getOwnPropertyNames(data);
    
                            for(let i = 0, leng = keys.length;i < leng;i++)
                                if(!parents_three.includes(data[keys[i]]))
                                    sub.set(keys[i], data[keys[i]], data, [...parents_three]);
    
                            super.set(key, sub);
                        }
                    }
                break;
                case "function":
                    super.set(key, new NativeFunction(data.bind(subj)));
                break;
            }
        } catch (e) {
            console.error("Error when cast value of " + key)
        }
    }

    result(heap, source_data, out, throw_error){
        let output = new Object();

        for(let [key, value] of this)
            if(!(value instanceof NativeFunction))
                output[key] = value != null ? value.result(heap, source_data, out, throw_error) : null;
        
        return output;
    }
}

module.exports.HeapIndexed = class HeapIndexed extends module.exports.Heap {
    constructor(data){
        super(data);

        this.length = 0;
    }

    push(data, subj = null, parents_three = new Array()){
        super.set(this.length++, data, subj, parents_three);
    }

    get(key){
        if(key >= 0 && key < this.length) {
            return super.get(key);
        } else
            return null;
    }

    set(key, data, subj = null, parents_three = new Array()){
        if(typeof key !== "number" || key < 0 || key > globalThis.Number.MAX_SAFE_INTEGER)
            throw new TypeError();

        if(this.length <= key)
            this.length = key + 1;
        
        super.set(key, data, subj, parents_three);
    }

    result(heap, source_data, out, throw_error){
        let output = new Array(this.length);

        for(let [key, value] of this)
            if(!(value instanceof NativeFunction))
                output[key] = value != null ? value.result(heap, source_data, out, throw_error) : null;
        
        return output;
    }
}

class ParserData {
    constructor(type = "undefined"){
        this.type = type;
    }
}

class Operator extends ParserData {
    constructor(data) {
        super("operator");

        this.position = data.position
        this.raw = data.data;

        switch(data.data.toString()){
            case "+":
                this.op_p = OPERATOR.PLUS;
            break;
            case "-":
                this.op_p = OPERATOR.MINUS;
            break;
            case "*":
                this.op_p = OPERATOR.MULT;
            break;
            case "/":
                this.op_p = OPERATOR.DIVIDE;
            break;
            case ">":
                this.op_p = OPERATOR.LARGER;
            break;
            case "<":
                this.op_p = OPERATOR.LESS;
            break;
            case ">=":
                this.op_p = OPERATOR.ELARGER;
            break;
            case "<=":
                this.op_p = OPERATOR.ELESS;
            break;
            case "=":
                this.op_p = OPERATOR.EQUAL;
            break;
            case "!=":
                this.op_p = OPERATOR.NEQUAL;
            break;
            case "&":
                this.op_p = OPERATOR.AND;
            break;
            case "|":
                this.op_p = OPERATOR.OR;
            break;
        }
    }

    equals(t){
        return this.op_p === OPERATOR[t];
    }

    toString(){
        return this.raw.toString();
    }
}

class RawData extends ParserData {
    constructor(entry, name){
        super("raw");

        this.position = entry.position;
        this.name = name;
    }

    result(){

    }

    equals(f){
        return this.name === f;
    }

    toString(){
        return this.name + " { " + this.result() + " }";
    }
}

class Integer extends RawData {
    constructor(data){
        super(data, "Integer");

        this.data = data.data.toString();
    }

    result(){
        return BigInt(this.data);
    }

    static toPatternNumber(data, pos = 0){
        if(!(data instanceof ParserData))
            return new Integer(new LexerEntry(CHARTYPE.NUMBER, Buffer.from(BigInt(data).toString()), pos, null));

        switch(data.entry.type){
            case CHARTYPE.STRING:
            case CHARTYPE.WORD:
                return new Integer(new LexerEntry(CHARTYPE.NUMBER, data.entry.data, pos, null));
            case CHARTYPE.NUMBER:
                return new Integer(new LexerEntry(CHARTYPE.NUMBER, Buffer.from(data.entry.data.toString()), pos, null));  
        }

        return new Integer(new LexerEntry(CHARTYPE.NUMBER, Buffer.from([48]), pos, null));
    }

    static create(pos = 0){
        return new Number(new LexerEntry(CHARTYPE.START, Buffer.from([48]), pos, null))
    }
}

class Number extends RawData {
    constructor(data){
        super(data, "Number");

        this.data = data.data.toString();

        this.unsigned = false;
    }

    toInteger(){
        this.unsigned = true;
    }

    toDouble(){
        this.unsigned = false;
    }

    result(){
        return this.unsigned ? parseInt(this.data) : parseFloat(this.data);
    }

    static toPatternNumber(data, pos = 0){
        if(!(data instanceof ParserData))
            return new Number(new LexerEntry(CHARTYPE.NUMBER, Buffer.from(new globalThis.Number(data).toString()), pos, null));

        switch(data.entry.type){
            case CHARTYPE.STRING:
            case CHARTYPE.WORD:
                return new Number(new LexerEntry(CHARTYPE.NUMBER, data.entry.data, pos, null));
            case CHARTYPE.NUMBER:
                return new Number(new LexerEntry(CHARTYPE.NUMBER, Buffer.from(data.entry.data.toString()), pos, null));  
        }

        return new Number(new LexerEntry(CHARTYPE.NUMBER, Buffer.from([48]), pos, null));
    }

    static create(pos = 0){
        return new Number(new LexerEntry(CHARTYPE.START, Buffer.from([48]), pos, null))
    }
}

class String extends RawData {
    constructor(data){
        super(data, "String");

        this.data = data.data.toString();
    }

    result(){
        return this.data.toString();
    }

    static toPatternString(data, pos = 0){
        if(!(data instanceof ParserData))
            return new String(new LexerEntry(CHARTYPE.WORD, Buffer.from(new globalThis.String(data).toString()), pos, null));

        switch(data.entry.type){
            case CHARTYPE.STRING:
            case CHARTYPE.WORD:
                return new String(new LexerEntry(CHARTYPE.WORD, data.entry.data, pos, null));
            case CHARTYPE.NUMBER:
                return new String(new LexerEntry(CHARTYPE.WORD, Buffer.from(data.entry.data.toString()), pos, null));  
        }

        return new String(new LexerEntry(CHARTYPE.WORD, Buffer.from([]), pos, null));
    }


    static create(pos = 0){
        return new String(new LexerEntry(CHARTYPE.START, Buffer.from([]), pos, null))
    }
}

class Boolean extends RawData {
    constructor(data){
        super(data, "Boolean");

        this.data = (data.data.toString() === "true") ? Buffer.from([1]) : Buffer.from([0]);
    }

    result(){
        return this.data[0] !== 0;
    }

    static toPatternBoolean(data, pos = 0){
        if(!(data instanceof ParserData))
            return new Boolean(new LexerEntry(CHARTYPE.WORD, Buffer.from(new globalThis.Boolean(data).toString()), pos, null));

        if(data.entry.data.byteLength === 1){
            return new Boolean(new LexerEntry(CHARTYPE.WORD, Buffer.from(data.entry.data[0] === 0 ? "false" : "true"), pos, null))
        } else {
            switch(data.entry.type){
                case CHARTYPE.STRING:
                case CHARTYPE.WORD:
                    switch(data.entry.data.toString()){
                        case "true":
                            return new Boolean(new LexerEntry(CHARTYPE.WORD, Buffer.from("true"), pos, null));
                        case "false":
                            return new Boolean(new LexerEntry(CHARTYPE.WORD, Buffer.from("false"), pos, null));
                    }
                break;
                case CHARTYPE.NUMBER:
                    switch(data.entry.data.toString()){
                        case "0":
                            return new Boolean(new LexerEntry(CHARTYPE.WORD, Buffer.from("false"), pos, null));
                        default:
                            return new Boolean(new LexerEntry(CHARTYPE.WORD, Buffer.from("true"), pos, null));
                    }
            }

            return new Boolean(new LexerEntry(CHARTYPE.WORD, Buffer.from("false"), pos, null));
        }
    }

    static create(pos = 0){
        return new Boolean(new LexerEntry(CHARTYPE.START, Buffer.from([0]), pos, null))
    }
}

class Null extends RawData {
    constructor(data){
        super(data, "Null");
    }

    result(){
        return null;
    }

    static create(){
        return new Null(new LexerEntry(CHARTYPE.START, Buffer.from([]), 0, null))
    }
}

class NativeFunction extends ParserData {
    constructor(func){
        super("native function");

        this.target = func;
    }

    result(args, throw_error, call_pos){
        let buff = this.target.call(null, ...args);

        if(buff == null)
            return Null.create();
        else if(typeof buff === "bigint")
            return new Integer(new LexerEntry(CHARTYPE.NUMBER, Buffer.from(buff.toString()), 0));
        else if(typeof buff === "number")
            return new Number(new LexerEntry(CHARTYPE.NUMBER, Buffer.from(buff.toString()), 0));
        else if(typeof buff === "string")
            return new String(new LexerEntry(CHARTYPE.STRING, Buffer.from(buff.toString()), 0));
        else if(typeof buff === "boolean")
            return new Boolean(new LexerEntry(CHARTYPE.WORD, Buffer.from(buff.toString()), 0));
        else if(typeof buff === "object")
            if(buff instanceof Array)
                return new module.exports.HeapIndexed(buff);
            else
                return new module.exports.Heap(buff);
        else
            throw_error(call_pos, "function can only return simple types, string number and boolean");
    }

    static create(){
        return new NativeFunction(() => false);
    }
}

class LexerEntry {
    constructor(type, data, p, s_separator){
        this.type = CHARTYPE[type];
        this.data = data;
        this.position = p != 0 ? p - data.byteLength + 1 : 0;
        this.leng = data.byteLength;
        this.string_separator = s_separator != null ? globalThis.String.fromCharCode(s_separator) : null;

        // Проверяем на валидность некоторые типы
        switch(this.type){
            case CHARTYPE.NUMBER:
                if(isNaN(parseFloat(this.data.toString())))
                        throw new Error("Cannot be identified as a digital format token of type: " + this.data.toString());
                    break;
        }
    }

    equals(t, s){
        return t == this.type && (s != null ? this.toString() == s : true);
    }

    toString(){
        return this.type != CHARTYPE.STRING ? this.data.toString("utf8") : this.string_separator + this.data.toString("utf8") + this.string_separator;
    }
}

class PatternData extends ParserData {
    constructor(pattern){
        super("pattern");

        this.target = pattern;
    }

    toString(){
        return `Pattern [${this.target}]`;
    }

    result(heap, source_data, out, throw_error){
        return this.target.result(source_data, throw_error);
    }
}

class GetByName extends ParserData {
    constructor(data){
        super("get_name");

        this.position = data.position;
        this.query_stack = data.data.toString().split(".");
    }

    result(heap, source_data, out, throw_error){
        let query_data = heap.get(this.query_stack[0]) || source_data.get(this.query_stack[0]);

        for(let i = 1, leng = this.query_stack.length;query_data && i < leng;i++)
            if(query_data instanceof module.exports.Heap || query_data instanceof module.exports.HeapIndexed) {
                query_data = query_data.get(this.query_stack[i]) || null;
            } else {
                throw_error(this.position, 'Cannot get property `' + this.query_stack[i] + '` of null')
            }

        if(query_data)
            return query_data.result(heap, source_data, out, throw_error);
        else
            return null
    }

    toString(){
        return this.query_stack.join(" => ");
    }
}

class GetByIndex extends ParserData {
    constructor(data, index){
        super("get_index");

        this.position = data.position;
        this.query_stack = data.data.toString().split(".");

        if(index.type === CHARTYPE.NUMBER){
            this.index = new Number(index);

            this.index.toInteger();
        }
    }

    result(heap, source_data, out, throw_error){
        let query_data  = heap.get(this.query_stack[0]) || source_data.get(this.query_stack[0]),
            index       = this.index.result();

        for(let i = 1, leng = this.query_stack.length;query_data && i < leng;i++)
            if(query_data !== null) {
                query_data = query_data.get(this.query_stack[i]) || null;
            } else {
                throw_error(this.position, 'Cannot get property `' + this.query_stack[i] + '` of null.')
            }

        query_data = query_data.get(index);

        if(query_data)
            return query_data.result(heap, source_data, out, throw_error);
        else
            return null
    }

    toString(){
        return this.query_stack.join(" => ") + "[" + this.index.result() + "]";
    }
}

class FunctionCall extends ParserData {
    constructor(name, args, position){
        super("call");

        this.name = name.split(".");
        this.args = args;
        this.position = position;
    }

    result(heap, source_data, out, throw_error){
        let query_data = heap.get(this.name[0]) || source_data.get(this.name[0]),
            args = new Array();

        for(let i = 1, leng = this.name.length;i < leng;i++)
            query_data = query_data && query_data.get(this.name[i]) || null;

        for(let i = 0, leng = this.args.length;i < leng;i++) {
            args.push(this.args[i].result(heap, source_data, out, throw_error))
        }

        if(query_data instanceof NativeFunction)
            return query_data.result(args, throw_error, this.position).result(heap, source_data, out, throw_error);
        else
            throw_error(this.position, "the called object is not a function " + this.name[this.name.length - 1]);
    }

    toString(){
        return "CallFunction => { " + this.name.join(" => ") + " } [ " + this.args.join(", ") + " ]";
    }
}

class TernarOperator extends ParserData {
    /**
     * Создает тернарные оператор
     * 
     * @param {ExpressionGroup} condition Выражение условие
     * @param {ExpressionGroup} v1 Выражение, если истина
     * @param {ExpressionGroup} v2 Выражение, если ложь
     */
    constructor(condition, v1, v2){
        super("ternar");

        this.condition = condition;
        this.v_o = v1;
        this.v_t = v2;
    }

    toString(){
        return " Ternar => { " + this.condition.toString() + " } [ " + this.v_o + " : " + this.v_t + " ]";
    }

    result(heap, source_data, out, throw_error){
        if(Boolean.toPatternBoolean(this.condition.result(heap, source_data, out, throw_error), this.condition.position).result())
            return this.v_o.result(heap, source_data, out, throw_error);
        else
            return this.v_t.result(heap, source_data, out, throw_error);
    }
}

class SetOperator {
    constructor(name, value){
        this.name = name.toString().split(".");
        this.position = name.position;
        this.value = value;
    }

    toString(){
        return "Set [ " + this.name + " = " + this.value.toString() + " ]";
    }

    result(heap, source_data, out, throw_error){
        if(this.name.length > 1)
            throw_error(this.position + Buffer.from(this.name[0]).byteLength, new UnexpectedTokenException('.', '='))

        if(!source_data.has(this.name[0]) && !heap.has(this.name[0]))
            source_data.set(this.name[0], this.value.result(heap, source_data, out, throw_error))
        else
            throw_error(this.position, `The ${this.name[0]} field already exists`)
    }
}

class ResetOperator {
    constructor(name, value){
        this.query_stack = name.toString().split('.');
        this.position = name.position;
        this.value = value;
    }

    toString(){
        return "Reset [ " + this.name + " = " + this.value.toString() + " ]";
    }

    result(heap, source_data, out, throw_error){
        let query_data = source_data.get(this.query_stack[0]) || heap.get(this.query_stack[0]);

        if(this.query_stack.length > 1){
            for(let i = 1, leng = this.query_stack.length - 1; query_data && i < leng;i++)
                query_data = query_data.get(this.query_stack[i]) || null;

            if(query_data instanceof module.exports.Heap)
                query_data.set(this.query_stack[this.query_stack.length - 1], this.value.result(heap, source_data, out, throw_error))
            else
                throw_error(this.position, `Can't get field '${this.query_stack[this.query_stack.length - 1]}' of ${query_data && query_data.type || 'null'}`)
        } else {
            if(query_data != null)
                if(source_data.get(this.query_stack[0]) != null)
                    source_data.set(this.query_stack[0], this.value.result(heap, source_data, out, throw_error));
                else
                    heap.set(this.query_stack[0], this.value.result(heap, source_data, out, throw_error));
            else
                throw_error(this.position, `Can't get field '${this.query_stack[this.query_stack.length - 1]}' of null`)
        }
    }
}

class WriteOperator {
    constructor(expression){
        this.expression = expression;
    }

    toString(){
        return "Write [ " + this.expression.toString() + " ]";
    }

    result(heap, source_data, out, throw_error){
        out.push(this.expression.result(heap, source_data, out, throw_error));
    }
}

class ExpressionGroup extends ParserData {
    constructor(position){
        super("expression");

        this.data = new Array();
        this.position = position;
        this.validated = false;
    }

    toString(){
        return "Expression [ " + this.data.join(" ") + " ]";
    }

    append(entry, throw_error){
        const _ = this;

        function push(entry){
            switch(entry.type){
                case CHARTYPE.NUMBER:
                    _.data.push(new Number(entry));
                break;
                case CHARTYPE.STRING:
                    _.data.push(new String(entry));
                break
                case CHARTYPE.WORD:
                    switch(entry.data.toString()){
                        case "true":
                        case "false":
                            _.data.push(new Boolean(entry));
                        break;
                        case "null":
                            _.data.push(new Null(entry));
                        break;
                        default:
                            _.data.push(new GetByName(entry));
                        break;
                    }
                break;
                case "get_index":
                case "get_name":
                case "call":
                case "raw":
                case "ternar":
                case "expression":
                case "operator":
                    _.data.push(entry);
                break;
                default:
                    throw_error(entry.position, "Unable to recognize type");
                break;
            }
        }

        if(_.data.length === 0) {
            push(entry);
        } else if(entry.type === "operator")
            if(_.data[_.data.length - 1].type !== "operator")
                push(entry);
            else
                throw_error(entry.position, new TheSequenceException(entry));
        else if(entry.type === "raw" || entry.type === "expression")
            if(_.data[_.data.length - 1].type === "operator")
                push(entry);
            else
                throw_error(entry.position, new TheSequenceException(entry));
        else if(entry.type === CHARTYPE.OPERATOR){
            if(_.data[_.data.length - 1].type !== "operator")
                push(new Operator(entry));
            else
                throw_error(entry.position, new TheSequenceException(entry));
        }else 
            if(_.data[_.data.length - 1].type === "operator")
                push(entry);
            else
                throw_error(entry.position, new TheSequenceException(entry));
    }

    complete(throw_error){
        if( // Выражение не должно начинаться с оператора и не не должно заканчиваться оператором
            this.data[0] instanceof LexerEntry &&
            this.data[0].equals(CHARTYPE.OPERATOR, ")")
        ){
            throw_error(this.data[0].position, new TheSequenceException(this.data[0]));
        } else if(
            this.data[this.data.length - 1] instanceof LexerEntry &&
            this.data[this.data.length - 1].equals(CHARTYPE.OPERATOR, ")")
        ) {
            throw_error(this.data[this.data.length - 1].position, new TheSequenceException(this.data[this.data.length - 1]));
        }

        // Stage 1: 2 + 2 * 2 => 2 + (2 * 2)
        if(this.data.filter(e => e.op_p === OPERATOR.MULT || e.op_p === OPERATOR.DIVIDE).length > 0) {
            let mltexp = false,
                dump   = Array.from(this.data),
                stack  = null;
            
            this.data.splice(0, this.data.length);

            for (let i = 0, leng = dump.length; i < leng; i++) {
                if(dump[i + 1] && dump[i + 1].type === "operator")
                    switch(dump[i + 1].op_p){
                        case OPERATOR.MULT:
                        case OPERATOR.DIVIDE:
                            if(mltexp)
                                break;

                            mltexp = true;

                            stack = new ExpressionGroup(dump[i + 1].position);
            
                            this.append(stack, throw_error);
                        break;
                        case OPERATOR.PLUS:
                        case OPERATOR.MINUS:
                        case OPERATOR.EQUAL:
                        case OPERATOR.LARGER:
                        case OPERATOR.LESS:
                        case OPERATOR.OR:
                        case OPERATOR.AND:
                            if(!mltexp)
                                break;

                            mltexp = false;

                            stack.append(dump[i], throw_error);

                            stack.complete();

                            stack = null;
                        continue;
                        default: break;
                    }
                
                if(mltexp){
                    stack.append(dump[i], throw_error); // Добавляем в суб стек
                }else{
                    this.append(dump[i], throw_error); // Добавляем в основной стек
                }
            }
        }

        // Stage 2 a & b => (a) & (b)
        if(this.data.filter(e => e.op_p === OPERATOR.AND).length > 0) {
            let dump   = Array.from(this.data),
                stack  = new ExpressionGroup(dump[0].position);
            
            this.data.splice(0, this.data.length);

            for (let i = 0, leng = dump.length; i < leng; i++) {
                if(dump[i] && dump[i].type === "operator" && dump[i].op_p === OPERATOR.AND) {
                    stack.complete();

                    this.append(stack, throw_error);

                    this.append(dump[i], throw_error);

                    stack = new ExpressionGroup(dump[i].position);

                    continue;
                }

                stack.append(dump[i], throw_error);
            }

            stack.complete();

            this.append(stack, throw_error);
        }

        // Stage 3 a | b => (a) | (b)
        if(this.data.filter(e => e.op_p === OPERATOR.OR).length > 0) {
            let dump   = Array.from(this.data),
                stack  = new ExpressionGroup(dump[0].position);
            
            this.data.splice(0, this.data.length);

            for (let i = 0, leng = dump.length; i < leng; i++) {
                if(dump[i] && dump[i].type === "operator" && dump[i].op_p === OPERATOR.OR) {
                    stack.complete();

                    this.append(stack, throw_error);

                    this.append(dump[i], throw_error);

                    stack = new ExpressionGroup(dump[i].position);

                    continue;
                }

                stack.append(dump[i], throw_error);
            }

            stack.complete();

            this.append(stack, throw_error);
        }

        this.validated = true;
    }

    result(heap, source_data, out, throw_error){
        let result = this.data[0] != null ?
            this.data[0].result(heap, source_data, out, throw_error) : Null.create().result();

        for(let i = 1, leng = this.data.length;i < leng;i += 2){
            switch(true){
                case this.data[i].equals(OPERATOR.PLUS):
                    result += this.data[i + 1].result(heap, source_data, out, throw_error);
                break;
                case this.data[i].equals(OPERATOR.MINUS):
                    result -= this.data[i + 1].result(heap, source_data, out, throw_error);
                break;
                case this.data[i].equals(OPERATOR.MULT):
                    result *= this.data[i + 1].result(heap, source_data, out, throw_error);
                break;
                case this.data[i].equals(OPERATOR.DIVIDE):
                    result /= this.data[i + 1].result(heap, source_data, out, throw_error);
                break;
                case this.data[i].equals(OPERATOR.LARGER):
                    result = result > this.data[i + 1].result(heap, source_data, out, throw_error);
                break;
                case this.data[i].equals(OPERATOR.LESS):
                    result = result < this.data[i + 1].result(heap, source_data, out, throw_error);
                break;
                case this.data[i].equals(OPERATOR.EQUAL):
                    result = result == this.data[i + 1].result(heap, source_data, out, throw_error);
                break;
                case this.data[i].equals(OPERATOR.ELARGER):
                    result = result >= this.data[i + 1].result(heap, source_data, out, throw_error);
                break;
                case this.data[i].equals(OPERATOR.ELESS):
                    result = result <= this.data[i + 1].result(heap, source_data, out, throw_error);
                break;
                case this.data[i].equals(OPERATOR.NEQUAL):
                    result = result != this.data[i + 1].result(heap, source_data, out, throw_error);
                break;
                case this.data[i].equals(OPERATOR.AND):
                    result = result && this.data[i + 1].result(heap, source_data, out, throw_error);

                    if(!result)
                        return result;
                break;
                case this.data[i].equals(OPERATOR.OR):
                    result = result || this.data[i + 1].result(heap, source_data, out, throw_error);

                    if(result)
                        return result;
                break;
            }
        }

        return result;
    }
}

class SequenceMainGroup {
    constructor(){
        this.Stack = new Array([0]);
        this.Sequence = new Array();
    }

    pushInStack(emm){
        let StackLink = this.Sequence;

        for(let i = 1, leng = this.Stack.length;i < leng;i++){
            StackLink = StackLink[this.Stack[i]].Sequence;
        }

        if(StackLink instanceof Array)
            StackLink.push(emm);
    }

    join(n){
        this.Stack.push(n);
    }

    out(n){
        this.Stack.splice(n, 1);
    }

    result(heap, source_data, out, throw_error){
        for(let i = 0, leng = this.Sequence.length;i < leng;i++)
            this.Sequence[i].result(heap, source_data, out, throw_error);
    }

    toString(){
        return "ExcecutionGroup [ " + this.Sequence.join(" ") + " ]";
    }
}

module.exports.lexer = function lexer(buffer, allow_spaces = true) {
    const Export = new Array();

    let buff = new Array(),
        is_string = false,
        string_entry = null,
        cur = null,
        last = null;

    for(let i = 0, leng = buffer.byteLength;i < leng;i++){
        switch(buffer[i]){
            case 32: cur = CHARTYPE.SPACE; break;
            case 46: cur = CHARTYPE.POINT; break;
            case 10: cur = CHARTYPE.NEWLINE; break;
            case 48:
            case 49:
            case 50:
            case 51:
            case 52:
            case 53:
            case 54:
            case 55:
            case 56:
            case 57: cur = CHARTYPE.NUMBER; break;
            case 34:
            case 39:
            case 96: cur = CHARTYPE.STRING; break;
            case 60:
            case 61:
            case 62:
            case 63:
            case 43:
            case 44:
            case 45:
            case 47:
            case 40:
            case 41:
            case 42:
            case 59:
            case 58:
            case 38:
            case 123:
            case 124:
            case 125:
            case 91:
            case 93:
            case 33: cur = CHARTYPE.OPERATOR; break;
            default: cur = CHARTYPE.WORD; break;
        }

        if(cur === CHARTYPE.POINT && (last === CHARTYPE.NUMBER || last === CHARTYPE.WORD)){
            buff.push(buffer[i]);

            continue;
        }

        if(cur === CHARTYPE.NUMBER && last === CHARTYPE.WORD){
            buff.push(buffer[i]);

            continue;
        }

        if(cur === CHARTYPE.OPERATOR && last === CHARTYPE.OPERATOR && buff.length === 1 && (buff[0] === 33 || buff[0] === 60 || buff[0] === 62) && buffer[i] === 61){
            buff.push(buffer[i]);
            
            if(allow_spaces || last !== CHARTYPE.SPACE)
                Export.push(new LexerEntry(last, Buffer.from(buff), i, string_entry));

            string_entry = null;

            buff.splice(0, buff.length);

            last = undefined;

            if(i + 1 === leng)
                return Export;

            continue;
        }

        if(!is_string){
            if(
                (
                    cur != last ||
                    last == CHARTYPE.STRING ||
                    last == CHARTYPE.OPERATOR
                )
                &&
                last != undefined
            ){
                if(allow_spaces || last !== CHARTYPE.SPACE)
                    Export.push(new LexerEntry(last, Buffer.from(buff), i, string_entry));

                string_entry = null

                buff.splice(0, buff.length);
            }

            if(cur === CHARTYPE.STRING){
                is_string = true;
                
                string_entry = buffer[i];

                last = cur;

                continue;
            }
            
            buff.push(buffer[i]);

            last = cur;
        } else {
            if(cur === CHARTYPE.STRING && buffer[i] === string_entry){
                is_string = false;

                last = cur;

                continue;
            }

            buff.push(buffer[i]);

            last = cur;
        }
    }

    if(allow_spaces || cur !== CHARTYPE.SPACE)
        Export.push(
            new LexerEntry(cur,
                Buffer.from(
                    buff
                ),
                buffer.byteLength - buff.length - 1,
                string_entry
            )
        );
                    
    return Export;
}

function parseFunction(name, start, data, throw_error) {
    let brack_index = 1, // 1 Скобка априори открыта, ведь в эту функцию ещё нужно зайти
        args = new Array(), buffer = new Array();

    function push(token, fa = false){
        if(buffer.length !== 0 || (buffer.length === 0 && args.length === 0 && fa)) {
            args.push(parseExpression(0, buffer, throw_error).data);

            buffer.splice(0, buffer.length);
        } else
            throw_error(token.position, new ParserEmtyArgumentException());
    }

    for(let i = start, leng = data.length + 1;i < leng;i++){
        if(data[i].equals(CHARTYPE.OPERATOR, "(")){
            buffer.push(data[i]);

            brack_index ++;
        } else if(data[i].equals(CHARTYPE.OPERATOR, ")")) {
            if(brack_index === 1){
                push(data[i], true);

                return {
                    data: new FunctionCall(name, args, data[i].thrower, data[i].position),
                    jump: i - start
                };
            }

            if(--brack_index < 0){
                throw_error(token.position, new ParserLogicException());
            };

            buffer.push(data[i]);
        } else if(data[i].equals(CHARTYPE.OPERATOR, ",") && brack_index === 1) {
            push(data[i], false);
        } else {
            buffer.push(data[i]);
        }
    }
}

function parseTernar(condition, start, data, throw_error) {
    let brack_index = 0, // Считаем скобки
        buffer = new Array(), args = new Array();

    function push(token){
        if(buffer.length !== 0) {
            args.push(parseExpression(0, buffer, throw_error).data);

            buffer.splice(0, buffer.length);
        } else
            throw_error(token != undefined ? token.position : data[start], new ParserEmtyArgumentException());
    }

    for(let i = start, leng = data.length + 1;i < leng;i++){
        if(
            data[i] === undefined ||
            data[i].equals(CHARTYPE.OPERATOR, ";") ||
            data[i].equals(CHARTYPE.NEWLINE) ||
            data[i].equals(CHARTYPE.OPERATOR, ")") && brack_index <= 0
        ){
            push(data[i]);

            if(args[0] === undefined || args[1] === undefined)
                throw_error(data[start].position, new ParserEmtyArgumentException());

            return {
                data: new TernarOperator(condition, args[0], args[1]),
                jump: i - start - (data[i] && data[i].equals(CHARTYPE.OPERATOR, ")") ? 1 : 0)
            }
        }

        if(data[i].equals(CHARTYPE.OPERATOR, "(")){
            buffer.push(data[i]);

            brack_index++;
        } else if(data[i].equals(CHARTYPE.OPERATOR, ")")) {
            buffer.push(data[i]);

            brack_index--;
        } else if(data[i].equals(CHARTYPE.OPERATOR, ":") && brack_index === 0 && args.length === 0) {
            push(data[i]);
        } else if(data[i].equals(CHARTYPE.OPERATOR, ":") && brack_index === 0 && args.length !== 0) {
            throw_error(data[i].position, new ParserLogicException());
        } else {
            buffer.push(data[i]);
        }
    }
}

function parseExpression(start, data, throw_error) {
    if(data.length === 0)
        return {
            data: new ExpressionGroup(0),
            jump: 0
        }

    let buffer = new ExpressionGroup(data[0].position),
        deep = 0, result;

    function append(d) {
        let targ_d = buffer;

        for(let i = 0;i < deep;i++){
            targ_d = targ_d.data[targ_d.data.length - 1];
        }

        return targ_d.append(d, throw_error);
    }

    for(var i = start, leng = data.length + 1;i < leng;i++){
        if(
            data[i] == undefined
            ||
            data[i].equals(CHARTYPE.OPERATOR, ";")
            ||
            data[i].equals(CHARTYPE.NEWLINE)
        ){
            buffer.complete(throw_error);

            return {
                data: buffer,
                jump: i - start
            }
        }

        switch(true){
            case // arg[1]
                i + 3 < leng &&
                data[i].equals(CHARTYPE.WORD) &&
                data[i + 1].equals(CHARTYPE.OPERATOR, "[") &&
                data[i + 2].equals(CHARTYPE.NUMBER) &&
                data[i + 3].equals(CHARTYPE.OPERATOR, "]"):
                append(new GetByIndex(data[i], data[i + 2]));

                i += 3;
            continue;
            case // func(....
                i + 2 < leng &&
                data[i].equals(CHARTYPE.WORD) &&
                data[i + 1].equals(CHARTYPE.OPERATOR, "("):
                result = parseFunction(data[i].toString(), i + 2, data, throw_error);

                i += 2 + result.jump;

                append(result.data);
            continue;
            case data[i].equals(CHARTYPE.OPERATOR, "("):
                append(new ExpressionGroup(data[i].position));

                deep++;
            continue;
            case data[i].equals(CHARTYPE.OPERATOR, ")"):
                deep--;

                if(deep < 0)
                    throw_error(data[i].position, new ParserLogicException())
            continue;
            case // expression ? v1 : v2;
                data[i].equals(CHARTYPE.OPERATOR, "?"):

                buffer.complete(throw_error);

                let targ_d = buffer;

                for(let i = 0;i < deep - 1;i++){
                    targ_d = targ_d.data[targ_d.data.length - 1];
                }

                result = parseTernar(deep === 0 ? targ_d : targ_d.data[targ_d.data.length - 1], i + 1, data, throw_error);

                i += 1 + result.jump;

                if(deep === 0)
                    return {
                        data: result.data,
                        jump: i - start
                    }
                else
                    targ_d.data[targ_d.data.length - 1] = result.data;
            continue;
        }

        append(data[i]);
    }
}

module.exports.parser = function parser(entries, throw_error) {
    const Export = new SequenceMainGroup();

    entries[-1] = new LexerEntry(CHARTYPE.START, "", 0);

    for(let i = 0, leng = entries.length + 1;i < leng;i++){
        if(entries[i] === undefined) break;

        if( // Вывод
            entries[i].equals(CHARTYPE.OPERATOR, ">")
        ){
            const { jump, data } = parseExpression(i + 1, entries, throw_error);

            i += 1 + jump;
            
            Export.pushInStack(new WriteOperator(data))

            continue;
        } else if(entries[i].equals(CHARTYPE.WORD, "set")){ // Оператор set
            if(i + 1 < leng && entries[i + 1].equals(CHARTYPE.WORD)) {
                if(i + 2 < leng && entries[i + 2].equals(CHARTYPE.OPERATOR, "=")) {
                    const { jump, data } = parseExpression(i + 3, entries, throw_error);

                    Export.pushInStack(new SetOperator(entries[i + 1], data));

                    i += jump + 3;

                    continue;
                } else {
                    throw_error(entries[i + 3].position, 'Expected word type expression and get ' + entries[i + 2].toString() + "[" + entries[i + 2].type + "]")
                }
            } else {
                throw_error(entries[i + 2].position, 'Expected word type expression and get ' + entries[i + 1].toString() + "[" + entries[i + 1].type + "]")
            }
        } else if(
            entries[i].equals(CHARTYPE.WORD) && 
            i + 1 < leng && entries[i + 1].equals(CHARTYPE.OPERATOR, "=")
        ){
            const { jump, data } = parseExpression(i + 2, entries, throw_error);

            Export.pushInStack(new ResetOperator(entries[i], data));

            i += jump + 2;

            continue;
        } else if( // Безусловные действия
            (
                entries[i].equals(CHARTYPE.WORD) &&
                i + 1 < leng && entries[i + 1].equals(CHARTYPE.OPERATOR, "(")
            ) ||
            (
                entries[i].equals(CHARTYPE.NUMBER) ||
                entries[i].equals(CHARTYPE.STRING)
            )
        ){
            const { jump, data } = parseExpression(i, entries, throw_error);
            
            Export.pushInStack(data);

            i += jump;

            continue;
        }
    }

    return Export;
}

module.exports.CodeEmitter = class CodeEmitter {
    constructor(input, import_s = [], logger = console.log){
        this.input = input;
        this.logger = logger;

        this.heap = new module.exports.Heap(Import(["default.lib", ...import_s], logger));

        if(typeof input !== "string")
            throw new TypeError('The `input` parameter must have a string type. But now `input` have a `' + typeof string + '` type.');
    }

    setHeap(heap){
        if(heap instanceof module.exports.Heap)
            this.heap = heap;
        else
            throw new TypeError();
    }

    throwError(pos, message, rad_of = 5) {
        rad_of = parseInt(rad_of);

        let buffer = [message instanceof Error ? message.message : message],
            data = this.input.split("\n"),
            line_dump = Buffer.from(this.input).subarray(0, pos).toString("utf8").split("\n"),
            line = line_dump.length - 1,
            line_start = line - parseInt(rad_of / 2) < 0 ? 0 : line - parseInt(rad_of / 2),
            line_end = line_start + rad_of < data.length ? line_start + rad_of : data.length,
            ll = line_end.toString(16).length + 2;
        
        buffer.push(', at ', line, ':' + line_dump[line].length, ' symbol :>\n');

        for(let i = line_start;i < line_end;i++){
            buffer.push(" ", toFixed(i, ll), " |> ", data[i]);

            if(i === line){
                buffer.push("\n ", new Array(ll + 1).join(" "), " |> " + new Array(line_dump[line].length).join(" "), "^");
            }

            if(i + 1 !== line_end)
                buffer.push("\n");
        }

        this.logger.error(buffer.join(""))

        if(message instanceof Error)
            throw message;
        else
            throw new ParserException();
    }


    result(data = new module.exports.Heap()) {
        // Do something
    }
}

// Message pattern
//
// No formated message
// {
//      // Your code here
// }
module.exports.MessagePattern = class MessagePattern extends module.exports.CodeEmitter {
    constructor(string, import_s, logger = console.log){
        super(string, import_s, logger);

        this.data = new Array();

        const entries = module.exports.lexer(Buffer.from(this.input)),
              buffer = new Array();

        let brack_index = 0;

        for(let i = 0, leng = entries.length;i < leng;i++){
            if(entries[i].equals(CHARTYPE.OPERATOR, "{") && brack_index === 0){
                this.data.push(new WriteOperator(new String(new LexerEntry(CHARTYPE.WORD, Buffer.from(buffer.join("")), entries[i].position))));

                buffer.splice(0, buffer.length);

                brack_index++;

                continue;
            } else if(entries[i].equals(CHARTYPE.OPERATOR, "}") && brack_index === 1){
                this.data.push(module.exports.parser(buffer.filter(e => e.type !== CHARTYPE.SPACE), this.throwError.bind(this)));

                buffer.splice(0, buffer.length);

                brack_index--;

                continue;
            } else {
                switch(true){
                    case entries[i].equals(CHARTYPE.OPERATOR, "{"):
                        brack_index++;
                    break;
                    case entries[i].equals(CHARTYPE.OPERATOR, "}"):
                        brack_index--;
                    break;
                }
            }

            if(!brack_index === 0)
                buffer.push(entries[i].toString());
            else
                buffer.push(entries[i]);
        }

        if(buffer.length !== 0)
            if(brack_index === 1){
                this.data.push(module.exports.parser(buffer.filter(e => e.type !== CHARTYPE.SPACE), this.throwError.bind(this)));

                buffer.splice(0, buffer.length);
            } else if(brack_index === 0) {
                this.data.push(new WriteOperator(new String(new LexerEntry(CHARTYPE.WORD, Buffer.from(buffer.join("")), entries[entries.length - 1].position))));

                buffer.splice(0, buffer.length);
            } else {
                this.throwError(entries[entries.length - 1].position, new UnexpectedTokenException(entries[entries.length - 1], '}'))
            }
    }

    result(data = new module.exports.Heap(), error = this.throwError.bind(this)) {
        const out = new Array();

        if(typeof data === "object" && !(data instanceof module.exports.Heap)){
            let d_data = new module.exports.Heap();

            for(let key in data)
                d_data.set(key, data[key]);

            data = d_data;
        }

        if(data instanceof module.exports.Heap) {
            for(let i = 0, leng = this.data.length;i < leng;i++)
                this.data[i].result(this.heap, data, out, error);
        } else {
            throw new TypeError("Data must have a Heap type");
        }

        return out.join("");
    }
}

// Code only excecution pattern
module.exports.ExcecutionPattern = class ExcecutionPattern extends module.exports.CodeEmitter {
    constructor(string, import_s, logger = console.log){
        super(string, import_s, logger);

        this.data = module.exports.parser(module.exports.lexer(Buffer.from(this.input)).filter(e => e.type !== CHARTYPE.SPACE), this.throwError.bind(this));
    }

    result(data = new module.exports.Heap(), error = this.throwError.bind(this)) {
        const out = new Array();

        if(typeof data === "object" && !(data instanceof module.exports.Heap)){
            let d_data = new module.exports.Heap();

            for(let key in data)
                d_data.set(key, data[key]);

            data = d_data;
        }

        if(data instanceof module.exports.Heap) {
            this.data.result(this.heap, data, out, error);
        } else {
            throw new TypeError("Data must have a Heap type");
        }

        return out.join("");
    }
}

// Expression only pattern
module.exports.ExpressionPattern = class ExpressionPattern extends module.exports.CodeEmitter {
    constructor(string, import_s, logger = console.log){
        super(string, import_s, logger);

        this.data = parseExpression(0, module.exports.lexer(Buffer.from(this.input), false), this.throwError.bind(this)).data;
    }

    result(data = new module.exports.Heap(), error = this.throwError.bind(this)) {
        if(typeof data === "object" && !(data instanceof module.exports.Heap)){
            let d_data = new module.exports.Heap();

            for(let key in data)
                d_data.set(key, data[key]);

            data = d_data;
        }

        if(data instanceof module.exports.Heap) {
            return this.data.result(this.heap, data, [], error);
        } else {
            throw new TypeError("Data must have a Heap type");
        }
    }
}