'use strict';

const jadeExts = require('./lib/jade-exts.js'),
      runSequence = require('run-sequence'),
      browserSync = require('browser-sync').create(),
      path = require('path'),
      del = require('del');

const gulp = require('gulp'),
      plumber = require('gulp-plumber'),
      notify = require('gulp-notify'),
      browserify = require('gulp-browserify'),
      jade = require('gulp-jade'),
      babel = require('gulp-babel'),
      typescript = require('gulp-typescript');


function handler(){
    return plumber({errorHandler: notify.onError('<%= error.message %>')});
}

const paths = {
    jade: ['*.jade', 'static/**.jade'],
    sass: ['static/**.scss'],
    ts: ['static/**.ts', './typings/browser.d.ts'],

    dist: 'dist',
    tmp: 'tmp',

    sassIncludePaths: ['node_modules', 'static'].concat(
        require('bourbon').includePaths,
        require('bourbon-neat').includePaths
    ).map((p) => {return path.resolve(p)})
};

gulp.task('highlight', () => {
    return gulp
        .src('static/hl.js')
        .pipe(handler())
        .pipe(browserify())
        .pipe(gulp.dest(paths.tmp));
});


gulp.task('typescript', () => {
    return gulp
        .src(paths.ts)
        .pipe(handler())
        .pipe(typescript(typescript.createProject('tsconfig.json')))
        .pipe(babel({presets: ['es2015', 'stage-3']}))
        .pipe(browserify())
        .pipe(gulp.dest(paths.tmp));
});


gulp.task('_jade', () => {
    return gulp
        .src(paths.jade)
        .pipe(handler())
        .pipe(jade({locals: Object.assign({paths: paths}, jadeExts)}))
        .pipe(gulp.dest(paths.dist));
});


gulp.task('jade', () => {
    return runSequence(
        ['highlight', 'typescript'],
        '_jade'
    );
});


gulp.task('distclean', () => {
    return del(['dist', 'tmp']);
});


gulp.task('_reload', () => {return browserSync.reload();});


gulp.task('watch', ['highlight', 'jade'], () => {
    browserSync.init({
        server: paths.dist
    });

    function watch(files, tasks) {
        return gulp.watch(files, () => {
            return runSequence.apply(runSequence, tasks.concat(['_reload']));
        });
    }

    watch([].concat(paths.jade, paths.sass), ['_jade']);
    watch(paths.ts, ['typescript', '_jade']);
});

gulp.task('default', ['jade']);
