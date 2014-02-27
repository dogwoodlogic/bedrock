/*
 * Copyright (c) 2012-2014 Digital Bazaar, Inc. All rights reserved.
 */
var fs = require('fs');
var path = require('path');
var bedrock = {
  config: require('../config')
};

var api = {};
module.exports = api;

// the multipath swig template resolver looks in multiple directories for files
/**
 * Generates a multipath resolver function. The function returns a resolver
 * that can be used by swig's loader to find template files. It searches
 * directories in the bedrock.config.website.views.paths array for relative
 * swig template pathnames.
 *
 * @param basepath not used by this swig loader.
 * @param encoding the encoding to use when reading the file.
 *
 * @return A resolver object that can be used by swig's 'loader' option.
 */
api.multipath = function(basepath, encoding) {
  var resolver = {};
  encoding = encoding || 'utf8';

  /**
   * Resolves a given relative path to a swig template file by either return
   * the pathname, or throwing an exception.
   *
   * @param relativePath the relative pathname to the swig template file.
   *
   * @return the resolved path to the swig template file.
   */
  resolver.resolve = function(relativePath) {
    // return absolute path
    if(relativePath === path.resolve(relativePath)) {
      return relativePath;
    }

    if(relativePath) {
      for(var i = 0; i < bedrock.config.website.views.paths.length; ++i) {
        var dir = bedrock.config.website.views.paths[i];
        var filename = path.resolve(dir, relativePath);
        if(fs.existsSync(filename)) {
          return filename;
        }
      }
    }

    // throw an exception if the swig template file can't be found
    throw new Error('Unable to find ' + relativePath + ' in view path: ' +
      JSON.stringify(bedrock.config.website.views.paths));
  };

  /**
   * Loads a swig template given either a complete pathname or a relative one.
   *
   * @param identifier a relative pathname to a swig template file.
   * @param callback called once the file has been read. If omitted, the
   *          contents of the file is returned.
   *
   * @return the contents of the file if callback is omitted.
   */
  resolver.load = function(identifier, callback) {
    identifier = resolver.resolve(identifier);

    if(callback) {
      fs.readFile(identifier, encoding, callback);
      return;
    }
    return fs.readFileSync(identifier, encoding);
  };

  return resolver;
};