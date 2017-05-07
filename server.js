var express = require('express'),
bodyParser = require('body-parser'),
multiparty = require('connect-multiparty'),
http = require('http'),
mongodb = require('mongodb'),
objectId = require('mongodb').ObjectId,
fs = require('fs-extra'),
sharp = require('sharp'),
Sync = require('sync');

var app = express();

//body-parser
app.use(bodyParser.urlencoded({ extended:true}));
app.use(bodyParser.json());
app.use(multiparty());

app.use(function(req, res, next){

	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
	res.setHeader("Access-Control-Allow-Headers", "content-type");
	res.setHeader("Access-Control-Allow-Credentials", true);

	next();
});

var port = 8080;

app.listen(port);

var db = new mongodb.Db(
	'resize-image',
	new mongodb.Server('localhost', 27017, {}),
	{}
	);

console.log('Servidor HTTP esta escutando na porta ' + port);

app.get('/', function(req, res){

	//Busca JSON
	var reqGet = http.request('http://54.152.221.29/images.json', function(data) {
		
		data.on('data', function(d) {

			var buf = new Buffer.from(d);
			
			var temp = JSON.parse(buf);

			result= '{ "images": [ ';

			for(var i = 0; i < temp.images.length; i++){
				Sync(function(){

					//Tamanhos de resize
					var resizeTransformSmall = sharp().resize(320, 240).max();
					var resizeTransformMedium = sharp().resize(384, 288).max();
					var resizeTransformLarge = sharp().resize(640, 480).max();

					//Preparar URLs
					var pathOrigem = temp.images[i].url;
					var pathDestinoSmall = './uploads/small_' + pathOrigem.substring(pathOrigem.lastIndexOf('/')+1);
					var pathDestinoMedium = './uploads/medium_' + pathOrigem.substring(pathOrigem.lastIndexOf('/')+1);
					var pathDestinoLarge = './uploads/large_' + pathOrigem.substring(pathOrigem.lastIndexOf('/')+1);

					//Insere no DB
					Sync(function(){
						db.open( function(err, mongoclient){
							mongoclient.collection('images', function(err, collection){
								collection.insert(
								{
									url: pathOrigem, 
									sizes: {
										small: pathDestinoSmall,
										medium: pathDestinoMedium,
										large: pathDestinoLarge
									}
								},
								function(err, records){
									//console.log('Foi');
									mongoclient.close();
								});
							});
						});
					});

					//Monta o JSON de resposta
					result = result + '{ "url": "' + pathOrigem + '", ';
					result = result + ' "sizes": { "small": "' + pathDestinoSmall + '", "medium": "'+ pathDestinoMedium +'", "large": "'+ pathDestinoLarge +'" } },';

					//Move para a pasta e redimensiona
					http.get(pathOrigem, function(downloadStream) {  

						var writeStreamSmall = fs.createWriteStream(pathDestinoSmall);
						var writeStreamMedium = fs.createWriteStream(pathDestinoMedium);
						var writeStreamLarge = fs.createWriteStream(pathDestinoLarge);

						Sync(function(){
							downloadStream.pipe(resizeTransformSmall).pipe(writeStreamSmall);
						});
						Sync(function(){
							downloadStream.pipe(resizeTransformMedium).pipe(writeStreamMedium);
						});
						Sync(function(){
							downloadStream.pipe(resizeTransformLarge).pipe(writeStreamLarge);
						});

					});
				});

			}

			//Ajusta o JSON
			result= result.substring(0, result.length - 1);  
			result= result + ']}';

			var obj = JSON.parse(result);

			res.json(obj);
			return;
		});

	});

	reqGet.end();
	reqGet.on('error', function(e) {
		console.error(e);
	});
});
