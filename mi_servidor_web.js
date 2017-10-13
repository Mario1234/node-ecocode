//CARGA DE LIBRERIAS EXTERNAS CON REQUIRE
var ClaseHttps = require("https");//pedimos la instancia singleton de la Clase HTTPS
var ClaseExpress = require("express");//para establecer certificado ssl
var ClaseSession = require("express-session");//para utilizar la sesion http
const parseadorDOM = require('body-parser');
var ClaseFs = require("fs");//para leer archivos del sistema

//CARGA HOJAS DE CODIGO DEL SERVIDOR
var fap = require( __dirname + '/funcionesAtenderPeticiones.js');

//CONFIGURA SESION Y PARSEADOR DOM
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
instanciaExpress.get("/",fap.cargarLogin);
instanciaExpress.post("/atentifica", fap.leerDatosLogin);//si pide autentificarse
instanciaExpress.get("/logout", fap.salirCuenta);//si pide salir de su cuenta
instanciaExpress.get("/datos", fap.datosUsuario);//si pide ver sus datos
instanciaExpress.get("/editarcodigos", fap.editarCodigos);//si pide editar sus codigos de especie
instanciaExpress.post("/subecodigos", fap.subirCodigos);//si pide subir sus codigos de especie recien editados
instanciaExpress.get("/cuenta", fap.menuCuenta);//si pide volver a menu de cuenta
instanciaExpress.get("/listasimulaciones", fap.listarSimulaciones);//si pide la lista de simulaciones activas actuales
instanciaExpress.post("/entrarsimulacion", fap.entrarSimulacion);//si pide entrar a una simulacion activa de la lista
instanciaExpress.get("/preparado", fap.marcarPreparado);//pide pasar a estado preparado, para comenzar la simulacion en cuanto esten todos
instanciaExpress.get("/actualizalistaespecies", fap.actualizaListaEspecies);//si el temporizador se activa y pide refesco de lista jugadores de la simulacion
instanciaExpress.get("/decisionhembras", fap.decisionHembras);//si envia las decisiones y movs de las hembras y codigos evolucionados, se le devuelve la fase de los machos
instanciaExpress.get("/decisionmachos", fap.decisionMachos);//si envia las semillas y movs de los machos, se le devuelve la fase de las hembras del sig paso

var servidor = ClaseHttps.createServer(opcionesConexion,instanciaExpress);
servidor.listen(443);
var host = servidor.address().address;
var port = servidor.address().port;

console.log("Servidor HTTPS en "+host+" corriendo en el puerto "+port);
