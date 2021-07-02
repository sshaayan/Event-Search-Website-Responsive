// Variables
const express = require("express");
const cors = require("cors");
const path = __dirname + '/app/views';
const app = express();
const geohash = require("ngeohash");
const request = require("request");
const SpotifyWebApi = require("node-spotify-api");
var spotifyApi = new SpotifyWebApi({
  id: 'bfe9186fa29a44fb96241acb2701fbc3',
  secret: 'e8c0c71436594499837908d5a2f331a4'
});

// Set up server
app.use(express.static(path));

var corsOptions = {
  origin: "http://localhost:4020"
};

app.use(cors(corsOptions));

app.get('/', function(req, res) {
  res.sendFile(path + "index.html");
});

// Get Spotify API data
app.get('/getArtistInfo', function(req, res) {
  var artistName = req.query.artist;
  var spotifyEntry = {"name":"", "followers":"", "popularity":"", "link":""};
  spotifyApi.search({type: 'artist', query: artistName }, 
    function(err, data) {
      if (!err) {
        artistData = data["artists"]["items"][0];
        if ("name" in artistData) {
          spotifyEntry["name"] = artistData["name"];
        }
        if ("followers" in artistData) {
          spotifyEntry["followers"] = artistData["followers"]["total"];
        }
        if ("popularity" in artistData) {
          spotifyEntry["popularity"] = artistData["popularity"];
        }
        if ("external_urls" in artistData) {
          spotifyEntry["link"] = artistData["external_urls"]["spotify"];
        }
      }
      res.send(spotifyEntry);
    }
  );
});

app.get('/searchEvents', function(req, res) {
  var keyword = req.query.keyword;
  var category = req.query.category;
  var distance = req.query.distance;
  var distUnit = req.query.distUnit;
  var geoVal = geohash.encode(req.query.lat, req.query.lng);

  var requestURL = "https://app.ticketmaster.com/discovery/v2/events.json?apikey=7PhcQTBX7M3JrEdFwRNzTYmOGcAjFx0P&keyword=";
  requestURL += keyword.split(/[ ,]+/).join("%20");
  if (category != "") {
    requestURL += "&segmentId=" + category;
  }
  requestURL += "&unit=" + distUnit + "&radius=" + distance + "&geoPoint=" + geoVal;
  request(requestURL, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var outputData = JSON.parse(body);

      // If the search did not return any results
      if (outputData["page"]["totalPages"] == 0) {
        res.send("EMPTY");
        return;
      }

      var count = 0;
      var cleanEvents = [];
      for(var key in outputData["_embedded"]["events"]) {
        var temp = outputData["_embedded"]["events"][key];
        var newEntry = {"date":"", "event":"", "category":"", "venue":"",
                "artists":[], "artistInfo":[], "priceRange":"", 
                "ticketStatus":"", "ticketURL":"", "seatmap":"", "address":"",
                "city":"", "phone":"", "hours":"", "generalRule":"",
                "childRule":""};

        if ("dates" in temp) {
          if ("start" in temp["dates"]) {
            if ("localDate" in temp["dates"]["start"]) {
              newEntry["date"] = temp["dates"]["start"]["localDate"];
            }
          }
          if ("status" in temp["dates"]) {
            if ("code" in temp["dates"]["status"]) {
              newEntry["ticketStatus"] = temp["dates"]["status"]["code"];
            }
          }
        }
        if ("name" in temp) {
          newEntry["event"] = temp["name"];
        }
        if ("classifications" in temp) {
          for (var item in temp["classifications"][0]) {
            if (item == "primary" || item == "family") {
              continue;
            }
            var curr = temp["classifications"][0][item];
            if ("name" in curr) {
              if (curr["name"] != "Undefined") {
                if (newEntry["category"] != "") {
                  newEntry["category"] += " | ";
                }
                newEntry["category"] += curr["name"];
              }
            }
          }
        }
        if ("_embedded" in temp) {
          if ("venues" in temp["_embedded"]) {
            var curr = temp["_embedded"]["venues"][0];

            if ("name" in curr) {
              newEntry["venue"] = curr["name"];
            }
            if ("address" in curr) {
              newEntry["address"] = curr["address"]["line1"];
            }
            if ("city" in curr && "state" in curr) {
              newEntry["city"] = curr["city"]["name"] + ", " + curr["state"]["name"];
            }
            if ("boxOfficeInfo" in curr) {
              if ("phoneNumberDetail" in curr["boxOfficeInfo"]) {
                newEntry["phone"] = curr["boxOfficeInfo"]["phoneNumberDetail"];
              }
              if ("openHoursDetail" in curr["boxOfficeInfo"]) {
                newEntry["hours"] = curr["boxOfficeInfo"]["openHoursDetail"];
              }
            }
            if ("generalInfo" in curr) {
              if ("generalRule" in curr["generalInfo"]) {
                newEntry["generalRule"] = curr["generalInfo"]["generalRule"];
              }
              if ("childRule" in curr["generalInfo"]) {
                newEntry["childRule"] = curr["generalInfo"]["childRule"];
              }
            }
          }
          if ("attractions" in temp["_embedded"]) {
            for (var curr in temp["_embedded"]["attractions"]) {
              newEntry["artists"].push(temp["_embedded"]["attractions"][curr]["name"]);
            }
          }
        }
        if ("priceRanges" in temp) {
          newEntry["priceRange"] = temp["priceRanges"][0]["min"] + " - " + temp["priceRanges"][0]["max"] + " " + temp["priceRanges"][0]["currency"];
        }
        if ("url" in temp) {
          newEntry["ticketURL"] = temp["url"];
        }
        if ("seatmap" in temp) {
          if ("staticUrl" in temp["seatmap"]) {
            newEntry["seatmap"] = temp["seatmap"]["staticUrl"];
          }
        }

        cleanEvents[count] = newEntry;
        count += 1;
      }
      res.send(cleanEvents);
    }
    else {
      // return "Failed to get search result"
      res.send("ERROR");
      return;
    }
  })
});

const PORT = process.env.PORT || 4200;
app.listen(PORT, () => {
  console.log("Server started on port", PORT);
});
