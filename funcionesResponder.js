var fbd = require( __dirname + '/funcionesBaseDatos.js');

//CARGA DE LIBRERIAS EXTERNAS CON REQUIRE
var ClaseAsync = require("async");//para trabajar con semaforos de procesos asincronos

//------------------------PRIVADAS----------------------------------

function enviaCadenaHTML(respuesta, html_cadena) {
    respuesta.writeHead(200, { 'Content-Type': 'text/html' });
    respuesta.write(html_cadena);
    respuesta.end();
}

function quitaFuncionesProhibidas(cadenaCodigo) {
    var cadenaCodigoRes=cadenaCodigo.replace(/XMLHttpRequest/g,"");
    cadenaCodigoRes=cadenaCodigoRes.replace(/jquery/g,"");
    cadenaCodigoRes=cadenaCodigoRes.replace(/FileReader/g,"");
    cadenaCodigoRes=cadenaCodigoRes.replace(/webkitRTCPeerConnection/g,""); 
    cadenaCodigoRes=cadenaCodigoRes.replace(/mozRTCPeerConnection/g,""); 
    return cadenaCodigoRes;
}

//------------------------PUBLICAS----------------------------------

var enviaSemillasHembras = module.exports.enviaSemillasHembras = function(respuesta, idSimulacion, idUsuario, codigosEspecie){
    if(codigosEspecie[0]==null){
        codigosEspecie[0]="";
    }	
    else{
        codigosEspecie[0] = quitaFuncionesProhibidas(codigosEspecie[0]);
        codigosEspecie[0] = codigosEspecie[0].replace(/'/g,"&#39;");//las comillas simples se pasan en nomenclatura HTML
    }
    if(codigosEspecie[1]==null){
        codigosEspecie[1]="";
    }	
    else{
        codigosEspecie[1] = quitaFuncionesProhibidas(codigosEspecie[1]);
        codigosEspecie[1] = codigosEspecie[1].replace(/'/g,"&#39;"); 
    }
	var iniHembras = "<html><head></head><body onload='funcionHembras();'><script>";
	var hembrasHTML = iniHembras+codigosEspecie[1]+"</script><form id='idDecisionHembrasForm' action='/decisionhembras' method='post'>";
	hembrasHTML+="<input type='hidden' id='idCodigoMacho' name='nameCodigoMacho' value='"+codigosEspecie[0]+"'>";
	hembrasHTML+="<input type='hidden' id='idCodigoHembra' name='nameCodigoHembra' value='"+codigosEspecie[1]+"'>";
	hembrasHTML+="<ul id='idHembras'>";
    ClaseAsync.series([function(retrollamada){fbd.dameIndividuosEspecieSexoBBDD(idSimulacion, idUsuario, "H",retrollamada)}],function (err, resultados){
        var indivaux = resultados[0];
        if(indivaux!=null){
            var i;
            for(i=0;i<indivaux.length;i++){
                //manda la decision de aceptar semilla como no aceptar por defecto
                hembrasHTML+="<li><input type='hidden' id='m"+indivaux[i].id+"' name='m"+indivaux[i].id+"' value='NO'>"+indivaux[i].semilla+"</li>";
                hembrasHTML+="<li><input type='hidden' id='d"+indivaux[i].id+"' name='d"+indivaux[i].id+"' value='N'>"+indivaux[i].semilla+"</li>";
            };
            hembrasHTML+="</ul></form></body></html>";
            enviaCadenaHTML(respuesta,hembrasHTML);
        }        
    });   	
}

var enviaTableroMachos = module.exports.enviaTableroMachos = function(respuesta, idSimulacion, idUsuario, tablero){	
	var iniMachos = "<html><head></head><body onload='funcionMachos();'><script>";
    var machosHTML = iniMachos+this.codigosEspecie[0]+"</script><p id='idTablero'>"+JSON.stringify(tablero)+"</p>";
    machosHTML+="<form id='idDecisionMachosForm' action='/decisionmachos' method='post'>";
	machosHTML+="<ul id='idMachos'>";
	ClaseAsync.series([function(retrollamada){fbd.dameIndividuosEspecieSexoBBDD(idSimulacion, idUsuario, "M",retrollamada)}],function (err, resultados){
        var indivaux = resultados[0];
        if(indivaux!=null){
            var i;
            for(i=0;i<indivaux.length;i++){
                //manda la decision de aceptar semilla como no aceptar por defecto
                machosHTML+="<li><input type='hidden' id='m"+indivaux[i].id+"' name='m"+indivaux[i].id+"' value='NO'></li>";
                machosHTML+="<li><input type='hidden' id='s"+indivaux[i].id+"' name='s"+indivaux[i].id+"' value=''></li>";
            };
            machosHTML+="</ul></form></body></html>";
            enviaCadenaHTML(respuesta,machosHTML);
        }        
    });
}

var enviaMensaje = module.exports.enviaMensaje = function(err,html_cadena) {
    if (err) {
      console.log(err);
      html_cadena = html_cadena.replace(/mensaje1a/g, err);  
    }
    else if(this.mensaje){
        html_cadena = html_cadena.replace(/mensaje1a/g, this.mensaje); 
    }
    else{
        html_cadena = html_cadena.replace(/mensaje1a/g, ""); 
    }
    enviaCadenaHTML(this.respuesta,html_cadena);
}

var enviaDatos = module.exports.enviaDatos = function(err2,html_cadena) {
    if (err2) {
      return console.log(err2);
    }
    html_cadena = html_cadena.replace(/usuario1a/g, this.nom);  
    html_cadena = html_cadena.replace(/contrasegna1a/g, this.con);  
    html_cadena = html_cadena.replace(/codigomacho1a/g, this.codM);  
    html_cadena = html_cadena.replace(/codigohembra1a/g, this.codH);     
    enviaCadenaHTML(this.respuesta,html_cadena);
}

var enviaListaSimulaciones = module.exports.enviaListaSimulaciones = function(err2, resultadosRetrollamadas) {
    if(err2){
        console.log(err2);
    }
    else{
        iniCadenaHTML = resultadosRetrollamadas[0];
        finCadenaHTML = resultadosRetrollamadas[1];
        var listaSimulaciones = "";
        if(this.rows.length>0){					
            listaSimulaciones += "<ul>";
            this.rows.forEach(function(row) {
                listaSimulaciones += "<li><button onclick=guardaPulsado('"+row.ID_SIMULACION+"')>"+row.ID_SIMULACION+"</button></li>";
            }, this);
            listaSimulaciones += "</ul>";
        }
        enviaCadenaHTML(this.respuesta,iniCadenaHTML+listaSimulaciones+finCadenaHTML);
    }						
}

var enviaListaEspeciesSimulacion = module.exports.enviaListaEspeciesSimulacion = function (err2,html_cadena) {
    if (err2) {
        return console.log(err2);
    }
    else{
        html_cadena =html_cadena.replace(/listaespecies1a/g, this.listaEspecies);
        enviaCadenaHTML(this.respuesta,html_cadena);
    }
}