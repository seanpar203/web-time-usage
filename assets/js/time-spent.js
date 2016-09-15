$(() => {
	/** Sensible Constants */
	const baseUrl = 'http://localhost:5000/api';
	const sendMsg = chrome.extension.sendMessage;
	let token = localStorage.getItem('WTA_TOKEN');
	let totalElapsed = 0;

	/**
	 * Fetch users time spent today.
	 */
	function getTodaysTimeSpent() {
		$.ajax({
			method:  'GET',
			url:     baseUrl + '/time',
			headers: {'Authorization': token},
			success: handleSucces,
			error:   (err) => console.log(err)
		});
	}

	/**
	 * getTodaysTimeSpent Success callback.
	 * @param res
	 */
	function handleSucces(res) {
		// Get static json for creating pie chart.
		d3.json('assets/data/pie.json', (err, pieData) => {

			// Attach Dynamic data to content.
			pieData.data.content = res.data;
			const pie = new d3pie("pieChart", pieData);
		});

		// Create Table, Update Header.
		createTable(res.data);
		updateHeader();
	}

	/**
	 * Create a bootstrap table with dynamic data.
	 * @param {Array} data - array of time objects.
	 */
	function createTable(data) {
		// Total amount spent from data.
		data.forEach(time => totalElapsed += time.value);

		// Create rows.
		data.forEach(time => {
			$('tbody')
				.append(
					'<tr>' +
						'<td class="collapsing">'+
							'<div class="ui fitted slider checkbox">'+
								'<input style=background-color:' + time.color +'!important;'+'color:' + time.color + '!important' + ' type="checkbox">'+
								'<label style=background-color:' + time.color +'!important;'+'color:' + time.color + '!important' + '>' + '</label>'+
							'</div>' +
						'</td>'+
							'<td class="color" style=background-color:' + time.color + '>' + '</td>' +
							'<td class="website">' + time.label + '</td>' +
							'<td class="time">' + calcTime(time.value).string() + '</td>' +
						'<td class="percent">' + Math.round(time.value / totalElapsed * 100) + '</td>' +
					'</tr>'
				)
		});

		// Fade in Table.
		$('.table').fadeIn(1000);
	}


	/** Update and fade in header */
	function updateHeader() {
		$('#total-time').html(calcTime(totalElapsed).string());
		$('header').fadeIn(1000);
	}

	/**
	 * Helper to return data & string format of time spent.
	 * @param time
	 * @returns {{lgName: *, lgAmnt: *, smName: *, smAmnt: *, string: string}}
	 */
	function calcTime(time) {
		/** Attributes. */
		let float;
		let lgName;
		let smName;

		let lgAmnt;
		let smAmnt;

		/** Calculates Hours & Minutes */
		const calcHours = () => {
			lgName = 'Hours';
			smName = 'Minutes';

			float = (time / 60 / 60).toFixed(2);
			lgAmnt = Math.floor(time / 60 / 60);
			smAmnt = Math.round(float.split('.')[1] * 60 / 100);
		};

		/** Calculates Minutes & Seconds. */
		const calcMinutes = () => {
			lgName = 'Minutes';
			smName = 'Seconds';

			float = (time / 60).toFixed(2);
			lgAmnt = Math.floor(time / 60);
			smAmnt = Math.round(float.split('.')[1] * 60 / 100);
		};

		/** Returns string format of calc results. */
		const string = () => {
			return `${lgAmnt} ${lgName}, ${smAmnt} ${smName}`
		};

		/** Kick Off Conditional. */
		time >= 3600 ? calcHours() : calcMinutes();

		/** Return calculated results. */
		return {
			lgName,
			lgAmnt,
			smName,
			smAmnt,
			string,
		};
	}

	function addAxesAndLegend(svg, xAxis, yAxis, margin, chartWidth, chartHeight) {
		var legendWidth  = 200,
		    legendHeight = 100;

		// clipping to make sure nothing appears behind legend
		svg.append('clipPath')
			.attr('id', 'axes-clip')
			.append('polygon')
			.attr('points', (-margin.left) + ',' + (-margin.top) + ' ' +
				(chartWidth - legendWidth - 1) + ',' + (-margin.top) + ' ' +
				(chartWidth - legendWidth - 1) + ',' + legendHeight + ' ' +
				(chartWidth + margin.right) + ',' + legendHeight + ' ' +
				(chartWidth + margin.right) + ',' + (chartHeight + margin.bottom) + ' ' +
				(-margin.left) + ',' + (chartHeight + margin.bottom));

		var axes = svg.append('g')
			.attr('clip-path', 'url(#axes-clip)');

		axes.append('g')
			.attr('class', 'x axis')
			.attr('transform', 'translate(0,' + chartHeight + ')')
			.call(xAxis);

		axes.append('g')
			.attr('class', 'y axis')
			.call(yAxis)
			.append('text')
			.attr('transform', 'rotate(-90)')
			.attr('y', 6)
			.attr('dy', '.71em')
			.style('text-anchor', 'end')
			.text('Time (s)');

		var legend = svg.append('g')
			.attr('class', 'legend')
			.attr('transform', 'translate(' + (chartWidth - legendWidth) + ', 0)');

		legend.append('rect')
			.attr('class', 'legend-bg')
			.attr('width', legendWidth)
			.attr('height', legendHeight);

		legend.append('rect')
			.attr('class', 'outer')
			.attr('width', 75)
			.attr('height', 20)
			.attr('x', 10)
			.attr('y', 10);

		legend.append('text')
			.attr('x', 115)
			.attr('y', 25)
			.text('5% - 95%');

		legend.append('rect')
			.attr('class', 'inner')
			.attr('width', 75)
			.attr('height', 20)
			.attr('x', 10)
			.attr('y', 40);

		legend.append('text')
			.attr('x', 115)
			.attr('y', 55)
			.text('25% - 75%');

		legend.append('path')
			.attr('class', 'median-line')
			.attr('d', 'M10,80L85,80');

		legend.append('text')
			.attr('x', 115)
			.attr('y', 85)
			.text('Median');
	}

	function drawPaths(svg, data, x, y) {
		var upperOuterArea = d3.svg.area()
			.interpolate('basis')
			.x(function (d) {
				return x(d.date) || 1;
			})
			.y0(function (d) {
				return y(d.pct95);
			})
			.y1(function (d) {
				return y(d.pct75);
			});

		var upperInnerArea = d3.svg.area()
			.interpolate('basis')
			.x(function (d) {
				return x(d.date) || 1;
			})
			.y0(function (d) {
				return y(d.pct75);
			})
			.y1(function (d) {
				return y(d.pct50);
			});

		var medianLine = d3.svg.line()
			.interpolate('basis')
			.x(function (d) {
				return x(d.date);
			})
			.y(function (d) {
				return y(d.pct50);
			});

		var lowerInnerArea = d3.svg.area()
			.interpolate('basis')
			.x(function (d) {
				return x(d.date) || 1;
			})
			.y0(function (d) {
				return y(d.pct50);
			})
			.y1(function (d) {
				return y(d.pct25);
			});

		var lowerOuterArea = d3.svg.area()
			.interpolate('basis')
			.x(function (d) {
				return x(d.date) || 1;
			})
			.y0(function (d) {
				return y(d.pct25);
			})
			.y1(function (d) {
				return y(d.pct05);
			});

		svg.datum(data);

		svg.append('path')
			.attr('class', 'area upper outer')
			.attr('d', upperOuterArea)
			.attr('clip-path', 'url(#rect-clip)');

		svg.append('path')
			.attr('class', 'area lower outer')
			.attr('d', lowerOuterArea)
			.attr('clip-path', 'url(#rect-clip)');

		svg.append('path')
			.attr('class', 'area upper inner')
			.attr('d', upperInnerArea)
			.attr('clip-path', 'url(#rect-clip)');

		svg.append('path')
			.attr('class', 'area lower inner')
			.attr('d', lowerInnerArea)
			.attr('clip-path', 'url(#rect-clip)');

		svg.append('path')
			.attr('class', 'median-line')
			.attr('d', medianLine)
			.attr('clip-path', 'url(#rect-clip)');
	}

	function addMarker(marker, svg, chartHeight, x) {
		var radius    = 32,
		    xPos      = x(marker.date) - radius - 3,
		    yPosStart = chartHeight - radius - 3,
		    yPosEnd   = (marker.type === 'Client' ? 80 : 160) + radius - 3;

		var markerG = svg.append('g')
			.attr('class', 'marker ' + marker.type.toLowerCase())
			.attr('transform', 'translate(' + xPos + ', ' + yPosStart + ')')
			.attr('opacity', 0);

		markerG.transition()
			.duration(1000)
			.attr('transform', 'translate(' + xPos + ', ' + yPosEnd + ')')
			.attr('opacity', 1);

		markerG.append('path')
			.attr('d', 'M' + radius + ',' + (chartHeight - yPosStart) + 'L' + radius + ',' + (chartHeight - yPosStart))
			.transition()
			.duration(1000)
			.attr('d', 'M' + radius + ',' + (chartHeight - yPosEnd) + 'L' + radius + ',' + (radius * 2));

		markerG.append('circle')
			.attr('class', 'marker-bg')
			.attr('cx', radius)
			.attr('cy', radius)
			.attr('r', radius);

		markerG.append('text')
			.attr('x', radius)
			.attr('y', radius * 0.9)
			.text(marker.type);

		markerG.append('text')
			.attr('x', radius)
			.attr('y', radius * 1.5)
			.text(marker.version);
	}

	function startTransitions(svg, chartWidth, chartHeight, rectClip, markers, x) {
		rectClip.transition()
			.duration(1000 * markers.length)
			.attr('width', chartWidth);

		markers.forEach(function (marker, i) {
			setTimeout(function () {
				addMarker(marker, svg, chartHeight, x);
			}, 1000 + 500 * i);
		});
	}

	function makeChart(data, markers) {
		var svgWidth    = 960,
		    svgHeight   = 500,
		    margin      = {
			    top:    20,
			    right:  20,
			    bottom: 40,
			    left:   40
		    },
		    chartWidth  = 750 - margin.left - margin.right,
		    chartHeight = 500 - margin.top - margin.bottom;

		var x = d3.time.scale()
			.range([
				0,
				chartWidth
			])
			.domain(d3.extent(data, function (d) {
				return d.date;
			})),
		    y = d3.scale.linear()
			    .range([
				    chartHeight,
				    0
			    ])
			    .domain([
				    0,
				    d3.max(data, function (d) {
					    return d.pct95;
				    })
			    ]);

		var xAxis = d3.svg.axis()
			.scale(x)
			.orient('bottom')
			.innerTickSize(-chartHeight)
			.outerTickSize(0)
			.tickPadding(10),

		    yAxis = d3.svg.axis()
			    .scale(y)
			    .orient('left')
			    .innerTickSize(-chartWidth)
			    .outerTickSize(0)
			    .tickPadding(10);

		var svg = d3.select('#trends')
			.append('svg')
			.attr('class', 'Hello')
			.attr('width', 750)
			.attr('height', 500)
			.append('g')
			.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

		// clipping to start chart hidden and slide it in later
		var rectClip = svg.append('clipPath')
			.attr('id', 'rect-clip')
			.append('rect')
			.attr('width', 0)
			.attr('height', chartHeight);

		addAxesAndLegend(svg, xAxis, yAxis, margin, chartWidth, chartHeight);
		drawPaths(svg, data, x, y);
		startTransitions(svg, chartWidth, chartHeight, rectClip, markers, x);
	}

	var parseDate = d3.time.format('%Y-%m-%d').parse;
	d3.json('assets/data/data.json', function (error, rawData) {
		if (error) {
			console.error(error);
			return;
		}

		var data = rawData.map(function (d) {
			return {
				date:  parseDate(d.date),
				pct05: d.pct05 / 1000,
				pct25: d.pct25 / 1000,
				pct50: d.pct50 / 1000,
				pct75: d.pct75 / 1000,
				pct95: d.pct95 / 1000
			};
		});

		d3.json('assets/data/markers.json', function (error, markerData) {
			if (error) {
				console.error(error);
				return;
			}

			var markers = markerData.map(function (marker) {
				return {
					date:    parseDate(marker.date),
					type:    marker.type,
					version: marker.version
				};
			});

			makeChart(data, markers);
		});
	});

	if (token != null) {
		getTodaysTimeSpent();
	}

	else if (token == null) {
		sendMsg({request: 'token'}, res => {
			token = res.token;
			localStorage.setItem('WTA_TOKEN', res.token);
			getTodaysTimeSpent();
		});
	}
});