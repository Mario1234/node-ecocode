var ClaseFs = require("fs");//para leer archivos del sistema

var leeArchivo = module.exports.leeArchivo  = function(ruta, retrollamada){
    ClaseFs.readFile(ruta, 'utf8', retrollamada);
}