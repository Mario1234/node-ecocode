//VARIABLES
var resultadoLogin = "";

//FUNCIONES

//Esta funcion decide si la contraseña y el usuario son correctos
//accede a la base de datos guardada en el archivo "miBaseDatos.db"
//compara el usuario con los de la consulta y sino lo casa dice que no existe
//si lo casa compara la contraseña introducida con la de ese registro de la base de datos(el registro casado)
function autentificaBBDD(peticion, respuesta, nombre, contrasegna) {
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
						ClaseFs.readFile(__dirname + "\\cuenta.html", 'utf8', function (err,html_cadena) {
							if (err) {
							  return console.log(err);
							}
							html_cadena = html_cadena.replace(/mensaje1a/g, mensaje);  
							respuesta.writeHead(200, { 'Content-Type': 'text/html' });
							respuesta.write(html_cadena);
							respuesta.end();
						});	
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

function dameTableroInicial(){
	return {};
}

function subeCodigosUsuarioBBDD(respuesta, idUsuario, machoCodigo,hembraCodigo,movMachoCodigo,movHembraCodigo){
	var dirHTMLrespuesta = "\\errorConexionBBDD.html";//si no tenemos resultado se mantiene al cliente en espera
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT count(*) as conteo FROM CODIGOS_ESPECIE WHERE ID_ESPECIE=?";
	var insertSQL = "INSERT INTO CODIGOS_ESPECIE (ID_ESPECIE, CODIGO_MACHO, CODIGO_HEMBRA, CODIGO_MOV_MACHO, CODIGO_MOV_HEMBRA) VALUES (?, ?, ?, ?, ?)";
	var updateSQL = "UPDATE CODIGOS_ESPECIE SET (CODIGO_MACHO=?, CODIGO_HEMBRA=?, CODIGO_MOV_MACHO=?, CODIGO_MOV_HEMBRA=?) WHERE ID_ESPECIE = ?";
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
					baseDatos.run(updateSQL,[machoCodigo,hembraCodigo,movMachoCodigo,movHembraCodigo,idUsuario]);
				}
				else{
					baseDatos.run(insertSQL,[idUsuario,machoCodigo,hembraCodigo,movMachoCodigo,movHembraCodigo]);
				}
				mensaje="datos subidos con exito";
			}						
		});	
		ClaseFs.readFile(__dirname + "\\cuenta.html", 'utf8', function (err,html_cadena) {
			if (err) {
			  return console.log(err);
			}
			html_cadena = html_cadena.replace(/mensaje1a/g, mensaje);  
			respuesta.writeHead(200, { 'Content-Type': 'text/html' });
			respuesta.write(html_cadena);
			respuesta.end();
		});	
	});
	baseDatos.close();
	if(baseDatos==null){
		//deberia de mandarse una pagina de error de conexion con BBDD
		respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
	}	
}

function dameDatosUsuarioBBDD(respuesta, idUsuario){
	var dirHTMLrespuesta = "\\errorConexionBBDD.html";//si no tenemos resultado se mantiene al cliente en espera
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT count(nombre) as filas, nombre, contrasegna, codigo_macho, codigo_hembra, codigo_mov_macho, codigo_mov_hembra FROM USUARIO INNER JOIN CODIGOS_ESPECIE ON id=ID_ESPECIE WHERE id=?";
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
				var nom = "";var con = "";var codM = "";var codH = "";var codMM = "";var codMH = "";				
				if(rows[0].filas>0){
					nom = rows[0].nombre;
					con = rows[0].contrasegna;
					codM = rows[0].codigo_macho;
					codH = rows[0].codigo_hembra;
					codMM = rows[0].codigo_mov_macho;
					codMH = rows[0].codigo_mov_hembra;
				}
				console.log(nom + ": " + con);
				ClaseFs.readFile(__dirname + "\\datos.html", 'utf8', function (err2,html_cadena) {
					if (err2) {
					  return console.log(err2);
					}
					html_cadena = html_cadena.replace(/usuario1a/g, nom);  
					html_cadena = html_cadena.replace(/contrasegna1a/g, con);  
					html_cadena = html_cadena.replace(/codigomacho1a/g, codM);  
					html_cadena = html_cadena.replace(/codigohembra1a/g, codH); 
					html_cadena = html_cadena.replace(/codigomovmacho1a/g, codMM); 
					html_cadena = html_cadena.replace(/codigomovhembra1a/g, codMH); 
					respuesta.writeHead(200, { 'Content-Type': 'text/html' });
					respuesta.write(html_cadena);
					respuesta.end();
				});
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
function leeRetrollamada2(err2,html_cadena) {
	if (err2) {
		console.log(err2);
	}
	return html_cadena;
}

function dameListaSimulacionesActivasBBDD(respuesta){
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
						ClaseFs.readFile(__dirname + "\\iniListaSimulaciones.txt", 'utf8', leeRetrollamada);
					},
					//esto se ejecuta en paralelo tambien
					function(leeRetrollamada2) {
						ClaseFs.readFile(__dirname + "\\finListaSimulaciones.txt", 'utf8', leeRetrollamada2);
					}
					],
					function(err2, resultadosRetrollamadas) {
						if(err2){
							console.log(err2);
						}
						else{
							iniCadenaHTML = resultadosRetrollamadas[0];
							finCadenaHTML = resultadosRetrollamadas[1];
							var listaSimulaciones = "";
							if(rows[0].filas>0){					
								listaSimulaciones += "<ul>";
								rows.forEach(function(row) {
									listaSimulaciones += "<li><button onclick=guardaPulsado('"+row.ID_SIMULACION+"')>"+row.ID_SIMULACION+"</button></li>";
								}, this);
								listaSimulaciones += "</ul>";
							}
							respuesta.writeHead(200, { 'Content-Type': 'text/html' });
							respuesta.write(iniCadenaHTML+listaSimulaciones+finCadenaHTML);
							respuesta.end();
						}						
					}
				);//fin del paralelismo  			
			}
		});
	});
	baseDatos.close();
	if(baseDatos==null){
		respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
	}	
}

function dameListaEspeciesSimulacionBBDD(respuesta, idSimulacion, idUsuario){
	var dirHTMLrespuesta = "\\errorConexionBBDD.html";
	var sqlite3 = require("sqlite3").verbose();
	var insertSQL = "INSERT INTO PASO_SIMULACION (ID_SIMULACION, PASO, ID_ESPECIE, TABLERO) VALUES (?, ?, ?, ?)";
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
				if(rows[0].filas>0){
					respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
				}
				else{
					baseDatos.run(insertSQL,[idSimulacion,0,idUsuario,'vacio']);
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
					ClaseFs.readFile(__dirname + "\\simulacionIni.html", 'utf8', function (err2,html_cadena) {
						if (err2) {
							return console.log(err2);
						}
						else{
							html_cadena =html_cadena.replace(/listaespecies1a/g, listaEspecies);
							respuesta.writeHead(200, { 'Content-Type': 'text/html' });
							respuesta.write(html_cadena);
							respuesta.end();
						}
					});
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

function entrarsimulacion(peticion,respuesta){
	var cadenaIdSimulacion = peticion.body.namePulsado;
	peticion.session.idSimulacion = parseInt(cadenaIdSimulacion);
	var idSimulacion = peticion.session.idSimulacion;
	var idUsuario = peticion.session.idUsuario;
	dameListaEspeciesSimulacionBBDD(respuesta, idSimulacion, idUsuario);
}

function listarSimulaciones(peticion,respuesta){		
	dameListaSimulacionesActivasBBDD(respuesta);
}

function subirCodigos(peticion,respuesta){
	var idUsuario = peticion.session.idUsuario;
	var machoCodigo=peticion.body.machoCodigo;
	var hembraCodigo=peticion.body.hembraCodigo;
	var movMachoCodigo=peticion.body.movMachoCodigo;
	var movHembraCodigo=peticion.body.movHembraCodigo;
	subeCodigosUsuarioBBDD(respuesta,idUsuario,machoCodigo,hembraCodigo,movMachoCodigo,movHembraCodigo);
	// console.log("machoCodigo");
	// console.log(machoCodigo);
	// console.log("hembraCodigo");
	// console.log(hembraCodigo);
	// console.log("movMachoCodigo");
	// console.log(movMachoCodigo);
	// console.log("movHembraCodigo");
	// console.log(movHembraCodigo);
	respuesta.sendFile(__dirname+"\\cuenta.html");
}

function menuCuenta(peticion,respuesta){
	var idUsuario = peticion.session.idUsuario;
	ClaseFs.readFile(__dirname + "\\cuenta.html", 'utf8', function (err,html_cadena) {
		if (err) {
		  return console.log(err);
		}
		html_cadena = html_cadena.replace(/mensaje1a/g, "");  
		respuesta.writeHead(200, { 'Content-Type': 'text/html' });
		respuesta.write(html_cadena);
		respuesta.end();
	});	
}

function editarCodigos(peticion,respuesta){
	var idUsuario = peticion.session.idUsuario;
	respuesta.sendFile(__dirname+"\\editorCodigos.html");
}

function datosUsuario(peticion,respuesta){
	var idUsuario = peticion.session.idUsuario;
	dameDatosUsuarioBBDD(respuesta, idUsuario);
}

//elimina la sesion
function salirCuenta(peticion,respuesta){
	peticion.session.destroy(function(error1) {
		if(error1) {
		 	console.log(error1);
		} else {
			respuesta.redirect('/');
		}
	});
}

function cargarLogin(peticion,respuesta){
	console.log("cargando login");
	respuesta.sendFile(__dirname+"\\botones.html");
}

//la funcion instanciaExpress.get o post devuelve los objetos peticion de la clase Request y respuesta de la clase Response
//lee la cabecera con la contraseña y el mail introducidos por el usuario en botones.html, ambos codificados en base64
function leerDatosLogin(peticion,respuesta){
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
	autentificaBBDD(peticion, respuesta, nombre, contrasegna);
	//seguramente se llegue aqui sin tener la respuesta de la consulta sql		
}

//CARGA DE LIBRERIAS EXTERNAS CON REQUIRE
var ClaseHttps = require("https");//pedimos la instancia singleton de la Clase HTTPS
var ClaseFs = require("fs");//para leer archivos del sistema
var ClaseExpress = require("express");//para establecer certificado ssl
var ClaseSession = require("express-session");//para utilizar la sesion http
var ClaseAsync = require("async");//para trabajar con semaforos de procesos asincronos
const parseadorDOM = require('body-parser');
var instanciaExpress = ClaseExpress();
instanciaExpress.use(parseadorDOM.urlencoded({ extended: true }));
instanciaExpress.use(ClaseSession({secret: 'ssshhhhh'}));

//EJECUCION PRINCIPAL DEL SERVIDOR

//ejecutar estos comandos para crear un certificado de prueba SSL
			//C:\> openssl req -new -key /path/to/key.pem -out csr.pem
			//C:\> openssl x509 -req -days 365 -in key.pem -signkey /path/to/file.pem -out /path/to/ssl.crt
const opcionesConexion = {
    key: ClaseFs.readFileSync("./ssl/claveprivada.key"),
    cert: ClaseFs.readFileSync("./ssl/certificado.crt"),
};

//Definimos las distintas rutinas de respuesta de cada peticion
//las peticiones que suben datos al servidor es obligatorio hacerlas con POST
instanciaExpress.get("/",cargarLogin);
instanciaExpress.post("/atentifica", leerDatosLogin);//si pide autentificarse
instanciaExpress.get("/logout", salirCuenta);//si pide salir de su cuenta
instanciaExpress.get("/datos", datosUsuario);//si pide ver sus datos
instanciaExpress.get("/editarcodigos", editarCodigos);//si pide editar sus codigos de especie
instanciaExpress.post("/subecodigos", subirCodigos);//si pide subir sus codigos de especie recien editados
instanciaExpress.get("/cuenta", menuCuenta);//si pide volver a menu de cuenta
instanciaExpress.get("/listasimulaciones", listarSimulaciones);//si pide la lista de simulaciones activas actuales
instanciaExpress.post("/entrarsimulacion",entrarsimulacion);//si pide entrar a una simulacion activa de la lista

var servidor = ClaseHttps.createServer(opcionesConexion,instanciaExpress);
servidor.listen(443);
var host = servidor.address().address;
var port = servidor.address().port;

console.log("Servidor HTTPS en "+host+" corriendo en el puerto "+port);
