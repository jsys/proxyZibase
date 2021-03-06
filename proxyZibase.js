/*
Prg par Jérôme SAYNES le 17/12/2013
Serveur proxy pour la box domotique
Version : 0.0.4
Licence : GPL2
*/


var fs = require('fs');
var url=require('url');

var express = require('express');
var md5 = require('MD5');
var http = require('http');

var app = express();

var parseString = require('xml2js').parseString;


function wget(aurl, seconde_cache, callback) {
    "use strict";
    var date = null;
    var buffer, data='', second;
    var u=url.parse(aurl);
    var fname='cache_wget'+md5(aurl)+'.txt';

    // Version en cache
    if (seconde_cache > 0 && fs.existsSync(fname)) {
        var stat=fs.statSync(fname);
        var d1=new Date();
        var d2=new Date(stat.mtime);
        if ((d1.getTime()-d2.getTime())/1000<seconde_cache) {
            var f=fs.readFileSync(fname, {encoding:'utf8'});
            callback(f);
            return false;
        }
    }

    var file = fs.createWriteStream(fname);
    var req = http.get({host: u.host, port: u.port||80, path: u.path}, function(res) {
        res.setEncoding('utf-8');
        res.on('data', function(chunk) {
            data+=chunk;
            buffer = file.write(chunk);
            if(buffer === false) {
                res.pause();
            }
            if (date === null) {
                date = new Date();
            }
            second = (new Date()-date)/1000;
            if (second > 5) {
                req.abort();
                return callback(false);
            }
        });
        res.on('end', function() {
            if (res.statusCode!==200) {
                callback(res.statusCode);
            }
            return callback(data);
        });
        file.on('drain', function() {
            res.resume();
        });
    });
    req.on('error', function() {
        return callback(false);
    });
}

var zibase=function(params) {
    "use strict";
    return {
        params: params,
        getDevices: function(callback) {
            var sensors=[],
                url='http://zibase.net/m/get_xml.php?device='+this.params.device+'&token='+this.params.token;
            wget(url, this.params.cache, function(xml) {
                if (xml=='') {
                    callback(false);
                    return false;
                }
                parseString(xml, function (err, js) {

                    var e=js.r.e, i;
                    for (i=0;i< e.length;i++) {
                        sensors.push({num: e[i].$.c, name:e[i].n[0], type:e[i].$.t, logo:e[i].$.i});
                    }
                    callback(sensors);
                    return true
                });
            });
        },
        getSensors: function(callback) {
            var tt=this, url, cache;
            if (this.params.ip) {
                url='http://'+this.params.ip+'/sensors.xml';
                cache=0; // pas de cache
            } else {
                url='https://zibase.net/m/get_xml_sensors.php?device='+this.params.device+'&token='+this.params.token;
                cache=10; // 10 secondes de cache pour les requêtes en ligne
            }
            wget(url, cache, function(xml) {
                try {
                    if (xml.substring(0,5)=='ERROR') {
                        callback(false);
                        return false;
                    }
                }
                catch(err) {
                    return false;
                }
                parseString(xml, function (err, js) {
                    try {
                        var zwtab=tt.zwaveDecodeTab(js.doc.zwtab[0]);
                    }
                    catch (err) {
                        console.log(err);
                        callback(false);
                        return false;
                    }

                    var evs=[],
                        ev=js.doc.evs[0].ev,
                        i, e;
                    for(i=0;i<ev.length;i++) {
                        e=ev[i].$;
                        evs.push(e);
                    }

                    callback({evs: evs, zwtab: zwtab});
                    return true;
                });
            });
        },
        // ZA7 -> 6
        zwaveToId: function(zw) {
            return (zw.charCodeAt(1)-65)*16 + (parseInt(zw.substr(2),10)-1);
        },
        zwaveDecodeTab: function(tab) {
            var i, h=[];
            for (i=0;i<64;i++) {
                h[i]=tab[i].toString(16);
            }
            var chaine='', w=[], x=[], y=[], z=[];
            for (i=0;i<64;i++) {
                w[i]=(h[i]&1);
                x[i]=(h[i]&2)/2;
                y[i]=(h[i]&4)/4;
                z[i]=(h[i]&8)/8;
                chaine+=''+z[i]+y[i]+x[i]+w[i];
            }
            var Z=[];
            for (i=0;i<16;i++) {
                Z[i]=''+chaine.substr(i*16+8,4)+chaine.substr(i*16+12,4)+chaine.substr(i*16,4)+chaine.substr(i*16+4,4);
            }
            var j, ZZ=[];
            for (i=0 ; i<16 ; i++) {
                ZZ[i]=[];
                for (j=0 ; j<16 ; j++) {
                    ZZ[i][15-j] = Z[i].substr(j,1);
                }
            }
            var values={}, k;
            for (i=0; i<16; i++) {
                for (j=0; j<16; j++) {
                    k=('Z'+String.fromCharCode(65+i)+''+(j+1));
                    values[k]=parseInt(ZZ[i][j],10);
                }
            }
            return values;
        },
        // zw = ZA7 par exemple
        zwaveSuppAlerte: function(zw, callback) {
            var id=this.zwaveToId(zw),
                url='https://zibase.net/m/zapi_remote_zibase_set.php?device='+this.params.device+'&token='+this.params.token+'&action=rowzibasecommand&param1=4&param2=0&param3='+id+'&param4=19';
            wget(url,0, function(res) {
                callback(res);
            });
        },

        infos: function(callback) {
            var tt=this;
            tt.getDevices(function(devices) {
                if (devices===false) {
                    callback();
                    return;
                }
                tt.getSensors(function(sensors) {
                    if (sensors===false) {
                        callback();
                        return;
                    }

                    var i, j, e, id, pro;
                    for(i=0;i<devices.length;i++) {

                        // Si ZWAVE
                        if (devices[i].num.substr(0,1)==='Z') {
                            id=tt.zwaveToId(devices[i].num);
                            devices[i].id = id;
                            devices[i].actif=sensors.zwtab[devices[i].num];
                            for(j=0;j<sensors.evs.length;j++) {
                                e=sensors.evs[j];
                                if (/*e.pro==='ZW_ON' && */ e.id==id) {
                                    devices[i].alerte = 1;
                                    devices[i].gmt = parseInt(e.gmt,10);
                                    devices[i].date = new Date(parseInt(e.gmt*1000,10));
                                    devices[i].lowbatt = e.lowbatt;
                                    break;
                                }
                            }
                        } else {
                            pro=devices[i].num.substr(0,2);
                            for(j=0;j<sensors.evs.length;j++) {
                                e=sensors.evs[j];
                                if (/*e.pro===pro && */ e.id==devices[i].num.substr(2)) {
                                    devices[i].id = devices[i].num.substr(2);
                                    devices[i].gmt = parseInt(e.gmt,10);
                                    devices[i].date = new Date(parseInt(e.gmt*1000,10));
                                    devices[i].v1 = e.v1;
                                    devices[i].v2 = e.v2;
                                    devices[i].lowbatt = e.lowbatt;
                                    break;
                                }
                            }
                        }
                    }
                    callback(devices);
                });
            });
        },


        traiteAction: function(param, callback) {
            if (param.suppAlerte && param.suppAlerte.substring(0,1)==='Z') {
                this.zwaveSuppAlerte(param.suppAlerte, function() {
                    return callback(true);
                });
            } else {
                return callback(false);
            }
        },

        traiteQuery: function(param, callback) {
            this.infos(function(infos) {
                if (param.periph && typeof infos==='object') {
                    var ok=false;
                    for(var i=0;i<infos.length;i++) {
                        if (infos[i].num===param.periph || infos[i].name===param.periph) {
                            if (param.info) {
                                // Renvoi l'info sur un périphérique
                                return callback(infos[i][param.info]+'');
                            } else {
                                // Renvoi les infos d'un périphérique
                                return callback(infos[i]);
                            }
                            ok=true;
                        }
                    }
                    if (!ok) {
                        // Renvoi rien si le periph recherché n'existe pas
                        return callback();
                    }
                } else {
                    // Renvoi tout les périphériques
                    return callback(infos);
                }
            });
        }
    };
};


app.get('/', function (req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");

    if (req.query.device && req.query.token) {
        var z=zibase({device: req.query.device, token: req.query.token, ip: req.query.ip});

        if (req.query.suppAlerte) {
            z.traiteAction(req.query, function(r) {
                z.traiteQuery(req.query, function(r) {
                    return res.send(r);
                });
            });
        } else {
            z.traiteQuery(req.query, function(r) {
                return res.send(r);
            });
        }

    } else {
        return res.send("Parametre device et token manquant.");
    }
});

app.get('/version', function (req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.send("V2014.01.10");
});

http.createServer(app).listen(81, function(){
    console.log('proxyZibase server start on port 81');
});

