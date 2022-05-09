
//VIZ DIMENSIONS
var margin = { right:50, top:20, left:0, bottom:80 };
var w = 800;
var h = 600;
var width = (w - margin.left - margin.right);
var height = (h - margin.top - margin.bottom);

//DATA
const url = 'https://apps.bea.gov/api/data/?&UserID=39600B34-D659-47F4-BC6E-C59E7019B5A1&method=GetData&datasetname=Regional&TableName=CAINC1&LineCode=1&GeoFIPS=state&ResultFormat=json&Year=2018,2019';

//SET THE SVG
const canvas = d3.select('.canvas');
const svg = canvas.append('svg')
        .attr('width', width + margin.right + margin.left)
        .attr('height', height + margin.top + margin.bottom)
        .attr('transform', 'translate(' + margin.right + ',' + margin.top + ')')

//HELPER METHOD - DATA LOAD & PREP
async function loadData(url){
    var ret = [];
    var d18 = [];
    var d19 = [];
    const data = await d3.json(url);
    for (let i=0; i<data.BEAAPI.Results.Data.length; i++){
        var res2018={};
        var res2019={};
        if(data.BEAAPI.Results.Data[i].TimePeriod === "2018"){
            res2018['GeoFips']= data.BEAAPI.Results.Data[i].GeoFips,
            res2018['GeoName']= data.BEAAPI.Results.Data[i].GeoName,
            res2018['DataValue' + '_' + data.BEAAPI.Results.Data[i].TimePeriod]= data.BEAAPI.Results.Data[i].DataValue
            d18.push(res2018);
        }else if(data.BEAAPI.Results.Data[i].TimePeriod === "2019"){
        // res = {
            // GeoFips: data.BEAAPI.Results.Data[i].GeoFips,
            // ...
            res2019['GeoFips']= data.BEAAPI.Results.Data[i].GeoFips,
            res2019['GeoName']= data.BEAAPI.Results.Data[i].GeoName,
            res2019['DataValue' + '_' + data.BEAAPI.Results.Data[i].TimePeriod]= data.BEAAPI.Results.Data[i].DataValue
            d19.push(res2019);
            // res['TimePeriod]= data.BEAAPI.Results.Data[i].TimePeriod
        }
    }
    const merge = d18.map((item, i) => Object.assign({}, item, d19[i]));  
    for(let j=0; j<merge.length; j++){

        //PERSONAL INCOME GROWTH RATE CALC
        merge[j]['growth'] = (100*((parseInt(merge[j].DataValue_2019)/parseInt(merge[j].DataValue_2018))-1)).toFixed(2);
        
        merge[j]['STATEFP'] = merge[j].GeoFips.substring(0,2);
    }
    ret.push(merge);
    
    var stateData = await d3.json("usTopo.json"); 
    ret.push(stateData);

    return ret;
}

//TITLE
svg.append('text')
.attr('class', 'title')
.attr('transform', 'translate(' + (w/2.4) + ',' + (margin.top + 30) + ')')
.text('Personal Income growth Rate: 2018-2019')

//PROJECTION FOR THE MAP
var projection= d3.geoAlbersUsa()
                .translate([width/2, height/2.5])
                .scale(700);              
path = d3.geoPath().projection(projection);


//PLOT THE MAP AND SHADE ACCORDING TO DATA VALUES
loadData(url).then(d => {    
    var pInc = d[0];
    var state = d[1];

    // pInc.forEach(e => {
    //     if(parseInt(e.growth)<0.5){
    //         console.log(e.growth)
    //     }
    // });

    //COLOR SCALE
    var color = d3.scaleSequential()
        .interpolator(d3.interpolateGreens)
        // .interpolator(d3.interpolatePiYG)
        .domain([d3.min(pInc, val => {return val.growth}), d3.max(pInc, val => {return val.growth})]);

    // var data = new Map();
    // for (const[k,v] of Object.entries(pInc)){
    //     data.set(v.STATEFP, +v.growth);
    // }

    var data = pInc.reduce((accumulator, d) => {
        accumulator[d.STATEFP] = d.growth;
        return accumulator;
    }, {})
     
    //PLOT
    svg.append('g')
        .selectAll('.states')
        .data(topojson.feature(state, state.objects.cb_2019_us_state_20m).features)
        .enter().append('path')
            .attr('class', 'states')
            .attr('d', path)
            .attr('transform', "translate(" + width/20 +"," + height/4 +")" )
            .attr('fill', d =>  color(data[d.properties.STATEFP]))
        .append('title')
            .text(d => d.properties.NAME + '\n' + data[d.properties.STATEFP] + ' %')

    // svg.append("g")
    // .selectAll("path")
    // .data(topojson.feature(state, state.objects.cb_2019_us_state_20m).features)
    // .join("path")
    //   .attr("fill", d => color(data.get(d.properties.STATEFP)))
    //   .attr("d", path)

    svg.append("path")
    .datum(topojson.mesh(state, state.objects.cb_2019_us_state_20m, (a, b) => a !== b))
    .attr("fill", "none")
    .attr("stroke", "white")
    .attr('stroke-width', '1.5')
    .attr("stroke-linejoin", "round")
    .attr('transform', "translate(" + width/20 +"," + height/4 +")" )
    .attr("d", path);


    //LEGEND & SCALE
    var defs = svg.append('defs');
    var linearGradient = defs.append('linearGradient')
                            .attr('id', 'linear-gradient');
    
    linearGradient.attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '100%')
            .attr('y2', '0%')

    linearGradient.selectAll("stop")
            .data(color.ticks().map((t, i, n) => ({ offset: `${100*i/n.length}%`, color: color(t) })))
            .enter().append("stop")
            .attr("offset", d => d.offset)
            .attr("stop-color", d => d.color);
    
    var legendVal = d3.scaleLinear()
                .domain(color.domain())
                .range([(w-280), (w-30)])
                
    svg.append('g')
        .attr('class', 'legendScale')
        .attr('transform', 'translate(' + 0 + ','+ 122 + ')')
        .call((d3.axisBottom(legendVal)))
            
    svg.append('rect')
            .attr('x', w-280)
            .attr('y', 45)
            .attr('width',250)
            .attr('height', 30)
            .attr('transform', 'translate(0, 50)')
            .style('fill', 'url(#linear-gradient)')

    svg.append('text')
        .attr('class', 'perc')
        .attr('transform', 'translate('+ `${w-30}` + ',' + 140 + ')')
        .text('%')

    //FOOTNOTE
    svg .append('text')
        .attr('class', 'source')
        .attr('transform', 'translate(' + width/2.5 + ',' + `${h-20}` + ')')
        .text('Source: Bureau of Economic Analaysis')
})
