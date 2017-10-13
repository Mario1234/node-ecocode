var funcionesExtra = require( __dirname + '/funcionesExtra.js');
var funcionesArchivos = require( __dirname + '/funcionesArchivos.js');
var fr = require( __dirname + '/funcionesResponder.js');

//CARGA DE LIBRERIAS EXTERNAS CON REQUIRE
var ClaseAsync = require("async");//para trabajar con semaforos de procesos asincronos

//Esta funcion decide si la contraseña y el usuario son correctos
//accede a la base de datos guardada en el archivo "miBaseDatos.db"
//compara el usuario con los de la consulta y sino lo casa dice que no existe
//si lo casa compara la contraseña introducida con la de ese registro de la base de datos(el registro casado)
var autentificaBBDD = module.exports.autentificaBBDD = function(peticion, respuesta, nombre, contrasegna) {
	var resultadoLogin = "";
	var dirHTMLrespuesta = "\\errorConexionBBDD.html";//si no tenemos resultado se mantiene al cliente en espera
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT count(id) as filas, id, nombre, contrasegna FROM USUARIO WHERE nombre=?";
	console.log(consultaSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		//crea un hilo paralelo para ejecutar el codigo posterior concurrente
		baseDatos.all(consultaSQL, [nombre], function(err, rows) {
			console.log(rows[0].nombre + ": " + rows[0].contrasegna);
			if(rows[0].filas>0){//mientras no encuentre al usuario introducido sigue buscando
				if(rows[0].nombre==nombre){
					if(rows[0].contrasegna==contrasegna){//si caso el usuario se comprueba la contrseña
						resultadoLogin="contraseña correcta";
						peticion.session.idUsuario = rows[0].id;
                        var mensaje=rows[0].nombre;
                        funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaCuenta.bind({respuesta: respuesta}));
					}
					else{
						resultadoLogin="contraseña incorrecta";
						dirHTMLrespuesta = "\\incorrecta.html";//contraseña incorrecta, advertimos con un html
						respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
					}
				}
			}	
			else{
				resultadoLogin = "no existe ese usuario";
				dirHTMLrespuesta = "\\noexiste.html";//usuario no existe, advertimos con un html
				console.log(resultadoLogin);
				//responde el resultado de la consulta
				respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
			}					
			console.log(resultadoLogin);			
		});	
	});
	baseDatos.close();
	if(baseDatos==null){
		resultadoLogin = "error al conectar con BBDD";
		console.log(resultadoLogin);
		//deberia de mandarse una pagina de error de conexion con BBDD
		respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
	}	
}

var subeCodigosUsuarioBBDD = module.exports.subeCodigosUsuarioBBDD = function(respuesta, idUsuario, machoCodigo,hembraCodigo){
	var dirHTMLrespuesta = "\\errorConexionBBDD.html";//si no tenemos resultado se mantiene al cliente en espera
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT count(*) as conteo FROM CODIGOS_ESPECIE WHERE ID_ESPECIE=?";
	var insertSQL = "INSERT INTO CODIGOS_ESPECIE (ID_ESPECIE, CODIGO_MACHO, CODIGO_HEMBRA) VALUES (?, ?, ?)";
	var updateSQL = "UPDATE CODIGOS_ESPECIE SET (CODIGO_MACHO=?, CODIGO_HEMBRA=?) WHERE ID_ESPECIE = ?";
	console.log(consultaSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		var mensaje = "error al subir los codigos";
		//crea un hilo paralelo para ejecutar el codigo posterior concurrente
		baseDatos.all(consultaSQL,[idUsuario], function(err, rows) {
			if(error){
				mensaje = "error en la consulta a BBDD";
			}
			else{
				if(rows[0].conteo>0){
					baseDatos.run(updateSQL,[machoCodigo,hembraCodigo,idUsuario]);
				}
				else{
					baseDatos.run(insertSQL,[idUsuario,machoCodigo,hembraCodigo]);
				}
				mensaje="datos subidos con exito";
			}						
		});	
		funcionesArchivos.leeArchivo(__dirname + "\\cuenta.html", fr.enviaCuenta.bind({respuesta: respuesta}));
	});
	baseDatos.close();
	if(baseDatos==null){
		//deberia de mandarse una pagina de error de conexion con BBDD
		respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
	}	
}

var dameDatosUsuarioBBDD = module.exports.dameDatosUsuarioBBDD = function(respuesta, idUsuario){
	var dirHTMLrespuesta = "\\errorConexionBBDD.html";//si no tenemos resultado se mantiene al cliente en espera
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT count(nombre) as filas, nombre, contrasegna, codigo_macho, codigo_hembra FROM USUARIO INNER JOIN CODIGOS_ESPECIE ON id=ID_ESPECIE WHERE id=?";
	console.log(consultaSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		//crea un hilo paralelo para ejecutar el codigo posterior concurrente
		baseDatos.all(consultaSQL, [idUsuario], function(err1, rows) {
			if(err1){
				dirHTMLrespuesta = "\\noexiste.html";//usuario no existe, advertimos con un html
				respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
			}
			else{
				var nom = "";var con = "";var codM = "";var codH = "";			
				if(rows[0].filas>0){
					nom = rows[0].nombre;
					con = rows[0].contrasegna;
					codM = rows[0].codigo_macho;
					codH = rows[0].codigo_hembra;
				}
                console.log(nom + ": " + con);
                funcionesArchivos.leeArchivo(__dirname + "\\datos.html", fr.enviaDatos.bind({respuesta: respuesta, nom:nom, con:con, codM:codM, codH:codH}));
			}			
		});	
	});
	baseDatos.close();
	if(baseDatos==null){
		//deberia de mandarse una pagina de error de conexion con BBDD
		respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
	}	
}

function leeRetrollamada(err2,html_cadena) {
	if (err2) {
		console.log(err2);
	}
	return html_cadena;
}

var dameListaSimulacionesActivasBBDD = module.exports.dameListaSimulacionesActivasBBDD = function(respuesta){
	var dirHTMLrespuesta = "\\errorConexionBBDD.html";
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT count(ID_SIMULACION) as filas, ID_SIMULACION FROM SIMULACION WHERE NUMERO_ESPECIES<MAX_NUM_ESPECIES";
	console.log(consultaSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		//crea un hilo paralelo para ejecutar el codigo posterior concurrente
		baseDatos.all(consultaSQL, function(err1, rows) {
			if(err1){
				dirHTMLrespuesta = "\\errorConexionBBDD.html";//usuario no existe, advertimos con un html
				respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
			}
			else{
				var iniCadenaHTML = "<html><head></head><body>";
				var finCadenaHTML = "</body></html>";
				
				ClaseAsync.parallel([
					// esto se ejecuta en paralelo porque no depende de ningun otro proceso
					function(leeRetrollamada) {
                        funcionesArchivos.leeArchivo(__dirname + "\\iniListaSimulaciones.txt", leeRetrollamada);
					},
					//esto se ejecuta en paralelo tambien
					function(leeRetrollamada) {
                        funcionesArchivos.leeArchivo(__dirname + "\\finListaSimulaciones.txt", leeRetrollamada);
					}
					],
					fr.enviaListaSimulaciones.bind({respuesta: respuesta, rows:rows})
                );//fin del paralelismo  			
                //el bind aniade parametros a la funcion retrollamada, en este caso enviaListaSimulaciones tendra respuesta y 
                //rows como parametros extra para poder responder al cliente. para acceder dentro de la funcion se usa this, ejemplo: this.rows
			}
		});
	});
	baseDatos.close();
	if(baseDatos==null){
		respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
	}	
}

//recomendacion: usar insert ignoer en vez de select y luego insert
var dameListaEspeciesSimulacionBBDD = module.exports.dameListaEspeciesSimulacionBBDD = function(respuesta, idSimulacion, idUsuario){
	var tableroString = JSON.stringify(funcionesExtra.dameTableroInicial());
	var dirHTMLrespuesta = "\\errorConexionBBDD.html";
	var sqlite3 = require("sqlite3").verbose();
	var insertSQL = "INSERT INTO PASO_SIMULACION (ID_SIMULACION, PASO, ID_ESPECIE, TABLERO, HECHA_DECISION_HEMBRAS) VALUES (?, ?, ?, ?, ?)";
	var consultaSQL = "SELECT count(ID_ESPECIE) as filas, ID_ESPECIE, nombre, PREPARADO FROM PASO_SIMULACION INNER JOIN USUARIO ON ID_ESPECIE=id WHERE ID_SIMULACION=?";
	var consulta2SQL = "SELECT count(ID_ESPECIE) as filas, ID_ESPECIE FROM PASO_SIMULACION WHERE ID_SIMULACION=? AND ID_ESPECIE=?";
	console.log(consultaSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	//crea el paso0 para el jugador que se acaba de unir
	ClaseAsync.series([function(retroLlama){
		var sentencia;
		baseDatos.all(consulta2SQL,[idSimulacion, idUsuario], function(err1, rows) {
			if(err1){
				respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
			}
			else{
				if(rows[0].filas<=0){
					//insert si no existe, despues de haber hecho el select
					baseDatos.run(insertSQL,[idSimulacion,0,idUsuario,tableroString,0]);
				}				
			}	
			retroLlama();		
		});
	}],function (err, resultados){
		//consigue la lista de jugadores 
		baseDatos.all(consultaSQL,[idSimulacion], function(err1, rows) {
			if(err1){
				respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
			}
			else{
				if(rows[0].filas>0){
					var listaEspecies = "<ul>";
					rows.forEach(function(row) {
						var preparado="esperando...";
						if(row.PREPARADO==1){
							preparado="Listo";
						}
						listaEspecies += "<li><p>"+row.nombre+": "+preparado+"</p></li>";
					}, this);
                    listaEspecies += "</ul>";
                    funcionesArchivos.leeArchivo( __dirname + "\\simulacionIni.html", fr.enviaListaEspeciesSimulacion.bind({respuesta: respuesta, listaEspecies:listaEspecies}) );                    
				}	
				else{
					respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto					
				}				
			}
			baseDatos.close();
		});
	});
	if(baseDatos==null){
		respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
	}	
}
var marcarPreparadoBBDD = module.exports.marcarPreparadoBBDD = function(respuesta, idUsuario){
	var dirHTMLrespuesta = "\\errorConexionBBDD.html";//si no tenemos resultado se mantiene al cliente en espera
	var sqlite3 = require("sqlite3").verbose();
	var updateSQL = "UPDATE USUARIO SET PREPARADO=? WHERE id=?";
	console.log(updateSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		//crea un hilo paralelo para ejecutar el codigo posterior concurrente
		baseDatos.run(updateSQL, [1,idUsuario], function(err1, rows) {
			if(err1){
				dirHTMLrespuesta = "\\noexiste.html";//usuario no existe, advertimos con un html
				respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
				return false;
			}
			else{
				return true;
			}						
		});	
	});
	baseDatos.close();
	if(baseDatos==null){
		respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
	}	
}

var miraSiEmpiezaSimulacionBBDD = module.exports.miraSiEmpiezaSimulacionBBDD = function(idSimulacion){
	var dirHTMLrespuesta = "\\errorConexionBBDD.html";//si no tenemos resultado se mantiene al cliente en espera
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT count(ID_ESPECIE) as filas, MAX_NUM_ESPECIES FROM PASO_SIMULACION INNER JOIN USUARIO ON ID_ESPECIE=id INNER JOIN SIMULACION ON SIMULACION.ID_SIMULACION=PASO_SIMULACION.ID_SIMULACION WHERE SIMULACION.ID_SIMULACION=? AND PREPARADO=1";
	console.log(consultaSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		//crea un hilo paralelo para ejecutar el codigo posterior concurrente
		baseDatos.all(consultaSQL, [idSimulacion], function(err1, rows) {
			if(err1){
				dirHTMLrespuesta = "\\noexiste.html";//usuario no existe, advertimos con un html
				respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
				return false;
			}
			else{
				if(rows[0].filas==rows[0].MAX_NUM_ESPECIES){
					return true;
				}
			}						
		});	
	});
	baseDatos.close();
	if(baseDatos==null){
		respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
	}	
}

var dameCodigosEspecieBBDD = module.exports.dameCodigosEspecieBBDD = function(idUsuario){
	var dirHTMLrespuesta = "\\errorConexionBBDD.html";//si no tenemos resultado se mantiene al cliente en espera
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT count(ID_ESPECIE) as filas, CODIGO_MACHO, CODIGO_HEMBRA FROM CODIGOS_ESPECIE WHERE ID_ESPECIE=?";
	console.log(consultaSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		//crea un hilo paralelo para ejecutar el codigo posterior concurrente
		baseDatos.all(consultaSQL, [idUsuario], function(err1, rows) {
			if(err1){
				dirHTMLrespuesta = "\\noexiste.html";//usuario no existe, advertimos con un html
				respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
				return "";
			}
			else{
				if(rows[0].filas==1){
					var listaCodigosEspecies;
					listaCodigosEspecies[0]=rows[0].CODIGO_MACHO;
					listaCodigosEspecies[1]=rows[0].CODIGO_HEMBRA;
					return listaCodigosEspecies;
				}
			}						
		});	
	});
	baseDatos.close();
	if(baseDatos==null){
		respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
	}	
}

var dameIndividuosEspecieSexoBBDD = module.exports.dameIndividuosEspecieSexoBBDD = function(idSimulacion, idUsuario, sexo){
	var dirHTMLrespuesta = "\\errorConexionBBDD.html";//si no tenemos resultado se mantiene al cliente en espera
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT count(TABLERO) as filas, TABLERO FROM PASO_SIMULACION INNER JOIN SIMULACION ON SIMULACION.ID_SIMULACION = PASO_SIMULACION.ID_SIMULACION AND SIMULACION.PASO=PASO_SIMULACION.PASO WHERE SIMULACION.ID_SIMULACION=? AND PASO_SIMULACION.ID_ESPECIE=?";
	console.log(consultaSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		baseDatos.all(consultaSQL, [idSimulacion, idUsuario], function(err1, rows) {
			if(err1){
				dirHTMLrespuesta = "\\noexiste.html";//usuario no existe, advertimos con un html
				respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
				return "";
			}
			else{
				if(rows[0].filas==1){
					var tablero = JSON.parse(rows[0].TABLERO);
					var hembras;
					var individuos = tablero.individuos;
					var i;
					var j=0;
					for(i=0;i<individuos.length;i++){
						var individuo=individuos[i];
						if(individuo.sexo==sexo && individuo.especie==idUsuario){
							hembras[j]=individuo;
							j++;
						}
					}
					return hembras;
				}
			}						
		});	
	});
	baseDatos.close();
	if(baseDatos==null){
		respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
	}	
}

var actualizaCodigosPasoBBDD = module.exports.actualizaCodigosPasoBBDD = function(idSimulacion, idUsuario, paso, nuevosCodigosEspecie){
	var dirHTMLrespuesta = "\\errorConexionBBDD.html";//si no tenemos resultado se mantiene al cliente en espera
	var sqlite3 = require("sqlite3").verbose();
	var updateSQL = "UPDATE PASO_SIMULACION SET(CODIGO_MACHO=?,CODIGO_HEMBRA=?) WHERE PASO_SIMULACION.ID_SIMULACION=? AND PASO_SIMULACION.ID_ESPECIE=? AND PASO_SIMULACION.PASO=?";
	console.log(updateSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		baseDatos.all(updateSQL, [nuevosCodigosEspecie[0],nuevosCodigosEspecie[1],idSimulacion, idUsuario, paso], function(err1, rows) {
			if(err1){
				dirHTMLrespuesta = "\\noexiste.html";//usuario no existe, advertimos con un html
				respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
				return false;
			}
			else{
				return true;
			}
		});	
	});
	baseDatos.close();
	if(baseDatos==null){
		respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
	}	
}

var actualizaTableroPasoBBDD = module.exports.actualizaTableroPasoBBDD = function(idSimulacion, idUsuario, paso, tablero){
	var dirHTMLrespuesta = "\\errorConexionBBDD.html";//si no tenemos resultado se mantiene al cliente en espera
	var sqlite3 = require("sqlite3").verbose();
	var updateSQL = "UPDATE PASO_SIMULACION SET(TABLERO=?, HECHA_DECISION_HEMBRAS=?) WHERE PASO_SIMULACION.ID_SIMULACION=? AND PASO_SIMULACION.ID_ESPECIE=? AND PASO_SIMULACION.PASO=?";
	console.log(updateSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		baseDatos.all(updateSQL, [tablero, 1, idSimulacion, idUsuario, paso], function(err1, rows) {
			if(err1){
				dirHTMLrespuesta = "\\noexiste.html";//usuario no existe, advertimos con un html
				respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
				return false;
			}
			else{
				return true;
			}
		});	
	});
	baseDatos.close();
	if(baseDatos==null){
		respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
	}
}

var dameTableroPasoBBDD = module.exports.dameTableroPasoBBDD = function(idSimulacion, idUsuario, paso){
	var dirHTMLrespuesta = "\\errorConexionBBDD.html";//si no tenemos resultado se mantiene al cliente en espera
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT count(TABLERO) as filas, TABLERO FROM PASO_SIMULACION WHERE PASO_SIMULACION.ID_SIMULACION=? AND PASO_SIMULACION.ID_ESPECIE=? AND PASO_SIMULACION.PASO=?";
	console.log(consultaSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		baseDatos.all(consultaSQL, [idSimulacion, idUsuario, paso], function(err1, rows) {
			if(err1){
				dirHTMLrespuesta = "\\noexiste.html";//usuario no existe, advertimos con un html
				respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
				return null;
			}
			else{
				if(rows[0].filas==1){
					return JSON.parse(rows[0].TABLERO);
				}
				return null;
			}
		});	
	});
	baseDatos.close();
	if(baseDatos==null){
		respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
	}
}

var dameCodigosPasoBBDD = module.exports.dameCodigosPasoBBDD = function(idSimulacion, idUsuario, paso){
	var codMach;
	var codHemb;
	var dirHTMLrespuesta = "\\errorConexionBBDD.html";//si no tenemos resultado se mantiene al cliente en espera
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT count(CODIGO_MACHO) as filas, CODIGO_MACHO, CODIGO_HEMBRA FROM PASO_SIMULACION WHERE PASO_SIMULACION.ID_SIMULACION=? AND PASO_SIMULACION.ID_ESPECIE=? AND PASO_SIMULACION.PASO=?";
	console.log(consultaSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		baseDatos.all(consultaSQL, [idSimulacion, idUsuario, paso], function(err1, rows) {
			if(err1){
				dirHTMLrespuesta = "\\noexiste.html";//usuario no existe, advertimos con un html
				respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
				return [codMach,codHemb];
			}
			else{
				if(rows[0].filas==1){
					codMach = JSON.parse(rows[0].CODIGO_MACHO);
					codHemb = JSON.parse(rows[0].CODIGO_HEMBRA);
					return [codMach,codHemb];
				}
				return [codMach,codHemb];
			}
		});	
	});
	baseDatos.close();
	if(baseDatos==null){
		respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
	}
}

var dameFaseSimulacionBBDD = module.exports.dameFaseSimulacionBBDD = function(idSimulacion){
	var fase=-1;
	var dirHTMLrespuesta = "\\errorConexionBBDD.html";//si no tenemos resultado se mantiene al cliente en espera
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT count(FASE) as filas, FASE FROM SIMULACION WHERE SIMULACION.ID_SIMULACION=?";
	console.log(consultaSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		baseDatos.all(consultaSQL, [idSimulacion], function(err1, rows) {
			if(err1){
				dirHTMLrespuesta = "\\noexiste.html";//usuario no existe, advertimos con un html
				respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
				return fase;
			}
			else{
				if(rows[0].filas==1){
					return rows[0].FASE;
				}
				return fase;
			}
		});	
	});
	baseDatos.close();
	if(baseDatos==null){
		respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
	}
}

var damePasoSimulacionBBDD = module.exports.damePasoSimulacionBBDD = function(idSimulacion){
	var paso=-1;
	var dirHTMLrespuesta = "\\errorConexionBBDD.html";//si no tenemos resultado se mantiene al cliente en espera
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT count(PASO) as filas, PASO FROM SIMULACION WHERE SIMULACION.ID_SIMULACION=?";
	console.log(consultaSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		baseDatos.all(consultaSQL, [idSimulacion], function(err1, rows) {
			if(err1){
				dirHTMLrespuesta = "\\noexiste.html";//usuario no existe, advertimos con un html
				respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
				return paso;
			}
			else{
				if(rows[0].filas==1){
					return rows[0].PASO;
				}
				return paso;
			}
		});	
	});
	baseDatos.close();
	if(baseDatos==null){
		respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
	}
}