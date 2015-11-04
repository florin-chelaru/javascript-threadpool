/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 11/4/2015
 * Time: 10:12 AM
 */

QUnit.test('parallel.ThreadPool', function(assert) {
  var done = assert.async();
  assert.ok(parallel.ThreadPool);
  assert.ok(parallel.ThreadProxy);

  var tp = new parallel.ThreadPool(16, WORKER);
  assert.ok(tp);

  var njobs = 100;
  var n = 10;

  var i = 0;
  u.async.for(njobs, function() {
    return tp.queue(function(thread) {
      var arr, threadArr;
      return Promise.resolve()
        .then(function() { return thread.createShared('Array'); })
        .then(function(d) {
          arr = d;
          return thread.run(function(arr, n) {
            // Here we are inside the worker, with no access to anything outside the scope
            for (var i = 0; i < n; ++i) {
              arr.push(Math.floor(Math.random() * 10)); // an array of integers between 0 and 9
            }
            return arr;
          }, [arr, n]);
        })
        .then(function(d) {
          threadArr = d;
          assert.ok(d, 'generated array is well defined');
          assert.equal(d.length, n, 'array.length == n');
          d.forEach(function(x) {
            assert.equal(typeof x, 'number', 'typeof x is number');
            assert.ok(x < 10, 'x < 10');
            assert.ok(x >= 0, 'x >= 0');
          });

          return thread.run(function(arr) {
            // Here we are inside the worker, with no access to anything outside the scope
            return arr.reduce(function(x, y) { return x + y; });
          }, [arr]);
        })
        .then(function(sum) {
          assert.ok(sum != undefined, 'sum was generated');

          var realSum = threadArr.reduce(function(x, y) { return x + y; });
          assert.equal(sum, realSum, 'sum is correct');

          return arr.join(',');
        })
        .then(function(joined) {
          assert.ok(joined, 'joined was generated');
          var realJoined = threadArr.join(',');
          assert.equal(joined, realJoined, 'joined is correct');
          ++i;
        });
    });
  }).then(function() {
    assert.equal(i, njobs, 'all jobs ran');
    done();
  });
});
