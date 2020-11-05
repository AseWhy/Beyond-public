let { performance } = require('perf_hooks');
    gulp = require('gulp'),
    cleanCSS = require('gulp-clean-css'),
    babel = require('gulp-babel'),
    concat = require('gulp-concat'),
    uglify = require('gulp-uglify-es').default;

const paths = {
    styles: {
        src: 'control/raw/styles/*.css',
        dest: 'control/data/styles/'
    },
    libs: {
        src: [
            'control/raw/libs/babel.runtime.js',
            'control/raw/libs/react.production.min.js',
            'control/raw/libs/react.dom.production.min.js',
            'control/raw/libs/chart.bundle.min.js'
        ],
        dest: 'control/data/scripts/'
    },
    jsx: {
        src: 'control/raw/jsx/*.jsx',
        dest: 'control/data/scripts/'
    },
    js: {
        src: 'control/raw/js/*.js',
        dest: 'control/data/scripts/'
    },
};

gulp.task("jsx", () => {
    let isSuccess = true, start = performance.now();

    gulp.src(paths.jsx.src)
        .pipe(babel({
            presets: [
                "@babel/env",
                "@babel/preset-react"
            ]
        }))
        .pipe(concat('ui.performing.js'))
        .pipe(uglify())
        .pipe(gulp.dest(paths.jsx.dest))
        .on('error', err => {
            isSuccess = false;

            global.web_logger.error('Error while compiling gulp JSX', err);
        })
        .on('end', ()=> {
            if(isSuccess)
                global.web_logger.log('JSX compiled successfully, Spent ' + Math.round(performance.now() - start) + '(ms)');
        });
})

gulp.task("js", () => {
    let isSuccess = true, start = performance.now();

    gulp.src(paths.js.src)
        .pipe(babel({
            presets: [
                "@babel/env"
            ]
        }))
        .pipe(concat('run-on.utils.js'))
        .pipe(uglify())
        .pipe(gulp.dest(paths.js.dest))
        .on('error', err => {
            isSuccess = false;

            global.web_logger.error('Error while compiling gulp JS', err);
        })
        .on('end', ()=> {
            if(isSuccess)
                global.web_logger.log('JS compiled successfully, Spent ' + Math.round(performance.now() - start) + '(ms)');
        });
})

gulp.task("libs", () => {
    let isSuccess = true, start = performance.now();

    gulp.src(paths.libs.src)
        .pipe(concat('assembled.libs.js'))
        .pipe(gulp.dest(paths.libs.dest))
        .on('error', err => {
            isSuccess = false;

            global.web_logger.error('Error while compiling gulp libs', err);
        })
        .on('end', ()=> {
            if(isSuccess)
                global.web_logger.log('libs compiled successfully, Spent ' + Math.round(performance.now() - start) + '(ms)');
        });
});

gulp.task("styles", () => {
    let isSuccess = true, start = performance.now();

    gulp.src(paths.styles.src)
        .pipe(cleanCSS())
        .pipe(gulp.dest(paths.styles.dest))
        .on('error', err => {
            isSuccess = false;

            global.web_logger.error('Error while compiling gulp css', err);
        })
        .on('end', ()=> {
            if(isSuccess)
                global.web_logger.log('css compiled successfully, Spent ' + Math.round(performance.now() - start) + '(ms)');

            global.web_pattern.update();
        });
})

if(!global.config.minimize_web)
    gulp.task('watch', () => {
        gulp.watch(paths.jsx.src)
            .on('change', gulp.series('jsx'));

        gulp.watch(paths.js.src)
            .on('change', gulp.series('js'));

        gulp.watch(paths.libs.src)
            .on('change', gulp.series('libs'));

        gulp.watch(paths.styles.src)
            .on('change', gulp.series('styles'));
    });

gulp.series(() => {
    gulp.series('jsx')();
    gulp.series('js')();
    gulp.series('libs')();
    gulp.series('styles')();

    if(!global.config.minimize_web)
        gulp.series('watch')();
})();