'use strict';

const jade = require('jade');
const mime = require('mime');
const fs = require('fs');
const sass = require('node-sass');

const table = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27',
    "/": '&#x2F'
}

function rep_func(match){
    return table[match];
}

jade.filters.escape = function(str){
    return str.replace(/[&"'<>\/]/g, rep_func);
}

exports.sass = function(opts){
    let header = ''
    if(opts.locals) {
        for(let k in opts.locals){
            let v = opts.locals[k];
            header += '$' + k + ': ' + v + ';\n';
        }
        delete opts.locals;
    }

    if(opts.file) {
        let str = fs.readFileSync(opts.file);
        delete opts.file;
        opts.data = str;
    }

    opts.data = header + opts.data;

    return sass.renderSync(opts).css.toString('utf-8');
}

exports.encodeBase64 = function(path){
    let str = fs.readFileSync(path);
    let b = new Buffer(str);
    let m = mime.lookup(path);
    return 'data:' + m + ';base64,' + b.toString('base64');
}

exports.getTimestamp = function(){
    let date = new Date();
    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();
    return '' + year + '/' + (month > 9 ? '' : '0') + month + '/' + (day > 9 ? '' : '0') + day;
}
