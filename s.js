var express = require('express');
var app = express();
var https = require('https');
var mongo = require('mongodb').MongoClient;
var baseURI = 'https://www.googleapis.com/customsearch/v1?key=AIzaSyBSs63MBV6VRExRW6dk_Zg1QZgD9hH0TrE&cx=003225943748974810979:1dlhgvqwfis';
var searchTypePrefix = '&searchType=';
var searchType = 'image';
var queryPrefix = '&q=';
var query = 'lolcat funny';
var numPrefix = '&num=';
var num = 10;
var imgInfoArr = [];
var resObj = {};
var startPrefix = '&start=';
var start = 2;
var fullURI = baseURI + searchTypePrefix + searchType + queryPrefix + query + numPrefix + num + startPrefix + start;


function storeSearchedTerm(searchedTerm) {
    mongo.connect('mongodb://admin:admin2020@ds015720.mlab.com:15720/heroku_8mmg8q9c', function(err, db) {
        if (err) {
            console.log('Failed To Connect DB');
        } else {
            console.log('Successfully Connected To DB');
            db.collection('searchedTermArr').find({
                _id: 'searchedTerms'
            }).toArray(function(err, data) {
                if (err) {
                    console.log('Data Not Found');
                } else {
                    var searchedTerms = data[0]['searchedTerms'];
                    var newSearchedTerm = {
                        term: searchedTerm,
                        when: new Date().toISOString()
                    };
                    searchedTerms.push(newSearchedTerm);
                    db.collection('searchedTermArr').update({
                        _id: 'searchedTerms'
                    }, {
                        $set: {
                            searchedTerms: searchedTerms
                        }
                    });
                }

            });
        }
    });
}

var recentTenSearchedTerms = [];

function findRecentSearchedTearms(callback) {
    mongo.connect('mongodb://admin:admin2020@ds015720.mlab.com:15720/heroku_8mmg8q9c', function(err, db) {
        if (err) {
            console.log('Failed To Connect DB');
        } else {
            console.log('Successfully Connected To DB');
            db.collection('searchedTermArr').find({
                _id: 'searchedTerms'
            }).toArray(function(err, data) {
                if (err) {
                    console.log('Data Not Found');
                } else {
                    console.log(data[0]);
                    var searchedTermArr = data[0]['searchedTerms'];
                    var num = 0;
                    if (searchedTermArr.length > 10) {
                        num = 10;
                    } else {
                        num = searchedTermArr.length;
                    }
                    for (var i = 0; i < num; i++) {
                        recentTenSearchedTerms.push(searchedTermArr[i]);
                    }
                    callback();
                }
            });
        }
    });
}

function returnimgInfoArr(callback) {
    fullURI = baseURI + searchTypePrefix + searchType + queryPrefix + query + numPrefix + num + startPrefix + start;
    storeSearchedTerm(query);
    https.get(fullURI, function(response) {
        var body = "";
        response.on('data', function(info) {
            body += info;
        });
        response.on('end', function() {
            var parsed = JSON.parse(body);
            var arr = [];
            parsed['items'].forEach(function(item) {
                var obj = {
                    url: item['link'],
                    snippet: item['snippet'],
                    thumbnail: item['image']['thumbnailLink'],
                    context: item['image']['contextLink']
                };
                arr.push(obj);
                arr = JSON.stringify(arr);
                arr = JSON.parse(arr);
            });
            imgInfoArr = arr;
            callback();
        });
    });
}

function sendImgInfo() {
    console.log(fullURI);
    resObj.json(imgInfoArr);
}

app.get('/api/imagesearch/*', function(req, res) {
    var queryStr = req.url.match(/^\/api\/imagesearch\/(.*)\?offset=.*/i)[1];
    var queryPage = req.url.match(/^\/api\/imagesearch\/.*\?offset=(.*)/i)[1];
    start = queryPage * 10 + 1;
    query = queryStr;
    resObj = res;
    console.log('get' + start);
    returnimgInfoArr(sendImgInfo);
});

var recentTenResObj = {};

function sendRecentTen() {
    recentTenResObj.json(recentTenSearchedTerms);
}

app.get('/api/latest/imagesearch/', function(req, res) {
    recentTenResObj = res;
    findRecentSearchedTearms(sendRecentTen);
});

var port = process.env.PORT || 8080;
app.listen(port, function() {
    console.log('Node.js listening on port ' + port + '...');
});