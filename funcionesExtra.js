
//------------------PRIVADAS----------------------

//recibe las respuestas de indivs de un mismo sexo
//y devuelve la respuesta del individuo con id si es de ese sexo
//sino devuelve null
function dameRespuestaId(id,respuestas){
	var i;
	for(i=0;i<respuestas.length;i++){
		if(respuestas[i].id==id){
			return respuestas[i];
		}
	}
	return null;
}

function dameCoordenadasAdyacentes(i,j){
	var listaCoordenadasAdyacentes = [];
	var x;
	var y;
	for(x=i-1;x<(i+2);x++){
		for(y=i-1;y<(i+2);y++){
			listaCoordenadasAdyacentes.push({"x":x,"y":y});
		}
	}
	return listaCoordenadasAdyacentes;
}

function dentroTablero(x,y,limiteSuperior){
	return (0<=x && 0<=y && x<limiteSuperior && y<limiteSuperior);
}

function dameCasillasAdyacentesDentroTablero(i1,j1,limiteSuperior){
	var casillasAdyacentesDentroTablero = [];
	var listaCoordenadasAdyacentes = dameCoordenadasAdyacentes(i1,j1);
	var i;
	for(i=0;i<listaCoordenadasAdyacentes.length;i++){
		var adyacente = listaCoordenadasAdyacentes[i];
		if(dentroTablero(adyacente.x,adyacente.y,limiteSuperior)){
			casillasAdyacentesDentroTablero.push(adyacente);
		}
	}
	return casillasAdyacentesDentroTablero;
}

function dameIndividuo(idIndiv,indivaux){
	var i=0;
	var indiv = {};
	var encontrado = false;
	while(i<indivaux.length && !encontrado){
		indiv = indivaux[i];
		if(indiv.id==idIndiv){
			encontrado=true;
		}
		i++;
	}
	return indiv;
}

//-------------MOVER
//devuelve el movimiento elegido por el individuo con id = idIndiv
//recibe la lista indivaux con info de todos los individuos
//podria cambiarse por indivaux[idIndiv].movimiento
function dameMovIndividuo(idIndiv,indivaux){
	var indiv = dameIndividuo(idIndiv,indivaux);
	if(indiv!=null){
		return indiv.movimiento;
	}
	else{
		return "NO";
	}	
}

function dameListaCasillasPermitidasMover(casillaux,i1,j1){
	var limiteSuperior = casillaux.length;
	var listaPermitidas = [];
	var i;
	//mira en las 8 casillas adyacentes a la (i,j)
	//que esten dentro del tablero
	var listaAdyacentes = dameCasillasAdyacentesDentroTablero(i1,j1,limiteSuperior);
	for(i=0;i<listaAdyacentes.length;i++){
		var x = listaAdyacentes[i].x;
		var y = listaAdyacentes[i].y;
		//si la casilla esta vacia
		if(casillaux[x][y]==-1){
			listaPermitidas.push(listaAdyacentes[i]);
		}
	}
	return listaPermitidas;
}

//devuelve las coordenadas de la casilla objetivo del movimiento
function dameCoordenadasMovimiento(movimiento,i,j){
	var x;
	var y;
	switch(movimiento){
		case "NO":
			x=i-1;y=j-1;
		break;
		case "N":
			x=i-1;y=j;
		break;
		case "NE":
			x=i-1;y=j+1;
		break;
		case "O":
			x=i;y=j-1;
		break;
		case "E":
			x=i;y=j+1;
		break;
		case "SO":
			x=i+1;y=j-1;
		break;
		case "S":
			x=i+1;y=j;
		break;
		case "SE":
			x=i+1;y=j+1;
		break;
		default:
	}
	return {"x":x,"y":y};
}

//mira si la casilla esta en la lista de casillas permitidas(listaPermitidas)
function estaPermitida(casillaObjetivo,listaPermitidas){
	var i=0;
	var x = casillaObjetivo.x;
	var y = casillaObjetivo.y;
	var encontrado=false;
	while(i<listaPermitidas.length && !encontrado){
		var permaux = listaPermitidas[i];
		if(permaux.x==x && permaux.y==y){
			encontrado=true;
		}
		i++;
	}
	return encontrado;
}

//realiza el movimiento del individuo en la casilla de las coordenadas i y j
//el movimeinto es "movimiento"
function mueveIndividuo(casillaux,movimiento,i,j){
	var id = casillaux[i][j];
	casillaux[i][j]=-1;
	var casillaObjetivo = dameCoordenadasMovimiento(movimiento,i,j);
	var listaPermitidas = dameListaCasillasPermitidasMover(casillaux,i,j);
	//si el movimiento lo puede hacer
	if(estaPermitida(casillaObjetivo,listaPermitidas)){
		//realiza su movimiento elegido
		casillaux[casillaObjetivo.x][casillaObjetivo.y]=id;
	//sino puede hacer el mov pero tiene otros mov permitidos
	}
	else{
		if(listaPermitidas.length>0){
			//ejecuta un mov al azar
			var azar = Math.floor((Math.random() * (listaPermitidas.length-1)) + 0);
			var casillaAzar = listaPermitidas[azar];
			casillaux[casillaAzar.x][casillaAzar.y]=id;
		}
		else{//como no se puede mover le devolvemos el valor que tenia esa casilla
			casillaux[i][j]=id;//no se mueve
		}
	}
}

function movimientos(tablero){
	var i,j;
	var casillaux = tablero.casillas;
	var indivaux = tablero.individuos;
	var numFils = casillaux.length;
	var numCols = casillaux[0].length;
	var listaMovimientos = [];
	for(i=0;i<numFils;i++){
		for(j=0;j<numCols;j++){
			var valorCasilla = casillaux[i][j];
			if(valorCasilla>=0){//solo mueve individuos, menor a 0 es borde o vacia
				var movimiento = dameMovIndividuo(valorCasilla,indivaux);//devueleve mov elegido
				var objMov = {"movimiento":movimiento,"i":i,"j":j};
				listaMovimientos.push(objMov);				
			}
		}
	}
	listaMovimientos.forEach(function(objMov) {
		//lo mueve donde eligio o al azar
		mueveIndividuo(casillaux,objMov.movimeinto,objMov.i,objMov.j);
	}, this);
}

//-------------NACER
//pone el individuo nuevo al azar en el tablero
function ponIndividuoTablero(id,tablero){
	var casillaux = tablero.casillas;
	var numFils = casillaux.length;
	var numCols = casillaux[0].length;
	var intentos=0;
	var colocado = false;
	while(intentos<100 && !colocado){
		var filAzar = Math.floor((Math.random() * (numFils-1)) + 0);
		var colAzar = Math.floor((Math.random() * (numCols-1)) + 0);
		if(casillaux[filAzar][colAzar]<0){
			casillaux[filAzar][colAzar]=id;
			colocado=true;
		}
		intentos++;
	}
}

//recorre todos los individuos, mira han decidido aceptar la semilla
//solo las hembras deciden eso
//recoge el id de la especie a la que pertenece el padre que fecunda a esta hembra
//para eso usa dameEspeciePadre
//crea una hembra y un macho de la especie del padre
//los mete en la lista de nuevos individuos
//concatena la lista de antiguos y la de nuevos
function nacimientos(tablero,fecundaciones){
	var i;
	var casillaux = tablero.casillas;
	var indivaux = tablero.individuos;
	var nuevos = [];
	var numFils = casillaux.length;
	var numCols = casillaux[0].length;
	var cantidadIndivs = indivaux.length;	
	for(i=0;i<indivaux.length;i++){
		if(indivaux[i].decision=="S"){
			var especiePadre = dameEspeciePadre(indivaux[i].id,fecundaciones);
			var nuevoMacho = {"id":-1,"especie":-1,"sexo":"M","movimiento":"NO","decision":"","semilla":""};
			var nuevaHembra = {"id":-1,"especie":-1,"sexo":"H","movimiento":"NO","decision":"N","semilla":""};
			nuevaHembra.especie = especiePadre;
			nuevoMacho.especie = especiePadre;
			nuevoMacho.id = cantidadIndivs;
			ponIndividuoTablero(nuevoMacho.id,tablero);
			cantidadIndivs++;
			nuevaHembra.id = cantidadIndivs;
			ponIndividuoTablero(nuevaHembra.id,tablero);
			cantidadIndivs++;
			nuevos.push(nuevoMacho);			
			nuevos.push(nuevaHembra);
		}
	}
	indivaux=indivaux.concat(nuevos);
}

//-------------FECUNDAR

function dameHembrasAdyacentesNoFecundadas(i1,j1,idMacho,tablero,fecundadas){
	var listaHembrasAdyacentes = [];
	var casillaux = tablero.casillas;
	var indivaux = tablero.individuos;
	var listaAdyacentes = dameCasillasAdyacentesDentroTablero(i1,j1,casillaux.length);
	var i;
	for(i=0;i<listaAdyacentes;i++){
		var x = listaAdyacentes.x;
		var y = listaAdyacentes.y;
		var valorCasilla = casillaux[x][y];
		if(valorCasilla>=0){
			var indiv = dameIndividuo(valorCasilla,indivaux);
			//si es hembra y no esta fecundada
			if(indiv!=null && indiv.sexo=="H" && !fecundadas[indiv.id]){
				listaHembrasAdyacentes.push(indv);
			}
		}
	}
	return listaHembrasAdyacentes;
}

function actualizaFecundacion(idHembra,especieMacho,fecundaciones){
	var i=0;
	var encontrado = false;
	while(i<fecundaciones.length && !encontrado){
		if(fecundaciones[i].idmadre==idHembra){
			fecundaciones[i].especiepadre = especieMacho;
		}
		i++;
	}
}

//se podria cambiar por var semillaux = indivaux[id].semilla;
function dameInfoSiMacho(id,indivaux){
	var indiv = dameIndividuo(id,indivaux);
	var semillaux = "";
	var especaux = -1;
	if(indiv!=null && indiv.sexo=="M"){
		semillaux = indiv.semilla;
		especaux = indiv.especie;
	}
	return {"sem":semillaux,"esp":especaux};
}

function entregaSemillas(tablero,fecundaciones){
	var casillaux = tablero.casillas;
	var indivaux = tablero.individuos;
	var fecundadas = [];
	var numFils = casillaux.length;
	var numCols = casillaux[0].length;
	for(i=0;i<indivaux.length;i++){
		fecundadas.push(false);
	}
	for(i=0;i<numFils;i++){
		for(j=0;j<numCols;j++){
			var valorCasilla = casillaux[i][j];
			if(valorCasilla>=0){
				var infoMacho = dameInfoSiMacho(valorCasilla,indivaux);
				var semillaux = infoMacho.sem;
				var especaux = infoMacho.esp;
				if(especaux!=-1){
					var idMacho=valorCasilla;
					var listaHembrasAdy = dameHembrasAdyacentesNoFecundadas(i,j,idMacho,tablero,fecundadas);
					if(listaHembrasAdy.length>0){
						var numHembraAzar = Math.floor((Math.random() * (listaHembrasAdy.length-1)) + 0);
						var hembAzar = listaHembrasAdy[numHembraAzar];
						hembAzar.semilla=semillaux;
						fecundadas[hembAzar.id]=true;
						actualizaFecundacion(hembAzar.id,especaux,fecundaciones);
					}
				}				
			}
		}
	}
}

//------------------PUBLICAS----------------------

//lee las decisiones de los individuos(enviadas dentro del formulario) y las guarda en el tablero
//si accion == d entonces los inds son hembras, si es == s entonces machos
//recoge el movimiento del individuo de peticion.body.m0 si su id=0
//dameRespuestaId recibe las respuestas de los macho o hembras dependiendo de accion
//y devuelve la respuesta del individuo con id=individuo.id si es de ese sexo
var dameTableroActualizadoUsuario = module.exports.dameTableroActualizadoUsuario = function(peticion,genteUnSexo,tablero,accion){
	var respuestasInds =[];
	var i;
	for(i=0;i<genteUnSexo.length;i++){
		var respuestaInd = {};//{id:"", movimiento:"", semilla:""}
		respuestaInd.id=genteUnSexo[i].id;
		respuestaInd.movimiento = peticion.body["m"+genteUnSexo[i].id];
		respuestaInd.semilla = peticion.body[accion+genteUnSexo[i].id];
		respuestasInds.push(respuestaInd);
	}
	var individuos = tablero.individuos;
	var i;
	for(i=0;i<individuos.length;i++){
		var individuo = individuos[i];
		var respuestaInd = dameRespuestaId(individuo.id,respuestasInds);
		if(respuestaInd!=null){
			individuo.movimiento=respuestaInd.movimiento;
			if(accion=="s"){
				individuo.semilla=respuestaInd.semilla;
			}
			else{
				individuo.decision=respuestaInd.decision;
			}
			
		}
	}		
}

var dameTableroInicial = module.exports.dameTableroInicial = function (){
	var tablero={casillas:[],individuos:[]};
	var casillas = [[-2,-2,-2,-2,-2,-2,-2],
					[-2,-1,-1,0,-1,-1,-2],
					[-2,-1,-1,-1,-1,-1,-2],
					[-2,1,-1,-1,-1,2,-2],
					[-2,-1,-1,-1,-1,-1,-2],
					[-2,-1,-1,3,-1,-1,-2],
					[-2,-2,-2,-2,-2,-2,-2]];
	tablero.casillas=casillas;
	//individuo
	//{id:0,especie:0,sexo:"M",movimiento:"NO",decision:"N",semilla:""}
	tablero.individuos=[{"id":0,"especie":0,"sexo":"M","movimiento":"SO","decision":"N","semilla":""},
						{"id":1,"especie":0,"sexo":"H","movimiento":"SE","decision":"N","semilla":""},
						{"id":2,"especie":1,"sexo":"M","movimiento":"NE","decision":"N","semilla":""},
						{"id":3,"especie":1,"sexo":"H","movimiento":"NO","decision":"N","semilla":""}];
	return tablero;
}

var movimientosNacimientos = module.exports.movimientosNacimientos = function(tablero,fecundaciones){
	movimientos(tablero);//modifica tablero
	var i;
	var j;
	var casillaux = tablero.casillas;
	console.log("Tablero\n[");
	for(i=0;i<casillaux.length;i++){
		var accum ="";
		for(j=0;j<casillaux[0].length;j++){
			accum += casillaux[i][j]+",";
		}
		console.log(accum+"\n");
	}
	console.log("]\n");
	nacimientos(tablero,fecundaciones);//modifica tablero, lee fecundaciones
	entregaSemillas(tablero,fecundaciones);//modifica tablero y fecundaciones
}