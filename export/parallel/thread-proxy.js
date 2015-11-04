/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 7/20/2015
 * Time: 12:33 PM
 */

/*
 var PARALLEL_BASE_PATH = PARALLEL_BASE_PATH || '/';
 var THREAD_PATH = THREAD_PATH || '/';
 */


goog.require('parallel.ThreadProxy');

goog.exportSymbol('parallel.ThreadProxy', parallel.ThreadProxy);
goog.exportProperty(parallel.ThreadProxy.prototype, 'start', parallel.ThreadProxy.prototype.start);
goog.exportProperty(parallel.ThreadProxy.prototype, 'stop', parallel.ThreadProxy.prototype.stop);
goog.exportProperty(parallel.ThreadProxy.prototype, 'run', parallel.ThreadProxy.prototype.run);
goog.exportProperty(parallel.ThreadProxy.prototype, 'createShared', parallel.ThreadProxy.prototype.createShared);
goog.exportProperty(parallel.ThreadProxy.prototype, 'swap', parallel.ThreadProxy.prototype.swap);
