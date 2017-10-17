var fbd = require( __dirname + '/funcionesBaseDatos.js');
var fr = require( __dirname + '/funcionesResponder.js');
var funcionesExtra = require( __dirname + '/funcionesExtra.js');
var funcionesArchivos = require( __dirname + '/funcionesArchivos.js');

//CARGA DE LIBRERIAS EXTERNAS CON REQUIRE
var ClaseAsync = require("async");//para trabajar con semaforos de procesos asincronos

//------------------------PRIVADAS----------------------------------

//recorre todos los usuarios de la simulacion y coge sus tableros con sus respuestas
//reune todas las respuestas en un tableroGlobal
//marca los usuarios como no preparados
//mueve gente, realiza nacimientos
//
function ejecutaPaso(respuesta, idSimulacion, paso, retrollamada){
	var i;
	if(paso==0){
		retrollamada();
	}
	else{
		ClaseAsync.series([function(retrollamada2){fbd.dameListaEspeciesSimulacionBBDD(idSimulacion,retrollamada2)}],function(err,resultados){
			var listaEspeciesSimulacion = resultados[0];
			//aniade las funciones de manera ordenada a una lista de funciones
			for(i=0;i<listaEspeciesSimulacion.length;i++){
				var listaFuncionesLambda = [];
				var idUsuarioSimulacion = listaEspeciesSimulacion[i];
				//se marcan como no preparados a que el servidor ejecute el siguiente paso
				fbd.marcarPreparadoONoBBDD(respuesta,idUsuarioSimulacion,0);
				//ENCOLA: pide el tablero con decisiones del paso anterior de cada jugador
				listaFuncionesLambda.push(function(retrollamada3){fbd.dameTableroPasoBBDD(idSimulacion, idUsuarioSimulacion, paso-1,retrollamada3)});							
			}
			//ejecuta de manera ordenada el tratamiento de tableros de cada jugador
			ClaseAsync.series(listaFuncionesLambda,function(err2,resultados2){
				var tableroGlobal = {};
				//actualiza de manera ordenada el tablero global con lo devuelto por la lista de lambdas, los tableros
				//recorre los indivs del primer tab
				var gente = resultados2[0].individuos;//coge los individuos de ese tablero, son el mismo num de indivs para todos los tableros
				tableroGlobal = resultados2[0].casillas;
				for(i=0;i<gente.length;i++){
					//guarda en ese indiv del tab global la info del indiv del tab de la especie a la que pertenece ese indiv
					var tabDeEspecieDeI = resultados2[gente[i].especie];
					tableroGlobal.individuos.push(tabDeEspecieDeI.individuos[i]);				
				}	
				var tableroStringGlobal = JSON.stringify(tableroGlobal);
				var listaFuncionesLambda2 = [];		
				for(i=0;i<listaEspeciesSimulacion.length;i++){
					//ENCOLA: recoge los codigos de cada jugador del paso anterior
					listaFuncionesLambda2.push(function(retrollamada3){fbd.dameCodigosPasoBBDD(idSimulacion,idUsuarioSimulacion,paso-1,retrollamada3)});
				}
				//ejecuta en serie la obtencion de codigos de cada jugador, lo devuelve ordenado
				ClaseAsync.series(listaFuncionesLambda2,function(err3,resultados3){
					var listaFuncionesLambda3 = [];
					for(i=0;i<listaEspeciesSimulacion.length;i++){
						var idUsuarioSimulacion = listaEspeciesSimulacion[i];
						//ENCOLA: se crea el siguiente paso para esa simu y ese usuario, guardando el tablero con las acciones de este paso realizadas
						listaFuncionesLambda3.push(function(retrollamada3){fbd.creaPasoUsuarioBBDD(respuesta,
							idSimulacion,paso,idUsuarioSimulacion,tableroStringGlobal,resultados3[i][0],resultados3[i][1],retrollamada3)});
					}				
					//ejecuta en paralelo la creacion del sig paso, el mismo para cada jugador
					ClaseAsync.parallel(listaFuncionesLambda3,function(err4,resultados4){
						retrollamada();
					});
				});								
			});			
		});
	}	
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
		if(fase==1 && resultados[0]==1 && resultados[1]==paso && err==null){
			//recoge la lista de machos y el tablero de este paso
			ClaseAsync.parallel([
				function(retrollamada2){fbd.dameIndividuosEspecieSexoBBDD(idSimulacion, idUsuario, "M",retrollamada2)},
				function(retrollamada2){fbd.dameTableroPasoBBDD(idSimulacion, idUsuario, paso,retrollamada2)}],
			function(err2,resultados2){
				if(err2){
					funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err2}));
				}
				else{
					//guarda las decisiones de los machos en el tablero del paso actual
					var tablero = funcionesExtra.dameTableroActualizadoUsuario(peticion,resultados2[0],resultados2[1],"s");						
					ClaseAsync.series([
						function(retrollamada3){fbd.actualizaTableroPasoBBDD(respuesta,idSimulacion, idUsuario, paso, tablero,retrollamada3)}],
					function(err3,resultados3){
						if(err3){
							funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err3}));
						}
						else{
							peticion.session.fase = 0;
							peticion.session.paso = paso+1;
							respuesta.redirect("/actualizaListaEspecies");//manda al usuario a esperar a que los demas terminen
						}					
					});
				}				
			});
		}
		else if(err!=null){
			funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err}));
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
		if(fase==0 && resultados[0]==0 && resultados[1]==paso && err==null){
			ClaseAsync.parallel([
				function(retrollamada2){fbd.dameIndividuosEspecieSexoBBDD(idSimulacion, idUsuario, "H",retrollamada2)},
				function(retrollamada2){fbd.dameTableroPasoBBDD(idSimulacion, idUsuario, paso,retrollamada2)}],
			function(err2,resultados2){
				if(err2){
					funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err2}));
				}
				else{
					var tablero = funcionesExtra.dameTableroActualizadoUsuario(peticion,resultados2[0],resultados2[1],"d");					
					fbd.actualizaTableroPasoBBDD(respuesta,idSimulacion, idUsuario, paso, tablero);
					var nuevosCodigosEspecie=[];
					nuevosCodigosEspecie.push(peticion.body.nameCodigoMacho);
					nuevosCodigosEspecie.push(peticion.body.nameCodigoHembra);
					//coge los codigos del paso anterior, evolucionan los codigos del paso actual y  despues envia tablero y codigos paso anterior a los machos
					ClaseAsync.parallel([
						function(retrollamada3){fbd.dameCodigosPasoBBDD(idSimulacion,idUsuario,paso,retrollamada3)},
						function(retrollamada3){fbd.actualizaCodigosPasoBBDD(idSimulacion, idUsuario, paso, nuevosCodigosEspecie,retrollamada3)}],
					function(err3,resultados3){
						if(err3){
							funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err3}));
						}
						else{
							var codigos = resultados3[0];
							peticion.session.fase = 1;
							ClaseAsync.series([function(retrollamada4){fbd.dameIndividuosEspecieSexoBBDD(idSimulacion, idUsuario, "M",retrollamada4)}],function (err4, resultados4){
								fr.enviaTableroMachos(respuesta,idSimulacion,idUsuario,tablero, codigos,resultados4[0]);
							});							
						}					
					});
				}
			});			
		}		
		else if(err!=null){
			funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err}));
		}
	});	
}

var actualizaListaEspecies = module.exports.actualizaListaEspecies = function(peticion,respuesta){
	var idUsuario = peticion.session.idUsuario;
	var idSimulacion = peticion.session.idSimulacion;
	var paso = peticion.session.paso;
	//mira si empieza/continua la simulacion
	//si empieza/continua, recoge codigos especie, ejecuta el paso anterior y enviaSemillasHembras y sino pide la lista de especies de nuevo
	ClaseAsync.series([function(retrollamada1){fbd.miraSiEmpiezaSimulacionBBDD(idSimulacion,retrollamada1)}],function(err1,resultados1){
		if(resultados1[0]){
			//ejecuta el paso anterior var tableroResultadoPaso 
			ClaseAsync.series([
				function(retrollamada2){ejecutaPaso(respuesta,idSimulacion,paso,retrollamada2)},
				function(retrollamada2){fbd.dameCodigosPasoBBDD(idSimulacion,idUsuario,paso,retrollamada2)}
			],function(err2,resultados2){	
				if(err2){
					funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err2}));
				}
				else{
					ClaseAsync.series([function(retrollamada3){fbd.dameIndividuosEspecieSexoBBDD(idSimulacion, idUsuario, "H",retrollamada3)}],function (err3, resultados3){
						fr.enviaSemillasHembras(respuesta, idSimulacion, idUsuario, resultados2[1], resultados3[0]);
					});	
							
				}	
			});
		}
		else{
			//pide la lista de especies de la simulacion y la muestra
			ClaseAsync.series([function(retrollamada2){fbd.dameListaEspeciesSimulacionBBDD(idSimulacion,retrollamada2)}],function(err2,resultados2){
				if(err2){
					funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err2}));
				}
				else{
					funcionesArchivos.leeArchivo( __dirname + "\\simulacionIni.html", fr.enviaListaEspeciesSimulacion.bind({respuesta: respuesta, listaEspecies:resultados2[0]}) );
				}
			});				
		}
	});
}

var marcarPreparado = module.exports.marcarPreparado = function(peticion,respuesta){
	var idUsuario = peticion.session.idUsuario;
	var idSimulacion = peticion.session.idSimulacion;
	fbd.marcarPreparadoONoBBDD(respuesta, idUsuario,1);
}

var entrarSimulacion = module.exports.entrarSimulacion = function(peticion,respuesta){
	var cadenaIdSimulacion = peticion.body.namePulsado;
	peticion.session.idSimulacion = parseInt(cadenaIdSimulacion);
	peticion.session.paso=0;
	peticion.session.fase=0;
	var idSimulacion = peticion.session.idSimulacion;
	var idUsuario = peticion.session.idUsuario;
	//crea el paso0 para el jugador que se acaba de unir
	var tableroString = JSON.stringify(funcionesExtra.dameTableroInicial());
	ClaseAsync.series([function(retrollamada){fbd.dameCodigosEspecieBBDD(idUsuario,retrollamada)}],
		function (err, resultados){
			ClaseAsync.series([function(retrollamada2){fbd.creaPasoUsuarioBBDD(respuesta,idSimulacion,0,idUsuario,tableroString,resultados[0][0],resultados[0][1],retrollamada2)},
				function(retrollamada3){fbd.dameListaEspeciesSimulacionBBDD(idSimulacion,retrollamada3)}],
				function (err2, resultados2){
					if(err){
						funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err}));
					}
					else if(err2){
						funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err2}));
					}
					else{
						funcionesArchivos.leeArchivo( __dirname + "\\simulacionIni.html", fr.enviaListaEspeciesSimulacion.bind({respuesta: respuesta, listaEspecies:resultados2[1]}) );
					}
				}
			);
		}
	);	
}

var listarSimulaciones = module.exports.listarSimulaciones = function(peticion,respuesta){		
	fbd.dameListaSimulacionesActivasBBDD(respuesta);
}

var subirCodigos = module.exports.subirCodigos = function(peticion,respuesta){
	var idUsuario = peticion.session.idUsuario;
	var machoCodigo=peticion.body.machoCodigo;
	var hembraCodigo=peticion.body.hembraCodigo;
	ClaseAsync.series([function(retrollamada){fbd.subeCodigosUsuarioBBDD(respuesta,idUsuario,machoCodigo,hembraCodigo,retrollamada)}],
		function (err, resultados){
			if(err){
				funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta,  mensaje:err}));
			}else{
				funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta,  mensaje:resultados[0]}));
			}
		}
	);
	// console.log("machoCodigo");
	// console.log(machoCodigo);
	// console.log("hembraCodigo");
    // console.log(hembraCodigo);
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