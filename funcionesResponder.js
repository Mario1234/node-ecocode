var fbd = require( __dirname + '/funcionesBaseDatos.js');

function enviaCadenaHTML(respuesta, html_cadena) {
    respuesta.writeHead(200, { 'Content-Type': 'text/html' });
    respuesta.write(html_cadena);
    respuesta.end();
}

var enviaSemillasHembras = module.exports.enviaSemillasHembras = function(respuesta, idSimulacion, idUsuario, codigosEspecie){	
	var iniHembras = "<html><head></head><body><script>";
	var hembrasHTML = iniHembras+codigosEspecie[1]+"</script><form id='idDecisionHembrasForm' action='/decisionhembras' method='post'>";
	hembrasHTML+="<input type='hidden' id='idCodigoMacho' name='nameCodigoMacho' value='"+codigosEspecie[0]+"'>";
	hembrasHTML+="<input type='hidden' id='idCodigoHembra' name='nameCodigoHembra' value='"+codigosEspecie[1]+"'>";
	hembrasHTML+="<ul id='idHembras'>";
	var hembras = fbd.dameIndividuosEspecieSexoBBDD(idSimulacion, idUsuario, "H");
	var i;
	for(i=0;i<hembras.length;i++){
		//manda la decision de aceptar semilla como no aceptar por defecto
		hembrasHTML+="<li><input type='hidden' id='"+hembras[i].id+"' name='"+hembras[i].id+"' value='{'movimiento':'NO','decision':'N'}'>"+hembras[i].semilla+"</li>";
	};
	hembrasHTML+="</ul></form></body></html>";
	enviaCadenaHTML(respuesta,hembrasHTML);
}

var enviaTableroMachos = module.exports.enviaTableroMachos = function(respuesta, idSimulacion, idUsuario, tablero, codigosEspecie){	
	var iniMachos = "<html><head></head><body><script>";
	var machosHTML = iniMachos+codigosEspecie[0]+"</script><form id='idDecisionMachosForm' action='/decisionmachos' method='post'>";
	machosHTML+="<ul id='idMachos'>";
	var machos = fbd.dameIndividuosEspecieSexoBBDD(idSimulacion, idUsuario, "M");
	var i;
	for(i=0;i<machos.length;i++){
		//manda la decision de aceptar semilla como no aceptar por defecto
		machosHTML+="<li><input type='hidden' id='"+machos[i].id+"' name='"+machos[i].id+"' value='{'movimiento':'NO','semilla':''}'></li>";
	};
	machosHTML+="</ul></form></body></html>";
	enviaCadenaHTML(respuesta,machosHTML);
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
        if(this.rows[0].filas>0){					
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