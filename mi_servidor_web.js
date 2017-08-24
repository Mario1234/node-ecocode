//VARIABLES
var resultadoLogin = "";
var dirHTMLrespuesta = "\\errorConexionBBDD.html";//si no tenemos resultado se mantiene al cliente en espera
var nombre = "John";
var contrasegna = "Doe";

//FUNCIONES

//Esta funcion decide si la contraseña y el usuario son correctos
//accede a la base de datos guardada en el archivo "miBaseDatos.db"
//compara el usuario con los de la consulta y sino lo casa dice que no existe
//si lo casa compara la contraseña introducida con la de ese registro de la base de datos(el registro casado)
function autentifica(respuesta) {
	var sqlite3 = require("sqlite3").verbose();
	var consultaSQL = "SELECT nombre, contrasegna FROM USUARIOS WHERE nombre='"+nombre+"'";
	console.log(consultaSQL);
	var baseDatos = new sqlite3.Database("miBaseDatos.db");	
	baseDatos.serialize(function() {
		var filasDevueltas = 0;
		var encontrado = false;
		//crea un hilo paralelo para ejecutar el codigo posterior concurrente
		baseDatos.each(consultaSQL, function(err, row) {
			filasDevueltas++;
			console.log(row.nombre + ": " + row.contrasegna);
			if(!encontrado){//mientras no encuentre al usuario introducido sigue buscando
				if(row.nombre==nombre){
					encontrado=true;
					if(row.contrasegna==contrasegna){//si caso el usuario se comprueba la contrseña
						resultadoLogin="contraseña correcta";
						dirHTMLrespuesta = "\\cuenta.html";//login exitoso, damos pagina personal
					}
					else{
						resultadoLogin="contraseña incorrecta";
						dirHTMLrespuesta = "\\incorrecta.html";//contraseña incorrecta, advertimos con un html
					}
				}
			}						
			console.log(resultadoLogin);
			//responde el resultado de la consulta
			respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
		}, function(err, rows) {
			if(filasDevueltas==0){
				resultadoLogin = "no existe ese usuario";
				dirHTMLrespuesta = "\\noexiste.html";//usuario no existe, advertimos con un html
			}
			console.log(resultadoLogin);
			//responde el resultado de la consulta
			respuesta.sendFile(__dirname + dirHTMLrespuesta);//direccionamiento absoluto
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

function cargarLogin(peticion,respuesta){
	console.log("cargando login");
	respuesta.sendFile(__dirname+"\\botones.html");
}

//la funcion instanciaExpress.get o post devuelve los objetos peticion de la clase Request y respuesta de la clase Response
//lee la cabecera con la contraseña y el mail introducidos por el usuario en botones.html, ambos codificados en base64
function leerDatosLogin(peticion,respuesta){
	console.log("atiende autentifica");	
	var cabecera=peticion.body.authorization||'';       // cogemos objeto cabecera de peticion
	console.log(cabecera);
    var sinEspacios=cabecera.split("\\s+").pop()||'';           // quitamos los espacios
    var autorizacion=new Buffer(sinEspacios, "base64").toString();    // lo convertimos a bas64
    var partes=autorizacion.split(/:/);                          // partimos en el separador :
      nombre=partes[0];
      contrasegna=partes[1];
	console.log(nombre+":"+contrasegna);
	autentifica(respuesta);
	//seguramente se llegue aqui sin tener la respuesta de la consulta sql		
}

//CARGA DE LIBRERIAS EXTERNAS CON REQUIRE
var ClaseHttps = require("https");//pedimos la instancia singleton de la Clase HTTPS
var ClaseFs = require("fs");//para leer archivos del sistema
var ClaseExpress = require("express");//para establecer certificado ssl
const parseadorDOM = require('body-parser');
var instanciaExpress = ClaseExpress();
instanciaExpress.use(parseadorDOM.urlencoded({ extended: true }));

//EJECUCION PRINCIPAL DEL SERVIDOR

//ejecutar estos comandos para crear un certificado de prueba SSL
			//C:\> openssl req -new -key /path/to/key.pem -out csr.pem
			//C:\> openssl x509 -req -days 365 -in key.pem -signkey /path/to/file.pem -out /path/to/ssl.crt
const opcionesConexion = {
    key: ClaseFs.readFileSync("./ssl/claveprivada.key"),
    cert: ClaseFs.readFileSync("./ssl/certificado.crt"),
};

//Definimos las distintas rutinas de respuesta de cada peticion
instanciaExpress.get("/",cargarLogin);
instanciaExpress.post("/atentifica", leerDatosLogin);//si pide autentificarse

var servidor = ClaseHttps.createServer(opcionesConexion,instanciaExpress);
servidor.listen(443);
var host = servidor.address().address;
var port = servidor.address().port;

console.log("Servidor HTTPS en "+host+" corriendo en el puerto "+port);
// instanciaExpress.listen(1900,function () {	
	

// });
//servidor.close();
