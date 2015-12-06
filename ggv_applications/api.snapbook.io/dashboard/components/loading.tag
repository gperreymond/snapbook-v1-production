<s-loading>
    
    <!-- layout -->
    
    <div class="container" if={ facade.currentState==Facade.STATE_LOADING }> 
        <h2>LOADING</h2>
        <p>
            <span>{ message }<pan><br>
            <span>-------------------------------<pan><br>
            <span>{ submessage }<pan><br>
        </p>
    </div>
    
    <!-- style -->
    
    <style>
    
    </style>
    
    <!-- logic -->
    
    <script>
        
        var self = this;
        
        self.message = 'initialisation en cours...';
        self.submessage = '';
        
        self.on('mount',function() {
	  	    console.log('loading.tag','mount');
		    facade.tags.loading = self; // put reference in the facade
		    self.trigger('load_stats');
		});
        
        self.on('load_stats',function() {
            console.log('loading.tag','load_database');
            facade.currentState = Facade.STATE_LOADING;
            var apis_stats = [];
		    async.map(apis_stats, function(item,callback) {
		        console.log('loading stats',item);
                self.submessage = item;
                self.update();
                $.ajax({
					type: "GET",
				    dataType: 'json',
					url : 'https://ggvdeve-gperreymond.c9.io/'+item,
					success: function(result) {
						if ( _.isArray(result) ) {
						    facade.databases[item] = result;
						    callback(null,true);
						} else {
						    callback(true,null);
						}
					},
		        	error: function(jqXHR, textStatus, errorThrown) {
		        		callback(true,null);
					}
				});
            }, function(err, results) {
                if (err) {
                     console.log('loading stats',err);
                } else {
                    console.log('loading stats','complete');
            	    facade.currentState = Facade.STATE_HOMEPAGE;
            	    riot.update();
            	}
            });
        });
        
    </script>
    
</s-loading>