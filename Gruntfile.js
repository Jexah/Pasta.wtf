module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
		less: {
			development:{
				files: {
					"assets/stylesheets/main.css": "assets/less/main.less"
				}
			}
		},
        concat: {
	        css: {
	           src: [
	                 'assets/stylesheets/*'
	                ],
	            dest: 'public/css/main.css'
	        },
	        js : {
	            src : [
	                'assets/javascripts/*'
	            ],
	            dest : 'public/js/main.js'
	        }
	    },
	    cssmin : {
            css:{
                src: 'public/css/main.css',
                dest: 'public/css/main.min.css'
            }
        },
        uglify : {
        	build:{
            	src:'public/js/main.js',
            	dest:'public/js/main.min.js'
            }
        },
        watch: {
    		files: ['assets/less/*', 'assets/javascripts/*'],
    		tasks: ['less', 'concat', 'cssmin', 'uglify']
   		}
    });
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.registerTask('default', [ 'less', 'concat:css', 'cssmin:css', 'concat:js', 'uglify:js' ]);
};