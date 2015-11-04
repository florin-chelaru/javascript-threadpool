/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 11/2/2015
 * Time: 2:46 PM
 */

var tp = null;

function start(njobs, n) {
  tp = tp || new parallel.ThreadPool(16, WORKER);

  var count = njobs;
  var startTime = new Date();
  for (var i = 0; i < njobs; ++i) {
    tp.queue(function(thread) {
      var arr;
      return thread.createShared('Array')
        .then(function(d) {
          arr = d;
          return thread
            .run(function(arr, n) {
              for (var i = 0; i < n; ++i) {
                arr.push(Math.floor(Math.random() * 10));
              }
            }, arr, n);
        })
        .then(function() {
          return thread.run(function(arr) {
            return arr.reduce(function(x, y) { return x + y; });
          }, arr);
        })
        .then(function(sum) {
          return arr.join(',')
            .then(function(joined) {
              // console.log('sum[' + joined + ']=' + sum);
              // console.log('sum=' + sum);
              --count;
              if (count == 0) {
                //alert('[Multi thread] Time elapsed: ' + (new Date() - startTime));
                console.log('[Multi thread] Time elapsed: ' + (new Date() - startTime));
              }
            });
        });
    });
  }
}

function startSameThread(njobs, n) {
  var startTime = new Date();
  for (var i = 0; i < njobs; ++i) {
    var arr = [];
    for (var j = 0; j < n; ++j) {
      arr.push(Math.floor(Math.random() * 10));
    }
    var sum = arr.reduce(function(x, y) { return x+y; });
    var joined = arr.join(',');
    //console.log('sum[' + joined + ']=' + sum);
  }
  //alert('[Single thread] Time elapsed: ' + (new Date() - startTime));
  console.log('[Single thread] Time elapsed: ' + (new Date() - startTime));
}
