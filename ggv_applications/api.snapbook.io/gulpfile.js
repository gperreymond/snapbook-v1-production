var gulp = require('gulp');
var $ = require('gulp-load-plugins')();

var runSequence = require('run-sequence');

/////////////////////
// methods
/////////////////////

function clean(files) {
  return function () {
    return gulp.src(files)
      .pipe($.clean({force: true}));
  };
}

function jshint(files) {
  return function () {
    return gulp.src(files)
      .pipe($.jshint())
      .pipe($.jshint.reporter('jshint-stylish'));
  };
}

function uglify(files) {
  return function () {
    return gulp.src(files)
      .pipe($.uglify())
      .pipe(gulp.dest('./build'));
  };
}

/////////////////////
// tasks
/////////////////////

gulp.task('clean',clean('./build/*'));
gulp.task('jshint', jshint('./src/**/*.js'));
gulp.task('uglify', uglify('./src/**/*.js'));

/////////////////////
// sequences
/////////////////////

// build sequence
gulp.task('build', function() {
	runSequence(
		['clean'],
		['jshint'],
		['uglify']
	);
});