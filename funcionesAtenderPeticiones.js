var fbd = require( __dirname + '/funcionesBaseDatos.js');
var fr = require( __dirname + '/funcionesResponder.js');
var funcionesExtra = require( __dirname + '/funcionesExtra.js');
var funcionesArchivos = require( __dirname + '/funcionesArchivos.js');

//CARGA DE LIBRERIAS EXTERNAS CON REQUIRE
var ClaseAsync = require("async");//para trabajar con semaforos de procesos asincronos

var seguroSemaforo = false;//se usa para asegurar que solo accede un cliente a un recurso

//------------------------PRIVADAS----------------------------------

//recorre todos los usuarios de la simulacion y coge sus tableros con sus respuestas
//reune todas las respuestas en un tableroGlobal
//marca los usuarios como no preparados
//mueve gente, realiza nacimientos
//
function ejecutaPaso(respuesta, idSimulacion, paso, retrollamada){	
	ClaseAsync.series([
		function(retrollamada2){fbd.dameListaEspeciesSimulacionBBDD(idSimulacion,retrollamada2)},
		function(retrollamada2){fbd.dameFecundacionesSimulacionBBDD(idSimulacion,retrollamada2)}
	],function(err,resultados){
		var listaEspeciesSimulacion = resultados[0];
		var fecundaciones = resultados[1];
		var i;
		//marca todos los usuarios como no preparados
		for(i=0;i<listaEspeciesSimulacion.length;i++){	
			var idUsuario = listaEspeciesSimulacion[i].ID_ESPECIE;	
			//se marca este usuario como no preparado a que el servidor ejecute el siguiente paso
			fbd.marcarPreparadoONoBBDD(respuesta,idUsuario,0);
		}
		
		//si es entrar en la simulacion
		if(paso<0){
			for(i=0;i<listaEspeciesSimulacion.length;i++){	
				var idUsuario = listaEspeciesSimulacion[i].ID_ESPECIE;
				creaPasoInicial(respuesta,idSimulacion,idUsuario,0,function(){});	
			}
			fbd.incrementaPasoSimulacionBBDD(idSimulacion);
			retrollamada();
		}
		//si es algun paso de la simulacion
		else{
			//aniade las funciones de manera ordenada a una lista de funciones
			var listaParamMap = [];
			for(i=0;i<listaEspeciesSimulacion.length;i++){				
				var idUsuario = listaEspeciesSimulacion[i].ID_ESPECIE;							
				//encapsulamos todos los parametros en un solo objeto para usar map
				var paramMap = {"idSimulacion":idSimulacion,"idUsuario":idUsuario,"paso":paso};
				listaParamMap.push(paramMap);						
			}
			//ejecuta de manera ordenada el tratamiento de tableros de cada jugador
			ClaseAsync.map(listaParamMap,fbd.dameTableroPasoBBDD,function(err2,resultados2){
				var tableroGlobal = {"casillas":[],"individuos":[]};
				//actualiza de manera ordenada el tablero global con lo devuelto por la lista de lambdas, los tableros
				//recorre los indivs del primer tab
				var gente = resultados2[0].individuos;//coge los individuos de ese tablero, son el mismo num de indivs para todos los tableros
				tableroGlobal.casillas = resultados2[0].casillas;
				for(i=0;i<gente.length;i++){
					//guarda en ese indiv del tab global la info del indiv del tab de la especie a la que pertenece ese indiv
					var tabDeEspecieDeI = resultados2[gente[i].especie];
					tableroGlobal.individuos.push(tabDeEspecieDeI.individuos[i]);				
				}					
				funcionesExtra.movimientosNacimientos(tableroGlobal,fecundaciones);
				for(i=0;i<fecundaciones.length;i++){
					var fecundacion = fecundaciones[i];
					fbd.actualizaFecundacionSimulacionBBDD(idSimulacion,fecundacion);
				}				
				var tableroStringGlobal = JSON.stringify(tableroGlobal);
				//ejecuta en serie la obtencion de codigos de cada jugador, lo devuelve ordenado
				ClaseAsync.map(listaParamMap,fbd.dameCodigosPasoBBDD,function(err3,resultados3){
					var listaParamMap3 = [];
					for(i=0;i<listaEspeciesSimulacion.length;i++){
						var idUsuario3 = listaEspeciesSimulacion[i].ID_ESPECIE;
						var codM1=resultados3[i][0];
						var codH1=resultados3[i][1];
						var paramMap3 = {"res":respuesta,"idSim":idSimulacion,"paso":paso+1,"idUsu":idUsuario3,
							"tab":tableroStringGlobal,"codM":codM1,"codH":codH1};
						listaParamMap3.push(paramMap3);
					}				
					//ejecuta en paralelo la creacion del sig paso, el mismo para cada jugador
					ClaseAsync.map(listaParamMap3,fbd.creaPasoUsuarioBBDD,function(err4,resultados4){
						fbd.incrementaPasoSimulacionBBDD(idSimulacion);
						retrollamada();
					});
				});								
			});			
		}
	});
}

function creaPasoInicial(respuesta, idSimulacion, idUsuario, paso, retrollamadaParam){
	//crea el paso0 para el jugador que se acaba de unir
	var tableroString = JSON.stringify(funcionesExtra.dameTableroInicial());	
	ClaseAsync.series([function(retrollamada){fbd.dameCodigosEspecieBBDD(idUsuario,retrollamada)}],
		function (err, resultados){
			var paramMap = {"res":respuesta,"idSim":idSimulacion,"paso":paso,"idUsu":idUsuario,
				"tab":tableroString,"codM":resultados[0][0],"codH":resultados[0][1]};
			ClaseAsync.series([function(retrollamada3){fbd.creaPasoUsuarioBBDD(paramMap,retrollamada3)}],
				function (err2, resultados2){
					if(err){
						retrollamadaParam(err);
					}
					else if(err2){
						retrollamadaParam(err2);
					}
					else{
						retrollamadaParam(null);
					}
				}
			);
		}
	);
}

//------------------------PUBLICAS----------------------------------
//coge el tablero del paso actual, extrae la lista de los individuos, por cada individuo mira 
//para obtener los ids de los machos usa dameIndividuosEspecieSexoBBDD con M, y recorre esos ids
//-usando la funcion dameTableroActualizadoUsuario recoge 
//-las respuestas de los machos: semillas y movimientos
//-dameTableroActualizadoUsuario devuelve el tablero con estas respuestas actualizadas
//guarda el tablero (con los movs y semillas) en BBDD con actualizaTableroPasoBBDD
//envia pagina a la simulacion, para que el usuario espere a que los demas hayan terminado esta fase
//actualizaListaEspecies
var decisionMachos = module.exports.decisionMachos = function(peticion,respuesta){
	var idUsuario = peticion.session.idUsuario;
	var idSimulacion = peticion.session.idSimulacion;	
	var paso = peticion.session.paso;
	var fase = peticion.session.fase;
	//solo si la simulacion esta en la fase 1 que la de machos, la sesion del jugador esta tambien en fase 1
	//y el paso del jugador es el de la simulacion
	ClaseAsync.series([
		function(retrollamada1){fbd.dameFaseSimulacionBBDD(idSimulacion,idUsuario,retrollamada1)},
		function(retrollamada1){fbd.damePasoSimulacionBBDD(idSimulacion,retrollamada1)}],
	function (err, resultados){
		if(fase==1 && resultados[0]==1 && resultados[1]==paso && err==null){
			//encapsulamos todos los parametros en un solo objeto porque se usa map despues con dameTableroPasoBBDD
			var paramMap = {"idSimulacion":idSimulacion,"idUsuario":idUsuario,"paso":paso};
			//recoge la lista de machos y el tablero de este paso
			ClaseAsync.parallel([
				function(retrollamada2){fbd.dameIndividuosEspecieSexoBBDD(idSimulacion, idUsuario, "M",retrollamada2)},
				function(retrollamada2){fbd.dameTableroPasoBBDD(paramMap,retrollamada2)}],
			function(err2,resultados2){
				if(err2){
					funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err2}));
				}
				else{
					//guarda las decisiones de los machos en el tablero del paso actual
					var tablero = resultados2[1];
					funcionesExtra.dameTableroActualizadoUsuario(peticion,resultados2[0],tablero,"s");	
					var tableroString = JSON.stringify(tablero);					
					ClaseAsync.series([
						function(retrollamada3){fbd.actualizaTableroPasoBBDD(respuesta,idSimulacion, idUsuario, paso, tableroString,retrollamada3)}],
					function(err3,resultados3){
						if(err3){
							funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err3}));
						}
						else{													
							//este usuario esta preparado a que el servidor ejecute el siguiente paso
							fbd.marcarPreparadoONoBBDD(respuesta,idUsuario,1);
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

//coge el tablero del paso actual, extrae la lista de los individuos, por cada individuo mira 
//para obtener los ids de las hembras usa dameIndividuosEspecieSexoBBDD con H, y recorre esos ids
//-usando la funcion dameTableroActualizadoUsuario recoge 
//-las respuestas de las hembras: decisiones y movimientos
//-dameTableroActualizadoUsuario tb actualiza la info de los individuos del tablero, sus respuestas
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
	ClaseAsync.series([
		function(retrollamada1){fbd.dameFaseSimulacionBBDD(idSimulacion,idUsuario,retrollamada1)},
		function(retrollamada1){fbd.damePasoSimulacionBBDD(idSimulacion,retrollamada1)}],
	function (err, resultados){
		if(fase==0 && resultados[0]==0 && resultados[1]==paso && err==null){			
			//encapsulamos todos los parametros en un solo objeto porque se usa map despues con dameTableroPasoBBDD
			var paramMap = {"idSimulacion":idSimulacion,"idUsuario":idUsuario,"paso":paso};
			ClaseAsync.parallel([
				function(retrollamada2){fbd.dameIndividuosEspecieSexoBBDD(idSimulacion, idUsuario, "H",retrollamada2)},
				function(retrollamada2){fbd.dameTableroPasoBBDD(paramMap,retrollamada2)}],
			function(err2,resultados2){
				if(err2){
					funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err2}));
				}
				else{
					var tablero = resultados2[1];
					funcionesExtra.dameTableroActualizadoUsuario(peticion,resultados2[0],tablero,"d");
					var tableroString = JSON.stringify(tablero);					
					fbd.actualizaTableroPasoBBDD(respuesta,idSimulacion, idUsuario, paso, tableroString,function(){});
					var nuevosCodigosEspecie=[];
					nuevosCodigosEspecie.push(peticion.body.nameCodigoMacho);
					nuevosCodigosEspecie.push(peticion.body.nameCodigoHembra);
					var paramMap = {"idSimulacion":idSimulacion,"idUsuario":idUsuario,"paso":paso};
					//coge los codigos del paso anterior, evolucionan los codigos del paso actual y  despues envia tablero y codigos paso anterior a los machos
					ClaseAsync.parallel([
						function(retrollamada3){fbd.dameCodigosPasoBBDD(paramMap,retrollamada3)},
						function(retrollamada3){fbd.actualizaCodigosPasoBBDD(idSimulacion, idUsuario, paso, nuevosCodigosEspecie,retrollamada3)}],
					function(err3,resultados3){
						if(err3){
							funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err3}));
						}
						else{
							var codigos = resultados3[0];	
							peticion.session.fase = 1;
							fase=1;						
							ClaseAsync.series([
								function(retrollamada4){fbd.dameIndividuosEspecieSexoBBDD(idSimulacion, idUsuario, "M",retrollamada4)}],
								function (err4, resultados4){
								if(err4){
									funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err4}));
								}
								else{								
									fr.enviaTableroMachos(respuesta,idSimulacion,idUsuario,tablero, codigos,resultados4[0]);
								}
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
	ClaseAsync.series([
		function(retrollamada1){fbd.miraSiListosSigPasoBBDD(idSimulacion,retrollamada1)},
		function(retrollamada1){fbd.damePasoSimulacionBBDD(idSimulacion,retrollamada1)}],
	function(err1,resultados1){
		//si estan todos listos o ya se les puso como no preparados y se incremento el paso
		//entonces ejecuta el paso o enviasemillashembras, respestivamente
		if(!seguroSemaforo && (resultados1[0] || (resultados1[1]==paso+1))){
			//si el paso de la sim es el paso de sim que tiene este usuario en su sesion
			//entonces estan todos listos asi que ejecuta el paso
			if(!seguroSemaforo && resultados1[1]==paso){
				seguroSemaforo=true;
				//ejecuta el paso anterior(todas las decisiones recien enviadas) 
				ClaseAsync.series([
					function(retrollamada2){fbd.dameListaEspeciesSimulacionBBDD(idSimulacion,retrollamada2)},
					function(retrollamada2){ejecutaPaso(respuesta,idSimulacion,paso,retrollamada2)}],
				function(err2,resultados2){
					if(err2){
						funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err2}));
					}
					else{
						seguroSemaforo=false;
						funcionesArchivos.leeArchivo( __dirname + "\\simulacionIni.html", fr.enviaListaEspeciesSimulacion.bind({respuesta: respuesta, listaEspecies:resultados2[0]}) );
					}
				});
			}
			//si el paso de la simulacion ha incrementado y el paso que tiene en sesion este usuario no
			//entonces incrementarlo y enviarle semillas a sus hembras para que decidan, fase0
			else{
				var paramMap = {"idSimulacion":idSimulacion,"idUsuario":idUsuario,"paso":paso};				
				ClaseAsync.series([
					function(retrollamada2){fbd.dameCodigosPasoBBDD(paramMap,retrollamada2)}
				],function(err2,resultados2){	
					if(err2){
						funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err2}));
					}
					else{
						ClaseAsync.series([function(retrollamada3){fbd.dameIndividuosEspecieSexoBBDD(idSimulacion, idUsuario, "H",retrollamada3)}],function (err3, resultados3){
							if(err3){
								funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err3}));
							}
							else{
								peticion.session.fase = 0;
								peticion.session.paso = paso+1;							
								fr.enviaSemillasHembras(respuesta, idSimulacion, idUsuario, resultados2[0], resultados3[0]);
							}	
						});								
					}	
				});
			}			
		}
		//si todavia no estan todos listos ni se ha incrementado el paso de la simu, seguir esperando
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
	peticion.session.paso=-1;
	peticion.session.fase=0;
	var idSimulacion = peticion.session.idSimulacion;
	var idUsuario = peticion.session.idUsuario;
	ClaseAsync.series([		
		function(retrollamada){creaPasoInicial(respuesta,idSimulacion,idUsuario,-1,retrollamada)},
		function(retrollamada){fbd.dameListaEspeciesSimulacionBBDD(idSimulacion,retrollamada)}],
	function (err, resultados){
		if(err){
			funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaMensaje.bind({respuesta: respuesta, mensaje:err}));
		}
		else{
			funcionesArchivos.leeArchivo( __dirname + "\\simulacionIni.html", fr.enviaListaEspeciesSimulacion.bind({respuesta: respuesta, listaEspecies:resultados[1]}) );
		}
	});	
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