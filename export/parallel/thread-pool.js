/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 7/20/2015
 * Time: 11:06 AM
 */

goog.require('parallel.ThreadPool');

goog.exportSymbol('parallel.ThreadPool', parallel.ThreadPool);
goog.exportProperty(parallel.ThreadPool.prototype, 'queue', parallel.ThreadPool.prototype.queue);
goog.exportProperty(parallel.ThreadPool.prototype, 'stopAll', parallel.ThreadPool.prototype.stopAll);
