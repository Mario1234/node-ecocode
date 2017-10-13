
var dameRespuestaId = module.exports.dameRespuestaId = function (id,respuestas){
	var i;
	for(i=0;i<respuestas.length;i++){
		if(respuestas[i].id==id){
			return respuestas[i];
		}
	}
	return null;
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
						{id:2,especie:0,sexo:"M",movimiento:"NE",decision:"N",semilla:""},
						{id:3,especie:0,sexo:"H",movimiento:"NO",decision:"N",semilla:""}];
	return tablero;
}