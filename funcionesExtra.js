
var dameRespuestaId = module.exports.dameRespuestaId = function (id,respuestas){
	var i;
	for(i=0;i<respuestas.length;i++){
		if(respuestas[i].id==id){
			return respuestas[i];
		}
	}
	return null;
}

//lee las decisiones de los individuos(enviadas dentro del formulario) y las guarda en el tablero
//si accion == d entonces los inds son hembras, si es == s entonces machos
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
	var tableroAct = tablero;
	var individuos = tableroAct.individuos;
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
	return tableroAct;
}

var dameTableroInicial = module.exports.dameTableroInicial = function (){
	var tablero={casillas:[],individuos:[]};
	var casillas = [[-1,-1,0,-1,-1],
					[-1,-1,-1,-1,-1],
					[1,-1,-1,-1,2],
					[-1,-1,-1,-1,-1],
					[-1,-1,3,-1,-1]];
	tablero.casillas=casillas;
	//individuo
	//{id:0,especie:0,sexo:"M",movimiento:"NO",decision:"N",semilla:""}
	tablero.individuos=[{id:0,especie:0,sexo:"M",movimiento:"SO",decision:"N",semilla:""},
						{id:1,especie:0,sexo:"H",movimiento:"SE",decision:"N",semilla:""},
						{id:2,especie:1,sexo:"M",movimiento:"NE",decision:"N",semilla:""},
						{id:3,especie:1,sexo:"H",movimiento:"NO",decision:"N",semilla:""}];
	return tablero;
}