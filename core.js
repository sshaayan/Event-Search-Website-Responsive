// Core JQuery and Angular file

// Global variables
var geolocation; // Location based on the user's IP address
var allCurrInfo; // The current JSON data returned by the Ticketmaster API
var months = {"1": "January", "2": "February", "3": "March", "4": "April", "5": "May",
              "6": "June", "7": "July", "8": "August", "9": "September", "10": "October",
              "11": "November", "12": "December"};
var myStorage = window.localStorage;

function pageLoaded() {
  $("#search").attr("disabled", true);
  $("#favBtn").attr("disabled", true);
  $.get("https://ipinfo.io/json?token=e12792029dfd7b", function(output) {
    geolocation = output.loc.split(",")
  });
}

$(document).ready(function() {
  // Validate when the user clicks out of the input form
  $("#keyword").focusout(function() {
    var inputVal = $(this).val();
    if(!inputVal.replace(/ /g, '') || /^[a-zA-Z0-9- ]*$/.test(inputVal) == false) {
      $("#firstValidate").css({"visibility": "visible"});
      $("#keyword").css({"border-color": "red"});
    }
  });

  // Reset error message if applicable when something is entered into the input form
  $("#keyword").on('input', function() {
    $("#firstValidate").css({"visibility": "hidden"});
    $("#keyword").css({"border-color": "#cdd4db"});
  });

  // Activate the location text box if the "Other" radio button is checked
  $(".locButton").click(function() {
    if($("#other-loc:checked").val() == "on") {
      $("#other-input").prop("disabled", false);
    }
    else if($("#curr-loc:checked").val() == "on") {
       $("#other-input").prop("disabled", true);
       $("#secondValidate").css({"visibility": "hidden"});
       $("#other-input").css({"border-color": "#cdd4db"});
    }
  });

  // Validate the location input when the user clicks out of it
  $("#other-input").focusout(function() {
    var inputVal = $(this).val();
    if(!inputVal.replace(/ /g, '') || /^[a-zA-Z0-9- ]*$/.test(inputVal) == false) {
      $("#secondValidate").css({"visibility": "visible"});
      $("#other-input").css({"border-color": "red"});
    }
  });

  // Reset the error message for the location input form, or when the other button is checked
  $("#other-input").on('input', function() {
    $("#secondValidate").css({"visibility": "hidden"});
    $("#other-input").css({"border-color": "#cdd4db"});
  });

  // Enable the search button if all the required information has been added to the form
  $("form :input").change(function() {
    if($("#keyword").val() && ($("#curr-loc:checked").val() == "on" || $("#other-input").val())) {
      $("#search").attr("disabled", false);
    }
    else {
      $("#search").attr("disabled", true);
    }
  });

  // Clear the form and the results
  $("#clear").click(function() {
    $("#details-table").html("");
    $("#results-table").html("");
    $("#details-table").hide();
    $("#results-table").hide();
    $("#fav-results-table").hide();
    $("#fav-details-table").hide();

    $("#keyword").val("");
    $("#categoryList").prop("selectedIndex",0);
    $("#distance").val("");
    $("#unit-list").prop("selectedIndex",0);
    $("#curr-loc").prop("checked", true);
    $("#other-loc").prop("checked", false);
    $("#other-input").val("");
    $("#other-input").prop("disabled", true);
  });

  // Get results after clicking the search button
  $("#search").click(function() {
    $("#details-table").html("");
    $("#results-table").html('<div class="progress"><div class="progress-bar progress-bar-striped" role="progressbar" style="width: 50%" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100"></div></div>');
    $("#details-table").hide();
    $("#results-table").show();

    var keyword = $("#keyword").val();
    var category = $("#categoryList option:selected").val();
    var distance = $("#distance").val();
    if (distance == "") {
      distance = "10";
    }
    var distUnit = $("#unit-list option:selected").val();
    var lat = geolocation[0];
    var lng = geolocation[1];

    if ($("#other-loc:checked").val() == "on") {
      var geoUrl = "https://maps.googleapis.com/maps/api/geocode/json?address=";
      var locAddress = $("#other-input").val();
      var locAddress = locAddress.replace(/\s+/g,'+');
      jQuery.ajaxSetup({async:false});
      geoUrl += locAddress + "&key=AIzaSyBBhJ4BGqKrObAIHsXPzhuTYTs9FUvL2g8";
      $.ajax({
        url: geoUrl,
        type: "get",
        async: false,
        success: function(data) {
          if (data.status == "OK") {
            lat = data.results[0].geometry.location.lat;
            lng = data.results[0].geometry.location.lng;
          }
        },
        error: function() {
          console.log("ERROR");
        }
      });
    }

    // Call Ticketmaster API and process data
    var parameters = {"keyword":keyword, "category":category, "distance":distance, 
                      "distUnit":distUnit, "lat":lat, "lng":lng};
    $.get('/searchEvents', parameters, function(data) {
      if (data == "ERROR") {
        // Failed to get search result
        let errorHTML = '<form class="col-lg-9 col-md-9 col-sm-10 rounded" id="error_form">Failed to get search results.</form>'
        $("#results-table").html(errorHTML);
      }
      else if (data == "EMPTY") {
        // No records available
        let emptyHTML = '<form class="col-lg-9 col-md-9 col-sm-10 rounded" id="no_records">No records.</form>';
        $("#results-table").html(emptyHTML);
      }
      else {
        // Call the Spotify API
        for (var key1 in data) {
          for (var key2 in data[key1]["artists"]) {
            $.ajax({
              url: '/getArtistInfo',
              type: "get",
              data: { artist: data[key1]["artists"][key2] },
              async: false,
              success: function(response) {
                data[key1]["artistInfo"].push(response);
              },
              error: function() {
                console.log("ERROR: Spotify API");
              }
            });
          }
        }

        // Process and display the data
        allCurrInfo = data;
        allCurrInfo.sort((a, b) => parseInt(a["date"].replace(/-/g, '')) - parseInt(b["date"].replace(/-/g, '')));
        var tableHTML = '<p id="detailsText" style="text-align: right; font-size: 12px">Details <svg xmlns="http://www.w3.org/2000/svg" height="12px" viewBox="0 0 18 18" width="12px" fill="darkgray"><path d="M0 0h24v24H0z" fill="none"/><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg></p>';
        tableHTML += '<table class="table"><thead><tr><th style="border-bottom: 2px solid black;" class = "top-row" scope="col">#</th><th style="border-bottom: 2px solid black;" class = "top-row" scope="col">Date</th><th style="border-bottom: 2px solid black;" class = "top-row" scope="col">Event</th><th style="border-bottom: 2px solid black;" class = "top-row" scope="col">Category</th><th style="border-bottom: 2px solid black;" class = "top-row" scope="col">Venue Info</th><th style="border-bottom: 2px solid black;" class = "top-row" scope="col">Favorite</th></tr></thead><tbody>';

        for (var i = 0; i < 20 && i < allCurrInfo.length; i++) {
          tableHTML += '<tr><th scope="row">' + (i + 1) + '</th><td>';
          tableHTML += allCurrInfo[i]["date"] + '</td><td>';

          // Check if the event name is too long
          eventName = allCurrInfo[i]["event"];
          if (eventName.length > 35) {
            eventName = eventName.slice(0, 35);
            if (eventName.endsWith(" ")) {
              eventName = eventName.slice(0, 34);
            }
            eventName += "...";
          }

          tableHTML += '<a onclick="createDetails(' + i + ')" href="javascript:void(0);">' + eventName + '</a></td><td>';
          tableHTML += allCurrInfo[i]["category"] + '</td><td>';
          tableHTML += allCurrInfo[i]["venue"] + '</td><td class="notFavorited stars">';

          var starIcon = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg>';
          // Check if the event is in Favorites

          tableHTML += starIcon + '</td></tr>';
        }

        tableHTML += '</tbody></table>';
        $("#results-table").html(tableHTML);
        $("#favBtn").attr("disabled", false);

        $(".stars").click(function() {
          if ($(this).attr("class") == "notFavorited stars") {
            $(this).html('<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#FFD900"><g><rect fill="none" height="24" width="24" x="0"/><polygon points="14.43,10 12,2 9.57,10 2,10 8.18,14.41 5.83,22 12,17.31 18.18,22 15.83,14.41 22,10"/></g></svg>');
            $(this).attr("class", "favorited stars");
            addFav();
          }
          else {
            $(this).html('<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg>');
            $(this).attr("class", "notFavorited stars");
            removeFav();
          }
        });
      }
    });
  })
});

function createDetails(i) {
  var index = parseInt(i);
  $("#detailsText").css( {"color":"black"} );
  $("#detailsText").html('<a onclick="showDetails();" href="javascript:void(0);" style="text-decoration: none; color: black">Details </a><svg xmlns="http://www.w3.org/2000/svg" height="12px" viewBox="0 0 18 18" width="12px" fill="black"><path d="M0 0h24v24H0z" fill="none"/><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>');

  var detailHTML = '<h5 style="text-align: center;">' + allCurrInfo[i]["event"] + '</h5><div class="button-row"><button onclick="showResults();" style="font-size: 12px;" type="button" class="btn btn-outline-secondary"><svg xmlns="http://www.w3.org/2000/svg" height="11px" viewBox="0 0 24 24" width="11px" fill="#000000"><path d="M0 0h24v24H0z" fill="none"/><path d="M11.67 3.87L9.9 2.1 0 12l9.9 9.9 1.77-1.77L3.54 12z"/></svg> List</button>'
                   + '<button style="font-size: 12px; float: right; padding-bottom: 0; margin-left: 1%" type="button" class="btn btn-outline-secondary favButton2"><svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="#000000"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg></button>'
                   + '<a target="_blank" href="https://twitter.com/intent/tweet?text=Check%20Out%20' + encodeURIComponent(allCurrInfo[i]["event"]) + '%20located%20at%20' + encodeURIComponent(allCurrInfo[i]["venue"]) + '.%20%23CSCI571EventSearch"><img style="vertical-align: top; margin-top: 1%; float: right" width="33px" height="33px" src="https://csci571.com/hw/hw8/images/Twitter.png"></a></div><ul style="font-size: 12px; margin-bottom: 2%;" class="nav nav-tabs col-lg-12" role="tablist"><li class="nav-item ml-auto"><a class="nav-link active" onclick="showEventTab();" href="javascript:void(0);" role="presentation" id="event-tab">Event</a>'
                   + '</li><li class="nav-item"><a class="nav-link" onclick="showArtistTab();" href="javascript:void(0);" role="presentation" id="artist-tab">Artist/Teams</a></li><li class="nav-item"><a class="nav-link" onclick="showVenueTab();" href="javascript:void(0);" role="presentation" id="venue-tab">Venue</a></li></ul>';

  // Create the Event tab
  detailHTML += '<div class="tab-content"><div class="tab-pane fade show active" id="event-entry" role="tabpanel"><table class="table table-striped"><tbody>';
  if (allCurrInfo[i]["artists"].length > 0) {
    detailHTML += '<tr><th scope="row">Artist/Team(s)</th><td>';
    for (var curr = 0; curr < allCurrInfo[i]["artists"].length; curr++) {
      if (curr > 0) {
        detailHTML += ' | ';
      }
      detailHTML += allCurrInfo[i]["artists"][curr];
    }
    detailHTML += '</td></tr>';
  }
  if (allCurrInfo[i]["venue"]) {
    detailHTML += '<tr><th scope="row">Venue</th><td>' + allCurrInfo[i]["venue"] + '</td></tr>';
  }
  if (allCurrInfo[i]["date"]) {
    var splitDate = allCurrInfo[i]["date"].split("-");
    if (splitDate[1][0] == 0) {
      splitDate[1] = splitDate[1].slice(1, 2);
    }
    if (splitDate[2][0] == 0) {
      splitDate[2] = splitDate[2].slice(1, 2);
    }
    detailHTML += '<tr><th scope="row">Time</th><td>' + months[splitDate[1]] + " " + splitDate[2] + ', ' + splitDate[0] + '</td></tr>';
  }
  if (allCurrInfo[i]["category"]) {
    detailHTML += '<tr><th scope="row">Category</th><td>' + allCurrInfo[i]["category"] + '</td></tr>';
  }
  if (allCurrInfo[i]["priceRange"]) {
    detailHTML += '<tr><th scope="row">Price Range</th><td>' + allCurrInfo[i]["priceRange"] + '</td></tr>';
  }
  if (allCurrInfo[i]["ticketStatus"]) {
    detailHTML += '<tr><th scope="row">Ticket Status</th><td>' + allCurrInfo[i]["ticketStatus"] + '</td></tr>';
  }
  if (allCurrInfo[i]["ticketURL"]) {
    detailHTML += '<tr><th scope="row">Buy Ticket At</th><td><a target="_blank" href="' + allCurrInfo[i]["ticketURL"] + '">Ticketmaster</a></td></tr>';
  }
  if (allCurrInfo[i]["seatmap"]) {
    detailHTML += '<tr><th scope="row">Seat Map</th><td><a target="_blank" href="' + allCurrInfo[i]["seatmap"] + '">View Seat Map Here</a></td></tr>';
  }
  detailHTML += '</tbody></table></div>';

  // Create the Artist/Team tab
  detailHTML += '<div class="tab-pane fade" id="artist-entry" role="tabpanel">';
  for (var curr = 0; curr < allCurrInfo[i]["artists"].length; curr++) {
    detailHTML += '<h6 style="text-align: center;">' + allCurrInfo[i]["event"] + '</h6>'
    if (allCurrInfo[i]["artistInfo"][curr]["name"] == "") {
      console.log("OK");
      detailHTML += '<p style="font-style: 12px; margin-bottom: 15px;">No details available</p>';
    }
    else {
      detailHTML += '<table style="margin-bottom: 20px;" class="table"><tbody><tr><th scope="row">Name</th><td>' + allCurrInfo[i]["artistInfo"][curr]["name"] + '</td></tr>';
      let formattedPop = allCurrInfo[i]["artistInfo"][curr]["followers"].toLocaleString("en-US");
      detailHTML += '<tr><th scope="row">Followers</th><td>' + formattedPop + '</td></tr>';
      detailHTML += '<tr><th scope="row">Popularity</th><td>' + allCurrInfo[i]["artistInfo"][curr]["popularity"] + '<round-progress [current]="' 
                    + allCurrInfo[i]["artistInfo"][curr]["popularity"] + '" [max]="100" [radius]="16" [stroke]="2"></round-progress></td></tr>';
      detailHTML += '<tr><th scope="row">Check At</th><td><a target="_blank" href="' + allCurrInfo[i]["artistInfo"][curr]["link"] + '">Spotify</a></td></tr>';
      detailHTML += '</tbody></table>';
    }
  }
  detailHTML += '</div>';

  // Create the Venue tab
  detailHTML += '<div class="tab-pane fade" id="venue-entry" role="tabpanel">';
  let addrEntry = allCurrInfo[i]["address"];
  let cityEntry = allCurrInfo[i]["city"];
  let phoneEntry = allCurrInfo[i]["phone"];
  let hoursEntry = allCurrInfo[i]["hours"];
  let generalEntry = allCurrInfo[i]["generalRule"];
  let childEntry = allCurrInfo[i]["childRule"];
  if (addrEntry == "" && cityEntry == "" && phoneEntry == "" && hoursEntry == "" && generalEntry == "" && childEntry == "") {
    // No records available
  }
  else {
    detailHTML += '<table class="table"><tbody>';
    if (addrEntry != "") {
      detailHTML += '<tr><th scope="row">Address</th><td>' + addrEntry + '</td></tr>';
    }
    if (cityEntry != "") {
      detailHTML += '<tr><th scope="row">City</th><td>' + cityEntry + '</td></tr>';
    }
    if (phoneEntry != "") {
      detailHTML += '<tr><th scope="row">Phone Number</th><td>' + phoneEntry + '</td></tr>';
    }
    if (hoursEntry != "") {
      detailHTML += '<tr><th scope="row">Open Hours</th><td>' + hoursEntry + '</td></tr>';
    }
    if (generalEntry != "") {
      detailHTML += '<tr><th scope="row">General Rule</th><td>' + generalEntry + '</td></tr>';
    }
    if (childEntry != "") {
      detailHTML += '<tr><th scope="row">Child Rule</th><td>' + childEntry + '</td></tr>';
    }
    detailHTML += '</tbody></table>';

    if (addrEntry != "") {
      detailHTML += '<div id="map"></div>';
      var geoUrl = "https://maps.googleapis.com/maps/api/geocode/json?address=";
      var newAddr = addrEntry.replace(/\s+/g,'+');
      jQuery.ajaxSetup({async:false});
      geoUrl += newAddr + "&key=" + "AIzaSyBBhJ4BGqKrObAIHsXPzhuTYTs9FUvL2g8";
      $.ajax({
        url: geoUrl,
        type: "get",
        async: false,
        success: function(data) {
          if (data.status == "OK") {
            let latEntry = data.results[0].geometry.location.lat;
            let lngEntry = data.results[0].geometry.location.lng;

            detailHTML += '<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyBBhJ4BGqKrObAIHsXPzhuTYTs9FUvL2g8&callback=initMap&libraries=&v=weekly"></script>'
                          + '<script type="text/javascript">function initMap(lat1 = ' + latEntry + ', lng1 = ' + lngEntry + ') {const currLoc = { lat: lat1, lng: lng1 };const map = new google.maps.Map(document.getElementById("map"), {zoom: 15,center: currLoc,});const marker = new google.maps.Marker({position: currLoc, map: map,});}initMap(' + latEntry + ', ' + lngEntry + ');</script>';
          }
        },
        error: function() {
          console.log("ERROR");
        }
      });
    }
  }
  detailHTML += '</div>';

  $("#results-table").hide();
  $("#details-table").html(detailHTML);
  $("#details-table").show();

  $(".favButton2").click(function() {
    if ($(this).attr("class") == "btn btn-outline-secondary favButton2") {
      $(this).html('<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="20px" viewBox="0 0 24 24" width="20px" fill="#FFD900"><g><rect fill="none" height="24" width="24" x="0"/><polygon points="14.43,10 12,2 9.57,10 2,10 8.18,14.41 5.83,22 12,17.31 18.18,22 15.83,14.41 22,10"/></g></svg>');
      $(this).attr("class", "btn btn-outline-secondary notfavButton2");
      addFav();
    }
    else {
      $(this).html('<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 0 24 24" width="20px" fill="#000000"><path d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z"/></svg>');
      $(this).attr("class", "btn btn-outline-secondary favButton2");
      removeFav();
    }
  });
}

function showDetails() {
  $("#results-table").hide();
  $("#details-table").show();
}

function showResults() {
  $("#details-table").hide();
  $("#results-table").show();
}

function showEventTab() {
  $("#venue-entry").attr("class", "tab-pane fade");
  $("#artist-entry").attr("class", "tab-pane fade");
  $("#event-entry").attr("class", "tab-pane fade show active");

  $("#venue-tab").attr("class", "nav-link");
  $("#artist-tab").attr("class", "nav-link");
  $("#event-tab").attr("class", "nav-link active");
}

function showArtistTab() {
  $("#venue-entry").attr("class", "tab-pane fade");
  $("#event-entry").attr("class", "tab-pane fade");
  $("#artist-entry").attr("class", "tab-pane fade show active");

  $("#venue-tab").attr("class", "nav-link");
  $("#event-tab").attr("class", "nav-link");
  $("#artist-tab").attr("class", "nav-link active");
}

function showVenueTab() {
  $("#event-entry").attr("class", "tab-pane fade");
  $("#artist-entry").attr("class", "tab-pane fade");
  $("#venue-entry").attr("class", "tab-pane fade show active");

  $("#event-tab").attr("class", "nav-link");
  $("#artist-tab").attr("class", "nav-link");
  $("#venue-tab").attr("class", "nav-link active");
}

function removeFav() {
  console.log("removed");
}

function addFav() {
  console.log("added");
}
