/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 7/20/2015
 * Time: 10:08 AM
 */

if (typeof COMPILED == 'undefined') {
  DOMAIN_BASE_PATH = '/parallel/';
  CLOSURE_BASE_PATH = DOMAIN_BASE_PATH + '/closure-library/closure/goog/';
  SRC_BASE_PATH = DOMAIN_BASE_PATH + '/src/';
  importScripts(
    CLOSURE_BASE_PATH + 'bootstrap/webworkers.js',
    CLOSURE_BASE_PATH + 'base.js',
    CLOSURE_BASE_PATH + 'deps.js',
    DOMAIN_BASE_PATH + 'deps.js');
}
