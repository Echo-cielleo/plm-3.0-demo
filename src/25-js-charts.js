/* ==================================================================
   [25] ECharts option 工厂（用于被各页面调用）
   也兼容 24-js-doe 内部直接拼 option 的方式
   ================================================================== */
function optMainEffect(effects){
  var series=effects.map(function(ef){
    return {name:ef.name,type:'line',data:ef.means,symbolSize:9,
            lineStyle:{width:2.5}};
  });
  return {
    tooltip:{trigger:'axis'},
    legend:{top:0,data:series.map(function(s){return s.name;})},
    grid:{left:50,right:20,top:40,bottom:30},
    xAxis:{type:'category',data:effects[0].levels.map(function(v){return v;})},
    yAxis:{type:'value'},
    series:series
  };
}
function optResidual(residuals){
  return {
    tooltip:{trigger:'item'},
    grid:{left:50,right:20,top:30,bottom:30},
    xAxis:{type:'value',name:'预测值'},
    yAxis:{type:'value',name:'残差'},
    series:[{type:'scatter',data:residuals.map(function(r){return [r.pred,r.res];}),
             symbolSize:9,itemStyle:{color:'#1677ff',opacity:.7},
             markLine:{silent:true,data:[{yAxis:0,lineStyle:{color:'#999',type:'dashed'}}]}}]
  };
}
function optPareto(pareto,crit){
  var sorted=pareto.slice().sort(function(a,b){return b.val-a.val;});
  return {
    tooltip:{trigger:'axis'},
    grid:{left:60,right:30,top:20,bottom:30},
    xAxis:{type:'value'},
    yAxis:{type:'category',data:sorted.map(function(p){return p.name;}),inverse:true},
    series:[{type:'bar',data:sorted.map(function(p){
      return {value:p.val,itemStyle:{color:p.val>crit?'#ff4d4f':'#1677ff'}};
    }),markLine:{silent:true,data:[{xAxis:crit,lineStyle:{color:'#ff4d4f',type:'dashed'}}],label:{formatter:'临界 '+crit}}}]
  };
}
function optNormalPlot(np){
  var lo=Math.min.apply(null,np.map(function(p){return p.act;}));
  var hi=Math.max.apply(null,np.map(function(p){return p.act;}));
  return {
    tooltip:{trigger:'item'},
    grid:{left:50,right:20,top:20,bottom:30},
    xAxis:{type:'value',min:-3.2,max:3.2},
    yAxis:{type:'value',min:lo-.3,max:hi+.3},
    series:[{type:'scatter',data:np.map(function(p){return [p.theo,p.act];}),
             symbolSize:8,itemStyle:{color:'#1677ff',opacity:.7},
             markLine:{silent:true,data:[[{coord:[lo,lo]},{coord:[hi,hi]}]],lineStyle:{color:'#999',type:'dashed'}}}]
  };
}
function optContrib(contrib){
  return {
    tooltip:{trigger:'axis'},
    grid:{left:80,right:40,top:20,bottom:30},
    xAxis:{type:'value',max:100},
    yAxis:{type:'category',data:contrib.map(function(x){return x.name;}),inverse:true},
    series:[{type:'bar',data:contrib.map(function(x){
      return {value:x.val,itemStyle:{color:x.name==='未解释'?'#d9d9d9':(x.name==='交互作用'?'#722ed1':'#1677ff')}};
    }),label:{show:true,position:'right',formatter:'{c}%'}}]
  };
}
