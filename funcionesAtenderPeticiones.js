var fbd = require( __dirname + '/funcionesBaseDatos.js');
var fr = require( __dirname + '/funcionesResponder.js');
var funcionesExtra = require( __dirname + '/funcionesExtra.js');
var funcionesArchivos = require( __dirname + '/funcionesArchivos.js');

//CARGA DE LIBRERIAS EXTERNAS CON REQUIRE
var ClaseAsync = require("async");//para trabajar con semaforos de procesos asincronos

//------------------------PRIVADAS----------------------------------

function cogeCodigos(respuesta, idSimulacion, paso,retrollamada){
    var codigos;
    if(paso==0){
        codigos = fbd.dameCodigosEspecieBBDD(idUsuario);
    }
    else{
        codigos = fbd.dameCodigosPasoBBDD(idSimulacion,idUsuario,paso-1);
    }	
    retrollamada(null,codigos);    
}

//------------------------PUBLICAS----------------------------------

var decisionMachos = module.exports.decisionMachos = function(peticion,respuesta){
	var idUsuario = peticion.session.idUsuario;
	var idSimulacion = peticion.session.idSimulacion;	
	var paso = peticion.session.paso;
	var fase = peticion.session.fase;
	//solo si la simulacion esta en la fase 1 que la de machos, la sesion del jugador esta tambien en fase 1
	//y el paso del jugador es el de la simulacion
	ClaseAsync.parallel([
		function(retrollamada1){fbd.dameFaseSimulacionBBDD(idSimulacion,retrollamada1)},
		function(retrollamada1){fbd.damePasoSimulacionBBDD(idSimulacion,retrollamada1)}],
	function (err, resultados){
		if(fase==1 && resultados[0]==1 && resultados[1]==paso){
			ClaseAsync.parallel([
				function(retrollamada2){fbd.dameIndividuosEspecieSexoBBDD(idSimulacion, idUsuario, "M",retrollamada2)},
				function(retrollamada2){fbd.dameTableroPasoBBDD(idSimulacion, idUsuario, paso,retrollamada2)}],
			function(err2,resultados2){
				var machos = resultados2[0];
				var respuestasMachos;
				var i;
				for(i=0;i<machos.length;i++){
					respuestasMachos[i].id=machos[i].id;
					respuestasMachos[i].movimiento = peticion.body["m"+machos[i].id];
					respuestasMachos[i].semilla = peticion.body["s"+machos[i].id];
				}
				var tablero = resultados2[1];
				var individuos = tablero.individuos;
				var i;
				for(i=0;i<individuos.length;i++){
					var individuo = individuos[i];
					var respuestaMacho = funcionesExtra.dameRespuestaId(individuo.id,respuestasMachos);
					if(respuestaMacho!=null){
						individuo.movimiento=respuestaMacho.decisiones.movimiento;
						individuo.semilla=respuestaMacho.decisiones.semilla;
					}
				}				
				ClaseAsync.parallel([
					function(retrollamada3){cogeCodigos(retrollamada3)},
					function(retrollamada3){fbd.actualizaTableroPasoBBDD(idSimulacion, idUsuario, paso, tablero,retrollamada3)}],
				function(err3,resultados3){
					var codigos = resultados3[0];
					peticion.session.fase = 0;
					fr.enviaSemillasHembras(respuesta,idSimulacion,idUsuario,codigos);
				});
			});
		}
	});
}

//recoge las respuestas de las hembras: decisiones y movimientos
//lo recoge de peticion.body.0 si es la hembra con id=0
//para obtener los ids de las hembras usa dameIndividuosEspecieSexoBBDD con H, y recorre esos ids
//coge el tablero del paso actual, extrae la lista de los individuos, por cada individuo mira 
//si tiene una respuesta con dameRespuestaId (solo devolvera respuestas de hembras)
//actualiza la info de los individuos del tablero, sus respuestas
//actualiza los codigos con los codigos de la evolucion de este paso
//recoge los codigos del paso anterior para enviar pagina de toma de decisiones a los machos
//envia pagina de toma de decisiones de los machos
var decisionHembras = module.exports.decisionHembras = function(peticion,respuesta){
	var idUsuario = peticion.session.idUsuario;
	var idSimulacion = peticion.session.idSimulacion;	
	var paso = peticion.session.paso;
	var fase = peticion.session.fase;
	//solo si la simulacion esta en la fase 0 que la de hembras, la sesion del jugador esta tambien en fase 0
	//y el paso del jugador es el de la simulacion
	ClaseAsync.parallel([
		function(retrollamada1){fbd.dameFaseSimulacionBBDD(idSimulacion,retrollamada1)},
		function(retrollamada1){fbd.damePasoSimulacionBBDD(idSimulacion,retrollamada1)}],
	function (err, resultados){
		if(fase==0 && resultados[0]==0 && resultados[1]==paso){
			ClaseAsync.parallel([
				function(retrollamada2){fbd.dameIndividuosEspecieSexoBBDD(idSimulacion, idUsuario, "H",retrollamada2)},
				function(retrollamada2){fbd.dameTableroPasoBBDD(idSimulacion, idUsuario, paso,retrollamada2)}],
			function(err2,resultados2){
				var hembras = resultados2[0];
				var respuestasHembras;
				var i;
				for(i=0;i<hembras.length;i++){
					respuestasHembras[i].id=hembras[i].id;
					var decisionesString = peticion.body[""+hembras[i].id];
					respuestasHembras[i].decisiones=JSON.parse(decisionesString);
				}
				var tablero = resultados[1];
				var individuos = tablero.individuos;
				var i;
				for(i=0;i<individuos.length;i++){
					var individuo = individuos[i];
					var respuestaHembra = funcionesExtra.dameRespuestaId(individuo.id,respuestasHembras);
					if(respuestaHembra!=null){
						individuo.movimiento=respuestaHembra.decisiones.movimiento;
						individuo.decision=respuestaHembra.decisiones.decision;
					}
				}
				fbd.actualizaTableroPasoBBDD(idSimulacion, idUsuario, paso, tablero);
				var nuevosCodigosEspecie;
				nuevosCodigosEspecie[0]=peticion.body.nameCodigoMacho;
				nuevosCodigosEspecie[1]=peticion.body.nameCodigoHembra;
			});
			ClaseAsync.parallel([
				function(retrollamada3){cogeCodigos(retrollamada3)},
				function(retrollamada3){fbd.actualizaCodigosPasoBBDD(idSimulacion, idUsuario, paso, nuevosCodigosEspecie,retrollamada3)}],
			function(err3,resultados3){
				var codigos = resultados3[0];
				peticion.session.fase = 1;
				fr.enviaTableroMachos(respuesta,idSimulacion,idUsuario,tablero, codigos);
			});
		}		
	});	
}

var actualizaListaEspecies = module.exports.actualizaListaEspecies = function(peticion,respuesta){
	var idUsuario = peticion.session.idUsuario;
	var idSimulacion = peticion.session.idSimulacion;
	//recoge codigos especie y mira si empieza la simulacion
	//si empieza enviaSemillasHembras y sino pide la lista de especies de nuevo
	ClaseAsync.series([function(retrollamada){fbd.dameCodigosEspecieBBDD(idUsuario,retrollamada)}],function(err,resultados1){
		ClaseAsync.series([function(retrollamada2){fbd.miraSiEmpiezaSimulacionBBDD(idSimulacion,retrollamada2)}],function(err,resultados2){
			if(resultados2[0]){
				fr.enviaSemillasHembras(respuesta, idSimulacion, idUsuario, resultados1[0]);
			}
			else{
				fbd.dameListaEspeciesSimulacionBBDD(respuesta, idSimulacion, idUsuario);				
			}
		});
	});
}

var marcarPreparado = module.exports.marcarPreparado = function(peticion,respuesta){
	var idUsuario = peticion.session.idUsuario;
	var idSimulacion = peticion.session.idSimulacion;
	fbd.marcarPreparadoBBDD(respuesta, idUsuario);
	//dameListaEspeciesSimulacionBBDD(respuesta, idSimulacion, idUsuario);
}

var entrarSimulacion = module.exports.entrarSimulacion = function(peticion,respuesta){
	var cadenaIdSimulacion = peticion.body.namePulsado;
	peticion.session.idSimulacion = parseInt(cadenaIdSimulacion);
	peticion.session.paso=0;
	peticion.session.fase=0;
	var idSimulacion = peticion.session.idSimulacion;
	var idUsuario = peticion.session.idUsuario;
	fbd.dameListaEspeciesSimulacionBBDD(respuesta, idSimulacion, idUsuario);
}

var listarSimulaciones = module.exports.listarSimulaciones = function(peticion,respuesta){		
	fbd.dameListaSimulacionesActivasBBDD(respuesta);
}

var subirCodigos = module.exports.subirCodigos = function(peticion,respuesta){
	var idUsuario = peticion.session.idUsuario;
	var machoCodigo=peticion.body.machoCodigo;
	var hembraCodigo=peticion.body.hembraCodigo;
	fbd.subeCodigosUsuarioBBDD(respuesta,idUsuario,machoCodigo,hembraCodigo);
	// console.log("machoCodigo");
	// console.log(machoCodigo);
	// console.log("hembraCodigo");
    // console.log(hembraCodigo);
    funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta}));
}

var menuCuenta = module.exports.menuCuenta = function(peticion,respuesta){
	var idUsuario = peticion.session.idUsuario;
	funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta}));
}

var editarCodigos = module.exports.editarCodigos = function(peticion,respuesta){
	var idUsuario = peticion.session.idUsuario;
	respuesta.sendFile(__dirname+"\\editorCodigos.html");
}

var datosUsuario = module.exports.datosUsuario = function(peticion,respuesta){
	var idUsuario = peticion.session.idUsuario;
	fbd.dameDatosUsuarioBBDD(respuesta, idUsuario);
}

//elimina la sesion
var salirCuenta = module.exports.salirCuenta = function(peticion,respuesta){
	peticion.session.destroy(function(error1) {
		if(error1) {
		 	console.log(error1);
		} else {
			respuesta.redirect('/');
		}
	});
}

var cargarLogin = module.exports.cargarLogin = function(peticion,respuesta){
	console.log("cargando login");
	funcionesArchivos.leeArchivo(__dirname + "\\botones.html",fr.enviaMensaje.bind({respuesta: respuesta, mensaje:""}));
}

//la funcion instanciaExpress.get o post devuelve los objetos peticion de la clase Request y respuesta de la clase Response
//lee la cabecera con la contraseña y el mail introducidos por el usuario en botones.html, ambos codificados en base64
var leerDatosLogin = module.exports.leerDatosLogin = function(peticion,respuesta){
	var nombre = "John";
	var contrasegna = "Doe";
	console.log("atiende autentifica");	
	var cabecera=peticion.body.authorization||'';       // cogemos objeto cabecera de peticion
	console.log(cabecera);
    var sinEspacios=cabecera.split("\\s+").pop()||'';           // quitamos los espacios
    var autorizacion=new Buffer(sinEspacios, "base64").toString();    // lo convertimos a bas64
    var partes=autorizacion.split(/:/);                          // partimos en el separador :
      nombre=partes[0];
	  contrasegna=partes[1];
	var sesionPeticion=peticion.session;
	sesionPeticion.nombreUsuario = nombre;//guarda nombre del usuario en sesion
	console.log(nombre+":"+contrasegna);
	fbd.autentificaBBDD(peticion, respuesta, nombre, contrasegna);
	//seguramente se llegue aqui sin tener la respuesta de la consulta sql		
}