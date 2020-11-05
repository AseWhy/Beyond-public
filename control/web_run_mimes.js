module.exports.MIME = {
    '.svg': 'image/svg+xml',
    '.svgz': 'image/svg+xml',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.jfif': 'image/jpeg',
    '.jpe': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.tiff': 'image/tiff',
    '.ico': 'image/vnd.microsoft.icon',
    '.wbmp': 'image/vnd.wap.wbmp',
    '.webp': 'image/webp',
    '.css': 'text/css',
    '.html': 'text/html',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.xml': 'text/xml',
    '.php': 'text/php',
    '.js': 'text/javascript',
    '.mpeg': 'video/mpeg',
    '.mp4': 'video/mp4',
    '.ogg': 'video/ogg',
    '.webm': 'video/webm',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.3gpp': 'video/3gpp',
    '.3gp': 'video/3gpp',
    '.3gpp2': 'video/3gpp2',
    '.3g2': 'video/3gpp2',
    '.json': 'application/javascript',
    'OTHER': 'application/octet-stream'
}

module.exports.getMIME = extension => {
    if(module.exports.MIME[extension] != undefined)
        return module.exports.MIME[extension];
    else
        return module.exports.MIME.OTHER
}