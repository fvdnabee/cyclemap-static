var bounds;
var rangeSelector;
var dates;
var ready = false;

// TODO: do we want to redraw markers already on the map?
var markers_on_map = new Set([]);
var markers = [];
var jsonResponse;

var layer_ids = [];
var tile_ids = [];

var base_url = "https://227nqzmfaieax54j3dxd75l3fm0kmhgq.lambda-url.eu-west-1.on.aws"

var rssv = document.getElementById('mymapscript').getAttribute('data-rssv');
var rsev = document.getElementById('mymapscript').getAttribute('data-rsev');
var max_width_height = 50; // 50 for zoomlevel < 6.5 and 100 for zl >= 6.5

map.on('load', function () {
	ready = true;

	// Show cycling tracks on map
	layer_colors = ["#0000ff", "#ff0000", "#ff0000", "#ff0000", "#ff0000", "#ff0000", "#00ffff", "#ffff00", "#800080", "#ff00ff"]
	layer_ids = ["santiago-track", "silkroad-0-track", "silkroad-1-track", "silkroad-2-track", "silkroad-3-track", "silkroad-4-track", "benede-track", "limburg-track", "swiss-track", "prov-track"]
	tile_ids = ["fvdnabee.5dbhhek7", "fvdnabee.cwn75xfz", "fvdnabee.8uncf7n4", "fvdnabee.1o18xqpn", "fvdnabee.3k6un6tc", "fvdnabee.arcp8dgf", "fvdnabee.70itxk00", "fvdnabee.1icj8poo", "fvdnabee.2bu2zz52", "fvdnabee.57oj1dkv"]
	addTrackLayers();

	initAjaxFilters()
	updateMap();
});

function initAjaxFilters() {
	setDates(new Date(rssv), new Date(rsev))
	//var bounds = map.getBounds().toArray();
	var bounds = [ [ -180, -90 ], [ 180, 90 ] ]
	setBounds(bounds);
}

map.on('zoomend', function() {
	if (map.getZoom() < 6.5 && max_width_height != 50) {
		max_width_height = 50;
		draw_map_entries();
	} else if (map.getZoom() >= 6.5 && max_width_height != 100) {
		max_width_height = 100;
		draw_map_entries();
	}
});

function addTrackLayers (){
	for (var i = 0; i < layer_ids.length; i++) {
		map.addLayer({
			"id": layer_ids[i],
			"type": "line",
			"source": {
				type: 'vector',
				url: 'mapbox://' + tile_ids[i]
			},
			"source-layer": "tracks",
			"layout": {
				"line-join": "round",
				"line-cap": "round"
			},
			"paint": {
				"line-color": layer_colors[i],
				"line-width": 4
			}
		});
	}

}

$(function(){
	if (typeof DevExpress == "undefined") return;

	rangeSelector = $("#range").dxRangeSelector({
		margin: {
			top: 0
		},
		size: {
			height: 50
		},
		scale: {
			startValue: new Date(rssv),
			endValue: new Date(rsev),
			minorTickInterval: "month",
			tickInterval: "month",
			minorTick: {
				visible: true,
			},
			marker: { visible: false },
			label: {
				format: "MMM yyyy"
			}
		},
		behavior: {
			callValueChanged: "onMovingComplete"
		},
		sliderMarker: {
			format: "dd MMM yyyy"
		},
		//title: "Display posts from the following dates:",
		onValueChanged: function (e) {
			var beginDate = new Date(rangeSelector.getValue()[0]);
			var endDate = new Date(rangeSelector.getValue()[1]);
			setDates(beginDate, endDate);

			updateMap();
		}
	}).dxRangeSelector("instance");
});

function updateMap() {
	if (!ready) return;
	var bounds_uri_path = bounds.join('/');
	var dates_uri_path = dates[0].toISOString() + '/' + dates[1].toISOString();

	// In case we want to add uri query params
	var uri_queries = [];

	var query_str = "";
	if (uri_queries.length > 0) {
		query_str = '?' + uri_queries.join('&');
	}

	var url = base_url + '/cyclemap_entries/' + bounds_uri_path + '/' + dates_uri_path + query_str;

	var oReq = new XMLHttpRequest();
	oReq.open('GET', url);
	oReq.responseType = "json";
	oReq.onload = function() {
		if (oReq.status === 200) {
			jsonResponse = oReq.response;
			draw_map_entries();
		}
		else {
			alert('Request failed.  Returned status of ' + oReq.status);
		}
	};
	oReq.send();
}

function draw_map_entries() {
	// Remove all markers:
	markers.forEach(function(m) { m.remove(); });
	markers.length = 0;

	// see: https://docs.mapbox.com/mapbox-gl-js/example/custom-marker-icons/
	jsonResponse.forEach(function(map_entry) {
		var date = new Date(map_entry.created_at);

		// create a DOM element for the marker
		var el = document.createElement('div');

		el.className = 'marker';
		//el.innerHTML = map_entry.loc_name + '; ' + date.toLocaleDateString();
		//if (max_width_height > 50) {
		//	el.innerHTML = map_entry.loc_name.substring(0, 18);
		//} else {
		//	el.innerHTML = '';
		//}
		el.style.padding = '1px';
		el.style.backgroundColor = 'white';
		el.style.backgroundImage = 'url(' + map_entry.media_attachments[0].preview_url + ')';
		if (max_width_height > 50) {
			el.style.backgroundPosition = 'center bottom';
		} else {
			el.style.backgroundOrigin = 'content-box';

		}
		el.style.backgroundRepeat = 'no-repeat';

		var w = map_entry.media_attachments[0].meta.small.width
		var h = map_entry.media_attachments[0].meta.small.height

		var ratioX = max_width_height / w;
		var ratioY = max_width_height / h;
		var ratio = Math.min(ratioX, ratioY);

		var newWidth = Math.floor(w * ratio);
		var newHeight = Math.floor(h * ratio);

		var marker_height = newHeight;
		// if (max_width_height > 50) { marker_height += 24; }
		el.style.width = newWidth + 'px';
		el.style.height = marker_height + 'px';
		el.style.backgroundSize = newWidth + 'px ' + newHeight + 'px';

		//el.addEventListener('click', function() {
		//    window.alert(map_entry.caption + '\n\n' + map_entry.url);
		//});

		// add marker to map
		var marker = new mapboxgl.Marker(el)
			.setLngLat(map_entry.location.coordinates)
			.setPopup(new mapboxgl.Popup({className: 'map_entry_popup', offset: 25 }) // add popups
				//.setHTML('<p style="margin: 0"><strong><a href="' + map_entry.account.url +'">' + map_entry.account.display_name + '</a></strong> • <a href="' + map_entry.url + '" title="View post on instagram.com">' + date.toDateString() + '</a></p>' +
				//	//'<p style="margin: 0; font-family: monospace, monospace;">' + map_entry.loc_name + '</p>' +
				//	'<img src="' + map_entry.media_attachments[0].url + '" style="max-width: 400px;" alt="Image not found" />' +
				//	map_entry.content +
				//	'<a href="' + map_entry.url + '" title="View all media on mastodon">' + map_entry.url + '</a>'))
				.setHTML('<iframe src="' + map_entry.url + '/embed" class="mastodon-embed" style="max-width: 100%; max-height: 350px; border: 0" width="400" height="400" allowfullscreen="allowfullscreen"></iframe><script src="https://social.vdna.be/embed.js" async="async"></script>'))
			.addTo(map);

		markers.push(marker);
	});
}

function setDates(beginDate, endDate) {
	dates = [beginDate, endDate]
}

function setBounds(b) {
	var newBounds = [b[0][0], b[0][1], b[1][0], b[1][1]]; // flatten array

	// round off the elements in newBounds:
	var fixed_length = 6;
	newBounds = newBounds.map(function(each_element){
		return Number(each_element.toFixed(fixed_length));
	});

	bounds = newBounds;
}

var btnSetBounds = document.getElementById("btn-set-bounds");
if (btnSetBounds != null) {
	btnSetBounds.onclick = function(){
		// show all track layers:
		layer_ids.forEach(function(id) { map.setLayoutProperty(id, 'visibility', 'visible'); });

		setBounds(map.getBounds().toArray());
		updateMap();
	};
}

var btnSilkroad = document.getElementById("btn-silkroad");
if (btnSilkroad != null) {
	btnSilkroad.onclick = function(){
		var beginDate = new Date(2018, 01, 01);
		var endDate = new Date(2018, 11, 30);
		var bounds = [ [-4.507774877735272, 2.6602810808397237], [146.11767796084553, 61.04584048146046] ];
		// show silkroad track layers, hide other layers:
		var layerIdsToHide = [layer_ids[0], layer_ids[6], layer_ids[7], layer_ids[8], layer_ids[9]];
		var layerIdsToShow = [layer_ids[1], layer_ids[2], layer_ids[3], layer_ids[4], layer_ids[5]];

		tourButtonClicked(beginDate, endDate, bounds, layerIdsToHide, layerIdsToShow);
	};
}

var btnSantiago = document.getElementById("btn-santiago");
if (btnSantiago != null) {
	btnSantiago.onclick = function(){
		var beginDate = new Date(2017, 9, 9);
		var endDate = new Date(2017, 11, 31);
		var bounds = [ [ -39.27630475468817, 26.781210313359125], [37.25033209346199, 54.85322398321597] ]
		// show santiago track layer, hide other layers:
		var layerIdsToHide = [layer_ids[1], layer_ids[2], layer_ids[3], layer_ids[4], layer_ids[5], layer_ids[6], layer_ids[7], layer_ids[8], layer_ids[9]];
		var layerIdsToShow = [layer_ids[0]];

		tourButtonClicked(beginDate, endDate, bounds, layerIdsToHide, layerIdsToShow);
	};
}

var btnBenede = document.getElementById("btn-benede");
if (btnBenede != null) {
	btnBenede.onclick = function(){
		var beginDate = new Date(2017, 6, 1);
		var endDate = new Date(2017, 6, 31);
		var bounds = [ [ 0.930541, 50.058336 ], [10.664480, 53.601601] ]
		var layerIdsToHide = [layer_ids[0], layer_ids[1], layer_ids[2], layer_ids[3], layer_ids[4], layer_ids[5], layer_ids[7], layer_ids[8], layer_ids[9]];
		var layerIdsToShow = [layer_ids[6]];

		tourButtonClicked(beginDate, endDate, bounds, layerIdsToHide, layerIdsToShow);
	};
}

var btnLimburg = document.getElementById("btn-limburg");
if (btnLimburg != null) {
	btnLimburg.onclick = function(){
		var beginDate = new Date(2021, 2, 30);
		var endDate = new Date(2021, 4, 31);
		var bounds = [ [3.30431091757914, 50.625855941053255], [6.741750996328203, 51.42902384992439] ]
		// show limburg track layer, hide other layers:
		var layerIdsToHide = [layer_ids[0], layer_ids[1], layer_ids[2], layer_ids[3], layer_ids[4], layer_ids[5], layer_ids[6], layer_ids[8], layer_ids[9]];
		var layerIdsToShow = [layer_ids[7]];

		tourButtonClicked(beginDate, endDate, bounds, layerIdsToHide, layerIdsToShow);
	};
}

var btnSwiss = document.getElementById("btn-swiss");
if (btnSwiss != null) {
	btnSwiss.onclick = function(){
		var beginDate = new Date(2021, 8, 1); // jan is month 0, dec is month 11
		var endDate = new Date(2021, 8, 19); // jan is month 0, dec is month 11
		var bounds = [ [5.798858253677991, 46.1077219159995], [10.3663090452535, 47.9275406797851] ]
		var layerIdsToHide = [layer_ids[0], layer_ids[1], layer_ids[2], layer_ids[3], layer_ids[4], layer_ids[5], layer_ids[6], layer_ids[7], layer_ids[9]];
		var layerIdsToShow = [layer_ids[8]];

		tourButtonClicked(beginDate, endDate, bounds, layerIdsToHide, layerIdsToShow);
	};
}

var btnProv = document.getElementById("btn-prov");
if (btnProv != null) {
	btnProv.onclick = function(){
		var beginDate = new Date(2022, 4, 7); // jan is month 0, dec is month 11
		var endDate = new Date(2022, 4, 23); // jan is month 0, dec is month 11
		var bounds = [ [3.981210010373801, 44.13436579362733], [5.36886047271357, 43.39750815959959] ]
		var layerIdsToHide = [layer_ids[0], layer_ids[1], layer_ids[2], layer_ids[3], layer_ids[4], layer_ids[5], layer_ids[6], layer_ids[7], layer_ids[8]];
		var layerIdsToShow = [layer_ids[9]];

		tourButtonClicked(beginDate, endDate, bounds, layerIdsToHide, layerIdsToShow);
	};
}

function tourButtonClicked(beginDate, endDate, bounds, layerIdsToHide, layerIdsToShow) {
		closeNav();

		if (typeof rangeSelector != "undefined")  rangeSelector.setValue([beginDate, endDate]);
		setDates(beginDate, endDate);

		map.fitBounds(bounds);
		setBounds(bounds);

		layerIdsToHide.forEach(function(id) { map.setLayoutProperty(id, 'visibility', 'none'); });
		layerIdsToShow.forEach(function(id) { map.setLayoutProperty(id, 'visibility', 'visible'); });

		updateMap();
}


var btnAllTours = document.getElementById("btn-alltours");
if (btnAllTours != null) {
	btnAllTours.onclick = function(){
		closeNav();

		initAjaxFilters();
		if (typeof rangeSelector != "undefined")  rangeSelector.setValue(dates); // dates is set by calling initAjaxFilters()

		map.setCenter([12.071354, 43.606002]);
		map.setZoom(4.5);

		// show all layers:
		layer_ids.forEach(function(id) { map.setLayoutProperty(id, 'visibility', 'visible'); });

		updateMap();
	};
}

function openNav() {
  document.getElementById("sidebar").style.width = "175px";
}

function closeNav() {
  document.getElementById("sidebar").style.width = "0";
}
