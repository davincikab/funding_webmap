// Creating map object
var map = L.map("map", {
    center: [36.15561783381855, -6.899414062500001],
    zoom: 5
});

// Adding tile layer

var layer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}' + (L.Browser.retina ? '@2x.png' : '.png'), {
   attribution:'&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attributions">CARTO</a>',
   subdomains: 'abcd',
   maxZoom: 20,
   minZoom: 0
 });

 layer.addTo(map);

 baseLayers ={
    'Carto Dark':layer
 };

// Load in geojson data
var asthmaData = "data/london_data.geojson";

var spainProvinces = L.geoJson(null, {
    style:function(feature) {
        return {
            fillColor:styleProvince(feature),
            fillOpacity:0.8,
            opacity:1,
            weight:0.5,
            color:'#dddd'
        }
    },
    onEachFeature:function(feature, layer){
        // add popup
        let popupContent = "<div class='popup-content'>"+
                    "<h3 class='header'>"+feature.properties.Name+"</h3>"+
                    "</div><p><strong>"+feature.properties['% RAISED']+"</strong> <br>Contribution </p>";
        layer.bindPopup(popupContent);

        // zoom to layer on click
        layer.on('click', function(e) {
            console.log(e);
            let targetLayer = e.target;
            // map.fitBounds(targetLayer.getBounds());

            map.flyTo(e.latlng, 7);
        });

    }
});

function styleProvince(feature) {
    let amountRaised = feature.properties['% RAISED'];
    return amountRaised == '100%' ? 'green': amountRaised == '0%' ? 'red': 'beige';
}


spainProvinces.addTo(map);

// The callback function the JSONP request will execute to load data from API
function doData(data) {
    console.log(data);

    // Final results will be stored here	
    var results = [];

    // Get all entries from spreadsheet
    var entries = data.feed.entry;

    // Set initial previous row, so we can check if the data in the current cell is from a new row
    var previousRow = 0;

    // Iterate all entries in the spreadsheet
    for (var i = 0; i < entries.length; i++) {
        // check what was the latest row we added to our result array, then load it to local variable
        var latestRow = results[results.length - 1];

        // get current cell
        var cell = entries[i];

        // get text from current cell
        var text = cell.content.$t;

        // get the current row
        var row = cell.gs$cell.row;

        // Determine if the current cell is in the latestRow or is a new row
        if (row > previousRow) {
            // this is a new row, create new array for this row
            var newRow = [];

            // add the cell text to this new row array  
            newRow.push(text);

            // store the new row array in the final results array
            results.push(newRow);

            // Increment the previous row, since we added a new row to the final results array
            previousRow++;
        } else {
            // This cell is in an existing row we already added to the results array, add text to this existing row
            latestRow.push(text);
        }

    }

    handleResults(results);
}

// Do what ever you please with the final array
function handleResults(spreadsheetArray) {
    let data = [];
    // create an object with the data
    var headers = spreadsheetArray[0];
    spreadsheetArray = spreadsheetArray.slice(1,);

    spreadsheetArray.forEach(entry => {
        let myEntry = {};

        headers.forEach((key,i) => myEntry[key] = entry[i].trim());
        data.push(myEntry);
    });

    console.log(data);

    loadGeoData(data);        
}

$.ajax({
    url:'https://spreadsheets.google.com/feeds/cells/1h5ZvlgoS9PmMrxH_p3uv8KbuD4c8heg9od02FrQMLuk/1/public/values?alt=json-in-script&callback=doData',
    type:'GET',
    dataType:'jsonp',
    jsonp:'doData'
});

function loadGeoData(contributionData) {
    fetch('data/spain_provinces.geojson')
    .then(res => res.json())
    .then(data => {

        // add contributios
        data.features.forEach(feature => {
            let contribution = contributionData.find(c => c['CITY'] == feature.properties.Name);
            if(contribution) {
                feature.properties = {...feature.properties, ...contribution}
            }
            return feature;
        });

        console.log(data);
        spainProvinces.addData(data);
        map.fitBounds(spainProvinces.getBounds());
    })
    .catch(error => {
        console.log(error);
    });
}


// legend
var legendControl = new L.Control({position:'bottomleft'});
legendControl.onAdd = function(map) {
    let div = L.DomUtil.create('div','legend');

    div.innerHTML += '<div class="outer-box"><div class="box red"></div> <small>   No Funding</small></div>';
    div.innerHTML += '<div class="outer-box"><div class="box beige"></div><small>  Partial Funding</small></div>';
    div.innerHTML += '<div class="outer-box"><div class="box green"></div> <small>  Full Funding</small></div>';

    return div;
}

map.addControl(legendControl);