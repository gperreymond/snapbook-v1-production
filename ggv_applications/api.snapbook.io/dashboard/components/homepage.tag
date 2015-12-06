<s-homepage>
    
    <!-- layout -->
    
    <div class="container" if={ facade.currentState==Facade.STATE_HOMEPAGE }> 
        <h2>OH! LES MAINS</h2>
        <h4>100 derniers snaps (activity)</h4>
        <div class="row">
            <div class="col s12">
                <div id="compare-time" class="ct-chart ct-double-octave"></div>
            </div>
        </div>
        <div class="row">
            <div class="col s12 m3">
                <h6>Temps Moyen : {compare_time_average} ms</h6>
            </div>
            <div class="col s12 m3">
                <h6>Temps Médian : {facade.charts_data.compare_time.series[1][25]} ms</h6>
            </div>
            <div class="col s12 m3">
                <h6>Temps Maximum : {facade.charts_data.compare_time.series[1][49]} ms</h6>
            </div>
            <div class="col s12 m3">
                <h6>Temps Minimum : {facade.charts_data.compare_time.series[1][0]} ms</h6>
            </div>
        </div>
    </div>
    
    <!-- style -->
    
    <style scoped>
    
    :scope .row {
        padding: 0;
        margin: 0;
    }
    
    </style>
    
    <!-- logic -->
    
    <script>
        
        var self = this;
        
        self.compare_time_average = 0;
        
        self.on('mount',function() {
	  	    console.log('homepage.tag','mount');
		    facade.tags.homepage = self; // put reference in the facade

		    async.forever(
                function(next) {
                    $.ajax({
    					type: "GET",
    				    dataType: 'json',
    					url : 'http://api.snapbook.io/stats/snaps?limit=100',
    					success: function(results) {
    						if ( _.isArray(results) ) {
        						setTimeout(function() {
        						    var i = 1;
        						    var sum = 0;
        						    var coincide_true = 0;
        						    var coincide_false = 0;
        						    async.mapSeries(results, 
        						        function(item,cb) {
        						            var data = {
        						                label: ' ',
        						                compare_time: item.meta.compare_time
        						            }
        						            if ( item.meta.coincide==true ) coincide_true += 1;
        						            if ( item.meta.coincide==false ) coincide_false += 1;
        						            i += 1;
        						            sum += item.meta.compare_time;
        						            if ( i==results.length ) self.compare_time_average = Math.round(sum/i);
        						            cb(null,data);
        						        }, 
        						        function(err, results) {
        						        
            						        facade.charts_data.compare_time = {
            						            labels: _.pluck(results, 'label'),
            						            series: [
            						                _.pluck(results, 'compare_time'),
            						                _.sortBy(_.pluck(results, 'compare_time'))
            						            ]
            						        };
            						        var options_compare_time = {
                                                fullWidth: true,
                                                showArea: true,
                                                showPoint: false,
                                                lineSmooth: Chartist.Interpolation.simple({
                                                    divisor: 2
                                                }),
                                                axisY: {
                                                    onlyInteger: true
                                                },
                                                chartPadding: {
                                                    right: 40
                                                }
                                            };
                                            
                                            if ( facade.charts.compare_time ) {
                                                console.log('update', 'charts');
                                                facade.charts.compare_time.update(facade.charts_data.compare_time);
                                            } else {
                                                console.log('create', 'charts');
                                                facade.charts.compare_time = new Chartist.Line('#compare-time', facade.charts_data.compare_time, options_compare_time);
                                            };
                                            
                                            self.update();
                                            next();
                                    });
        						},3000);
        					} else {
        					    next(true);
        					}
    					},
    		        	error: function(jqXHR, textStatus, errorThrown) {
    		        		next(true);
    					}
    				});
                },
                function(err) {
                    // if next is called with a value in its first parameter, it will appear
                    // in here as 'err', and execution will stop.
                }
            );
		    
		});
		
		self.on('update',function() {
		    console.log('homepage.tag','update');
		    
		});
        
    </script>
    
</s-homepage>